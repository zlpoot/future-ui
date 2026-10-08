import {
  DialogContent,
  DialogDescription,
  DialogPositioner,
  DialogRoot,
  DialogTitle,
} from '@ark-ui/react/dialog';
import type { ReactNode } from 'react';

/**
 * Phase C isolated consumer: Dialog realized by the REAL @ark-ui/react Dialog
 * primitive (Dialog.Root/Positioner/Content/Title/Description over the zag
 * dialog machine). This is a thin adapter — it does not reimplement focus
 * trap, Escape handling or aria wiring, and it never binds a business action.
 *
 * Deliberate composition (honestly recorded in the mapping):
 *  - `label` is rendered as Dialog.Title so the accessible name is sourced via
 *    zag's auto aria-labelledby (contract accessibleName feature).
 *  - `description` is rendered as Dialog.Description (auto aria-describedby).
 *  - aria-modal="true" is pinned on Content to guarantee the parts.root
 *    contract deterministically (zag already emits role="dialog").
 *  - Initial focus uses zag's DEFAULT behaviour: getInitialFocus() picks the
 *    first tabbable descendant of Content, which is exactly the frozen
 *    contract control.focus ("first focusable part"). No custom initialFocusEl
 *    is supplied. (jsdom has no layout engine, so the package test setup
 *    shims element visibility; in a real browser the first control is focused
 *    by zag directly.)
 *  - open is controlled by the host; openChange only forwards user dismiss.
 */
export interface ArkDialogProps {
  open: boolean;
  label: string;
  description?: string;
  children?: ReactNode;
  /** Fired only on a USER request to change open state (never on programmatic open). */
  onOpenChange?: (event: { open: boolean }) => void;
}

export function ArkDialog({ open, label, description, children, onOpenChange }: ArkDialogProps) {
  return (
    <DialogRoot
      open={open}
      onOpenChange={(details) => onOpenChange?.({ open: details.open })}
    >
      <DialogPositioner>
        <DialogContent
          // Pinned to satisfy the frozen parts.root (role=dialog, aria-modal=true).
          aria-modal="true"
          data-part="root"
        >
          {label ? <DialogTitle data-part="title">{label}</DialogTitle> : null}
          {description ? (
            <DialogDescription data-part="content-description">{description}</DialogDescription>
          ) : null}
          <div data-part="content">{children}</div>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  );
}
