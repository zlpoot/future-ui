import type { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * Phase C isolated consumer for the Button contract.
 *
 * HONEST NATIVE COMPOSITION: @ark-ui/react@5.39.3 ships NO Button primitive
 * (verified: no dist/components/button and no @zag-js/button dependency). This
 * component is therefore a plain platform <button>, not an Ark export, and the
 * mapping labels `root` accordingly (via: native). It must not be mistaken for
 * an Ark-native component.
 *
 * `loading` is UNSUPPORTED as an upstream feature — Ark has no busy concept.
 * The only honest projection is the host's pending state onto the native
 * aria-busy attribute while suppressing activation; no spinner/state machine
 * is invented. `type` defaults to "button" to match the frozen contract
 * default (the raw native default is "submit" inside a form).
 */
export interface ArkButtonProps {
  disabled?: boolean;
  /** Host pending state; projected to aria-busy only — not an Ark loading feature. */
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  children?: ReactNode;
  onClick?: () => void;
}

export function ArkButton({
  disabled = false,
  loading = false,
  type = 'button',
  children,
  onClick,
}: ArkButtonProps) {
  const inactive = disabled || loading;
  const handleClick: ButtonHTMLAttributes<HTMLButtonElement>['onClick'] = () => {
    // Frozen contract: click is not fired while disabled or loading.
    if (inactive) return;
    onClick?.();
  };
  return (
    <button
      data-part="root"
      data-composition="native"
      type={type}
      disabled={disabled || undefined}
      aria-busy={loading ? true : undefined}
      onClick={handleClick}
    >
      {children}
    </button>
  );
}
