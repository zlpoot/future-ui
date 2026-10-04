import { describe, expect, it } from 'vitest';

import { checkCompatibility, checkManifest, satisfies } from '../src/compat.js';
import { manifest, codeOf } from './helpers.js';

const provided = new Set(['theme:base', 'cap:cart']);

describe('checkManifest (structural, D02/D07)', () => {
  it('accepts a schema-valid manifest', () => {
    expect(checkManifest(manifest())).toEqual([]);
  });

  it('rejects a missing required field with missing_required', () => {
    const { id: _id, ...withoutId } = manifest();
    const codes = codeOf(checkManifest(withoutId));
    expect(codes).toContain('missing_required');
  });

  it('rejects an unknown field with unknown_field (strict reject per D02)', () => {
    const codes = codeOf(checkManifest({ ...manifest(), extra: 1 }));
    expect(codes).toContain('unknown_field');
  });

  it('rejects an unknown major contract version with unknown_major_version (no downgrade)', () => {
    const codes = codeOf(checkManifest(manifest({ contractVersion: '2.0.0' })));
    expect(codes).toContain('unknown_major_version');
  });

  it('rejects a non-semver contractVersion with constraint_violation', () => {
    const codes = codeOf(checkManifest(manifest({ contractVersion: 'latest' })));
    expect(codes).toContain('constraint_violation');
  });

  it('rejects a plugin kind outside the frozen enum', () => {
    const codes = codeOf(checkManifest({ ...manifest(), kind: 'market' }));
    expect(codes).toContain('constraint_violation');
  });
});

describe('checkCompatibility (runtime, D07(M0) rule 2)', () => {
  it('accepts a fully compatible manifest', () => {
    const d = checkCompatibility(manifest({ requires: ['theme:base'] }), { provided, platform: 'node' });
    expect(d).toEqual([]);
  });

  it('fails loudly on a missing dependency (no silent degradation)', () => {
    const d = checkCompatibility(manifest({ requires: ['theme:missing'] }), { provided, platform: 'node' });
    expect(codeOf(d)).toContain('constraint_violation');
    const hit = d.find((x) => x.code === 'constraint_violation');
    expect(hit?.path).toBe('/requires');
    expect(hit?.actual).toBe('absent');
  });

  it('refuses a duplicate provider with conflict', () => {
    const d = checkCompatibility(manifest({ provides: ['cap:cart'] }), { provided, platform: 'node' });
    expect(codeOf(d)).toContain('conflict');
    const hit = d.find((x) => x.code === 'conflict');
    expect(hit?.path).toBe('/provides');
    expect(hit?.actual).toBe('cap:cart');
  });

  it('refuses a platform mismatch with unsupported_feature', () => {
    const d = checkCompatibility(manifest(), { provided, platform: 'browser' });
    expect(codeOf(d)).toContain('unsupported_feature');
  });

  it('refuses an unsatisfied engine constraint with constraint_violation', () => {
    const contract = manifest({ compatibility: { platform: 'node', engines: { node: '>=25.0.0' } } });
    const d = checkCompatibility(contract, { provided, platform: 'node', engines: { node: '24.21.0' } });
    expect(codeOf(d)).toContain('constraint_violation');
    const hit = d.find((x) => x.code === 'constraint_violation');
    expect(hit?.path).toBe('/compatibility/engines/node');
  });

  it('accepts a satisfied engine constraint', () => {
    const contract = manifest({ compatibility: { platform: 'node', engines: { node: '>=24.0.0' } } });
    expect(checkCompatibility(contract, { provided, platform: 'node', engines: { node: '24.21.0' } })).toEqual([]);
  });
});

describe('satisfies (minimal semver ranges)', () => {
  it('supports exact, caret, tilde, star and >= ranges', () => {
    expect(satisfies('24.21.0', '24.21.0')).toBe(true);
    expect(satisfies('24.21.1', '24.21.0')).toBe(false);
    expect(satisfies('24.21.0', '^24.0.0')).toBe(true);
    expect(satisfies('25.0.0', '^24.0.0')).toBe(false);
    expect(satisfies('24.21.0', '~24.21.0')).toBe(true);
    expect(satisfies('24.22.0', '~24.21.0')).toBe(false);
    expect(satisfies('1.2.3', '*')).toBe(true);
    expect(satisfies('24.21.0', '>=24.0.0 <25.0.0')).toBe(true);
    expect(satisfies('25.0.0', '>=24.0.0 <25.0.0')).toBe(false);
  });
});
