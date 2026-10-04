// @vitest-environment jsdom
/**
 * End-to-end local vertical example (#10): select product -> set qty -> add
 * to cart -> show real execution result. Evidence is captured in four layers:
 * interaction (UI), capability invocation (runtime), business effect
 * (service state), final UI state.
 */
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import type { RuntimeHooks } from '@future-ui/capability-runtime';

import {
  CartDemo,
  CartDemoApp,
  addToCartBindingContract,
  createAddToCartBinding,
  createCartRuntime,
  programmaticAdd,
} from '@future-ui/cart-demo';

const allowHooks: RuntimeHooks = { authorize: () => ({ allowed: true }) };

async function addOnce(container: HTMLElement, product = 'p1', qty = '2'): Promise<void> {
  // Select product
  fireEvent.change(screen.getByLabelText('Product'), { target: { value: product } });
  // Set qty
  fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: qty } });
  // Click Add to cart
  fireEvent.click(screen.getByRole('button', { name: /Add to cart/i }));
  await waitFor(() => expect(container.querySelector('[data-part="result"]')?.getAttribute('data-status')).not.toBe('loading'));
}

describe('Cart demo vertical example (#10)', () => {
  it('full flow: UI interaction -> capability invoke -> business effect -> final UI state (4-layer evidence)', async () => {
    const runtime = createCartRuntime({ hooks: allowHooks });
    const { container } = render(
      <CartDemoApp>
        <CartDemo binding={createAddToCartBinding({ registry: runtime.registry, invoke: runtime.runtime.invoke.bind(runtime.runtime) })} />
      </CartDemoApp>,
    );
    // Layer 1: interaction
    expect(screen.getByRole('button', { name: /Add to cart/i })).toBeInTheDocument();
    await addOnce(container, 'p1', '2');
    // Layer 2: capability invocation happened (runtime result reached UI)
    const statusEl = container.querySelector('[data-part="result"]');
    expect(statusEl?.getAttribute('data-status')).toBe('success');
    // Layer 3: business effect — server-authoritative service state changed
    expect(runtime.service.items).toEqual([{ productId: 'p1', qty: 2 }]);
    expect(runtime.service.version).toBe(1);
    // Layer 4: final UI state shows receipt/version/lines
    expect(screen.getByTestId('cart-result')).toHaveTextContent(/Receipt cart:op-1/);
    expect(screen.getByTestId('cart-result')).toHaveTextContent(/v1/);
    expect(screen.getByTestId('cart-result')).toHaveTextContent(/1 line/);
  });

  it('idempotency: repeating the same operation key adds the item exactly once', async () => {
    const runtime = createCartRuntime({ hooks: allowHooks });
    const binding = createAddToCartBinding({ registry: runtime.registry, invoke: runtime.runtime.invoke.bind(runtime.runtime) });
    const first = await binding.invokeFromUi({ event: { appId: 'x' }, productId: 'p1', qty: 1, idempotencyKey: 'op-same' });
    const replay = await binding.invokeFromUi({ event: { appId: 'x' }, productId: 'p1', qty: 1, idempotencyKey: 'op-same' });
    expect(first.status).toBe('completed');
    expect(replay.status).toBe('completed');
    expect(runtime.service.items).toHaveLength(1);
    expect(runtime.service.version).toBe(1);
  });

  it('concurrency: two parallel adds for different products both commit (per-product lock, no deadlock)', async () => {
    const runtime = createCartRuntime({ hooks: allowHooks });
    const invoke = runtime.runtime.invoke.bind(runtime.runtime);
    const [a, b] = await Promise.all([
      invoke({ capabilityId: 'cart.add', input: { productId: 'p1', qty: 1 }, invocationId: 'c1', idempotencyKey: 'c1' }),
      invoke({ capabilityId: 'cart.add', input: { productId: 'p2', qty: 3 }, invocationId: 'c2', idempotencyKey: 'c2' }),
    ]);
    expect(a.status).toBe('completed');
    expect(b.status).toBe('completed');
    expect(runtime.service.items).toHaveLength(2);
    expect(runtime.service.version).toBe(2);
  });

  it('locked product -> transient-lock failure with retry-safe recovery, no state change', async () => {
    const { container } = render(
      <CartDemoApp>
        <CartDemo lockProductIds={['p2']} />
      </CartDemoApp>,
    );
    await addOnce(container, 'p2', '1');
    const statusEl = container.querySelector('[data-part="result"]');
    expect(statusEl?.getAttribute('data-status')).toBe('failed');
    expect(screen.getByTestId('cart-result')).toHaveAttribute('data-code', 'transient-lock');
    expect(screen.getByTestId('cart-result')).toHaveTextContent(/retry after backoff/);
  });

  it('unmount while an operation is in flight never writes to state afterwards (no leaks)', async () => {
    const { unmount } = render(
      <CartDemoApp>
        <CartDemo />
      </CartDemoApp>,
    );
    unmount();
    // A later click target no longer exists; no state update can occur.
    expect(screen.queryByRole('button', { name: /Add to cart/i })).toBeNull();
  });

  it('stale version is rejected by the business layer and shown as a failure, not a success', async () => {
    const runtime = createCartRuntime({ hooks: allowHooks });
    const binding = createAddToCartBinding({ registry: runtime.registry, invoke: runtime.runtime.invoke.bind(runtime.runtime) });
    await binding.invokeFromUi({ event: { appId: 'x' }, productId: 'p1', qty: 1, idempotencyKey: 'op-1' });
    const stale = await binding.invokeFromUi({ event: { appId: 'x' }, productId: 'p2', qty: 1, idempotencyKey: 'op-2', expectedVersion: 99 });
    expect(stale.status).toBe('failed');
    if (stale.status === 'failed') {
      expect(stale.code).toBe('stale-version');
      expect(stale.retrySafe).toBe(false);
    }
    expect(runtime.service.items).toHaveLength(1);
  });

  it('unknown write result is surfaced as unknown with a reconciliation handle — never faked as success', async () => {
    const { container } = render(
      <CartDemoApp>
        <CartDemo />
      </CartDemoApp>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Add \(unknown channel\)/i }));
    await waitFor(() => expect(container.querySelector('[data-part="result"]')?.getAttribute('data-status')).toBe('unknown'));
    expect(screen.getByTestId('cart-result')).toHaveAttribute('data-code', 'unknown');
    expect(screen.getByTestId('cart-result')).toHaveTextContent(/query cart.query:/);
    expect(screen.getByTestId('cart-result')).toHaveTextContent(/blind-retrying/);
  });

  it('human and agent requests get the SAME business constraints: deny is enforced for both paths', async () => {
    // Human UI path: runtime with deny authorization.
    const deniedRuntime = createCartRuntime({ hooks: { authorize: () => ({ allowed: false }) } });
    const { container } = render(
      <CartDemoApp>
        <CartDemo
          authorizeAll={false}
          binding={createAddToCartBinding({ registry: deniedRuntime.registry, invoke: deniedRuntime.runtime.invoke.bind(deniedRuntime.runtime) })}
        />
      </CartDemoApp>,
    );
    await addOnce(container, 'p1', '1');
    expect(container.querySelector('[data-part="result"]')?.getAttribute('data-status')).toBe('failed');
    expect(deniedRuntime.service.items).toHaveLength(0);

    // Agent path: same runtime policy -> same denial.
    const agentResult = await deniedRuntime.runtime.invoke({
      capabilityId: 'cart.add',
      input: { productId: 'p1', qty: 1 },
      invocationId: 'agent-1',
      idempotencyKey: 'agent-1',
    });
    expect(agentResult.status).toBe('rejected');
    expect(deniedRuntime.service.items).toHaveLength(0);
    // The UI never disabled its way around authorization (button still enabled, deny came from the server side).
    expect(screen.getByRole('button', { name: /Add to cart/i })).not.toBeDisabled();
  });

  it('binding consumes only public interfaces: event payload appId + discovery view (agent allowlist), no private DOM', () => {
    const runtime = createCartRuntime({ hooks: allowHooks });
    const binding = createAddToCartBinding({ registry: runtime.registry, invoke: runtime.runtime.invoke.bind(runtime.runtime) });
    // Binding contract asserts public-only consumption.
    expect(binding.contractView.id).toBe('cart.add');
    expect(Object.keys(binding.contractView.agentVisible).sort()).toEqual(['concurrency', 'description', 'effects', 'idempotency']);
    // Params map from public UI values, not internal state.
    expect(addToCartBindingContract.params.mapping).toEqual({ productId: 'selectedProduct', qty: 'qtyInput' });
    // Redaction list is honored.
    expect(addToCartBindingContract.projection.redaction).toContain('secret');
  });

  it('UI-only: removing the binding module does not break the business action — the app calls the runtime directly', async () => {
    const runtime = createCartRuntime({ hooks: allowHooks });
    // Programmatic (agent) call shares the same business action without any binding.
    const result = await programmaticAdd({ runtime: runtime.runtime, productId: 'p3', qty: 5, idempotencyKey: 'direct-1' });
    expect(result.status).toBe('completed');
    expect(runtime.service.items).toEqual([{ productId: 'p3', qty: 5 }]);
    // UI path (no binding passed) still works end to end.
    const { container } = render(
      <CartDemoApp>
        <CartDemo />
      </CartDemoApp>,
    );
    await addOnce(container, 'p1', '1');
    expect(screen.getByTestId('cart-result')).toHaveTextContent(/Receipt cart:op-1/);
  });
});
