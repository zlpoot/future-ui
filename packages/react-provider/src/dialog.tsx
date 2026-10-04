import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react';
import type { JSX } from 'react';

import { useFutureUIContext } from './provider.js';

export interface DialogOpenChangeEvent {
  /** The requested next open value (false on Escape / close affordance). */
  open: boolean;
  /** App scope identifier from the enclosing FutureUIProvider (D07 M0). */
  appId: string;
}

export interface DialogProps {
  /** Controlled open state; the host owns it. */
  open?: boolean;
  /** Accessible name source; mapped to aria-labelledby when a title is rendered. */
  label?: string;
  /** Accessible description; mapped to aria-describedby on the content part. */
  description?: string;
  /** Fired when the user requests a state change (Escape/close). Never fired by programmatic open changes. */
  onOpenChange?: (event: DialogOpenChangeEvent) => void;
  children?: ReactNode;
}

const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Dialog — focus lifecycle per contract (#19).
 *
 * - open is controlled by the host (`props.open`); the dialog never opens
 *   itself.
 * - On open: focus moves to the first focusable part inside the dialog and a
 *   keydown listener handles Escape → `onOpenChange({open:false})`.
 * - On close/unmount: focus returns to the previously focused element and all
 *   listeners are cleaned up (requiresCleanup=true).
 * - Accessible name via the title part (aria-labelledby) or aria-label;
 *   description via aria-describedby on the content part.
 * - Pure UI component: no business capability auto-binding (host decides what
 *   happens on open/close).
 */
export const Dialog = forwardRef<HTMLDivElement, DialogProps>(function Dialog(
  { open = false, label, description = '', onOpenChange, children }: DialogProps,
  ref: Ref<HTMLDivElement>,
): JSX.Element {
  const { appId } = useFutureUIContext();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<Element | null>(null);
  const titleId = useId();
  const contentId = useId();

  const handleClose = useCallback(
    (reason: string): void => {
      onOpenChange?.({ open: false, appId });
      void reason;
    },
    [onOpenChange, appId],
  );

  useEffect(() => {
    if (!open) return;
    const root = rootRef.current;
    if (!root) return;

    // Remember what had focus so we can restore it on close (focus return).
    if (triggerRef.current === null) {
      triggerRef.current = document.activeElement;
    }

    const focusables = [...root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)];
    const first = focusables[0];
    if (first) {
      first.focus();
    } else {
      root.setAttribute('tabindex', '-1');
      root.focus();
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        handleClose('escape');
      }
    };
    document.addEventListener('keydown', onKeyDown as unknown as EventListener);

    return () => {
      document.removeEventListener('keydown', onKeyDown as unknown as EventListener);
      // On close/unmount: restore focus to the trigger (focus return), then
      // release the reference so a later reopen records a fresh trigger.
      const trigger = triggerRef.current;
      triggerRef.current = null;
      if (trigger instanceof HTMLElement) trigger.focus();
    };
  }, [open, handleClose]);

  if (!open) return <></>;

  return (
    <div
      ref={(node) => {
        rootRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={label !== '' ? titleId : undefined}
      aria-describedby={description !== '' ? contentId : undefined}
    >
      {label !== '' && (
        <h2 id={titleId} className="future-ui-dialog-title">
          {label}
        </h2>
      )}
      <div id={contentId} className="future-ui-dialog-content">
        {children}
      </div>
    </div>
  );
});
