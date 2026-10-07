import * as React from 'react';
import { cn } from 'cn';
import { Input } from '../upstream/index.js';

export type ShadcnInputType = 'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url';

/**
 * Contract `valueChange` payload (future-ui.text-input): an object carrying
 * the resulting value, never a bare string. This adapter has no appId
 * concept, so only the contract-owned `value` field is present.
 */
export interface ShadcnTextInputValueChangeEvent {
  value: string;
}

export interface ShadcnTextInputProps {
  /** Provide for controlled ownership; omit (with defaultValue) for uncontrolled. */
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  readOnly?: boolean;
  error?: boolean;
  name?: string;
  description?: string;
  placeholder?: string;
  type?: ShadcnInputType;
  autoComplete?: string;
  /** Fired on each user edit with the contract payload `{ value }`; not fired for programmatic value sets. */
  onValueChange?: (event: ShadcnTextInputValueChangeEvent) => void;
  className?: string;
  id?: string;
}

/**
 * Thin composition over the vendored shadcn Input:
 *  - valueChange adapter emitting the contract payload { value }
 *  - error  → aria-invalid
 *  - description → aria-describedby + visible description element
 *  - name → native name attribute AND aria-label (per the frozen contract's
 *    accessibility clause "name maps to aria-label when provided")
 * Hybrid ownership is native React input behavior; the wrapper never mutates
 * a provided controlled value.
 */
export const ShadcnTextInput = React.forwardRef<HTMLInputElement, ShadcnTextInputProps>(
  function ShadcnTextInput(
    {
      value,
      defaultValue,
      disabled = false,
      readOnly = false,
      error = false,
      name,
      description,
      placeholder,
      type = 'text',
      autoComplete,
      onValueChange,
      className,
      id,
    },
    ref,
  ) {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const descriptionId = description ? `${inputId}-description` : undefined;
    const controlled = value !== undefined;
    const [internal, setInternal] = React.useState(defaultValue ?? '');

    return (
      <div className="flex flex-col gap-1.5">
        <Input
          ref={ref}
          id={inputId}
          name={name}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          readOnly={readOnly}
          aria-label={name || undefined}
          aria-invalid={error || undefined}
          aria-describedby={descriptionId}
          className={cn(className)}
          value={controlled ? value : internal}
          onChange={(event) => {
            // Native semantics: disabled/readOnly do not deliver change events.
            if (disabled || readOnly) return;
            if (!controlled) setInternal(event.target.value);
            onValueChange?.({ value: event.target.value });
          }}
        />
        {description ? (
          <p id={descriptionId} className="text-muted-foreground text-sm">
            {description}
          </p>
        ) : null}
      </div>
    );
  },
);
