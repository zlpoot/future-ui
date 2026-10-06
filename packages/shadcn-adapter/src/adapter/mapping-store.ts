import type { ComponentContract } from '@future-ui/contracts';
import {
  buttonContract,
  dialogContract,
  textInputContract,
  BUTTON_COMPONENT_TYPE,
  DIALOG_COMPONENT_TYPE,
  TEXT_INPUT_COMPONENT_TYPE,
} from '@future-ui/react-provider';

import type { R1Diagnostic } from '../errors.js';
import { adapterIdentity } from '../upstream-provenance.js';
import { buttonMapping, dialogMapping, textInputMapping } from './mappings.js';
import type {
  ComponentMapping,
  ComponentMappingReport,
  ComponentMappingStatus,
  MappingDomain,
  MemberConclusion,
  MemberStatus,
} from './types.js';
import { MAPPING_DOMAINS } from './types.js';

export { adapterIdentity } from '../upstream-provenance.js';

const VALID_STATUS: readonly MemberStatus[] = [
  'mapped',
  'inherited-equivalent',
  'unsupported',
  'not-applicable',
];

const contractsByType: Readonly<Record<string, ComponentContract>> = {
  [DIALOG_COMPONENT_TYPE]: dialogContract,
  [BUTTON_COMPONENT_TYPE]: buttonContract,
  [TEXT_INPUT_COMPONENT_TYPE]: textInputContract,
};

const mappingsByType: Readonly<Record<string, ComponentMapping>> = {
  [DIALOG_COMPONENT_TYPE]: dialogMapping,
  [BUTTON_COMPONENT_TYPE]: buttonMapping,
  [TEXT_INPUT_COMPONENT_TYPE]: textInputMapping,
};

/** The exact set of member names a contract instance declares in a domain. */
function contractMembers(contract: ComponentContract, domain: MappingDomain): string[] {
  switch (domain) {
    case 'features': return Object.keys(contract.features);
    case 'props': return Object.keys(contract.props);
    case 'events': return Object.keys(contract.events);
    case 'parts': return Object.keys(contract.parts);
    case 'control': return Object.keys(contract.control);
    case 'state':
      return ['ownership', ...Object.keys(contract.state.fields ?? {})];
    case 'accessibility':
      return ['role', ...(['keyboard', 'focus', 'semanticRelations'] as const).filter(
        (k) => contract.accessibility[k] !== undefined,
      )];
    case 'lifecycle': return ['requiresCleanup'];
    case 'token': return []; // Profile-side visual layer; members are declared by the mapping itself.
  }
}

function err(
  code: R1Diagnostic['code'],
  path: string,
  message: string,
  expected?: unknown,
  actual?: unknown,
): R1Diagnostic {
  return { code, path, message, expected, actual };
}

/**
 * Validate ONE component mapping against its anchored contract instance.
 * Enforces D15 member-level completeness, evidence and status rules.
 */
export function validateComponentMapping(mapping: ComponentMapping): R1Diagnostic[] {
  const diagnostics: R1Diagnostic[] = [];
  const { componentType, contractVersion } = mapping.anchor;
  const base = `${componentType}`;

  const contract = contractsByType[componentType];
  if (!contract) {
    diagnostics.push(err('r1_adapter_anchor_mismatch', `${base}/anchor`,
      `No frozen contract instance for componentType ${componentType}.`,
      Object.keys(contractsByType), componentType));
    return diagnostics;
  }
  if (contractVersion !== contract.contractVersion) {
    diagnostics.push(err('r1_adapter_anchor_mismatch', `${base}/anchor/contractVersion`,
      'Mapping anchor contractVersion must equal the frozen contract instance.',
      contract.contractVersion, contractVersion));
  }
  if (!contractVersion.startsWith('1.')) {
    diagnostics.push(err('r1_adapter_anchor_mismatch', `${base}/anchor/contractVersion`,
      'contractVersion major must equal CONTRACT_MAJOR = 1.', '1.x', contractVersion));
  }

  for (const domain of MAPPING_DOMAINS) {
    const conclusions = mapping.domains[domain];
    if (!Array.isArray(conclusions)) {
      diagnostics.push(err('r1_adapter_domain_missing', `${base}/${domain}`,
        `Domain ${domain} must list member-level conclusions.`));
      continue;
    }
    const byName = new Map<string, MemberConclusion>();
    for (const c of conclusions) {
      if (byName.has(c.member)) {
        diagnostics.push(err('r1_adapter_unknown_member', `${base}/${domain}/${c.member}`,
          'Duplicate member conclusion.'));
      }
      byName.set(c.member, c);
    }

    if (domain === 'token' && conclusions.length === 0) {
      diagnostics.push(err('r1_adapter_token_domain_empty', `${base}/token`,
        'Visual token domain must not be empty; zero visual mapping cannot be "supported".'));
    }

    const expectedMembers = contractMembers(contract, domain);
    const actualMembers = [...byName.keys()];

    // Domain-level not-applicable is structurally impossible; check members.
    for (const member of expectedMembers) {
      const c = byName.get(member);
      if (!c) {
        diagnostics.push(err('r1_adapter_member_missing', `${base}/${domain}/${member}`,
          `Contract member ${member} has no member-level conclusion in domain ${domain}.`));
        continue;
      }
      validateConclusion(diagnostics, `${base}/${domain}/${member}`, c, domain);
    }
    for (const member of actualMembers.filter((m) => !expectedMembers.includes(m))) {
      // The token domain has no contract-side member enumeration; extras there
      // are allowed, but the eight contract domains cannot invent members.
      if (domain !== 'token') {
        diagnostics.push(err('r1_adapter_unknown_member', `${base}/${domain}/${member}`,
          `Conclusion member ${member} is not declared by the anchored contract instance.`,
          expectedMembers, member));
      }
    }
  }

  return diagnostics;
}

