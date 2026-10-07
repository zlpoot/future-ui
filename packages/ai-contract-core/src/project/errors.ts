/**
 * R1-03 (#69) package-local diagnostics for the Project AI View, explicit
 * instance registry and bounded validator.
 *
 * The Diagnostic SHAPE reuses the frozen M0-02 fields
 * (code/path/expected/actual/explanation/repairHint); only the code values are
 * a package-local `r1_project_*` set. The frozen contracts package error-code
 * union and core 12 codes are NOT extended or modified (R1-03 stop condition).
 */
export const r1ProjectErrorCodes = [
  /** A component/capability definition is structurally invalid. */
  'r1_project_definition_invalid',
  /** Registered adapter/profile/upstream identity does not match the definition. */
  'r1_project_identity_mismatch',
  /** An instance registration is structurally invalid. */
  'r1_project_instance_invalid',
  /** register() reused an instanceId that already exists. */
  'r1_project_instance_duplicate',
  /** update/unregister referenced an instanceId that is not registered. */
  'r1_project_instance_not_found',
  /** A query/cleanup named a scope that has no coverage information. */
  'r1_project_scope_unknown',
  /** Projection asked to expose a state key not on the instance allowlist. */
  'r1_project_visible_state_forbidden',
  /** A business capability reference has no explicit binding on the instance. */
  'r1_project_capability_unbound',
  /** validate() referenced a ruleId outside the frozen bounded rule set. */
  'r1_project_rule_unknown',
  /** A rule needs a higher evidence tier than the supplied evidence provides. */
  'r1_project_evidence_insufficient',
  /** The requested page/scope/instance is explicitly not covered (no guess). */
  'r1_project_not_covered',
] as const;

export type R1ProjectErrorCode = (typeof r1ProjectErrorCodes)[number];

export interface ProjectDiagnostic {
  code: R1ProjectErrorCode;
  path: string;
  expected?: unknown;
  actual?: unknown;
  explanation: string;
  repairHint?: string;
}
