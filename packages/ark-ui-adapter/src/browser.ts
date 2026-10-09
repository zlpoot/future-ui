/**
 * Browser-safe export surface of @future-ui/ark-ui-adapter.
 *
 * R1-RC-001 (#86) first-failure fix: the package INDEX re-exports
 * mapping-store validators, which transitively import @future-ui/contracts
 * (node:fs schema reads at module load) — no browser graph can touch the
 * index. This barrel exposes ONLY the browser-runnable surface (zero node:
 * imports in its graph):
 *  - isolated Ark consumers (ArkDialog, ArkButton, ArkTextInput)
 *  - D15 mapping tables (real adapter data, rendered by the capability matrix)
 *  - frozen identity/provenance constants
 *
 * The main index is unchanged; mapping validators stay Node-side.
 */
export { ArkDialog } from './components/ark-dialog.js';
export type { ArkDialogProps } from './components/ark-dialog.js';
export { ArkButton } from './components/ark-button.js';
export type { ArkButtonProps } from './components/ark-button.js';
export { ArkTextInput } from './components/ark-text-input.js';
export type { ArkTextInputProps, ArkTextInputType, ArkTextInputValueChange } from './components/ark-text-input.js';

export {
  arkComponentMappings,
  arkDialogMapping,
  arkButtonMapping,
  arkTextInputMapping,
} from './adapter/mappings.js';
export type {
  ArkComponentMapping,
  ArkMappingDomain,
  ArkMappingVia,
  ArkMemberConclusion,
  ArkMemberStatus,
} from './adapter/types.js';

export {
  adapterIdentity,
  arkPackage,
  engineIdentity,
  arkEntryPoints,
  CONTRACT_VERSION,
} from './ark-provenance.js';
export type { ArkAdapterIdentity } from './ark-provenance.js';
