/**
 * @future-ui/rc-manual-host — v0.1 local manual acceptance host (dev-only).
 *
 * Re-exports the independent UI-only sample and the browser-side live
 * validator helpers so tests and future hosts can reuse them. The host page
 * itself (main.tsx / app.tsx / sections) is intentionally NOT re-exported: the
 * only stable surfaces are the UI-only sample and the validator helpers.
 */
export { UiOnlySample } from './sections/ui-only-sample.js';
export type { ValidatorDemoResult, LiveRenderedEvidence, ValidatorFindingView, AiViewSummary } from './validator-live.js';
export {
  runPositiveValidator,
  runNegativeValidator,
  readAiViewSummaries,
} from './validator-live.js';
