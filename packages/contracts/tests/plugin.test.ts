import { describe, expect, it } from 'vitest';

import { validatePlugin } from '../src/validate.js';
import type { PluginContract } from '../src/types.js';

const theme: PluginContract = {
  kind: 'theme',
  id: 'future-ui-light',
  contractVersion: '1.0.0',
  provides: ['theme:light'],
  requires: [],
  compatibility: { platform: 'web', engines: { futureUi: '>=1.0.0' } },
  scope: { app: true, request: false, description: 'app-level theme, no per-request state' },
  lifecycle: { init: true, dispose: true, cleanupOnFailure: true },
};

describe('Plugin contract (M0 minimal Plugin Kernel)', () => {
  it('accepts a valid theme plugin', () => {
    const result = validatePlugin(theme);
    expect(result.valid).toBe(true);
    expect(result.diagnostics).toEqual([]);
  });

  it('rejects an unknown kind with constraint_violation', () => {
    const bad = { ...theme, kind: 'universal' };
    const result = validatePlugin(bad);
    expect(result.valid).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'constraint_violation', path: '/kind' }),
    );
  });

  it('rejects missing lifecycle semantics with missing_required', () => {
    const { lifecycle: _lifecycle, ...bad } = theme;
    const result = validatePlugin(bad);
    expect(result.valid).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'missing_required' }),
    );
  });

  it('rejects unknown major with unknown_major_version', () => {
    const bad = { ...theme, contractVersion: '0.1.0' };
    const result = validatePlugin(bad);
    expect(result.valid).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'unknown_major_version', actual: '0.1.0' }),
    );
  });
});
