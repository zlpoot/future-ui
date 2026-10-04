import { forwardRef, type ChangeEvent, type Ref } from 'react';
import type { JSX } from 'react';

import { useFutureUIContext } from './provider.js';

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectValueChangeEvent {
  /** The selected value (single); null when the placeholder empty-value option is chosen. */
  value: string | null;
  /** App scope identifier from the enclosing FutureUIProvider (D07 M0). */
  appId: string;
}

export interface SelectProps {
  /** Option collection; required (public contract `options`). */
  options: SelectOption[];
  /** Initially selected value; uncontrolled ownership (contract `defaultValue`). */
  defaultValue?: string | null;
  /** Fired on single-option selection. Never mapped to business effects. */
  onValueChange?: (event: SelectValueChangeEvent) => void;
  placeholder?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

/**
 * Select — stateful representative for the #26 portability comparison.
 * Public props are defined by `selectContract` (D04 scope 2). The root is a
 * native <select>: open/close popup and keyboard interaction are native
 * browser semantics (deterministic and portable across frameworks), and the
 * change path is fully testable in jsdom.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, defaultValue = null, onValueChange, placeholder = '', disabled = false, 'aria-label': ariaLabel }: SelectProps,
  ref: Ref<HTMLSelectElement>,
): JSX.Element {
  const { appId } = useFutureUIContext();
  const handleChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    if (disabled) return;
    const value = event.target.value;
    onValueChange?.({ value: value === '' ? null : value, appId });
  };
  return (
    <select
      ref={ref}
      defaultValue={defaultValue ?? ''}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={handleChange}
    >
      {placeholder !== '' && (
        <option value="">{placeholder}</option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
});
