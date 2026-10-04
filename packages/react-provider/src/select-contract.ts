import { validateComponent, type ComponentContract, type Diagnostic } from '@future-ui/contracts';

export const SELECT_COMPONENT_TYPE = 'future-ui.select';

/**
 * Public Select contract instance (D05 M0 field families), consumed by the
 * React adapter. Unsupported extensions (searchable/multi) are declared
 * absent explicitly — never silently downgraded (D04 / #18 acceptance).
 *
 * Implementation note: Select uses the native <select> element. Native
 * open/close and keyboard interaction are browser-managed semantics; the
 * contract declares focus as the only programmatic control method. The
 * structure/behavior accessibility scope (D07(M1)-min) covers value,
 * collection, disabled and change semantics deterministically in jsdom.
 */
export const selectContract: ComponentContract = {
  componentType: SELECT_COMPONENT_TYPE,
  contractVersion: '1.0.0',
  features: {
    disabled: true,
    searchable: false,
    multi: false,
  },
  props: {
    options: {
      type: 'array',
      required: true,
      description: 'Option collection [{label: string, value: string}].',
    },
    defaultValue: { type: 'string', default: null, required: false, description: 'Initially selected value (uncontrolled).' },
    placeholder: { type: 'string', default: '', required: false, description: 'Shown as an empty-value option when present.' },
    disabled: { type: 'boolean', default: false, required: false, description: 'Disables selection.' },
  },
  events: {
    valueChange: {
      description: 'Fired when a single option is selected. Not fired while disabled; not mapped to any business effect.',
      payload: { value: null },
    },
  },
  state: {
    ownership: 'uncontrolled',
    fields: { value: null },
  },
  parts: {
    root: { required: true, description: 'The native <select> element.' },
  },
  control: {
    focus: { params: {}, returns: 'void', description: 'Moves keyboard focus to the select.' },
  },
  accessibility: {
    role: 'combobox',
    keyboard: true,
    focus: true,
    semanticRelations: true,
    description: 'Native select semantics; open/close popup is browser-managed, keyboard selection per native behavior.',
  },
  lifecycle: {
    requiresCleanup: false,
  },
};

/** Structural check against the frozen M0-02 Component schema (D14 rule 3). */
export function validateSelectContract(): Diagnostic[] {
  return validateComponent(selectContract).diagnostics;
}
