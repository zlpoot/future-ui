/**
 * R1-04 Phase C — Ark UI member-level adapter mapping data structures.
 *
 * INDEPENDENT of the shadcn adapter (this file does not import its mapping
 * types). The vocabulary mirrors the accepted D15 member-level methodology —
 * member-level conclusions only, domain-level not-applicable forbidden — but
 * the realization mechanism is Ark-specific. The frozen Component Contract
 * instances in @future-ui/react-provider remain the single semantic anchor;
 * this adapter adds no contract members and no second Project Profile.
 */

export const ARK_MAPPING_DOMAINS = [
  'features',
  'props',
  'events',
  'state',
  'parts',
  'control',
  'accessibility',
  'lifecycle',
  'token',
] as const;

export type ArkMappingDomain = (typeof ARK_MAPPING_DOMAINS)[number];

/** The 8 Component Contract required domains (the token domain is visual). */
export const ARK_CONTRACT_DOMAINS = ARK_MAPPING_DOMAINS.filter((d) => d !== 'token');

export type ArkMemberStatus =
  | 'mapped'
  | 'inherited-equivalent'
  | 'unsupported'
  | 'not-applicable';

/** How a `mapped` conclusion is realized by THIS adapter. */
export type ArkMappingVia =
  /** an actual @ark-ui/react export / zag state-machine mechanism */
  | 'ark-primitive'
  /** native HTML semantics of the element the Ark factory renders (ark.input / native button) */
  | 'native'
  /** realized by this package's thin, honestly-labelled composition layer */
  | 'composition';

export interface ArkMemberConclusion {
  /** member name exactly as declared in the anchored contract instance */
  member: string;
  status: ArkMemberStatus;
  /** required when status = mapped */
  via?: ArkMappingVia;
  /** concrete Ark/zag/native mechanism the member maps to */
  mapsTo?: string;
  /** required when inherited-equivalent: package-relative source or official docs anchor */
  evidence?: string;
  /** required when unsupported */
  reason?: string;
  /** impact note for behavior differences */
  impact?: string;
  note?: string;
}

export interface ArkComponentMapping {
  anchor: {
    componentType: string;
    contractVersion: string;
  };
  domains: Record<ArkMappingDomain, ArkMemberConclusion[]>;
  /** Ark/zag extras that have NO contract member (reverse direction). */
  upstreamExtras?: string[];
}

export type ArkComponentMappingStatus = 'supported' | 'partial' | 'unsupported';

export interface ArkComponentMappingReport {
  componentType: string;
  status: ArkComponentMappingStatus;
  unsupported: string[];
  missing: string[];
}
