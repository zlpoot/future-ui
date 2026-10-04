import { describe, expect, it } from 'vitest';

import { schemas } from '@future-ui/contracts';

import { buildCatalog, queryCatalog, stableNodeIdFor } from '../src/catalog.js';
import type { CatalogKind } from '../src/catalog.js';

const catalog = buildCatalog();
const kinds: CatalogKind[] = ['component', 'capability', 'binding', 'plugin', 'diagnostics', 'version'];

describe('buildCatalog (D14 rule 1: single source of truth)', () => {
  it('emits one entry per authoritative schema with matching $id and required fields', () => {
    expect(catalog.entries).toHaveLength(kinds.length);
    for (const kind of kinds) {
      const entry = catalog.entries.find((e) => e.kind === kind);
      expect(entry, `entry for ${kind}`).toBeDefined();
      expect(entry?.$id).toBe(schemas[kind].$id);
      expect(entry?.requiredFields).toEqual(schemas[kind].required ?? []);
    }
  });

  it('catalog contract major matches the frozen CONTRACT_MAJOR', () => {
    expect(catalog.contractMajor).toBe(1);
  });

  it('exposes constraints and metadata derived from the schema, not hand-copied', () => {
    const component = catalog.entries.find((e) => e.kind === 'component');
    expect(component?.constraints['componentType']).toContainEqual({ kind: 'type', value: 'string' });
    expect(component?.constraints['contractVersion']).toContainEqual({
      kind: 'ref',
      value: 'https://future-ui.dev/contracts/version.schema.json',
    });
    expect(component?.metadata['componentType']).toBe('stable component type identifier, e.g. dialog / select');
  });

  it('marks parts maps only for component entries', () => {
    const component = catalog.entries.find((e) => e.kind === 'component');
    expect(component?.hasParts).toBe(true);
    const plugin = catalog.entries.find((e) => e.kind === 'plugin');
    expect(plugin?.hasParts).toBe(false);
  });
});

describe('queryCatalog (D14 rule 2: versioned machine-readable catalog)', () => {
  it('filters by kind', () => {
    const { entries, diagnostics } = queryCatalog(catalog, { kind: 'plugin' });
    expect(diagnostics).toEqual([]);
    expect(entries.map((e) => e.kind)).toEqual(['plugin']);
  });

  it('accepts a matching contract major', () => {
    const { diagnostics } = queryCatalog(catalog, { kind: 'component', contractVersion: '1.2.0' });
    expect(diagnostics).toEqual([]);
  });

  it('rejects an unknown major version with unknown_major_version', () => {
    const { diagnostics } = queryCatalog(catalog, { kind: 'component', contractVersion: '2.0.0' });
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.code).toBe('unknown_major_version');
    expect(diagnostics[0]?.path).toBe('/query/contractVersion');
  });

  it('rejects a malformed version with constraint_violation', () => {
    const { diagnostics } = queryCatalog(catalog, { contractVersion: 'not-semver' });
    expect(diagnostics[0]?.code).toBe('constraint_violation');
  });

  it('reports node_not_found for an unknown kind instead of silently returning empty', () => {
    const { entries, diagnostics } = queryCatalog(catalog, { kind: 'theme' as CatalogKind });
    expect(entries).toHaveLength(0);
    expect(diagnostics[0]?.code).toBe('node_not_found');
    expect(diagnostics[0]?.path).toBe('/catalog/theme');
  });
});

describe('stableNodeIdFor (D14 rule 4: stable node ids from the catalog)', () => {
  it('derives stable node ids from kind + name', () => {
    expect(stableNodeIdFor('component', 'dialog')).toBe('component:dialog');
    expect(stableNodeIdFor('capability', 'cart.add')).toBe('capability:cart.add');
  });
});
