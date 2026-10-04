import { describe, expect, it, vi } from 'vitest';

import { createPluginKernel } from '../src/kernel.js';
import { manifest } from './helpers.js';

const node = { platform: 'node', engines: { node: '24.21.0' } };

describe('kernel boundary (D07(M0) rule 4)', () => {
  it('exposes a fixed API with no unrestricted universal hook', () => {
    const kernel = createPluginKernel(node);
    const surface = Object.keys(kernel).sort();
    expect(surface).toEqual(
      ['auditPermissions', 'createRequestScope', 'dispose', 'init', 'missingProviderDiagnostic', 'queryProvider', 'register', 'registry', 'unloadAll'].sort(),
    );
    // no generic hook of any kind
    expect(surface.some((k) => k.toLowerCase().includes('hook'))).toBe(false);
    expect('hook' in kernel).toBe(false);
  });

  it('does not couple UI-only plugins to Agent modules', async () => {
    const kernel = createPluginKernel(node);
    const uiOnly = {
      contract: manifest({ kind: 'component', id: 'ui-btn', provides: ['component:button'], requires: ['theme:base'] }),
      factory: { init: () => undefined },
    };
    // theme:base is a UI provider; no capability/Agent module is required
    kernel.register({ contract: manifest({ id: 'theme-base', provides: ['theme:base'] }), factory: { init: () => undefined } });
    expect(kernel.register(uiOnly).ok).toBe(true);
    expect((await kernel.init('ui-btn')).ok).toBe(true);
  });

  it('does not couple capability-only plugins to UI providers', async () => {
    const kernel = createPluginKernel(node);
    const capOnly = {
      contract: manifest({ kind: 'capability', id: 'cap-cart', provides: ['cap:cart'] }),
      factory: { init: () => undefined },
    };
    // no theme/component provider present; capability-only must still load
    expect(kernel.register(capOnly).ok).toBe(true);
    expect((await kernel.init('cap-cart')).ok).toBe(true);
  });

  it('keeps permission claims as audit data only, never affecting load decisions', async () => {
    const kernel = createPluginKernel(node);
    kernel.register({
      contract: manifest({ id: 'p-audit' }),
      factory: { init: () => undefined },
      permissions: ['ui:read', 'cap:checkout'],
    });
    // permissions are queryable for review...
    expect(kernel.auditPermissions('p-audit')).toEqual(['ui:read', 'cap:checkout']);
    // ...but are not enforced as a sandbox: the plugin still initializes
    const result = await kernel.init('p-audit');
    expect(result.ok).toBe(true);
  });
});

describe('unloadAll', () => {
  it('disposes and clears every app plugin', async () => {
    const kernel = createPluginKernel(node);
    const disposeA = vi.fn(() => undefined);
    const disposeB = vi.fn(() => undefined);
    kernel.register({ contract: manifest({ id: 'a', provides: ['cap:a'] }), factory: { init: () => ({ dispose: disposeA }) } });
    kernel.register({ contract: manifest({ id: 'b', provides: ['cap:b'] }), factory: { init: () => ({ dispose: disposeB }) } });
    await kernel.init('a');
    await kernel.init('b');

    await kernel.unloadAll();

    expect(disposeA).toHaveBeenCalledTimes(1);
    expect(disposeB).toHaveBeenCalledTimes(1);
    expect(kernel.registry.ids()).toEqual([]);
    expect(kernel.registry.provided().size).toBe(0);
  });
});
