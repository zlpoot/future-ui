import { describe, expect, it } from 'vitest';

import { isPlainData, NodeStore } from '../src/patch.js';
import type { NodeRecord } from '../src/patch.js';

const initial: NodeRecord[] = [
  { nodeId: 'component:dialog', version: 1, value: { open: false, label: 'Confirm' } },
  { nodeId: 'component:select', version: 1, value: { options: [], value: null } },
];

describe('isPlainData (D14 rule 5: declarative data only)', () => {
  it('accepts plain JSON data', () => {
    expect(isPlainData(null)).toBe(true);
    expect(isPlainData('x')).toBe(true);
    expect(isPlainData(1)).toBe(true);
    expect(isPlainData(true)).toBe(true);
    expect(isPlainData({ a: 1, b: [1, 2], c: { d: 'x' }, e: null })).toBe(true);
    expect(isPlainData([{ a: 1 }, 'x'])).toBe(true);
  });

  it('rejects non-plain values (functions, class instances, undefined, symbols, bigints)', () => {
    expect(isPlainData(() => 1)).toBe(false);
    expect(isPlainData(new Date())).toBe(false);
    expect(isPlainData(new Map())).toBe(false);
    expect(isPlainData(undefined)).toBe(false);
    expect(isPlainData(Symbol('x'))).toBe(false);
    expect(isPlainData(10n)).toBe(false);
    expect(isPlainData({ fn: () => 1 })).toBe(false);
  });
});

describe('NodeStore.apply (D14 rule 4: stable node id + expectedVersion)', () => {
  it('applies a matching patch: value merged, version incremented', () => {
    const store = new NodeStore(initial);
    const result = store.apply({ nodeId: 'component:dialog', expectedVersion: 1, changes: { open: true } });
    expect(result.ok).toBe(true);
    expect(result.diagnostics).toEqual([]);
    expect(store.get('component:dialog')).toEqual({ nodeId: 'component:dialog', version: 2, value: { open: true, label: 'Confirm' } });
  });

  it('rejects a stale patch with conflict and leaves the node unchanged', () => {
    const store = new NodeStore(initial);
    const result = store.apply({ nodeId: 'component:dialog', expectedVersion: 5, changes: { open: true } });
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.code).toBe('conflict');
    expect(result.diagnostics[0]?.expected).toBe(1);
    expect(result.diagnostics[0]?.actual).toBe(5);
    expect(store.get('component:dialog')).toEqual(initial[0]);
  });

  it('reports node_not_found for an unregistered target', () => {
    const store = new NodeStore(initial);
    const result = store.apply({ nodeId: 'component:missing', expectedVersion: 1, changes: {} });
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.code).toBe('node_not_found');
  });

  it('rejects non-plain changes with constraint_violation', () => {
    const store = new NodeStore(initial);
    const result = store.apply({ nodeId: 'component:dialog', expectedVersion: 1, changes: { fn: () => 1 } });
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.code).toBe('constraint_violation');
    expect(store.get('component:dialog')).toEqual(initial[0]);
  });
});

describe('NodeStore.applyAll (atomic batch)', () => {
  it('applies a fully valid batch and increments every target version', () => {
    const store = new NodeStore(initial);
    const result = store.applyAll([
      { nodeId: 'component:dialog', expectedVersion: 1, changes: { open: true } },
      { nodeId: 'component:select', expectedVersion: 1, changes: { value: 'b' } },
    ]);
    expect(result.ok).toBe(true);
    expect(store.get('component:dialog')?.version).toBe(2);
    expect(store.get('component:select')?.version).toBe(2);
    expect(store.get('component:select')?.value).toEqual({ options: [], value: 'b' });
  });

  it('rejects the whole batch when any patch is stale, leaving the store unchanged', () => {
    const store = new NodeStore(initial);
    const result = store.applyAll([
      { nodeId: 'component:dialog', expectedVersion: 1, changes: { open: true } },
      { nodeId: 'component:select', expectedVersion: 9, changes: { value: 'b' } },
    ]);
    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((d) => d.code)).toEqual(['conflict']);
    expect(store.list()).toEqual(initial);
  });
});
