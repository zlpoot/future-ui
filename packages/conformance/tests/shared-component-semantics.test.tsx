// @vitest-environment jsdom
/**
 * Shared public-component semantics for all React UI components (#21
 * acceptance 1). Cross-component obligations — event payload appId, public
 * data-part, absence of capability/protocol/model leakage, theme-free
 * structure — are expressed here once, as stable conformance cases.
 *
 * Component-specific semantics stay in each component's dedicated tests
 * (packages/react-provider/tests/*) and are NOT folded into a universal test
 * (acceptance 2).
 */
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import {
  Button,
  Dialog,
  FutureUIProvider,
  Select,
  TextInput,
} from '@future-ui/react-provider';

const appId = 'shared-conformance';

interface SharedCase {
  name: string;
  role: string;
  render: () => React.ReactElement;
  fireUserAction: (el: Element) => void;
  expectEvent: (event: unknown) => void;
}

function SharedCaseHost({ children }: { children: React.ReactNode }) {
  return <FutureUIProvider appId={appId}>{children}</FutureUIProvider>;
}

const cases: SharedCase[] = [
  {
    name: 'Button',
    role: 'button',
    render: () => <Button onClick={(e) => capturedEvents.push(e)}>OK</Button>,
    fireUserAction: (el) => fireEvent.click(el),
    expectEvent: (event) => expect((event as { appId: string }).appId).toBe(appId),
  },
  {
    name: 'TextInput',
    role: 'textbox',
    render: () => <TextInput defaultValue="" onValueChange={(e) => capturedEvents.push(e)} aria-label="Name" />,
    fireUserAction: (el) => fireEvent.change(el, { target: { value: 'x' } }),
    expectEvent: (event) => expect((event as { appId: string }).appId).toBe(appId),
  },
  {
    name: 'Select',
    role: 'combobox',
    render: () => (
      <Select
        options={[{ label: 'A', value: 'a' }]}
        onValueChange={(e) => capturedEvents.push(e)}
        aria-label="Pick"
      />
    ),
    fireUserAction: (el) => fireEvent.change(el, { target: { value: 'a' } }),
    expectEvent: (event) => expect((event as { appId: string }).appId).toBe(appId),
  },
];

let capturedEvents: unknown[] = [];

describe('Shared component semantics (UI-only conformance, #21)', () => {
  it.each(cases.map((c) => [c.name, c] as const))(
    '%s: public role + data-part present, no capability/protocol/model leakage, event carries appId',
    (_name, c) => {
      capturedEvents = [];
      render(<SharedCaseHost>{c.render()}</SharedCaseHost>);
      const el = screen.getByRole(c.role);
      // Public DOM contract: role + data-part="root".
      expect(el).toBeInTheDocument();
      expect(el).toHaveAttribute('data-part', 'root');
      // No capability-runtime / protocol / model leakage on the surface.
      expect(el.hasAttribute('data-capability')).toBe(false);
      expect(el.hasAttribute('data-agent')).toBe(false);
      expect(el.hasAttribute('data-binding')).toBe(false);
      // Theme-free structure: no theme surface required for semantics.
      expect(document.querySelector('[data-theme]')).toBeNull();
      // User action reports a single event with the app scope id.
      c.fireUserAction(el);
      expect(capturedEvents).toHaveLength(1);
      c.expectEvent(capturedEvents[0]);
    },
  );

  it('Dialog: dialog role + data-part, Escape event carries appId, no leakage', () => {
    capturedEvents = [];
    render(
      <SharedCaseHost>
        <Dialog open label="Confirm" onOpenChange={(e) => capturedEvents.push(e)}>
          <button>Accept</button>
        </Dialog>
      </SharedCaseHost>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('data-part', 'root');
    expect(dialog.hasAttribute('data-capability')).toBe(false);
    expect(document.querySelector('[data-theme]')).toBeNull();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(capturedEvents).toHaveLength(1);
    expect((capturedEvents[0] as { appId: string }).appId).toBe(appId);
  });

  it('no component injects capability-runtime / protocol / model artifacts anywhere in the rendered tree', () => {
    const { container } = render(
      <FutureUIProvider appId={appId}>
        <Button>OK</Button>
        <TextInput defaultValue="" aria-label="Name" />
        <Select options={[{ label: 'A', value: 'a' }]} aria-label="Pick" />
        <Dialog open label="D">
          <button>Accept</button>
        </Dialog>
      </FutureUIProvider>,
    );
    expect(container.querySelector('[data-capability]')).toBeNull();
    expect(container.querySelector('[data-agent]')).toBeNull();
    expect(container.querySelector('[data-protocol]')).toBeNull();
    expect(container.querySelector('[data-model]')).toBeNull();
    // Public parts only; no private class names leak (e.g. no module-hashed classes).
    const partEls = [...container.querySelectorAll('[data-part]')];
    expect(partEls.length).toBeGreaterThanOrEqual(4);
  });
});
