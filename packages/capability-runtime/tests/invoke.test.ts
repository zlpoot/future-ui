import { describe, expect, it, vi, type Mock } from 'vitest';

import { CapabilityRegistry, CapabilityRuntime, type RuntimeHooks } from '../src/index.js';
import { cartAddContract, makeRuntime, requestIdemContract } from './helpers.js';

function simpleHandler(viFn: Mock<(input: Record<string, unknown>) => void>, contract = cartAddContract) {
  return {
    contract,
    handler: (input: Record<string, unknown>) => {
      viFn(input);
      return { status: 'completed' as const, result: { ok: true } };
    },
  };
}

describe('CapabilityRuntime.invoke unified path (M1-02)', () => {
  it('invoking an undeclared capability is rejected before anything runs', async () => {
    const registry = new CapabilityRegistry();
    const runtime = new CapabilityRuntime(registry);
    const result = await runtime.invoke({ capabilityId: 'cart.remove', input: {}, invocationId: 'i1' });
    expect(result.status).toBe('rejected');
    if (result.status === 'rejected') {
      expect(result.diagnostics[0]?.code).toBe('capability_conflict');
    }
  });

  it('input validation runs before the handler: missing required field ⇒ rejected, zero handler calls', async () => {
    const fn = vi.fn();
    const registry = new CapabilityRegistry();
    registry.register(simpleHandler(fn));
    const runtime = new CapabilityRuntime(registry, { hooks: { authorize: () => ({ allowed: true }) }, defaultConfirmation: 'allow' });
    const result = await runtime.invoke({ capabilityId: 'cart.add', input: { qty: 2 }, invocationId: 'i1' });
    expect(result.status).toBe('rejected');
    if (result.status === 'rejected') {
      expect(result.diagnostics[0]?.code).toBe('missing_required');
    }
    expect(fn).not.toHaveBeenCalled();
  });

  it('input type mismatch is rejected with a type_mismatch diagnostic', async () => {
    const fn = vi.fn();
    const registry = new CapabilityRegistry();
    registry.register(simpleHandler(fn));
    const runtime = new CapabilityRuntime(registry, { hooks: { authorize: () => ({ allowed: true }) }, defaultConfirmation: 'allow' });
    const result = await runtime.invoke({ capabilityId: 'cart.add', input: { productId: 'p1', qty: 'two' }, invocationId: 'i1' });
    expect(result.status).toBe('rejected');
    if (result.status === 'rejected') {
      expect(result.diagnostics[0]?.code).toBe('type_mismatch');
    }
    expect(fn).not.toHaveBeenCalled();
  });

  it('a rejecting authorization hook blocks execution with no side effect', async () => {
    const fn = vi.fn();
    const registry = new CapabilityRegistry();
    registry.register(simpleHandler(fn));
    const hooks: RuntimeHooks = { authorize: () => ({ allowed: false, reason: 'denied by policy' }) };
    const runtime = new CapabilityRuntime(registry, { hooks, defaultConfirmation: 'allow' });
    const result = await runtime.invoke({ capabilityId: 'cart.add', input: { productId: 'p1', qty: 1 }, invocationId: 'i1', principal: 'alice' });
    expect(result.status).toBe('rejected');
    if (result.status === 'rejected') {
      expect(result.diagnostics[0]?.code).toBe('unauthorized');
      expect(result.reason).toContain('denied by policy');
    }
    expect(fn).not.toHaveBeenCalled();
  });

  it('a policy description is never an execution permission: no hook + default deny ⇒ rejected', async () => {
    const fn = vi.fn();
    const registry = new CapabilityRegistry();
    registry.register(simpleHandler(fn));
    const runtime = new CapabilityRuntime(registry, { defaultConfirmation: 'allow' }); // no authorize hook
    const result = await runtime.invoke({ capabilityId: 'cart.add', input: { productId: 'p1', qty: 1 }, invocationId: 'i1' });
    expect(result.status).toBe('rejected');
    if (result.status === 'rejected') {
      expect(result.diagnostics[0]?.code).toBe('unauthorized');
    }
    expect(fn).not.toHaveBeenCalled();
  });

  it('mandatory confirmation for irreversible effects: unconfirmed ⇒ rejected, confirmed ⇒ executed', async () => {
    const fn = vi.fn();
    const registry = new CapabilityRegistry();
    registry.register(simpleHandler(fn));
    const runtime = new CapabilityRuntime(registry, {
      hooks: { authorize: () => ({ allowed: true }), confirm: () => ({ approved: false, missing: ['cart.items'] }) },
    });
    const denied = await runtime.invoke({ capabilityId: 'cart.add', input: { productId: 'p1', qty: 1 }, invocationId: 'i1' });
    expect(denied.status).toBe('rejected');
    if (denied.status === 'rejected') {
      expect(denied.reason).toContain('confirmation required');
    }
    expect(fn).not.toHaveBeenCalled();

    const hooks2: RuntimeHooks = { authorize: () => ({ allowed: true }), confirm: () => ({ approved: true }) };
    const runtime2 = new CapabilityRuntime(registry, { hooks: hooks2 });
    const approved = await runtime2.invoke({ capabilityId: 'cart.add', input: { productId: 'p1', qty: 1 }, invocationId: 'i2' });
    expect(approved.status).toBe('completed');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('availability preconditions are re-checked before execution', async () => {
    const fn = vi.fn();
    const registry = new CapabilityRegistry();
    registry.register(simpleHandler(fn));
    const hooks: RuntimeHooks = {
      authorize: () => ({ allowed: true }),
      checkState: () => ({ ok: false, reason: 'cart service down' }),
    };
    const runtime = new CapabilityRuntime(registry, { hooks, defaultConfirmation: 'allow' });
    const result = await runtime.invoke({ capabilityId: 'cart.add', input: { productId: 'p1', qty: 1 }, invocationId: 'i1' });
    expect(result.status).toBe('rejected');
    if (result.status === 'rejected') {
      expect(result.diagnostics[0]?.code).toBe('unavailable');
      expect(result.reason).toContain('cart service down');
    }
    expect(fn).not.toHaveBeenCalled();
  });

  it('idempotency scope=request: same invocationId replays the first result, handler runs once', async () => {
    const fn = vi.fn();
    const registry = new CapabilityRegistry();
    registry.register(simpleHandler(fn, requestIdemContract));
    const runtime = new CapabilityRuntime(registry, { hooks: { authorize: () => ({ allowed: true }) }, defaultConfirmation: 'allow' });
    const first = await runtime.invoke({ capabilityId: 'request.echo', input: { productId: 'p1', qty: 1 }, invocationId: 'same' });
    const second = await runtime.invoke({ capabilityId: 'request.echo', input: { productId: 'p1', qty: 1 }, invocationId: 'same' });
    expect(first.status).toBe('completed');
    expect(second.status).toBe('completed');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('idempotency scope=operation: same key + same params replays; same key + different params is a key conflict', async () => {
    const fn = vi.fn();
    const registry = new CapabilityRegistry();
    registry.register(simpleHandler(fn));
    const runtime = new CapabilityRuntime(registry, { hooks: { authorize: () => ({ allowed: true }) }, defaultConfirmation: 'allow' });
    const first = await runtime.invoke({ capabilityId: 'cart.add', input: { productId: 'p1', qty: 1 }, invocationId: 'i1', idempotencyKey: 'k1' });
    expect(first.status).toBe('completed');
    const replay = await runtime.invoke({ capabilityId: 'cart.add', input: { productId: 'p1', qty: 1 }, invocationId: 'i2', idempotencyKey: 'k1' });
    expect(replay.status).toBe('completed');
    const conflict = await runtime.invoke({ capabilityId: 'cart.add', input: { productId: 'p1', qty: 99 }, invocationId: 'i3', idempotencyKey: 'k1' });
    expect(conflict.status).toBe('rejected');
    if (conflict.status === 'rejected') {
      expect(conflict.diagnostics[0]?.code).toBe('conflict');
    }
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('a concurrent same-identity call returns pending instead of blind-retrying', async () => {
    const registry = new CapabilityRegistry();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    registry.register({
      contract: cartAddContract,
      handler: () => new Promise<{ status: 'completed'; result: Record<string, unknown> }>((resolve) => {
        void gate.then(() => resolve({ status: 'completed', result: { ok: true } }));
      }),
    });
    const runtime = new CapabilityRuntime(registry, { hooks: { authorize: () => ({ allowed: true }) }, defaultConfirmation: 'allow' });
    const first = runtime.invoke({ capabilityId: 'cart.add', input: { productId: 'p1', qty: 1 }, invocationId: 'i1', idempotencyKey: 'k1' });
    const second = await runtime.invoke({ capabilityId: 'cart.add', input: { productId: 'p1', qty: 1 }, invocationId: 'i2', idempotencyKey: 'k1' });
    expect(second.status).toBe('pending');
    release();
    const resolved = await first;
    expect(resolved.status).toBe('completed');
  });

  it('cancellation before execution returns cancelled and never implies rollback', async () => {
    const fn = vi.fn();
    const registry = new CapabilityRegistry();
    registry.register(simpleHandler(fn));
    const runtime = new CapabilityRuntime(registry, { hooks: { authorize: () => ({ allowed: true }) }, defaultConfirmation: 'allow' });
    const controller = new AbortController();
    controller.abort();
    const result = await runtime.invoke({ capabilityId: 'cart.add', input: { productId: 'p1', qty: 1 }, invocationId: 'i1', signal: controller.signal });
    expect(result.status).toBe('cancelled');
    if (result.status === 'cancelled') {
      expect(result.rollbackApplied).toBe(false);
    }
    expect(fn).not.toHaveBeenCalled();
  });

  it('async failure is classified: explicit failed outcome keeps retrySafe/recovery; thrown error becomes handler_error', async () => {
    const registry = new CapabilityRegistry();
    registry.register({
      contract: cartAddContract,
      handler: () => ({ status: 'failed' as const, code: 'transient-lock', message: 'locked', retrySafe: true, recovery: 'retry after backoff' }),
    });
    const runtime = new CapabilityRuntime(registry, { hooks: { authorize: () => ({ allowed: true }) }, defaultConfirmation: 'allow' });
    const failed = await runtime.invoke({ capabilityId: 'cart.add', input: { productId: 'p1', qty: 1 }, invocationId: 'i1' });
    expect(failed.status).toBe('failed');
    if (failed.status === 'failed') {
      expect(failed.retrySafe).toBe(true);
      expect(failed.recovery).toBe('retry after backoff');
    }

    const registry2 = new CapabilityRegistry();
    registry2.register({ contract: cartAddContract, handler: () => { throw new Error('boom'); } });
    const runtime2 = new CapabilityRuntime(registry2, { hooks: { authorize: () => ({ allowed: true }) }, defaultConfirmation: 'allow' });
    const thrown = await runtime2.invoke({ capabilityId: 'cart.add', input: { productId: 'p1', qty: 1 }, invocationId: 'i2' });
    expect(thrown.status).toBe('failed');
    if (thrown.status === 'failed') {
      expect(thrown.code).toBe('handler_error');
      expect(thrown.retrySafe).toBe(false);
    }
  });

  it('unknown results carry a reconciliation handle; the caller must query, not blind-retry', async () => {
    const registry = new CapabilityRegistry();
    registry.register({
      contract: cartAddContract,
      handler: () => ({ status: 'unknown' as const, reason: 'channel unconfirmed', reconciliation: 'cart.query:r1', receipt: 'r1' }),
    });
    const runtime = new CapabilityRuntime(registry, { hooks: { authorize: () => ({ allowed: true }) }, defaultConfirmation: 'allow' });
    const result = await runtime.invoke({ capabilityId: 'cart.add', input: { productId: 'p1', qty: 1 }, invocationId: 'i1' });
    expect(result.status).toBe('unknown');
    if (result.status === 'unknown') {
      expect(result.reconciliation).toBe('cart.query:r1');
    }
  });
});

describe('CapabilityRuntime audit (M1-02)', () => {
  it('every invocation is audited with redacted input; secrets never reach the log', async () => {
    const { runtime, service } = makeRuntime({ hooks: { authorize: () => ({ allowed: true }) } });
    await runtime.invoke({
      capabilityId: 'cart.add',
      input: { productId: 'p1', qty: 1, cookie: 'session=abc', access_token: 'tok-123' },
      invocationId: 'i1',
    });
    expect(service.items).toHaveLength(1);
    const entries = runtime.auditEntries();
    expect(entries.length).toBeGreaterThan(0);
    const last = entries[entries.length - 1]!;
    expect(last.input.cookie).toBe('[REDACTED]');
    expect(last.input.access_token).toBe('[REDACTED]');
    expect(JSON.stringify(last)).not.toContain('abc');
    expect(JSON.stringify(last)).not.toContain('tok-123');
    expect(last.input.productId).toBe('p1');
  });
});
