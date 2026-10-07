/**
 * Phase D (#69) — deterministic jsdom evidence for the EditDialog reference.
 *
 * Renders the REAL @future-ui/shadcn-adapter EditDialog in jsdom and turns the
 * observed DOM/interactions into the layered evidence the bounded validator
 * consumes. Everything here is deterministic and controlled: no browser, no
 * network, no model. A rendered fact is observed, never assumed from metadata.
 */
import * as React from 'react';
import { act } from '@testing-library/react';
import { createRoot, type Root } from 'react-dom/client';
import { EditDialog } from '@future-ui/shadcn-adapter';
import type { EditDialogField, EditDialogOpenChangeDetail } from '@future-ui/shadcn-adapter';
import type { InteractionEvidence, RenderedEvidence } from '@future-ui/ai-contract-core';

const FIELDS: EditDialogField[] = [
  { name: 'displayName', label: '名称', type: 'text', defaultValue: '' },
  // a sensitive field — its draft value must never be projected
  { name: 'ssn', label: '证件号', type: 'password', defaultValue: '', autoComplete: 'off' },
];

/** Close controls the bounded R1-DLG-02 rule looks for, as observed paths. */
function observedCloseAffordances(scope: ParentNode): string[] {
  const out: string[] = [];
  if (scope.querySelector('[data-slot="dialog-close"]')) out.push('/dialog[0]/[data-slot=dialog-close]');
  if (scope.querySelector('[data-testid="edit-dialog-cancel"]')) out.push('/dialog[0]/button[edit-dialog-cancel]');
  if (scope.querySelector('[data-testid="edit-dialog-discard"]')) out.push('/dialog[0]/button[edit-dialog-discard]');
  return out;
}

/**
 * Read rendered evidence for the currently mounted dialog. Radix renders
 * DialogContent through a portal on document.body (not under the React root
 * container), so the whole document is inspected.
 */
export function collectRenderedEvidence(scope: ParentNode = document.body): RenderedEvidence {
  const dialog = scope.querySelector('[role="dialog"]');
  return {
    role: dialog?.getAttribute('role') ?? undefined,
    ariaModal: dialog?.getAttribute('aria-modal') === 'true' ? true : undefined,
    closeAffordances: observedCloseAffordances(scope),
    rootPath: '/dialog[0]',
  };
}

export interface RenderedDialogHandle {
  container: HTMLElement;
  unmount: () => void;
}

interface MountState {
  open: boolean;
  blocking: boolean;
  onSave: (values: Record<string, string>) => Promise<void> | void;
}

/** Mount the real EditDialog in jsdom with explicit controls. */
export function mountEditDialog(
  initial: {
    blocking?: boolean;
    onSave?: (values: Record<string, string>) => Promise<void> | void;
  } = {},
): RenderedDialogHandle & {
  closeEvents: EditDialogOpenChangeDetail[];
  rerender: (patch: Partial<MountState>) => void;
} {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  const closeEvents: EditDialogOpenChangeDetail[] = [];
  const state: MountState = {
    open: true,
    blocking: initial.blocking ?? false,
    onSave: initial.onSave ?? (() => undefined),
  };

  const draw = (): void => {
    root.render(
      <EditDialog
        open={state.open}
        blocking={state.blocking}
        label="编辑成员"
        description="维护成员资料"
        fields={FIELDS}
        onSave={state.onSave}
        onOpenChange={(detail) => {
          closeEvents.push(detail);
          if (!detail.open) state.open = false;
          draw();
        }}
      />,
    );
  };
  act(() => {
    draw();
  });

  return {
    container,
    closeEvents,
    rerender: (patch) => {
      Object.assign(state, patch);
      act(() => {
        draw();
      });
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

function flush(): Promise<void> {
  return act(async () => {
    await Promise.resolve();
  });
}

/**
 * Drives the pending lifecycle of the REAL EditDialog and observes:
 *  - R1-DLG-04: a second save click while pending does not re-invoke onSave;
 *  - R1-DLG-05: "stop waiting and close" closes once, and when the in-flight
 *    save later settles (after a quick reopen into a new generation) it does
 *    NOT emit a second close and cannot close the reopened dialog.
 */
export async function drivePendingInteraction(): Promise<
  InteractionEvidence & { reopenGenerationSafe: boolean; closeReasons: string[] }
> {
  let resolveSave: (() => void) | null = null;
  let saveCalls = 0;

  const handle = mountEditDialog({
    onSave: () => {
      saveCalls += 1;
      return new Promise<void>((resolve) => {
        resolveSave = resolve;
      });
    },
  });

  try {
    const saveBtn = (): HTMLButtonElement =>
      document.body.querySelector('[data-testid="edit-dialog-save"]') as HTMLButtonElement;

    // First save → pending.
    act(() => {
      saveBtn().click();
    });
    // Second save while pending must be a no-op (R1-DLG-04).
    act(() => {
      saveBtn().click();
    });
    const pendingDuplicateSubmitBlocked = saveCalls === 1;

    // Request cancel while pending → explicit confirm (no silent close).
    const cancelBtn = document.body.querySelector('[data-testid="edit-dialog-cancel"]') as HTMLButtonElement;
    act(() => {
      cancelBtn.click();
    });
    const confirm = document.body.querySelector('[data-testid="edit-dialog-pending-confirm"]');
    if (confirm === null) throw new Error('pending close confirmation was not rendered');

    // Stop waiting and close.
    const stopBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('停止等待并关闭'),
    ) as HTMLButtonElement;
    act(() => {
      stopBtn.click();
    });
    const closesAfterStopWait = handle.closeEvents.length;
    if (handle.closeEvents.at(-1)?.reason !== 'pending-confirm') {
      throw new Error('expected a single pending-confirm close event');
    }

    // Quickly REOPEN into a fresh dialog generation before the save settles.
    handle.rerender({ open: true });
    const reopenDialogPresent = document.body.querySelector('[role="dialog"]') !== null;

    // The detached generation's save now settles successfully.
    await act(async () => {
      resolveSave?.();
      await Promise.resolve();
    });
    await flush();

    const noSecondClose = handle.closeEvents.length === closesAfterStopWait;
    const dialogStillOpen = document.body.querySelector('[role="dialog"]') !== null;

    return {
      pendingDuplicateSubmitBlocked,
      stopWaitNoSecondClose: noSecondClose,
      reopenGenerationSafe: reopenDialogPresent && dialogStillOpen && noSecondClose,
      closeReasons: handle.closeEvents.map((e) => e.reason),
    };
  } finally {
    handle.unmount();
  }
}
