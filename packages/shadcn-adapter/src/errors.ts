/**
 * R1-02 (#68) package-local diagnostics.
 *
 * Per the accepted R1-01 freeze (§「诊断映射」), rule severity → diagnostic
 * mapping uses an INDEPENDENT namespace. The frozen 12 core error codes in
 * `packages/contracts/src/diagnostics.ts` are not extended or reused here.
 */
export const r1AdapterErrorCodes = [
  /** Mapping anchor does not match the frozen contract instance. */
  'r1_adapter_anchor_mismatch',
  /** A required semantic domain is missing from the mapping. */
  'r1_adapter_domain_missing',
  /** A contract member has no conclusion (domain-level conclusions do not count). */
  'r1_adapter_member_missing',
  /** A conclusion names a member that does not exist in the anchored contract. */
  'r1_adapter_unknown_member',
  /** inherited-equivalent without a locatable upstream source/doc evidence. */
  'r1_adapter_evidence_required',
  /** unsupported without reason/impact. */
  'r1_adapter_reason_required',
  /** Status value outside the D15-closed set, or domain-level not-applicable. */
  'r1_adapter_bad_status',
  /** An enumerated contract member was concluded not-applicable (fail-open escape). */
  'r1_adapter_not_applicable_forbidden',
  /** The visual token domain is empty — zero visual mapping cannot be "supported". */
  'r1_adapter_token_domain_empty',
] as const;

export const r1ProfileErrorCodes = [
  /** Referenced token key does not exist in the Profile. */
  'r1_profile_token_not_found',
  /** Alias chain contains a cycle. */
  'r1_profile_alias_cycle',
  /** Alias chain visits more than 16 distinct token keys. */
  'r1_profile_alias_too_deep',
  /** Alias chain ends on a non-literal token. */
  'r1_profile_unresolved_terminal',
  /** Ratio base is missing or points at an undefined named base. */
  'r1_profile_ratio_base_missing',
  /** Ratio factor is missing, non-positive, non-finite, or carries a dimension. */
  'r1_profile_ratio_invalid_factor',
  /** Ratio/base dimension or unit disagree with no declared conversion (incl. illegal unitless mixes). */
  'r1_profile_dimension_mismatch',
  /** Dimension/unit is not declared in the Profile's closed set. */
  'r1_profile_unknown_dimension',
  /** A declared sizes档位 points at an undefined token. */
  'r1_profile_size_target_missing',
  /** Unknown variantId requested (profile policy = error). */
  'r1_profile_variant_not_found',
  /** A visual token referenced by a mapping conclusion is absent from the Profile. */
  'r1_profile_mapping_token_missing',
] as const;

export type R1AdapterErrorCode = (typeof r1AdapterErrorCodes)[number];
export type R1ProfileErrorCode = (typeof r1ProfileErrorCodes)[number];

export interface R1Diagnostic {
  code: R1AdapterErrorCode | R1ProfileErrorCode;
  /** Stable locator, e.g. dialog/props/open or tokens/dialog.gap. */
  path: string;
  message: string;
  expected?: unknown;
  actual?: unknown;
  repairHint?: string;
}

export function hasErrors(diagnostics: readonly R1Diagnostic[]): boolean {
  return diagnostics.length > 0;
}
