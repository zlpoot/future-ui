import type { R1Diagnostic } from '../errors.js';
import type {
  ProjectProfile,
  RatioToken,
  ResolvedToken,
  SizeStep,
} from './types.js';

export type ProfileResult<T> =
  | { ok: true; value: T }
  | { ok: false; diagnostics: R1Diagnostic[] };

const MAX_ALIAS_DEPTH = 16;
const KNOWN_DIMENSIONS = ['length', 'duration', 'unitless'] as const;

function err(
  code: R1Diagnostic['code'],
  path: string,
  message: string,
  expected?: unknown,
  actual?: unknown,
  repairHint?: string,
): R1Diagnostic {
  return { code, path, message, expected, actual, repairHint };
}

function toCanonical(profile: ProjectProfile, value: number, dimension: string, unit: string): number | null {
  const decl = profile.dimensions[dimension as keyof ProjectProfile['dimensions']];
  if (!decl) return null;
  if (unit === decl.canonicalUnit) return value;
  const mult = decl.unitConversions?.[unit];
  if (mult === undefined) return null;
  return value * mult;
}

function declaredDimension(profile: ProjectProfile, dimension: string): boolean {
  return (KNOWN_DIMENSIONS as readonly string[]).includes(dimension)
    && Boolean(profile.dimensions[dimension as keyof ProjectProfile['dimensions']]);
}

/**
 * Resolve one tokenKey to a terminal concrete value. Deterministic: the same
 * (profile, key) always yields the same value/dimension/unit.
 */
export function resolveToken(
  profile: ProjectProfile,
  tokenKey: string,
  result: { diagnostics: R1Diagnostic[] } = { diagnostics: [] },
  _trace: string[] = [],
): ResolvedToken | null {
  const trace = [..._trace, tokenKey];
  if (new Set(trace).size > MAX_ALIAS_DEPTH) {
    result.diagnostics.push(err('r1_profile_alias_too_deep', `tokens/${tokenKey}`,
      `Alias chain visits more than ${MAX_ALIAS_DEPTH} distinct token keys.`,
      `<= ${MAX_ALIAS_DEPTH}`, trace.length));
    return null;
  }
  const token = profile.tokens[tokenKey];
  if (!token) {
    result.diagnostics.push(err('r1_profile_token_not_found', `tokens/${tokenKey}`,
      'Referenced token key does not exist in the Profile.',
      Object.keys(profile.tokens), tokenKey));
    return null;
  }

  if (token.kind === 'literal') {
    const dimension = token.dimension ?? 'unitless';
    const unit = token.unit ?? profile.dimensions.unitless.canonicalUnit;
    if (!declaredDimension(profile, dimension)) {
      result.diagnostics.push(err('r1_profile_unknown_dimension', `tokens/${tokenKey}`,
        'Literal dimension is not declared in the Profile.', KNOWN_DIMENSIONS, dimension));
      return null;
    }
    if (toCanonical(profile, token.value, dimension, unit) === null) {
      result.diagnostics.push(err('r1_profile_unknown_dimension', `tokens/${tokenKey}`,
        `Unit ${unit} is not declared/convertible for dimension ${dimension}.`));
      return null;
    }
    return { value: token.value, dimension, unit };
  }

  if (token.kind === 'alias') {
    if (trace.slice(0, -1).includes(tokenKey)) {
      result.diagnostics.push(err('r1_profile_alias_cycle', `tokens/${tokenKey}`,
        'Alias chain contains a cycle.', 'acyclic', trace));
      return null;
    }
    if (trace.slice(0, -1).includes(token.ref)) {
      result.diagnostics.push(err('r1_profile_alias_cycle', `tokens/${tokenKey}`,
        `Alias ref ${token.ref} forms a cycle.`, 'acyclic', trace));
      return null;
    }
    const target = resolveToken(profile, token.ref, result, trace);
    if (!target) return null;
    return target;
  }

  // ratio
  const ratio = token as RatioToken;
  if (typeof ratio.factor !== 'number' || !Number.isFinite(ratio.factor) || ratio.factor <= 0) {
    result.diagnostics.push(err('r1_profile_ratio_invalid_factor', `tokens/${tokenKey}`,
      'Ratio factor must be a positive finite number.', '> 0 finite', ratio.factor));
    return null;
  }
  const base = resolveToken(profile, ratio.base, result, trace);
  if (!base) {
    if (!profile.tokens[ratio.base]) {
      result.diagnostics.push(err('r1_profile_ratio_base_missing', `tokens/${tokenKey}`,
        `Ratio base ${ratio.base} does not exist.`, Object.keys(profile.tokens), ratio.base));
    }
    return null;
  }
  const baseCanonical = toCanonical(profile, base.value, base.dimension, base.unit);
  const ratioCanonicalUnit = profile.dimensions[ratio.dimension]?.canonicalUnit;
  if (!declaredDimension(profile, ratio.dimension) || !ratioCanonicalUnit) {
    result.diagnostics.push(err('r1_profile_unknown_dimension', `tokens/${tokenKey}`,
      'Ratio dimension is not declared in the Profile.', KNOWN_DIMENSIONS, ratio.dimension));
    return null;
  }
  if (baseCanonical === null || toCanonical(profile, 1, ratio.dimension, ratio.unit) === null) {
    result.diagnostics.push(err('r1_profile_unknown_dimension', `tokens/${tokenKey}`,
      `Unit ${ratio.unit} not declared/convertible for dimension ${ratio.dimension}.`));
    return null;
  }
  // Same dimension required; illegal unitless↔physical mixes (freeze rule 4).
  if (base.dimension !== ratio.dimension) {
    result.diagnostics.push(err('r1_profile_dimension_mismatch', `tokens/${tokenKey}`,
      'Ratio/base dimensions disagree with no declared conversion.',
      base.dimension, ratio.dimension));
    return null;
  }
  const outCanonical = baseCanonical * ratio.factor;
  const outMult = ratio.unit === ratioCanonicalUnit
    ? 1
    : profile.dimensions[ratio.dimension].unitConversions?.[ratio.unit];
  if (!outMult) {
    result.diagnostics.push(err('r1_profile_unknown_dimension', `tokens/${tokenKey}`,
      `Cannot convert result unit ${ratio.unit}.`));
    return null;
  }
  return { value: outCanonical / outMult, dimension: ratio.dimension, unit: ratio.unit };
}

