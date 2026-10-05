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
