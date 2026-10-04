/**
 * @future-ui/contracts — framework-agnostic contract schemas, validation and diagnostics (M0-02).
 *
 * Single source of truth: JSON Schema Draft 2020-12 files under ./schemas.
 * TypeScript types are aligned with those schemas; structural validation never
 * implies authorization, execution or live credit (D02 / D06(M0) invariants).
 */
export { errorCodes } from './diagnostics.js';
export type { Diagnostic, ErrorCode } from './diagnostics.js';
export type {
  AccessibilityObligations,
  BindingContract,
  CapabilityContract,
  ComponentContract,
  ComponentEvent,
  ComponentPart,
  ComponentProp,
  ComponentState,
  ControlMethod,
  DataShape,
  Lifecycle,
  PluginContract,
  SemVer,
} from './types.js';
export {
  CONTRACT_MAJOR,
  schemas,
  validateBinding,
  validateCapability,
  validateComponent,
  validatePlugin,
} from './validate.js';
export type { ValidationContext, ValidationResult } from './validate.js';