/** Convenience boolean resolver (throws-free). */
export function tryResolveToken(profile: ProjectProfile, tokenKey: string): ProfileResult<ResolvedToken> {
  const acc = { diagnostics: [] as R1Diagnostic[] };
  const value = resolveToken(profile, tokenKey, acc);
  if (acc.diagnostics.length > 0 || !value) return { ok: false, diagnostics: acc.diagnostics };
  return { ok: true, value };
}

/** Validate a whole profile: closed dimensions, resolvable tokens, size/variant targets. */
export function validateProfile(profile: ProjectProfile): R1Diagnostic[] {
  const diagnostics: R1Diagnostic[] = [];
  for (const dim of KNOWN_DIMENSIONS) {
    if (!profile.dimensions[dim]) {
      diagnostics.push(err('r1_profile_unknown_dimension', `dimensions/${dim}`,
        'Required dimension is not declared.', KNOWN_DIMENSIONS, undefined));
    }
  }
  for (const key of Object.keys(profile.tokens)) {
    const acc = { diagnostics: [] as R1Diagnostic[] };
    resolveToken(profile, key, acc);
    diagnostics.push(...acc.diagnostics);
  }
  const checkSteps = (steps: SizeStep[], group: string) => {
    for (const step of steps) {
      if (!profile.tokens[step.tokenKey]) {
        diagnostics.push(err('r1_profile_size_target_missing', `sizes/${group}/${step.id}`,
          `Size档位 ${step.id} points at an undefined token.`,
          Object.keys(profile.tokens), step.tokenKey));
      }
    }
  };
  checkSteps(profile.sizes.controlHeight, 'controlHeight');
  checkSteps(profile.sizes.dialogWidth, 'dialogWidth');
  checkSteps(profile.sizes.spacing, 'spacing');
  return diagnostics;
}

/** Resolve a variant id; unknownVariantPolicy=error means no silent fallback. */
export function resolveVariant(
  profile: ProjectProfile,
  variantId: string,
): ProfileResult<ProjectProfile['variants'][string]> {
  const v = profile.variants[variantId];
  if (!v) {
    return {
      ok: false,
      diagnostics: [err('r1_profile_variant_not_found', `variants/${variantId}`,
        'Unknown variantId; profile policy is error (no silent fallback).',
        Object.keys(profile.variants), variantId)],
    };
  }
  return { ok: true, value: v };
}
