import { validateComponent, type ComponentContract, type Diagnostic } from '@future-ui/contracts';

export const BUTTON_COMPONENT_TYPE = 'future-ui.button';

/**
 * Public Button contract instance (D05 M0 field families), consumed by the
 * React adapter. This is the single contract for Button; the adapter maps it
 * onto the internal Ark UI primitive without leaking Ark types (D03 rule 1).
 */
export const buttonContract: ComponentContract = {
  componentType: BUTTON_COMPONENT_TYPE,
  contractVersion: '1.0.0',
  features: {
    disabled: true,
    loading: true,
  },
  props: {
    disabled: { type: 'boolean', default: false, required: false, description: 'Disables pointer and keyboard activation.' },
    loading: { type: 'boolean', default: false, required: false, description: 'Busy state; implies disabled and aria-busy=true.' },
    type: { type: 'string', enum: ['button', 'submit', 'reset'], default: 'button', required: false },
  },
  events: {
    click: { description: 'Activation event (pointer or keyboard). Not fired while disabled or loading.', payload: {} },
  },
  state: {
    ownership: 'uncontrolled',
    fields: { disabled: false, loading: false },
  },
  parts: {
    root: { required: true, description: 'The native <button> element.' },
  },
  control: {
    focus: { params: {}, returns: 'void', description: 'Moves keyboard focus to the button.' },
  },
  accessibility: {
    role: 'button',
    keyboard: true,
    focus: true,
    semanticRelations: false,
    description: 'Native button semantics; loading exposes aria-busy=true.',
  },
  lifecycle: {
    requiresCleanup: false,
  },
};

/**
 * Structural check against the frozen M0-02 Component schema (D14 rule 3:
 * no second error system — reuses contracts diagnostics).
 */
export function validateButtonContract(): Diagnostic[] {
  return validateComponent(buttonContract).diagnostics;
}
