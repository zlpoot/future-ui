/**
 * @future-ui/ai-dev — deterministic AI Preview/Test development host (M1-06A2 / #25).
 *
 * ui.preview renders controlled fixtures (jsdom + conformance dom-provider,
 * host whitelist 'dom') and returns a locatable render target + M0
 * diagnostics; ui.test executes deterministic structure/interaction/business
 * checks with exact baselines. Dev-time only: never part of the UI-only
 * production dependency graph, never in the website agent tool directory, and
 * no model calls (M0-08 §4/§7).
 */
export { preview, validatePreviewProps, renderPreview, PREVIEW_CONTRACTS } from './preview.js';
export type {
  PreviewComponentId,
  PreviewHost,
  PreviewInput,
  PreviewOutput,
  PreviewEventSink,
  RenderNode,
  RenderTarget,
} from './preview.js';
export { test } from './test.js';
export type {
  BusinessCheck,
  BusinessFixture,
  CheckCategory,
  InteractionAction,
  InteractionCheck,
  InteractionExpectation,
  StructureCheck,
  StructureExpectation,
  TestCheck,
  TestInput,
  TestOutput,
  TestResult,
} from './test.js';
export { devErrorCodes } from './errors.js';
export type { DevDiagnostic, DevErrorCode } from './errors.js';

//
// R1-03 (#69) Project-level integration: real shadcn descriptor, explicit
// instance registry wiring, and deterministic jsdom rendered/interaction
// evidence for the bounded validator. Dev-only; re-exports the generic core
// model so consumers need not depend on ai-contract-core directly.
//
export {
  buildProjectView,
  validateComponentDefinition,
  queryComponents,
  describeComponent,
  capabilitiesForInstance,
  InstanceRegistry,
  BOUNDED_RULES,
  isKnownRule,
  validateProject,
  getScopeCoverage,
  r1ProjectErrorCodes,
  TrustedEvidence,
  validateEvidenceShape,
  identityRefFor,
  upstreamIdentityFingerprint,
} from '@future-ui/ai-contract-core';
export type {
  BuildProjectViewInput,
  BuildProjectViewResult,
  ComponentDefinition,
  ComponentQuery,
  EvidenceSet,
  EvidenceTier,
  Finding,
  FindingStatus,
  InstanceIdentityRef,
  InstanceRegistration,
  InteractionEvidence,
  ProjectAIView,
  ProjectDiagnostic,
  R1ProjectErrorCode,
  RenderedEvidence,
  ValidationReport,
  ValidateProjectOptions,
  VisibleStateSnapshot,
} from '@future-ui/ai-contract-core';

export { buildShadcnProjectView, buildShadcnComponentDefinitions } from './project/shadcn-descriptor.js';
export {
  createEditDialogProjectContext,
  registerEditDialogInstance,
  validateEditDialogProject,
  sealProjectEvidence,
} from './project/edit-dialog-project.js';
export type { EditDialogProjectContext, EditDialogInstanceOptions } from './project/edit-dialog-project.js';
export { mountEditDialog, collectRenderedEvidence, drivePendingInteraction } from './project/dialog-evidence.js';
export {
  FROZEN_PROJECT_TOOL_NAMES,
  PROJECT_TOOL_DESCRIPTORS,
  executeProjectTool,
} from './project/mcp-projection.js';
export type {
  ProjectToolName,
  ProjectToolDescriptor,
  ProjectToolResult,
  ProjectToolError,
  ProjectToolErrorCode,
  ProjectToolContext,
} from './project/mcp-projection.js';