function validateConclusion(
  diagnostics: R1Diagnostic[],
  path: string,
  c: MemberConclusion,
  domain: MappingDomain,
): void {
  if (!VALID_STATUS.includes(c.status)) {
    diagnostics.push(err('r1_adapter_bad_status', path,
      `Status must be one of ${VALID_STATUS.join(' | ')}.`, VALID_STATUS, c.status));
    return;
  }
  if (domain !== 'token' && c.status === 'not-applicable' && !c.reason) {
    diagnostics.push(err('r1_adapter_reason_required', path,
      'Member-level not-applicable requires a reason tied to the contract instance.'));
  }
  if (c.status === 'mapped' && !(c.via && c.mapsTo)) {
    diagnostics.push(err('r1_adapter_bad_status', path,
      "status 'mapped' requires via + mapsTo describing the concrete upstream mechanism."));
  }
  if (c.status === 'inherited-equivalent' && !c.evidence) {
    diagnostics.push(err('r1_adapter_evidence_required', path,
      "status 'inherited-equivalent' requires a locatable upstream source/doc evidence."));
  }
  if (c.status === 'unsupported' && !c.reason) {
    diagnostics.push(err('r1_adapter_reason_required', path,
      "status 'unsupported' requires a reason and impact statement."));
  }
}

/** Validate every adapter mapping; returns all diagnostics (fail-closed). */
export function validateAdapterMappings(
  mappings: readonly ComponentMapping[] = [dialogMapping, buttonMapping, textInputMapping],
): R1Diagnostic[] {
  return mappings.flatMap((m) => validateComponentMapping(m));
}

function reportFor(mapping: ComponentMapping): ComponentMappingReport {
  const diagnostics = validateComponentMapping(mapping);
  const { componentType } = mapping.anchor;
  const unsupported: string[] = [];
  for (const domain of MAPPING_DOMAINS) {
    for (const c of mapping.domains[domain] ?? []) {
      if (c.status === 'unsupported') unsupported.push(`${domain}.${c.member}`);
    }
  }
  const missing = diagnostics
    .filter((d) => d.code === 'r1_adapter_member_missing' || d.code === 'r1_adapter_domain_missing'
      || d.code === 'r1_adapter_token_domain_empty')
    .map((d) => d.path);
  // Anchor mismatch / malformed table → cannot be consumed as a valid mapping.
  const hardInvalid = diagnostics.some((d) => d.code === 'r1_adapter_anchor_mismatch');
  let status: ComponentMappingStatus;
  if (hardInvalid) status = 'unsupported';
  else if (unsupported.length > 0 || diagnostics.length > 0) status = 'partial';
  else status = 'supported';
  return { componentType, status, unsupported, missing };
}

export function getAdapterIdentity() {
  return adapterIdentity;
}

export function getComponentMapping(componentType: string): ComponentMapping | undefined {
  return mappingsByType[componentType];
}

export function getComponentMappingReports(): ComponentMappingReport[] {
  return [dialogMapping, buttonMapping, textInputMapping].map(reportFor);
}

/**
 * Cross-check the visual token layer: every token-domain conclusion that
 * declares a concrete `profileTokenKey` must resolve in the D16 Profile.
 */
export function validateMappingProfileLinkage(
  mapping: ComponentMapping,
  resolve: (tokenKey: string) => { ok: boolean },
): R1Diagnostic[] {
  const diagnostics: R1Diagnostic[] = [];
  for (const c of mapping.domains.token ?? []) {
    if (!c.profileTokenKey) continue;
    const res = resolve(c.profileTokenKey);
    if (!res.ok) {
      diagnostics.push(err('r1_profile_mapping_token_missing',
        `${mapping.anchor.componentType}/token/${c.member}`,
        `Mapping token ${c.member} names profile token ${c.profileTokenKey}, which does not resolve.`,
        'a resolvable Project Profile tokenKey', c.profileTokenKey));
    }
  }
  return diagnostics;
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const key of Object.keys(value as Record<string, unknown>)) {
    deepFreeze((value as Record<string, unknown>)[key]);
  }
  return Object.freeze(value);
}

/**
 * D15 freeze entry: mapping tables and Profile are frozen before mapping
 * review / mapping review; runtime sees the same frozen objects.
 */
export function freezeAdapterData(profile: unknown = undefined): {
  mappings: readonly ComponentMapping[];
  profile: unknown;
} {
  return {
    mappings: [dialogMapping, buttonMapping, textInputMapping].map((m) => deepFreeze(m)),
    profile: profile === undefined ? undefined : deepFreeze(profile),
  };
}

// Freeze shipped mapping data once at module load.
freezeAdapterData();
