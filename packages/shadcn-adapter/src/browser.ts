/**
 * Browser-safe export surface of @future-ui/shadcn-adapter.
 *
 * R1-RC-001 (#86) first-failure fix: the package INDEX re-exports
 * mapping-store validators, which transitively import @future-ui/contracts
 * (validateComponent → node:fs schema reads at module load) — vite externalizes
 * node:fs, so no browser graph can touch the index. This barrel exposes ONLY
 * the browser-runnable surface (zero node: imports in its graph):
 *  - thin composition components (EditDialog, ShadcnButton, ShadcnTextInput)
 *  - D15 mapping tables (real adapter data, rendered by the capability matrix)
 *  - frozen identity/provenance constants and the single Project Profile
 *
 * The main index is unchanged; mapping validators stay Node-side.
 */
export { EditDialog } from './components/edit-dialog.js';
export type {
  EditDialogProps,
  EditDialogField,
  EditDialogOpenChangeDetail,
  EditDialogCloseReason,
} from './components/edit-dialog.js';
export { ShadcnButton } from './components/shadcn-button.js';
export type { ShadcnButtonProps } from './components/shadcn-button.js';
export { ShadcnTextInput } from './components/shadcn-text-input.js';
export type {
  ShadcnTextInputProps,
  ShadcnInputType,
  ShadcnTextInputValueChangeEvent,
} from './components/shadcn-text-input.js';

export { componentMappings, dialogMapping, buttonMapping, textInputMapping } from './adapter/mappings.js';
export type {
  ComponentMapping,
  MappingDomain,
  MemberConclusion,
  MemberStatus,
  MappingVia,
} from './adapter/types.js';

export {
  adapterIdentity,
  CONTRACT_VERSION,
  upstreamFiles,
  upstreamCommit,
  registrySource,
  baseIdentity,
  runtimeDependencies,
  styleLayer,
} from './upstream-provenance.js';
export type { AdapterIdentity, UpstreamFileIdentity } from './upstream-provenance.js';
export { editDialogProfile } from './profile/edit-dialog-profile.js';
export type { ProjectProfile, ResolvedToken } from './profile/types.js';
