import { describe, expect, it, vi } from 'vitest';

import { createPluginKernel } from '../src/kernel.js';
import { manifest } from './helpers.js';

const node = { platform: 'node', engines: { node: '24.21.0' } };

describe('init (D07(M0) rule 3)', () => {
  it('moves a plugin to active and keeps its handle', async () => {
    const kernel = createPluginKernel(node);
    kernel.register({
      contract: manifest(),
      factory: { init: () => ({ dispose: () => undefined }) },
    });
    const result = await kernel.init('test-plugin');
    expect(result.ok).toBe(true);
    expect(kernel.registry.get('test-plugin')?.status).toBe('active');
  });

  it('rolls back resources registered during a failing init', async () => {
    const kernel = createPluginKernel(node);
    const rollback = vi.fn(() => undefined);
    const factory = {
      init: (ctx: { registerResource: (r: { dispose: () => void }) => void }) => {
        ctx.registerResource({ dispose: rollback });
        throw new Error('boom');
      },
    };
    kernel.register({ contract: manifest(), factory });

    const result = await kernel.init('test-plugin');
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.code).toBe('unavailable');
    expect(result.diagnostics[0]?.path).toBe('/lifecycle/init');
    expect(rollback).toHaveBeenCalledTimes(1);
    // no half-initialized instance is left behind
    expect(kernel.registry.get('test-plugin')?.status).toBe('registered');
  });

  it('leaves no residue after dispose: a disposed plugin cannot be initialized again', async () => {
    const kernel = createPluginKernel(node);
    kernel.register({ contract: manifest(), factory: { init: () => undefined } });
    await kernel.init('test-plugin');
    await kernel.dispose('test-plugin');
    // dispose fully unloads the plugin (D07(M0) rule 3): the entry is gone,
    // so init reports node_not_found instead of touching a half state.
    const again = await kernel.init('test-plugin');
    expect(again.ok).toBe(false);
    expect(again.diagnostics[0]?.code).toBe('node_not_found');
  });
});

describe('dispose (D07(M0) rule 3)', () => {
  it('releases handle resources, handle.dispose and factory.dispose in order', async () => {
    const kernel = createPluginKernel(node);
    const order: string[] = [];
    const resourceDispose = vi.fn(() => { order.push('resource'); });
    const handleDispose = vi.fn(() => { order.push('handle'); });
    const factoryDispose = vi.fn(() => { order.push('factory'); });

    kernel.register({
      contract: manifest(),
      factory: {
        init: () => ({ dispose: handleDispose, resources: [{ dispose: resourceDispose }] }),
        dispose: factoryDispose,
      },
    });
    await kernel.init('test-plugin');
    await kernel.dispose('test-plugin');

    expect(resourceDispose).toHaveBeenCalledTimes(1);
    expect(handleDispose).toHaveBeenCalledTimes(1);
    expect(factoryDispose).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['resource', 'handle', 'factory']);
    expect(kernel.registry.get('test-plugin')).toBeUndefined();
  });

  it('disposes even when a resource dispose throws (best effort)', async () => {
    const kernel = createPluginKernel(node);
    const handleDispose = vi.fn(() => undefined);
    kernel.register({
      contract: manifest(),
      factory: {
        init: () => ({
          dispose: handleDispose,
          resources: [{ dispose: () => { throw new Error('resource failed'); } }],
        }),
      },
    });
    await kernel.init('test-plugin');
    await kernel.dispose('test-plugin');
    expect(handleDispose).toHaveBeenCalledTimes(1);
  });

  it('leaves no residue after dispose: provider lookup yields nothing', async () => {
    const kernel = createPluginKernel(node);
    kernel.register({
      contract: manifest({ provides: ['cap:test'] }),
      factory: { init: () => undefined },
    });
    await kernel.init('test-plugin');
    expect(kernel.queryProvider('cap:test')).toBeDefined();
    await kernel.dispose('test-plugin');
    expect(kernel.queryProvider('cap:test')).toBeUndefined();
    expect(kernel.registry.hasProvider('cap:test')).toBe(false);
  });
});
