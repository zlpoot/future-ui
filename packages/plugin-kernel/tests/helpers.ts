import type { PluginContract } from '@future-ui/contracts';

/** Build a schema-valid M0 plugin manifest for tests. */
export function manifest(overrides: Partial<PluginContract> = {}): PluginContract {
  return {
    kind: 'capability',
    id: 'test-plugin',
    contractVersion: '1.0.0',
    provides: ['cap:test'],
    requires: [],
    compatibility: { platform: 'node' },
    scope: { app: true, request: false },
    lifecycle: { init: true, dispose: true, cleanupOnFailure: true },
    ...overrides,
  };
}

export function codeOf(diagnostics: ReadonlyArray<{ code: string }>): string[] {
  return diagnostics.map((d) => d.code);
}
