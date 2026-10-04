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
}

/** Creates a native <button> honoring the Button contract public semantics. */
export function createDomButton(options: DomButtonOptions): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  if (options.disabled) button.disabled = true;
  button.addEventListener('click', (event) => {
    if (button.disabled) return;
    options.onClick?.({ originalEvent: event, appId: options.appId });
  });
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
  select.addEventListener('change', () => {
    if (select.disabled) return;
    const value = select.value;
    options.onValueChange?.({ value: value === '' ? null : value, appId: options.appId });
  });
  return select;
}

/** Contract shape check reused from the frozen M0-02 schema (D14 rule 3). */
export function validateConsumerContract(contract: ComponentContract): Diagnostic[] {
  return validateComponent(contract).diagnostics;
}
