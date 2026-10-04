import { forwardRef, useId, useState, type ChangeEvent, type Ref } from 'react';
import type { JSX } from 'react';

import { useFutureUIContext } from './provider.js';

export interface TextInputValueChangeEvent {
  /** The current input value after this user edit. */
  value: string;
  /** App scope identifier from the enclosing FutureUIProvider (D07 M0). */
  appId: string;
}

export interface TextInputProps {
  /** Controlled value. While provided it is the single source of truth. */
  value?: string;
  /** Initial value for uncontrolled ownership. */
  defaultValue?: string;
  /** Fired on each user edit. Never fired by programmatic value changes. */
  onValueChange?: (event: TextInputValueChangeEvent) => void;
  disabled?: boolean;
  readOnly?: boolean;
  /** Invalid state; maps to aria-invalid=true. */
  error?: boolean;
  name?: string;
  /** Accessible description; wired via aria-describedby. */
  description?: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url';
  'aria-label'?: string;
}

/**
 * TextInput — controlled/uncontrolled value with a single source of truth
 * (#17).
 *
 * - Controlled mode: `props.value` drives the element; user edits only report
 *   `valueChange` and never mutate internal state, so there is exactly one
 *   authority for the value.
 * - Uncontrolled mode: the internal default state is initialized once from
 *   `defaultValue` and then tracks user edits.
 * - disabled / readOnly / error / name / description map to native or ARIA
 *   semantics; the component is a pure UI consumer (no business validation,
 *   capability effects or agent visibility).
 */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  {
    value,
    defaultValue = '',
    onValueChange,
    disabled = false,
    readOnly = false,
    error = false,
    name,
    description = '',
    placeholder = '',
    type = 'text',
    'aria-label': ariaLabel,
  }: TextInputProps,
  ref: Ref<HTMLInputElement>,
): JSX.Element {
  const { appId } = useFutureUIContext();
  const [internalValue, setInternalValue] = useState<string>(defaultValue);
  const isControlled = value !== undefined;
  const currentValue = isControlled ? (value ?? '') : internalValue;
  const descriptionId = useId();

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    if (disabled || readOnly) return;
    const next = event.target.value;
    if (!isControlled) setInternalValue(next);
    onValueChange?.({ value: next, appId });
  };

  return (
    <>
      <input
        ref={ref}
        type={type}
        value={currentValue}
        disabled={disabled}
        readOnly={readOnly}
        aria-invalid={error ? true : undefined}
        aria-label={ariaLabel}
        name={name}
        placeholder={placeholder}
        aria-describedby={description !== '' ? descriptionId : undefined}
        onChange={handleChange}
      />
      {description !== '' && (
        <span id={descriptionId} className="future-ui-text-input-description">
          {description}
        </span>
      )}
    </>
  );
});
