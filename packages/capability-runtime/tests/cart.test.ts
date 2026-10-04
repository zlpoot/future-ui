import { describe, expect, it } from 'vitest';

import type { RuntimeHooks } from '../src/index.js';
import { makeRuntime } from './helpers.js';

const allowHooks: RuntimeHooks = { authorize: () => ({ allowed: true }) };

describe('cart.add business layer (M1-02 acceptance)', () => {
  it('a normal add completes with a receipt and changes cart state', async () => {
    const { runtime, service } = makeRuntime({ hooks: allowHooks });
    const result = await runtime.invoke({
      capabilityId: 'cart.add',
      input: { productId: 'p1', qty: 2 },
      invocationId: 'i1',
      idempotencyKey: 'op-1',
    });
    expect(result.status).toBe('completed');
    if (result.status === 'completed') {
      expect(result.receipt).toBe('cart:op-1');
      expect(result.result.version).toBe(1);
    }
    expect(service.items).toEqual([{ productId: 'p1', qty: 2 }]);
  });

  it('the business layer enforces idempotency: the same key adds the item exactly once', async () => {
    const { runtime, service } = makeRuntime({ hooks: allowHooks });
    const first = await runtime.invoke({ capabilityId: 'cart.add', input: { productId: 'p1', qty: 1 }, invocationId: 'i1', idempotencyKey: 'op-1' });
    const replay = await runtime.invoke({ capabilityId: 'cart.add', input: { productId: 'p1', qty: 1 }, invocationId: 'i2', idempotencyKey: 'op-1' });
    expect(first.status).toBe('completed');
    expect(replay.status).toBe('completed');
    expect(service.items).toHaveLength(1);
    expect(service.version).toBe(1);
  });

  it('expected-version conflict is rejected by the business layer with no state change', async () => {
    const { runtime, service } = makeRuntime({ hooks: allowHooks });
    await runtime.invoke({ capabilityId: 'cart.add', input: { productId: 'p1', qty: 1 }, invocationId: 'i1', idempotencyKey: 'op-1' });
    const result = await runtime.invoke({
      capabilityId: 'cart.add',
      input: { productId: 'p1', qty: 1, expectedVersion: 1 },
      invocationId: 'i2',
      idempotencyKey: 'op-2',
      expectedVersion: 1,
    });
    // business layer is at version 1; passing expectedVersion=1 matches → success
    expect(result.status).toBe('completed');
    const stale = await runtime.invoke({
      capabilityId: 'cart.add',
      input: { productId: 'p1', qty: 1, expectedVersion: 5 },
      invocationId: 'i3',
      idempotencyKey: 'op-3',
      expectedVersion: 5,
    });
    expect(stale.status).toBe('failed');
    if (stale.status === 'failed') {
      expect(stale.code).toBe('stale-version');
      expect(stale.retrySafe).toBe(false);
    }
    expect(service.items).toHaveLength(2); // only the two successful adds, none from the stale one
  });

  it('unknown results are not blind-retried: the caller reconciles via the receipt query boundary', async () => {
    const { runtime, service } = makeRuntime({ hooks: allowHooks });
    const result = await runtime.invoke({
      capabilityId: 'cart.add',
      input: { productId: 'p1', qty: 1, mode: 'unknown' },
      invocationId: 'i1',
      idempotencyKey: 'op-unknown',
    });
    expect(result.status).toBe('unknown');
    if (result.status === 'unknown') {
      const queried = service.queryByReceipt(result.receipt ?? '');
      expect(queried?.status).toBe('unknown');
      // The same key re-invoked still returns unknown (never a fabricated success).
      const again = await runtime.invoke({
        capabilityId: 'cart.add',
        input: { productId: 'p1', qty: 1, mode: 'unknown' },
        invocationId: 'i2',
        idempotencyKey: 'op-unknown',
      });
      expect(again.status).toBe('unknown');
    }
    expect(service.items).toHaveLength(0); // unknown write did not mutate cart
  });

  it('failure classification distinguishes transient (retrySafe) from permanent failures', async () => {
    const { runtime, service } = makeRuntime({ hooks: allowHooks, lockProductIds: ['locked-p'] });
    const transient = await runtime.invoke({
      capabilityId: 'cart.add',
      input: { productId: 'locked-p', qty: 1 },
      invocationId: 'i1',
    });
    expect(transient.status).toBe('failed');
    if (transient.status === 'failed') {
      expect(transient.code).toBe('transient-lock');
      expect(transient.retrySafe).toBe(true);
      expect(transient.recovery).toBeDefined();
    }
    expect(service.items).toHaveLength(0);
  });

  it('cancellation never pretends a rollback happened', async () => {
    const { runtime, service } = makeRuntime({ hooks: allowHooks });
    const controller = new AbortController();
    controller.abort();
    const result = await runtime.invoke({
      capabilityId: 'cart.add',
      input: { productId: 'p1', qty: 1 },
      invocationId: 'i1',
      signal: controller.signal,
    });
    expect(result.status).toBe('cancelled');
    if (result.status === 'cancelled') {
      expect(result.rollbackApplied).toBe(false);
      expect(result.note).toContain('cancelled');
    }
    expect(service.items).toHaveLength(0);
  });

  it('concurrent duplicate calls return explicit distinct results (completed + pending), one business effect', async () => {
    const { runtime, service } = makeRuntime({ hooks: allowHooks });
    const first = runtime.invoke({ capabilityId: 'cart.add', input: { productId: 'p1', qty: 1 }, invocationId: 'i1', idempotencyKey: 'k' });
    const second = await runtime.invoke({ capabilityId: 'cart.add', input: { productId: 'p1', qty: 1 }, invocationId: 'i2', idempotencyKey: 'k' });
    expect(second.status).toBe('pending');
    const resolved = await first;
    expect(resolved.status).toBe('completed');
    expect(service.items).toHaveLength(1);
  });
});
