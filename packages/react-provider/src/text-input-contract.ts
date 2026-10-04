import { validateComponent, type ComponentContract, type Diagnostic } from '@future-ui/contracts';

export const TEXT_INPUT_COMPONENT_TYPE = 'future-ui.text-input';

/**
 * Public TextInput contract instance (D05 M0 field families), consumed by the
 * React adapter (#17).
 *
 * Ownership is explicitly 'hybrid': a controlled `value` is the single source
 * of truth while provided (the adapter never mutates it); otherwise the
 * component owns an uncontrolled default state initialized once from
 * `defaultValue`. The two never form a dual authority.
 *
 * The component never mixes in business validation, capability effects or
 * agent visibility (#17 acceptance 4) — it is a pure UI consumer.
 */
export const textInputContract: ComponentContract = {
  componentType: TEXT_INPUT_COMPONENT_TYPE,
  contractVersion: '1.0.0',
  features: {
    disabled: true,
    readOnly: true,
    error: true,
    name: true,
    description: true,
    controlled: true,
  },
  props: {
    value: {
      type: 'string',
      default: null,
      required: false,
      description: 'Controlled value. While provided it is the single source of truth; programmatic changes do not fire valueChange.',
    },
    defaultValue: {
      type: 'string',
      default: '',
      required: false,
      description: 'Initial value for uncontrolled ownership; ignored while `value` is controlled.',
    },
    disabled: { type: 'boolean', default: false, required: false, description: 'Disables editing and pointer/keyboard activation.' },
    readOnly: { type: 'boolean', default: false, required: false, description: 'Blocks user edits but keeps focusability and DOM semantics.' },
    error: { type: 'boolean', default: false, required: false, description: 'Invalid state; maps to aria-invalid=true.' },
    name: { type: 'string', default: '', required: false, description: 'Native input name attribute.' },
    description: {
      type: 'string',
      default: '',
      required: false,
      description: 'Accessible description; wired via aria-describedby to a description part.',
    },
    placeholder: { type: 'string', default: '', required: false, description: 'Native placeholder hint.' },
    type: {
      type: 'string',
      enum: ['text', 'email', 'password', 'number', 'search', 'tel', 'url'],
      default: 'text',
      required: false,
    },
  },
  events: {
    valueChange: {
      description: 'Fired on each user edit with the resulting value and appId. Not fired while disabled or readOnly; not fired by programmatic value changes.',
      payload: { value: '' },
    },
  },
  state: {
    ownership: 'hybrid',
    fields: { value: '' },
  },
  parts: {
    root: { required: true, description: 'The native <input> element.' },
    description: { required: false, description: 'Accessible description element referenced by aria-describedby.' },
  },
  control: {
    focus: { params: {}, returns: 'void', description: 'Moves keyboard focus to the input.' },
  },
  accessibility: {
    role: 'textbox',
    keyboard: true,
    focus: true,
    semanticRelations: true,
    description: 'Native input semantics; aria-invalid for error, aria-describedby for description, name maps to aria-label when provided.',
  },
  lifecycle: {
    requiresCleanup: false,
  },
};

/** Structural check against the frozen M0-02 Component schema (D14 rule 3). */
export function validateTextInputContract(): Diagnostic[] {
  return validateComponent(textInputContract).diagnostics;
}
