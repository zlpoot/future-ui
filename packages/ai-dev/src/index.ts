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
  validateComponentSource,
  importableModule,
  COMPONENT_SOURCE_KINDS,
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
  ComponentSource,
  ModuleImportSource,
  InlinePageSource,
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

//
// R1-04 (#70) Phase A — MV-Auto-Editor real project integration: real Project
// Profile, Project AI View, explicit instance registration and deterministic
// jsdom evidence for the Asset Edit & Approval scenario. Dev-only.
//
export { mvAutoEditorProfile } from './project/mv-auto-editor/mv-profile.js';
export {
  buildMvProjectView,
  buildMvAutoEditorComponentDefinitions,
  MV_UPSTREAM,
} from './project/mv-auto-editor/mv-view.js';
export type { BuildMvProjectViewInput } from './project/mv-auto-editor/mv-view.js';
export {
  createMvProjectContext,
  validateMvProject,
  assertEvidenceNotDrifted,
} from './project/mv-auto-editor/mv-project.js';
export type { MvProjectContext, MvEvidenceDrift } from './project/mv-auto-editor/mv-project.js';
export {
  readMvCurrentUpstream,
  MV_REPO_PATH,
  MV_CANVAS_REL_PATH,
  PINNED_MV_HEAD,
  PINNED_MV_CANVAS_BLOB,
} from './project/mv-auto-editor/mv-upstream.js';
export type { MvCurrentUpstream } from './project/mv-auto-editor/mv-upstream.js';
export {
  registerMvAssetEditInstance,
  registerRealMvAssetInstances,
  REAL_MV_ASSET_CARDS,
} from './project/mv-auto-editor/mv-instances.js';
export type { MvAssetInstanceOptions, MvAssetCardRef } from './project/mv-auto-editor/mv-instances.js';
export {
  mountMvAssetPanel,
  collectMvPanelRenderedEvidence,
  observeMvAssetControls,
  buildMvAssetPanelMarkup,
} from './project/mv-auto-editor/mv-evidence.js';
export type { MvPanelFixtureOptions, MvPanelHandle, MvAssetControlFacts } from './project/mv-auto-editor/mv-evidence.js';
