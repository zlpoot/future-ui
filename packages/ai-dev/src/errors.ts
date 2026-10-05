import type { ErrorCode } from '@future-ui/contracts';

/**
 * Dev-prefixed error codes for the AI Preview/Test host (M0-08 §6).
 *
 * The diagnostic STRUCTURE reuses the frozen M0-02 Diagnostic shape
 * (code/path/expected/actual/explanation/repairHint); only the code values are
 * extended with the `preview_*` / `test_*` / `business_*` dev set. The
 * contracts package error-code union stays frozen (M0 subset) — no new code is
 * written into the core contract.
 */
export const devErrorCodes = [
  'preview_unsupported_component',
  'preview_invalid_props',
  'preview_unsupported_host',
  'test_unknown_check',
  'test_structure_mismatch',
  'test_interaction_mismatch',
  'test_baseline_missing',
  'business_fixture_required',
] as const;

export type DevErrorCode = (typeof devErrorCodes)[number];

/** Diagnostic shape identical to the M0 Diagnostic, with dev-prefixed codes allowed. */
export interface DevDiagnostic {
  code: DevErrorCode | ErrorCode;
  path: string;
  expected: unknown;
  actual: unknown;
  explanation: string;
  repairHint?: string;
}
