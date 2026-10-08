/**
 * @future-ui/ark-ui-adapter — R1-04 (#70) Phase C Ark UI contrast adapter.
 *
 * Isolated React consumers + independent member-level mapping against the
 * FROZEN Component Contract. This package creates no second Project Profile,
 * binds no capabilities, and is independent of the shadcn adapter.
 */
export { adapterIdentity, arkPackage, engineIdentity, arkEntryPoints, CONTRACT_VERSION } from './ark-provenance.js';
export type { ArkAdapterIdentity } from './ark-provenance.js';

export {
  arkComponentMappings,
  arkDialogMapping,
  arkButtonMapping,
  arkTextInputMapping,
} from './adapter/mappings.js';
export {
  validateArkComponentMapping,
  validateArkMappings,
  ALL_ARK_DOMAINS,
} from './adapter/mapping-store.js';
export type {
  ArkComponentMapping,
  ArkComponentMappingReport,
  ArkComponentMappingStatus,
  ArkMappingDomain,
  ArkMappingVia,
  ArkMemberConclusion,
  ArkMemberStatus,
} from './adapter/types.js';
export { r1ArkAdapterErrorCodes, hasArkErrors } from './errors.js';
export type { R1ArkAdapterErrorCode, R1ArkDiagnostic } from './errors.js';

export { ArkDialog } from './components/ark-dialog.js';
export type { ArkDialogProps } from './components/ark-dialog.js';
export { ArkButton } from './components/ark-button.js';
export type { ArkButtonProps } from './components/ark-button.js';
export { ArkTextInput } from './components/ark-text-input.js';
export type { ArkTextInputProps, ArkTextInputType, ArkTextInputValueChange } from './components/ark-text-input.js';
