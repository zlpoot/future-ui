import { describe, expect, it } from 'vitest';

import { CapabilityRegistry } from '../src/index.js';
import { cartAddContract } from './helpers.js';

describe('CapabilityRegistry (M1-02)', () => {
  it('explicitly registered capabilities are discoverable; undeclared ids are not', () => {
    const registry = new CapabilityRegistry();
    expect(registry.discover('cart.add')).toBeUndefined();
    registry.register({ contract: cartAddContract, handler: () => ({ status: 'completed' as const, result: {} }) });
    expect(registry.discover('cart.add')?.id).toBe('cart.add');
    expect(registry.discover('cart.remove')).toBeUndefined();
  });

  it('metadata and business handler are separate: discovery views never contain the handler', () => {
    const registry = new CapabilityRegistry();
    registry.register({ contract: cartAddContract, handler: () => ({ status: 'completed' as const, result: {} }) });
    const view = registry.discover('cart.add');
    expect(view).toBeDefined();
    expect(view!.agentVisible).not.toHaveProperty('handler');
    // The view exposes only the fields named in visibility.agentAllowlist.
    expect(Object.keys(view!.agentVisible).sort()).toEqual(['concurrency', 'description', 'effects', 'idempotency']);
    // Fields outside the allowlist must not enter the read context.
    expect(view!.agentVisible).not.toHaveProperty('authorization');
    expect(view!.agentVisible).not.toHaveProperty('failureModes');
    expect(view!.agentVisible).not.toHaveProperty('input');
    expect(view!.agentVisible).not.toHaveProperty('visibility');
  });

  it('unregister removes the capability; re-register after unregister succeeds', () => {
    const registry = new CapabilityRegistry();
    registry.register({ contract: cartAddContract, handler: () => ({ status: 'completed' as const, result: {} }) });
    expect(registry.unregister('cart.add')).toBe(true);
    expect(registry.discover('cart.add')).toBeUndefined();
    expect(registry.unregister('cart.add')).toBe(false);
    const again = registry.register({ contract: cartAddContract, handler: () => ({ status: 'completed' as const, result: {} }) });
    expect(again.ok).toBe(true);
  });

  it('duplicate registration is rejected with a conflict diagnostic and leaves the registry unchanged', () => {
    const registry = new CapabilityRegistry();
    registry.register({ contract: cartAddContract, handler: () => ({ status: 'completed' as const, result: {} }) });
    const second = registry.register({ contract: cartAddContract, handler: () => ({ status: 'completed' as const, result: {} }) });
    expect(second.ok).toBe(false);
    expect(second.diagnostics[0]?.code).toBe('conflict');
    expect(registry.ids()).toEqual(['cart.add']);
  });

  it('a contract violating D06(M0) invariants is rejected at registration', () => {
    const registry = new CapabilityRegistry();
    const bad = {
      ...cartAddContract,
      execution: { ...cartAddContract.execution, cancelImpliesRollback: true },
    };
    const result = registry.register({ contract: bad, handler: () => ({ status: 'completed' as const, result: {} }) });
    expect(result.ok).toBe(false);
    expect(result.diagnostics.some((d) => d.code === 'constraint_violation' && d.path === '/execution/cancelImpliesRollback')).toBe(true);
  });
});
