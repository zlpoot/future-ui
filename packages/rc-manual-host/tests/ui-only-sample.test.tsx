// @vitest-environment jsdom
/**
 * R1-RC-001 (#86) — UI-only sample renders and interacts in jsdom with zero
 * business tools. The test harness uses jsdom/@testing-library, but the SAMPLE
 * module (ui-only-sample.tsx) must not — that boundary is enforced by
 * ui-only-import-graph.test.ts.
 *
 * NOTE: assertions deliberately use plain vitest matchers (toBeTruthy/toBeNull)
 * instead of @testing-library/jest-dom, so the package program stays on a
 * single vitest type instance without augmentation coupling.
 */
import '../../ark-ui-adapter/tests/setup.js';
import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { UiOnlySample } from '../src/index.js';

const LEAK_ATTRIBUTES = ['data-capability', 'data-agent', 'data-binding', 'data-model', 'data-mcp'];

/**
 * Pump the micro/raf/timer chain zag defers its machine effects onto (same
 * pattern as ark-ui-adapter tests). jsdom has no layout engine, so we drain a
 * few frames rather than assert on a single raf.
 */
async function drainDeferred(frames = 4): Promise<void> {
  for (let i = 0; i < frames; i += 1) {
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
}

describe('UI-only sample (jsdom)', () => {
  it('renders, registers entries and opens detail dialog with zero business tools', async () => {
    const { container } = render(<UiOnlySample />);
    expect(screen.getByText(/尚无登记条目/)).toBeTruthy();

    const nameInput = document.querySelector('#uio-name') as HTMLInputElement;
    const noteInput = Array.from(document.querySelectorAll('input')).find((i) => i.name === 'uio-note') as HTMLInputElement;
    act(() => {
      fireEvent.change(nameInput, { target: { value: '小明' } });
      fireEvent.change(noteInput, { target: { value: '第一条备注' } });
    });
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: '登记' }));
    });

    expect(screen.getByText(/小明/)).toBeTruthy();
    expect(screen.queryByText(/尚无登记条目/)).toBeNull();

    // Open the detail dialog through the local entry button.
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /#1 小明/ }));
    });
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText(/第一条备注/)).toBeTruthy();

    // Explicit close entry works. Ark keeps the surface mounted and only flips
    // data-state, so the host must observe onOpenChange({open:false}) and
    // unmount; drain the deferred machine chain like the ark-adapter tests.
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '关闭' }));
      await drainDeferred(4);
    });
    expect(screen.queryByRole('dialog')).toBeNull();

    // Zero capability/binding/agent/model/MCP leakage in the rendered DOM.
    for (const attr of LEAK_ATTRIBUTES) {
      expect(container.querySelector(`[${attr}]`)).toBeNull();
    }
  });

  it('does not fire business calls when callbacks are absent (adapters hold no registry)', () => {
    render(<UiOnlySample />);
    expect(() => fireEvent.click(screen.getByRole('button', { name: '登记' }))).not.toThrow();
    expect(() =>
      fireEvent.change(document.querySelector('#uio-name') as HTMLInputElement, { target: { value: 'x' } }),
    ).not.toThrow();
  });
});
