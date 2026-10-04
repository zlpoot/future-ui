/**
 * Framework-agnostic minimal DOM provider — the second implementation that
 * challenges the Component Contract (M1-04A / #26).
 *
 * Hard constraint (freeze rule D-PORT-01.1): this module consumes only the
 * public future-ui Contract shapes and its own native DOM semantics. It does
 * NOT import React, Ark, or any React provider component, and it never reads
 * framework-internal state or DOM structure assumptions beyond what a plain
 * HTML button/select exposes. Public events carry the same payload families
 * as the React host (clickId/value + appId), proving the contract is not a
 * wrapper around the first implementation's API.
 */
import { validateComponent, type ComponentContract, type Diagnostic } from '@future-ui/contracts';

export interface DomButtonOptions {
  appId: string;
  disabled?: boolean;
  onClick?: (event: { originalEvent: Event; appId: string }) => void;
  /** Lifecycle: aborting this signal disposes the listeners (native DOM semantics). */
  signal?: AbortSignal;
}

export interface DomSelectOption {
  label: string;
  value: string;
}

export interface DomSelectOptions {
  appId: string;
  options: DomSelectOption[];
  defaultValue?: string | null;
  placeholder?: string;
  disabled?: boolean;
  onValueChange?: (event: { value: string | null; appId: string }) => void;
  /** Lifecycle: aborting this signal disposes the listeners (native DOM semantics). */
  signal?: AbortSignal;
}

/** Creates a native <button> honoring the Button contract public semantics. */
export function createDomButton(options: DomButtonOptions): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  if (options.disabled) button.disabled = true;
  const activate = (originalEvent: Event): void => {
    if (button.disabled) return;
    options.onClick?.({ originalEvent, appId: options.appId });
  };
  button.addEventListener('click', (event) => activate(event), { signal: options.signal });
  // Keyboard activation (Enter/Space) mirrors the UI host's explicit
  // handling, so both implementations give identical interaction semantics in
  // jsdom (#11 acceptance 1).
  button.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      activate(event);
    },
    { signal: options.signal },
  );
  return button;
}

/** Creates a native <select> honoring the Select contract public semantics. */
export function createDomSelect(options: DomSelectOptions): HTMLSelectElement {
  const select = document.createElement('select');
  if (options.disabled) select.disabled = true;
  if (options.placeholder !== undefined && options.placeholder !== '') {
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = options.placeholder;
    select.appendChild(empty);
  }
  for (const option of options.options) {
    const el = document.createElement('option');
    el.value = option.value;
    el.textContent = option.label;
    select.appendChild(el);
  }
  if (options.defaultValue != null) select.value = options.defaultValue;
  select.addEventListener(
    'change',
    () => {
      if (select.disabled) return;
      const value = select.value;
      options.onValueChange?.({ value: value === '' ? null : value, appId: options.appId });
    },
    { signal: options.signal },
  );
  return select;
}

/** Contract shape check reused from the frozen M0-02 schema (D14 rule 3). */
export function validateConsumerContract(contract: ComponentContract): Diagnostic[] {
  return validateComponent(contract).diagnostics;
}

export interface DomTextInputOptions {
  appId: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  error?: boolean;
  'aria-label'?: string;
  onValueChange?: (event: { value: string; appId: string }) => void;
  /** Lifecycle: aborting this signal disposes the listeners (native DOM semantics). */
  signal?: AbortSignal;
}

/** Creates a native <input> honoring the TextInput contract public semantics. */
export function createDomTextInput(options: DomTextInputOptions): HTMLInputElement {
  const input = document.createElement('input');
  input.setAttribute('data-part', 'root');
  if (options.defaultValue !== undefined) input.value = options.defaultValue;
  if (options.placeholder !== undefined) input.placeholder = options.placeholder;
  if (options.disabled) input.disabled = true;
  if (options.readOnly) input.readOnly = true;
  if (options.error) input.setAttribute('aria-invalid', 'true');
  if (options['aria-label'] !== undefined) input.setAttribute('aria-label', options['aria-label']);
  input.addEventListener(
    'change',
    () => {
      if (input.disabled || input.readOnly) return;
      options.onValueChange?.({ value: input.value, appId: options.appId });
    },
    { signal: options.signal },
  );
  input.addEventListener(
    'input',
    () => {
      if (input.disabled || input.readOnly) return;
      options.onValueChange?.({ value: input.value, appId: options.appId });
    },
    { signal: options.signal },
  );
  return input;
}
