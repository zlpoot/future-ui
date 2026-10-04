import { forwardRef, type KeyboardEvent, type MouseEvent, type ReactNode, type Ref } from 'react';
import type { JSX } from 'react';

import { useFutureUIContext } from './provider.js';

export interface ButtonClickEvent {
  /** Underlying activation event (pointer or keyboard). */
  originalEvent: MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLButtonElement>;
  /** App scope identifier from the enclosing FutureUIProvider (D07 M0). */
  appId: string;
}

export interface ButtonProps {
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: (event: ButtonClickEvent) => void;
  children?: ReactNode;
  'aria-label'?: string;
}

/**
 * First future-ui contract consumer. Public props are defined by
 * `buttonContract` (D04 scope 2). The root is a native <button>: keyboard
 * activation (Enter/Space) is part of the Button contract and is handled
 * explicitly, so it is deterministic across DOM environments and never
 * depends on browser default behavior for correctness.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { disabled = false, loading = false, type = 'button', onClick, children, 'aria-label': ariaLabel }: ButtonProps,
  ref: Ref<HTMLButtonElement>,
): JSX.Element {
  const { appId } = useFutureUIContext();
  const inactive = disabled || loading;
  return (
    <button
      ref={ref}
      type={type}
      data-part="root"
      disabled={inactive}
      aria-busy={loading ? true : undefined}
      aria-label={ariaLabel}
      onClick={(event) => {
        if (inactive) return;
        onClick?.({ originalEvent: event, appId });
      }}
      onKeyDown={(event) => {
        if (inactive) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick?.({ originalEvent: event, appId });
        }
      }}
    >
      {children}
    </button>
  );
});
