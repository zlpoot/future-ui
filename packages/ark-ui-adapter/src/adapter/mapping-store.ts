/**
 * Fail-closed validator for the Ark UI member-level mapping tables.
 *
 * The single semantic anchor remains the frozen Component Contract instance
 * in @future-ui/react-provider. For every LITERAL contract domain
 * (features/props/events/state/parts/control/accessibility/lifecycle) the
 * expected member set is DERIVED FROM THE FROZEN CONTRACT OBJECT and must
 * equal the concluded member set exactly — a missing member, an unknown
 * member or a duplicate is an error (no domain-level "not-applicable"
 * escape hatch). The token domain is exempt from membership matching because
 * a headless primitive has no contract token block, but it must still be
 * present and honestly concluded.
 */
import type { ComponentContract } from '@future-ui/contracts';

import type { R1ArkDiagnostic } from '../errors.js';
import type {
  ArkComponentMapping,
  ArkComponentMappingReport,
  ArkComponentMappingStatus,
  ArkMappingDomain,
  ArkMemberConclusion,
  ArkMemberStatus,
} from './types.js';

const LITERAL_DOMAINS = [
  'features',
  'props',
  'events',
  'state',
  'parts',
  'control',
  'accessibility',
  'lifecycle',
] as const;

const VALID_STATUS: readonly ArkMemberStatus[] = [
  'mapped',
  'inherited-equivalent',
  'unsupported',
  'not-applicable',
];

/** Derive the exact expected member names for a literal domain from the frozen contract. */
function expectedMembers(contract: ComponentContract, domain: (typeof LITERAL_DOMAINS)[number]): Set<string> {
  const out = new Set<string>();
  switch (domain) {
    case 'features':
      for (const [k, v] of Object.entries(contract.features ?? {})) if (v) out.add(k);
      break;
    case 'props':
      for (const k of Object.keys(contract.props ?? {})) out.add(k);
      break;
    case 'events':
      for (const k of Object.keys(contract.events ?? {})) out.add(k);
      break;
    case 'state':
      if (contract.state) {
        out.add('ownership');
        for (const k of Object.keys(contract.state.fields ?? {})) out.add(k);
      }
      break;
    case 'parts':
      for (const k of Object.keys(contract.parts ?? {})) out.add(k);
      break;
    case 'control':
      for (const k of Object.keys(contract.control ?? {})) out.add(k);
      break;
    case 'accessibility':
      for (const k of ['role', 'keyboard', 'focus', 'semanticRelations']) {
        if (k in (contract.accessibility ?? {})) out.add(k);
      }
      break;
    case 'lifecycle':
      if (contract.lifecycle && 'requiresCleanup' in contract.lifecycle) out.add('requiresCleanup');
      break;
  }
  return out;
}

function validateConclusion(
  c: ArkMemberConclusion,
  path: string,
  diagnostics: R1ArkDiagnostic[],
): void {
  if (!c.member || typeof c.member !== 'string') {
    diagnostics.push({ code: 'r1_ark_adapter_member_missing', path, message: 'conclusion has no member name' });
    return;
  }
  if (!VALID_STATUS.includes(c.status)) {
    diagnostics.push({
      code: 'r1_ark_adapter_bad_status',
      path: `${path}/${c.member}`,
      message: `status must be one of ${VALID_STATUS.join('|')}, got ${String(c.status)}`,
      actual: c.status,
    });
  }
  // Member-level not-applicable is a fail-open escape and is forbidden.
  if (c.status === 'not-applicable') {
    diagnostics.push({
      code: 'r1_ark_adapter_not_applicable_forbidden',
      path: `${path}/${c.member}`,
      message: 'enumerated contract member cannot be concluded not-applicable; map it or mark unsupported with a reason',
    });
  }
  if (c.status === 'mapped') {
    if (!c.via) {
      diagnostics.push({ code: 'r1_ark_adapter_evidence_required', path: `${path}/${c.member}`, message: 'mapped member requires a realization via (ark-primitive|native|composition)' });
    }
    if (!c.mapsTo || !c.mapsTo.trim()) {
      diagnostics.push({ code: 'r1_ark_adapter_evidence_required', path: `${path}/${c.member}`, message: 'mapped member requires a non-empty mapsTo mechanism' });
    }
  }
  if (c.status === 'inherited-equivalent' && (!c.evidence || !c.evidence.trim())) {
    diagnostics.push({ code: 'r1_ark_adapter_evidence_required', path: `${path}/${c.member}`, message: 'inherited-equivalent member requires locatable evidence' });
  }
  if (c.status === 'unsupported') {
    if (!c.reason || !c.reason.trim()) {
      diagnostics.push({ code: 'r1_ark_adapter_reason_required', path: `${path}/${c.member}`, message: 'unsupported member requires a reason' });
    }
    if (!c.impact || !c.impact.trim()) {
      diagnostics.push({ code: 'r1_ark_adapter_reason_required', path: `${path}/${c.member}`, message: 'unsupported member requires an impact note' });
    }
  }
}

