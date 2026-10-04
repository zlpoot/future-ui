/**
 * Stable structured diagnostics for contract validation.
 *
 * M0 error-code subset frozen in docs/management/m0-02-contract-freeze-proposal.md.
 * Structural validation produces the structural subset; business/runtime codes
 * (conflict / unauthorized / unavailable / capability_conflict / node_not_found)
 * are reserved for consumers such as #22 catalog/validate primitives.
 */
export const errorCodes = [
  'unknown_major_version',
  'unknown_field',
  'missing_required',
  'type_mismatch',
  'constraint_violation',
  'invalid_combination',
  'conflict',
  'unauthorized',
  'unavailable',
  'capability_conflict',
  'unsupported_feature',
  'node_not_found',
] as const;

export type ErrorCode = (typeof errorCodes)[number];

export interface Diagnostic {
  /** stable error code */
  code: ErrorCode;
  /** JSON Pointer (RFC 6901) locating the offending node */
  path: string;
  /** expected value or description */
  expected: unknown;
  /** actual value or description */
  actual: unknown;
  explanation: string;
  repairHint?: string;
}
