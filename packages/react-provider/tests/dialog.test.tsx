// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import {
  Dialog,
  FutureUIProvider,
  dialogContract,
  validateDialogContract,
} from '@future-ui/react-provider';

const appId = 'dialog-app';

function FocusButton({ onOpenChange, open = true }: { onOpenChange?: (e: { open: boolean; appId: string }) => void; open?: boolean }) {
  return (
    <FutureUIProvider appId={appId}>
      <button>Trigger</button>
      <Dialog open={open} label="Confirm" description="This action cannot be undone." onOpenChange={onOpenChange}>
        <button>Accept</button>
        <button>Cancel</button>
      </Dialog>
    </FutureUIProvider>
  );
}

describe('Dialog contract (#19)', () => {
  it('contract is structurally valid and requires cleanup', () => {
    expect(validateDialogContract()).toEqual([]);
    expect(dialogContract.componentType).toBe('future-ui.dialog');
    expect(dialogContract.lifecycle.requiresCleanup).toBe(true);
  });

  it('closed by default: no dialog surface is rendered when open is false', () => {
    render(<FocusButton open={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('open renders a role=dialog surface with aria-modal and accessible name/description', () => {
    render(<FocusButton />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    // Accessible name from the title part via aria-labelledby.
    const labelledBy = dialog.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    expect(document.getElementById(labelledBy as string)?.textContent).toBe('Confirm');
    // Accessible description via aria-describedby on the content part.
    const describedBy = dialog.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)).toBeTruthy();
  });

  it('focus enters the dialog on open (first focusable part)', () => {
    render(<FocusButton />);
    // The first focusable inside the dialog is the Accept button.
    expect(screen.getByRole('button', { name: 'Accept' })).toHaveFocus();
  });

  it('Escape requests close via onOpenChange({open:false})', () => {
    const onOpenChange = vi.fn();
    render(<FocusButton onOpenChange={onOpenChange} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange.mock.calls[0][0]).toMatchObject({ open: false, appId });
  });

  it('focus returns to the previously focused element on close (focus restore)', () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <FutureUIProvider appId={appId}>
        <button id="trigger">Trigger</button>
        <Dialog open={false} label="Confirm" onOpenChange={onOpenChange} />
      </FutureUIProvider>,
    );
    const trigger = document.getElementById('trigger') as HTMLButtonElement;
    trigger.focus();
    rerender(
      <FutureUIProvider appId={appId}>
        <button id="trigger">Trigger</button>
        <Dialog open label="Confirm" onOpenChange={onOpenChange}>
          <button>Accept</button>
        </Dialog>
      </FutureUIProvider>,
    );
    expect(screen.getByRole('button', { name: 'Accept' })).toHaveFocus();
    // Close: focus must return to the trigger.
    rerender(
      <FutureUIProvider appId={appId}>
        <button id="trigger">Trigger</button>
        <Dialog open={false} label="Confirm" onOpenChange={onOpenChange}>
          <button>Accept</button>
        </Dialog>
      </FutureUIProvider>,
    );
    expect(document.getElementById('trigger')).toHaveFocus();
  });

  it('unmount while open releases listeners and focus resources (no leaks)', () => {
    const onOpenChange = vi.fn();
    const { unmount } = render(
      <FutureUIProvider appId={appId}>
        <button id="t">Trigger</button>
        <Dialog open label="Confirm" onOpenChange={onOpenChange}>
          <button>Accept</button>
        </Dialog>
      </FutureUIProvider>,
    );
    unmount();
    // After unmount, a stray Escape must not call onOpenChange (listener removed).
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('programmatic open changes never fire openChange (host owns the open prop)', () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(<FocusButton onOpenChange={onOpenChange} open={false} />);
    rerender(<FocusButton onOpenChange={onOpenChange} open />);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('theme absence does not change structure/behavior semantics', () => {
    render(<FocusButton />);
    const dialog = screen.getByRole('dialog');
    // Structure is stable without any theme tokens applied.
    expect(dialog.querySelector('.future-ui-dialog-title')).toBeTruthy();
    expect(dialog.querySelector('.future-ui-dialog-content')).toBeTruthy();
    expect(dialog.getAttribute('role')).toBe('dialog');
  });

  it('never auto-binds business capabilities (host decides what happens on open/close)', () => {
    const { container } = render(<FocusButton />);
    // No data-capability wiring, no effect nodes.
    expect(container.querySelector('[data-capability]')).toBeNull();
    expect(dialogContract.events.openChange.description).not.toMatch(/business|effect|confirm/i);
  });
});