export function validateArkComponentMapping(
  mapping: ArkComponentMapping,
  contract: ComponentContract,
): { diagnostics: R1ArkDiagnostic[]; report: ArkComponentMappingReport } {
  const diagnostics: R1ArkDiagnostic[] = [];
  const base = mapping.anchor.componentType;

  if (mapping.anchor.componentType !== contract.componentType) {
    diagnostics.push({
      code: 'r1_ark_adapter_anchor_mismatch',
      path: 'anchor.componentType',
      message: 'mapping is anchored to a different componentType than the frozen contract',
      expected: contract.componentType,
      actual: mapping.anchor.componentType,
    });
  }
  if (mapping.anchor.contractVersion !== contract.contractVersion) {
    diagnostics.push({
      code: 'r1_ark_adapter_anchor_mismatch',
      path: 'anchor.contractVersion',
      message: 'mapping contractVersion does not match the frozen contract',
      expected: contract.contractVersion,
      actual: mapping.anchor.contractVersion,
    });
  }

  const unsupported: string[] = [];
  const missing: string[] = [];

  for (const domain of LITERAL_DOMAINS) {
    const conclusions = mapping.domains[domain];
    if (!Array.isArray(conclusions)) {
      diagnostics.push({ code: 'r1_ark_adapter_domain_missing', path: `${base}/${domain}`, message: 'required domain absent from mapping' });
      for (const m of expectedMembers(contract, domain)) missing.push(`${domain}.${m}`);
      continue;
    }
    const expected = expectedMembers(contract, domain);
    const seen = new Set<string>();
    for (const c of conclusions) {
      validateConclusion(c, `${base}/${domain}`, diagnostics);
      if (seen.has(c.member)) {
        diagnostics.push({ code: 'r1_ark_adapter_unknown_member', path: `${base}/${domain}/${c.member}`, message: 'duplicate member conclusion' });
      }
      seen.add(c.member);
      if (!expected.has(c.member)) {
        diagnostics.push({ code: 'r1_ark_adapter_unknown_member', path: `${base}/${domain}/${c.member}`, message: 'conclusion names a member not declared in the frozen contract for this domain', actual: c.member });
      }
      if (c.status === 'unsupported') unsupported.push(`${domain}.${c.member}`);
    }
    for (const m of expected) {
      if (!seen.has(m)) {
        diagnostics.push({ code: 'r1_ark_adapter_member_missing', path: `${base}/${domain}/${m}`, message: 'frozen contract member has no member-level conclusion' });
        missing.push(`${domain}.${m}`);
      }
    }
  }

  // Token domain: headless Ark has no contract token block; require a present,
  // honestly-concluded non-empty set (validated but not membership-matched).
  const token = mapping.domains.token;
  if (!Array.isArray(token) || token.length === 0) {
    diagnostics.push({ code: 'r1_ark_adapter_token_unbacked', path: `${base}/token`, message: 'token domain must be present and honestly conclude the headless visual scope (cannot be silently empty)' });
  } else {
    for (const c of token) validateConclusion(c, `${base}/token`, diagnostics);
  }

  const status: ArkComponentMappingStatus =
    diagnostics.some((d) => d.code === 'r1_ark_adapter_anchor_mismatch') || unsupported.length === 0 && missing.length > 0
      ? 'unsupported'
      : unsupported.length > 0 || missing.length > 0
        ? 'partial'
        : 'supported';

  return {
    diagnostics,
    report: { componentType: contract.componentType, status, unsupported, missing },
  };
}

export function validateArkMappings(
  entries: ReadonlyArray<{ mapping: ArkComponentMapping; contract: ComponentContract }>,
): { diagnostics: R1ArkDiagnostic[]; reports: ArkComponentMappingReport[] } {
  const diagnostics: R1ArkDiagnostic[] = [];
  const reports: ArkComponentMappingReport[] = [];
  for (const { mapping, contract } of entries) {
    const r = validateArkComponentMapping(mapping, contract);
    diagnostics.push(...r.diagnostics);
    reports.push(r.report);
  }
  return { diagnostics, reports };
}

export const ALL_ARK_DOMAINS: readonly ArkMappingDomain[] = [
  ...LITERAL_DOMAINS,
  'token',
];
