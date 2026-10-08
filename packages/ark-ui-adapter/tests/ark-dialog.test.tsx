// @vitest-environment jsdom
import './setup.js';

import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { ArkDialog } from '../src/index.js';

/**
 * Pump the finite micro/raf/timer chain zag defers its machine + focus-layer
 * effects onto. jsdom has no layout engine, and under parallel worker load the
 * exact frame count can drift, so teardown drains a few frames rather than
 * asserting on a fixed single raf.
 */
async function drainDeferred(frames = 4): Promise<void> {
  for (let i = 0; i < frames; i += 1) {
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
}

function Harness({
  open,
  onOpenChange,
  description = 'This action cannot be undone.',
  closeLabel,
}: {
  open: boolean;
  onOpenChange?: (e: { open: boolean }) => void;
  description?: string;
  closeLabel?: string;
}) {
  return (
    <ArkDialog open={open} label="Confirm" description={description} closeLabel={closeLabel} onOpenChange={onOpenChange}>
      <button>Accept</button>
    </ArkDialog>
  );
}

describe('ArkDialog — real @ark-ui/react Dialog rendering (rendered evidence)', () => {
  it('renders nothing while open=false (no dialog surface)', () => {
    render(<Harness open={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('open: role=dialog + aria-modal + accessible name/description wiring', async () => {
    render(<Harness open />);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const labelledBy = dialog.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    expect(document.getElementById(labelledBy as string)?.textContent).toBe('Confirm');
    const describedBy = dialog.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)?.textContent).toBe('This action cannot be undone.');
  });

  it('uses a real Ark/zag surface (data-scope=dialog + generated ids + positioner part), not a hand-rolled div', async () => {
    render(<Harness open />);
    const dialog = await screen.findByRole('dialog');
    // Ark/zag machine markers prove the surface is produced by the real primitive.
    expect(dialog).toHaveAttribute('data-scope', 'dialog');
    expect(dialog.id).toMatch(/^dialog:/);
    expect(document.querySelector('[data-part="positioner"][data-scope="dialog"]')).toBeTruthy();
    // Verified Ark 5.39.3 behavior: Positioner renders inline (no Portal wrapper
    // is used by this adapter), so the surface stays inside the render container.
    expect(dialog.closest('[data-part="positioner"]')).toBeTruthy();
  });

  it('renders NO explicit close affordance when closeLabel is omitted (nothing invented)', async () => {
    render(<Harness open />);
    await screen.findByRole('dialog');
    expect(document.querySelector('[data-part="close-trigger"]')).toBeNull();
    expect(screen.queryByRole('button', { name: /close|dismiss/i })).toBeNull();
  });

  it('with closeLabel renders the REAL Ark Dialog.CloseTrigger (zag button, not a hand-rolled handler)', async () => {
    render(<Harness open closeLabel="Close dialog" />);
    await screen.findByRole('dialog');
    const trigger = screen.getByRole('button', { name: 'Close dialog' });
    // Verified 5.39.3 surface: DialogCloseTrigger renders ark.button with
    // getCloseTriggerProps() => data-part="close-trigger", type="button".
    expect(trigger).toHaveAttribute('data-part', 'close-trigger');
    expect(trigger).toHaveAttribute('data-scope', 'dialog');
    expect(trigger).toHaveAttribute('type', 'button');
    // Placed after the body, so the primary control remains the first tabbable.
    expect(screen.getByRole('button', { name: 'Accept' }).compareDocumentPosition(trigger)
      & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('ArkDialog — interaction-verified', () => {
  it('focus enters the dialog on open and lands on the FIRST focusable part (via real initialFocusEl)', async () => {
    render(<Harness open />);
    const accept = await screen.findByRole('button', { name: 'Accept' });
    await waitFor(() => expect(accept).toHaveFocus());
  });

  it('Escape requests close via onOpenChange({open:false}) only from a user gesture', async () => {
    const onOpenChange = vi.fn();
    const { unmount } = render(<Harness open onOpenChange={onOpenChange} />);
    await screen.findByRole('dialog');
    // Entire close lifecycle (deferred dismiss layer, machine transition, focus
    // trap deactivation/restore, and the chained raf it schedules) is flushed in
    // ONE act, then the tree is unmounted INSIDE that same act so no late
    // DialogRoot frame can land in an act-free gap (jsdom is layout-free and,
    // under parallel worker load, frame counts drift).
    await act(async () => {
      // Let the dismissable layer become top-most.
      await drainDeferred();
      // zag listens for Escape at document level (capture) while modal.
      fireEvent.keyDown(document, { key: 'Escape' });
      await drainDeferred(6);
      expect(onOpenChange).toHaveBeenCalledTimes(1);
      expect(onOpenChange.mock.calls[0][0]).toMatchObject({ open: false });
      unmount();
      await drainDeferred(3);
    });
  });

  it('clicking the explicit Ark CloseTrigger requests close via onOpenChange({open:false})', async () => {
    const onOpenChange = vi.fn();
    // Ark keeps the surface mounted by default and only flips data-state to
    // "closed", so (like the Escape case) the host stays controlled-open and
    // the user-dismiss contract is proven via the onOpenChange payload.
    const { unmount } = render(<Harness open closeLabel="Close dialog" onOpenChange={onOpenChange} />);
    const trigger = await screen.findByRole('button', { name: 'Close dialog' });
    await act(async () => {
      await drainDeferred();
      // Real Ark DialogCloseTrigger: getCloseTriggerProps() sends CLOSE.
      fireEvent.click(trigger);
      await drainDeferred(6);
      expect(onOpenChange).toHaveBeenCalledTimes(1);
      expect(onOpenChange.mock.calls[0][0]).toMatchObject({ open: false });
      unmount();
      await drainDeferred(3);
    });
  });

  it('programmatic open transitions never fire onOpenChange (host owns open)', async () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(<Harness open={false} onOpenChange={onOpenChange} />);
    rerender(<Harness open onOpenChange={onOpenChange} />);
    await screen.findByRole('dialog');
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('unmount removes the surface (no dialog left, no throw)', async () => {
    const onOpenChange = vi.fn();
    const { unmount } = render(<Harness open onOpenChange={onOpenChange} />);
    await screen.findByRole('dialog');
    unmount();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('ArkDialog — zero business binding (UI-only)', () => {
  it('never emits data-capability / data-agent / data-binding / data-model hooks', async () => {
    render(<Harness open />);
    await screen.findByRole('dialog');
    expect(document.querySelector('[data-capability]')).toBeNull();
    expect(document.querySelector('[data-agent]')).toBeNull();
    expect(document.querySelector('[data-binding]')).toBeNull();
    expect(document.querySelector('[data-model]')).toBeNull();
  });
});
