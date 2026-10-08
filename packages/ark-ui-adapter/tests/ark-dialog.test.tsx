// @vitest-environment jsdom
import './setup.js';

import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { ArkDialog } from '../src/index.js';

function Harness({
  open,
  onOpenChange,
  description = 'This action cannot be undone.',
}: {
  open: boolean;
  onOpenChange?: (e: { open: boolean }) => void;
  description?: string;
}) {
  return (
    <ArkDialog open={open} label="Confirm" description={description} onOpenChange={onOpenChange}>
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
});

describe('ArkDialog — interaction-verified', () => {
  it('focus enters the dialog on open and lands on the FIRST focusable part (via real initialFocusEl)', async () => {
    render(<Harness open />);
    const accept = await screen.findByRole('button', { name: 'Accept' });
    await waitFor(() => expect(accept).toHaveFocus());
  });

  it('Escape requests close via onOpenChange({open:false}) only from a user gesture', async () => {
    const onOpenChange = vi.fn();
    render(<Harness open onOpenChange={onOpenChange} />);
    await screen.findByRole('dialog');
    // zag registers the dismissable layer and focus trap on deferred micro/
    // animation frames; let the layer become top-most before dismissing.
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    // zag listens for Escape at document level (capture) while the modal is open.
    await act(async () => {
      fireEvent.keyDown(document, { key: 'Escape' });
      // The dismiss→machine-send→controlled React update flushes on deferred
      // frames; stay inside act so no state update leaks past the gesture.
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
    });
    // The controlled onOpenChange is emitted via the zag machine's subscriber
    // flush, so wait for it rather than asserting synchronously.
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledTimes(1));
    expect(onOpenChange.mock.calls[0][0]).toMatchObject({ open: false });
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
