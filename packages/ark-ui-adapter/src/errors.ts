/**
 * R1-04 (#70) Phase C — package-local diagnostics for the Ark UI adapter.
 *
 * Independent namespace (same freeze rule as the R1-02 adapter): the frozen
 * core error codes in packages/contracts/src/diagnostics.ts are neither
 * extended nor reused, and the shadcn adapter's `r1_adapter_*` codes are not
 * imported — the Ark adapter stays independent of shadcn.
 */
export const r1ArkAdapterErrorCodes = [
  /** Mapping anchor does not match the frozen contract instance. */
  'r1_ark_adapter_anchor_mismatch',
  /** A required semantic domain is missing from the mapping. */
  'r1_ark_adapter_domain_missing',
  /** A contract member has no conclusion. */
  'r1_ark_adapter_member_missing',
  /** A conclusion names a member that does not exist in the anchored contract. */
  'r1_ark_adapter_unknown_member',
  /** inherited-equivalent without locatable upstream source/doc evidence. */
  'r1_ark_adapter_evidence_required',
  /** unsupported without reason/impact. */
  'r1_ark_adapter_reason_required',
  /** Status value outside the closed set, or domain-level not-applicable. */
  'r1_ark_adapter_bad_status',
  /** An enumerated contract member was concluded not-applicable (fail-open escape). */
  'r1_ark_adapter_not_applicable_forbidden',
  /** A declared token conclusion cannot be backed by the headless upstream. */
  'r1_ark_adapter_token_unbacked',
] as const;

export type R1ArkAdapterErrorCode = (typeof r1ArkAdapterErrorCodes)[number];

export interface R1ArkDiagnostic {
  code: R1ArkAdapterErrorCode;
  /** Stable locator, e.g. dialog/props/open. */
  path: string;
  message: string;
  expected?: unknown;
  actual?: unknown;
  repairHint?: string;
}

export function hasArkErrors(diagnostics: readonly R1ArkDiagnostic[]): boolean {
  return diagnostics.length > 0;
}
