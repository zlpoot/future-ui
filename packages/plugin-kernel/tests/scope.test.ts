import { describe, expect, it, vi } from 'vitest';

import { createPluginKernel } from '../src/kernel.js';
import { manifest } from './helpers.js';

const node = { platform: 'node', engines: { node: '24.21.0' } };

describe('request scope isolation (D07(M0) rule 1)', () => {
  it('keeps request-scope plugins out of the app registry', async () => {
    const kernel = createPluginKernel(node);
    const req = kernel.createRequestScope();

    const app = { contract: manifest({ id: 'app-p', provides: ['cap:app'] }), factory: { init: () => undefined } };
    const request = { contract: manifest({ id: 'req-p', scope: { app: false, request: true }, provides: ['cap:req'] }), factory: { init: () => undefined } };

    expect(kernel.register(app).ok).toBe(true);
    expect(req.register(request).ok).toBe(true);

    // request plugin is visible only inside the request scope
    expect(req.registry.ids()).toEqual(['req-p']);
    expect(kernel.registry.ids()).toEqual(['app-p']);
    expect(kernel.queryProvider('cap:req')).toBeUndefined();
    expect(req.registry.queryProvider('cap:req')?.id).toBe('req-p');

    // request scope sees parent providers
    expect(req.registry.hasProvider('cap:app')).toBe(true);
  });

  it('does not leak state between two request scopes', async () => {
    const kernel = createPluginKernel(node);
    const req1 = kernel.createRequestScope();
    const req2 = kernel.createRequestScope();

    req1.register({ contract: manifest({ id: 'r1', provides: ['cap:r1'] }), factory: { init: () => undefined } });
    req2.register({ contract: manifest({ id: 'r2', provides: ['cap:r2'] }), factory: { init: () => undefined } });

    expect(req1.registry.ids()).toEqual(['r1']);
    expect(req2.registry.ids()).toEqual(['r2']);
    expect(req1.registry.hasProvider('cap:r2')).toBe(false);
  });

  it('disposeAll unloads request plugins without touching the app scope', async () => {
    const kernel = createPluginKernel(node);
    const req = kernel.createRequestScope();
    const dispose = vi.fn(() => undefined);

    kernel.register({ contract: manifest({ id: 'app-p', provides: ['cap:app'] }), factory: { init: () => undefined } });
    req.register({
      contract: manifest({ id: 'req-p', scope: { app: false, request: true }, provides: ['cap:req'] }),
      factory: { init: () => ({ dispose }) },
    });
    await req.init('req-p');
    expect(dispose).not.toHaveBeenCalled();

    await req.disposeAll();

    expect(dispose).toHaveBeenCalledTimes(1);
    expect(req.registry.ids()).toEqual([]);
    expect(req.registry.hasProvider('cap:req')).toBe(false);
    // app scope untouched
    expect(kernel.registry.ids()).toEqual(['app-p']);
    expect(kernel.queryProvider('cap:app')?.id).toBe('app-p');
  });

  it('reports node_not_found for an absent request-scope provider after unload', async () => {
    const kernel = createPluginKernel(node);
    const req = kernel.createRequestScope();
    req.register({
      contract: manifest({ id: 'req-p', scope: { app: false, request: true }, provides: ['cap:req'] }),
      factory: { init: () => undefined },
    });
    await req.disposeAll();
    const result = await req.init('req-p');
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.code).toBe('node_not_found');
    expect(kernel.missingProviderDiagnostic('cap:req').code).toBe('node_not_found');
  });
});
