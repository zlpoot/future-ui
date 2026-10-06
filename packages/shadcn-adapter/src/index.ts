/**
 * @future-ui/shadcn-adapter — R1-02 (#68)
 * Existing-library adapter for shadcn/ui (React, new-york-v4 / Radix).
 */

// Frozen identity & provenance (D15 upstream identification)
export {
  adapterIdentity,
  CONTRACT_VERSION,
  digestSpec,
  upstreamFiles,
  upstreamCommit,
  registrySource,
  baseIdentity,
  runtimeDependencies,
  styleLayer,
  toolingProvenance,
} from './upstream-provenance.js';
export type { AdapterIdentity, UpstreamFileIdentity } from './upstream-provenance.js';

// Vendored upstream components (immutable; digest-enforced)
export * from './upstream/index.js';

// Thin composition components
export { ShadcnButton } from './components/shadcn-button.js';
export type { ShadcnButtonProps } from './components/shadcn-button.js';
export { ShadcnTextInput } from './components/shadcn-text-input.js';
export type { ShadcnTextInputProps, ShadcnInputType } from './components/shadcn-text-input.js';
export { EditDialog } from './components/edit-dialog.js';
export type {
  EditDialogProps,
  EditDialogField,
  EditDialogOpenChangeDetail,
  EditDialogCloseReason,
} from './components/edit-dialog.js';

// D15 mapping
export {
  validateAdapterMappings,
  validateComponentMapping,
  validateMappingProfileLinkage,
  freezeAdapterData,
  getAdapterIdentity,
  getComponentMapping,
  getComponentMappingReports,
} from './adapter/mapping-store.js';
export { componentMappings, dialogMapping, buttonMapping, textInputMapping } from './adapter/mappings.js';
export type {
  ComponentMapping,
  ComponentMappingReport,
  MappingDomain,
  MemberConclusion,
  MemberStatus,
  MappingVia,
} from './adapter/types.js';

// D16 Project Profile + resolver
export { editDialogProfile } from './profile/edit-dialog-profile.js';
export {
  resolveToken,
  tryResolveToken,
  validateProfile,
  resolveVariant,
} from './profile/resolver.js';
export type { ProjectProfile, ProjectProfile as ProjectProfileType, ResolvedToken } from './profile/types.js';
export type { ProfileResult } from './profile/resolver.js';

// Local diagnostics (independent namespace)
export { r1AdapterErrorCodes, r1ProfileErrorCodes } from './errors.js';
export type { R1AdapterErrorCode, R1ProfileErrorCode, R1Diagnostic } from './errors.js';
