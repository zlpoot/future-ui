import { describe, expect, it } from 'vitest';

import { createPluginKernel } from '../src/kernel.js';
import { PluginRegistry } from '../src/registry.js';
import { manifest, codeOf } from './helpers.js';

const node = { platform: 'node', engines: { node: '24.21.0' } };

describe('registry ownership (D07(M0) rule 1)', () => {
  it('keeps two app instances fully isolated', () => {
    const a = createPluginKernel(node);
    const b = createPluginKernel(node);
    a.register({ contract: manifest({ id: 'p-a', provides: ['cap:a'] }), factory: { init: () => undefined } });
    expect(a.registry.ids()).toEqual(['p-a']);
    expect(b.registry.ids()).toEqual([]);
    expect(b.queryProvider('cap:a')).toBeUndefined();
  });

  it('does not leak providers between registries', () => {
    const regA = new PluginRegistry(node);
    const regB = new PluginRegistry(node);
    regA.register({ contract: manifest({ id: 'p-a', provides: ['cap:a'] }), factory: { init: () => undefined } });
    expect(regA.hasProvider('cap:a')).toBe(true);
    expect(regB.hasProvider('cap:a')).toBe(false);
    expect(regB.provided().size).toBe(0);
  });

  it('fails registration with a duplicate id and leaves the registry unchanged', () => {
    const kernel = createPluginKernel(node);
    const def = { contract: manifest({ id: 'dup' }), factory: { init: () => undefined } };
    expect(kernel.register(def).ok).toBe(true);
    const second = kernel.register(def);
    expect(second.ok).toBe(false);
    expect(codeOf(second.diagnostics)).toContain('conflict');
    expect(kernel.registry.ids()).toEqual(['dup']);
  });
});

describe('registry queries', () => {
  it('resolves provider ownership and contracts', () => {
    const kernel = createPluginKernel(node);
    const def = { contract: manifest({ id: 'p1', provides: ['cap:cart', 'cap:checkout'] }), factory: { init: () => undefined } };
    expect(kernel.register(def).ok).toBe(true);
    expect(kernel.registry.providerOwner('cap:cart')).toBe('p1');
    expect(kernel.registry.provided()).toEqual(new Set(['cap:cart', 'cap:checkout']));
    expect(kernel.queryProvider('cap:cart')?.id).toBe('p1');
    expect(kernel.queryProvider('cap:nope')).toBeUndefined();
  });

  it('unregister removes provider entries', () => {
    const kernel = createPluginKernel(node);
    const def = { contract: manifest({ id: 'p1', provides: ['cap:cart'] }), factory: { init: () => undefined } };
    kernel.register(def);
    expect(kernel.registry.unregister('p1')).toBe(true);
    expect(kernel.registry.ids()).toEqual([]);
    expect(kernel.registry.hasProvider('cap:cart')).toBe(false);
    expect(kernel.registry.unregister('p1')).toBe(false);
  });
});
