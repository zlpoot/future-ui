/**
 * D16 Project Profile data structures (accepted R1-01 §D16).
 *
 * First version: only the minimum the EditDialog reference consumes.
 * Machine-validatable JSON Schema remains Deferred; this is strict TypeScript
 * data + a deterministic resolver/validator (no public Schema change).
 */

export interface DimensionDecl {
  /** canonical unit; all other units must declare a conversion to it */
  canonicalUnit: string;
  /** extra unit → multiplier to canonical (value_canonical = value * mult) */
  unitConversions?: Record<string, number>;
}

export type TokenKind = 'literal' | 'alias' | 'ratio';

export interface LiteralToken {
  kind: 'literal';
  /** concrete value */
  value: number;
  /** omit = unitless; otherwise one of the Profile's declared dimensions */
  dimension?: DimensionName;
  unit?: UnitName;
}

export interface AliasToken {
  kind: 'alias';
  /** tokenKey that must exist in the same Profile */
  ref: string;
}

export interface RatioToken {
  kind: 'ratio';
  /** existing tokenKey in the same Profile */
  base: string;
  /** dimensionless positive factor */
  factor: number;
  dimension: DimensionName;
  unit: UnitName;
}

export type ProfileToken = LiteralToken | AliasToken | RatioToken;
export type DimensionName = 'length' | 'duration' | 'unitless';
export type UnitName = string;

export interface SizeStep {
  /** library-neutral档位 id, e.g. sm/md/lg */
  id: string;
  /** must resolve to a concrete token */
  tokenKey: string;
  description?: string;
}

export interface ProfileVariant {
  variantId: string;
  tokenOverrides: Record<string, string>;
  description?: string;
}

/** R1-DLG-08 blocking declaration subset enforced by the reference/checks. */
export interface BlockingConvention {
  declared: true;
  reason: string;
  closePolicy: string;
  resolutionPath: string[];
  failureFallback: { retryLimit: number; then: string };
  /** may only relax R1-DLG-02's ordinary close entry; never operability 1-8 */
  exceptionId?: string;
}

export interface DialogConventions {
  /** R1-DLG-01 */
  accessibleNameFrom: 'label';
  /** R1-DLG-02: an explicit on-screen close entry is always rendered in the reference */
  explicitCloseEntries: Array<'cancel-action' | 'x-control'>;
  escapeAndOverlayAreAdditionalOnly: boolean;
  /** R1-DLG-03: footer order left→right, profile-fixed */
  footerOrder: ['cancel', 'primary'];
  primaryVariant: string;
  cancelVariant: string;
  /** R1-DLG-04 */
  pendingBlocksResubmit: boolean;
  /** R1-DLG-05 */
  pendingCloseIsConfirmedNeverSilent: boolean;
  /** R1-DLG-06 */
  focusEnterAndRestore: boolean;
  /** R1-DLG-07 */
  draftFieldsAgentVisibleByDefault: false;
  blocking: BlockingConvention;
}

export interface ProfileException {
  exceptionId: string;
  ruleId: 'R1-DLG-02';
  scenario: string;
  rationale: string;
  expiryCondition: string;
}

export interface ProjectProfile {
  identity: {
    profileId: string;
    profileVersion: string;
    scope: string;
  };
  dimensions: Record<DimensionName, DimensionDecl>;
  tokens: Record<string, ProfileToken>;
  sizes: {
    controlHeight: SizeStep[];
    dialogWidth: SizeStep[];
    spacing: SizeStep[];
  };
  variants: Record<string, ProfileVariant>;
  /** behavior for an unknown variantId (D16: must be explicit; no silent fallback) */
  unknownVariantPolicy: 'error';
  dialogConventions: DialogConventions;
  exceptions: ProfileException[];
}

/** A fully resolved terminal value (always a literal). */
export interface ResolvedToken {
  value: number;
  dimension: DimensionName;
  unit: UnitName;
}
