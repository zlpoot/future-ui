import { validateComponent, type ComponentContract, type Diagnostic } from '@future-ui/contracts';
import { DIALOG_COMPONENT_TYPE } from './component-types.js';
export { DIALOG_COMPONENT_TYPE } from './component-types.js';

/**
 * Public Dialog contract instance (D05 M0 field families), consumed by the
 * React adapter (#19).
 *
 * Focus lifecycle is part of the contract: on open, focus moves into the
 * dialog (first focusable part); Escape requests close; on close, focus
 * returns to the previously focused element; unmount/abnormal close releases
 * listeners and focus-related resources. `requiresCleanup: true` reflects
 * that the adapter must clean up listeners on unmount.
 *
 * The Dialog never auto-binds business capabilities (e.g. confirm effects);
 * it is a pure UI component — the host application decides what happens on
 * open/close (#19 禁止 clause).
 */
export const dialogContract: ComponentContract = {
  componentType: DIALOG_COMPONENT_TYPE,
  contractVersion: '1.0.0',
  features: {
    open: true,
    escapeClose: true,
    focusTrap: true,
    focusRestore: true,
    accessibleName: true,
  },
  props: {
    open: { type: 'boolean', default: false, required: false, description: 'Controlled open state.' },
    label: {
      type: 'string',
      default: '',
      required: false,
      description: 'Accessible name; maps to aria-labelledby when a title part is rendered, or aria-label.',
    },
    description: {
      type: 'string',
      default: '',
      required: false,
      description: 'Accessible description; maps to aria-describedby on the content part.',
    },
  },
  events: {
    openChange: {
      description: 'Fired with the next open value when the user requests a state change (Escape, close affordance). Never fired by programmatic open prop changes.',
      payload: { open: false },
    },
  },
  state: {
    ownership: 'controlled',
    fields: { open: false },
  },
  parts: {
    root: { required: true, description: 'The dialog surface; role=dialog, aria-modal=true.' },
    title: { required: false, description: 'Accessible name source; referenced by aria-labelledby.' },
    content: { required: false, description: 'Dialog body; referenced by aria-describedby when description is provided.' },
  },
  control: {
    open: { params: {}, returns: 'void', description: 'Requests the dialog to open (host still owns the open prop).' },
    close: { params: {}, returns: 'void', description: 'Requests the dialog to close (host still owns the open prop).' },
    focus: { params: {}, returns: 'void', description: 'Moves focus to the first focusable part inside the dialog.' },
  },
  accessibility: {
    role: 'dialog',
    keyboard: true,
    focus: true,
    semanticRelations: true,
    description: 'Focus enters on open, Escape requests close, focus returns to the trigger on close; aria-modal=true while open.',
  },
  lifecycle: {
    requiresCleanup: true,
  },
};

/** Structural check against the frozen M0-02 Component schema (D14 rule 3). */
export function validateDialogContract(): Diagnostic[] {
  return validateComponent(dialogContract).diagnostics;
}
