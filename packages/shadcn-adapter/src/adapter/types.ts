/**
 * D15 Library Adapter mapping data structures (accepted R1-01 §D15).
 *
 * Declarative, member-level conclusions only — no executable JS, no eval.
 * Domain-level conclusions never replace member-level conclusions, and
 * `not-applicable` exists only at member level.
 */

export const MAPPING_DOMAINS = [
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

export type MappingDomain = (typeof MAPPING_DOMAINS)[number];

/** The 8 Component Contract required domains (never not-applicable). */
export const CONTRACT_DOMAINS = MAPPING_DOMAINS.filter((d) => d !== 'token');

export type MemberStatus =
  | 'mapped'
  | 'inherited-equivalent'
  | 'unsupported'
  | 'not-applicable';

/** How a `mapped` conclusion is realized. */
export type MappingVia =
  /** direct prop/mechanism on the vendored shadcn component */
  | 'upstream-prop'
  /** native HTML semantics of the element shadcn renders */
  | 'native'
  /** provided by the Radix base without adapter code */
  | 'radix'
  /** realized by this package's thin composition layer (reference/wrappers) */
  | 'composition';

export interface MemberConclusion {
  /** member name exactly as declared in the anchored contract instance */
  member: string;
  status: MemberStatus;
  /** required when status = mapped */
  via?: MappingVia;
  /** concrete upstream prop / part / mechanism the member maps to */
  mapsTo?: string;
  /**
   * Required when status = inherited-equivalent: a locator into vendored
   * upstream source (file:line) or official upstream docs, reviewable during
   * the mapping review (D15 冻结规则 2).
   */
  evidence?: string;
  /** required when status = unsupported / not-applicable */
  reason?: string;
  /** impact note for behavior differences (D15 规则 3) */
  impact?: string;
  /** non-normative clarification */
  note?: string;
  /**
   * Token-domain only: when a conclusion resolves to a concrete project
   * value, it must name a tokenKey that resolves in the D16 Project Profile.
   * Scale bases (e.g. spacing.scale) and pure variant hooks omit this.
   */
  profileTokenKey?: string;
}

export interface ComponentMapping {
  /** frozen contract anchor — validated against the react-provider instances */
  anchor: {
    componentType: string;
    contractVersion: string;
  };
  /** one member conclusion list per domain; token is the visual layer */
  domains: Record<MappingDomain, MemberConclusion[]>;
  /** upstream extras that have NO contract member (D15 规则 3, reverse direction) */
  upstreamExtras?: string[];
}

export type ComponentMappingStatus = 'supported' | 'partial' | 'unsupported';

export interface ComponentMappingReport {
  componentType: string;
  status: ComponentMappingStatus;
  unsupported: string[];
  missing: string[];
}
