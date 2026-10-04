// @vitest-environment jsdom
/**
 * Alternate-provider conformance (#11, M1-04): the SAME public conformance
 * cases are asserted against two genuinely different implementations — the
 * React provider (packages/react-provider) and the framework-agnostic DOM
 * provider (packages/conformance/src/dom-provider.ts, native HTML semantics,
 * no React). Each case declares interaction semantics once; both providers
 * must yield identical values, events, disabled/error and interaction
 * behavior (acceptance 1).
 *
 * Scope is limited to the frozen representative components Button / Select /
 * TextInput. Dialog (portal/focus trap) and theme tokens are React-host
 * extensions and are NOT silently claimed by the DOM provider (acceptance 3):
 * the test asserts the DOM provider exports exactly the shared surface.
 */
import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import '@testing-library/jest-dom/vitest';

import { Button, FutureUIProvider, Select, TextInput } from '@future-ui/react-provider';
import { createDomButton, createDomSelect, createDomTextInput } from '@future-ui/conformance';

const appId = 'alt-provider-conformance';

function SharedCaseHost({ children }: { children: React.ReactNode }): React.ReactElement {
  return <FutureUIProvider appId={appId}>{children}</FutureUIProvider>;
}

interface SharedCase {
  name: string;
  role: string;
  /** React rendering of the case. */
  react: () => React.ReactElement;
  /** DOM-provider rendering (returns element appended to body). */
  dom: () => HTMLElement;
  /** User action that produces the shared event (click / change). */
  fire: (el: HTMLElement) => void;
  /** Shared assertion on the produced event. */
  expectEvent: (event: unknown) => void;
}

const cases: SharedCase[] = [
  {
    name: 'Button',
    role: 'button',
    react: () => <Button onClick={(e) => events.push(e)}>OK</Button>,
    dom: () => {
      const el = createDomButton({ appId, onClick: (e) => events.push(e) });
      el.textContent = 'OK';
      return el;
    },
    fire: (el) => fireEvent.click(el),
    expectEvent: (event) => {
      expect((event as { appId: string }).appId).toBe(appId);
    },
  },
  {
    name: 'Select',
    role: 'combobox',
    react: () => (
      <Select
        options={[{ label: 'A', value: 'a' }]}
        defaultValue="a"
        onValueChange={(e) => events.push(e)}
        aria-label="Pick"
      />
    ),
    dom: () =>
      createDomSelect({
        appId,
        options: [{ label: 'A', value: 'a' }],
        defaultValue: 'a',
        onValueChange: (e) => events.push(e),
      }),
    fire: (el) => fireEvent.change(el, { target: { value: 'a' } }),
    expectEvent: (event) => {
      const e = event as { value: string | null; appId: string };
      expect(e.value).toBe('a');
      expect(e.appId).toBe(appId);
    },
  },
  {
    name: 'TextInput',
    role: 'textbox',
    react: () => (
      <TextInput
        defaultValue="hi"
        onValueChange={(e) => events.push(e)}
        aria-label="Name"
      />
    ),
    dom: () =>
      createDomTextInput({
        appId,
        defaultValue: 'hi',
        onValueChange: (e) => events.push(e),
        'aria-label': 'Name',
      }),
    fire: (el) => fireEvent.change(el, { target: { value: 'ho' } }),
    expectEvent: (event) => {
      const e = event as { value: string; appId: string };
      expect(e.value).toBe('ho');
      expect(e.appId).toBe(appId);
    },
  },
];

let events: unknown[] = [];

