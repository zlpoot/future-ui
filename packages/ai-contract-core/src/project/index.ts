/**
 * R1-03 (#69) Project AI View, explicit instance registry and bounded
 * consistency validator — pure deterministic data model and rules. No React,
 * no jsdom, no adapter import here: the integration layer (ai-dev) assembles
 * real component definitions and supplies rendered/interaction evidence.
 */
export { r1ProjectErrorCodes } from './errors.js';
export type { ProjectDiagnostic, R1ProjectErrorCode } from './errors.js';

export {
  buildProjectView,
  validateComponentDefinition,
  validateComponentSource,
  importableModule,
  COMPONENT_SOURCE_KINDS,
  queryComponents,
  describeComponent,
  capabilitiesForInstance,
} from './project-view.js';
export type { BuildProjectViewInput, BuildProjectViewResult, ComponentQuery } from './project-view.js';

export { InstanceRegistry } from './instance-registry.js';
export type {
  RegisterResult,
  ScopeCleanupResult,
  VisibleStateSnapshot,
} from './instance-registry.js';

export {
  BOUNDED_RULES,
  isKnownRule,
  validateProject,
  getScopeCoverage,
  TrustedEvidence,
  validateEvidenceShape,
} from './validator.js';
export type {
  EvidenceSet,
  EvidenceTier,
  Finding,
  FindingStatus,
  InteractionEvidence,
  RenderedEvidence,
  ValidationReport,
  ValidateProjectOptions,
} from './validator.js';

export { identityRefFor, upstreamIdentityFingerprint } from './identity.js';
export type { InstanceIdentityRef } from './identity.js';

export type {
  AdapterComponentIdentity,
  CapabilityReference,
  ComponentDefinition,
  ComponentSource,
  ComponentType,
  InlinePageSource,
  InstanceMetadata,
  InstanceRegistration,
  InstanceRelation,
  InstanceRelationKind,
  MappingLimit,
  MappingStatus,
  ModuleImportSource,
  ProjectAIView,
  ScopeCoverage,
  VisibleStatePolicy,
} from './types.js';
