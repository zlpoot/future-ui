import { Field } from '@ark-ui/react/field';
import type { ReactNode } from 'react';

export type ArkTextInputType =
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'search'
  | 'tel'
  | 'url';

export interface ArkTextInputValueChange {
  value: string;
}

/**
 * Phase C isolated consumer for the TextInput contract, realized by the REAL
 * Ark Field primitive: Field.Root (disabled/readOnly/invalid) + Field.Input
 * (renders a native input merged with getInputProps) + Field.HelperText, which
 * together provide the auto aria-invalid / aria-describedby wiring.
 *
 * Hybrid ownership: controlled when `value` is supplied, otherwise initialized
 * from `defaultValue` and left uncontrolled. valueChange is emitted only from
 * real user edits, never from programmatic value sets.
 *
 * Documented limitation (mapping accessibility.role = unsupported): the seven
 * contracted input types do not share one implicit ARIA role, so this single
 * Field.Input cannot present role=textbox for number/search/password. The
 * component does not override the implicit role to fake conformance.
 */
export interface ArkTextInputProps {
  /** Local id passthrough so a host <label htmlFor> can associate with the real Field.Input (no public Contract change). */
  id?: string;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  readOnly?: boolean;
  error?: boolean;
  name?: string;
  description?: string;
  placeholder?: string;
  type?: ArkTextInputType;
  onValueChange?: (event: ArkTextInputValueChange) => void;
}

export function ArkTextInput({
  id,
  value,
  defaultValue,
  disabled = false,
  readOnly = false,
  error = false,
  name,
  description,
  placeholder,
  type = 'text',
  onValueChange,
}: ArkTextInputProps) {
  const controlled = value !== undefined;
  // Accessible description is wired entirely by the Field primitive: a
  // Field.HelperText child makes Field.Input's getInputProps() emit an
  // aria-describedby pointing at the generated helper id.
  const helper: ReactNode = description ? <Field.HelperText>{description}</Field.HelperText> : null;

  return (
    <Field.Root disabled={disabled} readOnly={readOnly} invalid={error}>
      {helper}
      <Field.Input
        id={id}
        data-part="root"
        {...(controlled ? { value } : { defaultValue })}
        type={type}
        name={name}
        placeholder={placeholder}
        readOnly={readOnly || undefined}
        aria-label={name}
        onChange={(event) => {
          // Contract: no valueChange while disabled/readOnly, and only from user edits.
          if (disabled || readOnly) return;
          onValueChange?.({ value: event.target.value });
        }}
      />
    </Field.Root>
  );
}
