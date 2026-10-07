import { describe, expect, it } from 'vitest';

import {
  editDialogProfile,
  resolveToken,
  tryResolveToken,
  validateProfile,
  resolveVariant,
} from '../src/index.js';

describe('D16 Project Profile resolver', () => {
  it('profile validates (closed dimensions, resolvable tokens, size/variant targets)', () => {
    expect(validateProfile(editDialogProfile)).toEqual([]);
  });

  it('resolves literals to px/ms', () => {
    const rem = tryResolveToken(editDialogProfile, 'length.rem');
    const dur = tryResolveToken(editDialogProfile, 'dialog.duration');
    expect(rem.ok ? rem.value : null).toEqual({ value: 16, dimension: 'length', unit: 'px' });
    expect(dur.ok ? dur.value : null).toEqual({ value: 200, dimension: 'duration', unit: 'ms' });
  });

  it('resolves ratios to rem-derived px values', () => {
    const h = tryResolveToken(editDialogProfile, 'control.height.md');
    const w = tryResolveToken(editDialogProfile, 'dialog.width.max');
    const r = tryResolveToken(editDialogProfile, 'control.radius');
    expect(h.ok ? h.value : null).toEqual({ value: 36, dimension: 'length', unit: 'px' });
    expect(w.ok ? w.value : null).toEqual({ value: 512, dimension: 'length', unit: 'px' });
    expect(r.ok ? r.value : null).toEqual({ value: 6, dimension: 'length', unit: 'px' });
  });

  it('resolves aliases (dialog.padding → space.6 → 24px, dialog.gap → 16px)', () => {
    const p = tryResolveToken(editDialogProfile, 'dialog.padding');
    const g = tryResolveToken(editDialogProfile, 'dialog.gap');
    const r = tryResolveToken(editDialogProfile, 'dialog.radius');
    expect(p.ok ? p.value : null).toEqual({ value: 24, dimension: 'length', unit: 'px' });
    expect(g.ok ? g.value : null).toEqual({ value: 16, dimension: 'length', unit: 'px' });
    expect(r.ok ? r.value : null).toEqual({ value: 8, dimension: 'length', unit: 'px' });
  });

  it('returns token_not_found for an unknown key', () => {
    const res = tryResolveToken(editDialogProfile, 'nope');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.diagnostics[0].code).toBe('r1_profile_token_not_found');
  });

  it('detects alias cycles', () => {
    const p = structuredClone(editDialogProfile);
    p.tokens = {
      a: { kind: 'alias', ref: 'b' },
      b: { kind: 'alias', ref: 'a' },
    };
    const res = tryResolveToken(p, 'a');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.diagnostics.some((d) => d.code === 'r1_profile_alias_cycle')).toBe(true);
  });

  it('rejects a non-positive / non-finite ratio factor', () => {
    const p = structuredClone(editDialogProfile);
    p.tokens = { base: { kind: 'literal', value: 10, dimension: 'length', unit: 'px' }, bad: { kind: 'ratio', base: 'base', factor: 0, dimension: 'length', unit: 'px' } };
    const res = tryResolveToken(p, 'bad');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.diagnostics[0].code).toBe('r1_profile_ratio_invalid_factor');
  });

  it('rejects dimension/unit disagreement with no declared conversion', () => {
    const p = structuredClone(editDialogProfile);
    p.tokens = { base: { kind: 'literal', value: 10, dimension: 'length', unit: 'px' }, bad: { kind: 'ratio', base: 'base', factor: 1, dimension: 'duration', unit: 'ms' } };
    const res = tryResolveToken(p, 'bad');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.diagnostics.some((d) => d.code === 'r1_profile_dimension_mismatch')).toBe(true);
  });

  it('rejects an undeclared unit', () => {
    const p = structuredClone(editDialogProfile);
    p.tokens = { weird: { kind: 'literal', value: 10, dimension: 'length', unit: 'pt' } };
    const diagnostics = validateProfile(p);
    expect(diagnostics.some((d) => d.code === 'r1_profile_unknown_dimension')).toBe(true);
  });

  it('errors on unknown variantId (no silent fallback)', () => {
    const res = resolveVariant(editDialogProfile, 'ghost-banned');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.diagnostics[0].code).toBe('r1_profile_variant_not_found');
    expect(resolveVariant(editDialogProfile, 'primary').ok).toBe(true);
  });

  it('is deterministic for the same key', () => {
    const r1 = resolveToken(editDialogProfile, 'control.height.lg');
    const r2 = resolveToken(editDialogProfile, 'control.height.lg');
    expect(r1).toEqual(r2);
  });
});
