import * as React from 'react';
import { cn } from 'cn';
import { Input } from '../upstream/index.js';

export type ShadcnInputType = 'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url';

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
  /** Stable per-keystroke value adapter; not fired for programmatic value sets. */
  onValueChange?: (value: string) => void;
  className?: string;
  id?: string;
}

/**
 * Thin composition over the vendored shadcn Input:
 *  - valueChange adapter (event.target.value)
 *  - error  → aria-invalid
 *  - description → aria-describedby + visible description element
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
          aria-invalid={error || undefined}
          aria-describedby={descriptionId}
          className={cn(className)}
          value={controlled ? value : internal}
          onChange={(event) => {
            // Native semantics: disabled/readOnly do not deliver change events.
            if (disabled || readOnly) return;
            if (!controlled) setInternal(event.target.value);
            onValueChange?.(event.target.value);
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