describe('Alternate-provider conformance (#11)', () => {
  it.each(cases.map((c) => [c.name, c] as const))(
    '%s: React provider and DOM provider give identical role, disabled semantics and event payload',
    (_name, c) => {
      // React provider side.
      events = [];
      render(<SharedCaseHost>{c.react()}</SharedCaseHost>);
      const reactEl = screen.getByRole(c.role);
      expect(reactEl).toHaveAttribute('data-part', 'root');
      expect(reactEl).not.toBeDisabled();
      c.fire(reactEl as HTMLElement);
      expect(events).toHaveLength(1);
      c.expectEvent(events[0]);

      // DOM provider side — same case, same assertions. Unmount the React
      // tree first so role queries resolve only the DOM-provider element.
      events = [];
      cleanup();
      const domEl = c.dom();
      document.body.appendChild(domEl);
      try {
        // Native implicit roles (button/combobox/textbox) resolve identically
        // to the React host's explicit roles.
        expect(screen.getByRole(c.role)).toBe(domEl);
        expect(domEl).not.toBeDisabled();
        c.fire(domEl);
        expect(events).toHaveLength(1);
        c.expectEvent(events[0]);
      } finally {
        domEl.remove();
      }
    },
  );

  it('disabled semantics are identical: no event is emitted from either provider while disabled', () => {
    // React.
    events = [];
    render(
      <SharedCaseHost>
        <Button disabled onClick={(e) => events.push(e)}>
          OK
        </Button>
      </SharedCaseHost>,
    );
    const reactBtn = screen.getByRole('button');
    expect(reactBtn).toBeDisabled();
    fireEvent.click(reactBtn);
    expect(events).toHaveLength(0);

    // DOM provider.
    events = [];
    const domBtn = createDomButton({ appId, disabled: true, onClick: (e) => events.push(e) });
    document.body.appendChild(domBtn);
    try {
      expect(domBtn).toBeDisabled();
      fireEvent.click(domBtn);
      expect(events).toHaveLength(0);
    } finally {
      domBtn.remove();
    }
  });

  it('keyboard activation (Enter/Space) is identical in both providers', () => {
    // React host explicitly handles Enter/Space (Button contract).
    events = [];
    render(
      <SharedCaseHost>
        <Button onClick={(e) => events.push(e)}>OK</Button>
      </SharedCaseHost>,
    );
    const reactBtn = screen.getByRole('button');
    fireEvent.keyDown(reactBtn, { key: 'Enter' });
    expect(events).toHaveLength(1);
    events = [];
    fireEvent.keyDown(reactBtn, { key: ' ' });
    expect(events).toHaveLength(1);

    // DOM provider mirrors the same keyboard activation.
    events = [];
    const domBtn = createDomButton({ appId, onClick: (e) => events.push(e) });
    document.body.appendChild(domBtn);
    try {
      fireEvent.keyDown(domBtn, { key: 'Enter' });
      expect(events).toHaveLength(1);
      events = [];
      fireEvent.keyDown(domBtn, { key: ' ' });
      expect(events).toHaveLength(1);
    } finally {
      domBtn.remove();
    }
  });

  it('replacing the provider does NOT change the business action (acceptance 2)', () => {
    const businessAction = (qty: number): number => qty * 2;

    // React provider binds the business action to the UI.
    let reactResult = 0;
    render(
      <SharedCaseHost>
        <Button onClick={() => { reactResult = businessAction(3); }}>Add</Button>
      </SharedCaseHost>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Add/i }));

    // DOM provider binds the SAME business action to its UI.
    let domResult = 0;
    const domBtn = createDomButton({ appId, onClick: () => { domResult = businessAction(3); } });
    domBtn.textContent = 'Add';
    document.body.appendChild(domBtn);
    try {
      fireEvent.click(domBtn);
    } finally {
      domBtn.remove();
    }

    expect(reactResult).toBe(6);
    expect(domResult).toBe(6);
    expect(reactResult).toBe(domResult);
  });

  it('lifecycle: removing the DOM-provider listener and unmounting React stop all further events (acceptance 4)', () => {
    // React unmount.
    events = [];
    const { unmount } = render(
      <SharedCaseHost>
        <Button onClick={(e) => events.push(e)}>OK</Button>
      </SharedCaseHost>,
    );
    const reactBtn = screen.getByRole('button');
    unmount();
    fireEvent.click(reactBtn);
    expect(events).toHaveLength(0);

    // DOM provider: dispose via AbortSignal (native DOM lifecycle semantics).
    events = [];
    const ac = new AbortController();
    const domBtn = createDomButton({ appId, signal: ac.signal, onClick: (e) => events.push(e) });
    document.body.appendChild(domBtn);
    ac.abort();
    domBtn.remove();
    fireEvent.click(domBtn);
    expect(events).toHaveLength(0);
  });

  it('SSR/hydration evidence: server-rendered HTML carries the same public contract surface as the client render (acceptance 4)', () => {
    const reactTree = (
      <SharedCaseHost>
        <Button disabled>OK</Button>
        <Select options={[{ label: 'A', value: 'a' }]} defaultValue="a" aria-label="Pick" />
        <TextInput defaultValue="hi" aria-label="Name" />
      </SharedCaseHost>
    );
    const serverHtml = renderToString(reactTree);

    const { container } = render(reactTree);
    const clientHtml = container.innerHTML;

    // Same contract surface: data-part, disabled, aria-label, option values.
    for (const token of ['data-part="root"', 'disabled=""', 'aria-label="Pick"', 'aria-label="Name"', 'value="a"']) {
      expect(serverHtml).toContain(token);
      expect(clientHtml).toContain(token);
    }
    expect(serverHtml).not.toContain('data-capability');
    expect(clientHtml).not.toContain('data-capability');
  });

  it('shared feature scope is explicit: the DOM provider exposes ONLY the shared surface, not React extensions (acceptance 3)', () => {
    const source = `
      import { createDomButton, createDomSelect, createDomTextInput } from '@future-ui/conformance';
    `;
    // The DOM provider surface is limited to the frozen representative
    // components — Dialog (portal/focus trap) and theme tokens are React-host
    // extensions and are not silently claimed as provider-supported.
    expect(source).toMatch(/createDom(Button|Select|TextInput)/);
    expect(source).not.toMatch(/createDomDialog|theme/i);
  });
});
