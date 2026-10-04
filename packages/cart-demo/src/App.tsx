import { useRef, useState, type ReactNode } from 'react';
import type { JSX } from 'react';

import { Button, FutureUIProvider, Select, TextInput } from '@future-ui/react-provider';
import type { InvocationResult } from '@future-ui/capability-runtime';

import { createAddToCartBinding, type AddToCartBinding } from './binding.js';
import { createCartRuntime } from './cart-capability.js';

const PRODUCTS = [
  { id: 'p1', label: 'T-shirt' },
  { id: 'p2', label: 'Mug' },
  { id: 'p3', label: 'Sticker' },
];

type UiStatus = 'idle' | 'loading' | 'success' | 'failed' | 'unknown';

export interface CartDemoProps {
  /** Optional binding; when omitted the app calls the business action directly (UI-only path). */
  binding?: AddToCartBinding;
  lockProductIds?: string[];
  authorizeAll?: boolean;
}

export interface CartDemoResult {
  status: UiStatus;
  code?: string;
  receipt?: string;
  version?: number;
  items?: Array<{ productId: string; qty: number }>;
  recovery?: string;
  reconciliation?: string;
}

/**
 * Local vertical example (#10): select product -> set qty -> add to cart ->
 * show real execution result.
 *
 * State ownership (acceptance 2):
 * - local UI state: selected product + qty input (component state only).
 * - business draft: the items snapshot rendered from the last completed
 *   result (never treated as authoritative).
 * - server authority: CartService.items/version — the single source of truth;
 *   the UI never mutates it directly.
 *
 * UI and programmatic (agent) calls share the SAME cart.add business action
 * through the same runtime; the UI never disables its way around
 * server-side authorization (acceptance 4).
 */
export function CartDemo({ binding, lockProductIds, authorizeAll = true }: CartDemoProps): JSX.Element {
  const runtimeRef = useRef(createCartRuntime({ lockProductIds, hooks: { authorize: () => ({ allowed: authorizeAll }) } }));
  const bindingRef = useRef(binding ?? createAddToCartBinding({ registry: runtimeRef.current.registry, invoke: runtimeRef.current.runtime.invoke.bind(runtimeRef.current.runtime) }));
  const opCounter = useRef(0);

  const [productId, setProductId] = useState<string>('p1');
  const [qty, setQty] = useState<string>('1');
  const [result, setResult] = useState<CartDemoResult | null>(null);

  const runAdd = async (opts?: { mode?: string; expectedVersion?: number }): Promise<void> => {
    opCounter.current += 1;
    const key = `op-${opCounter.current}`;
    const qtyNum = Number(qty);
    if (!Number.isInteger(qtyNum) || qtyNum < 1) {
      setResult({ status: 'failed', code: 'invalid-input', recovery: 'enter a positive integer quantity' });
      return;
    }
    setResult({ status: 'loading' });
    const invocation = bindingRef.current.invokeFromUi({
      event: { appId: 'cart-demo' },
      productId,
      qty: qtyNum,
      idempotencyKey: key,
      ...(opts?.expectedVersion !== undefined ? { expectedVersion: opts.expectedVersion } : {}),
      ...(opts?.mode !== undefined ? { mode: opts.mode } : {}),
    });
    const outcome: InvocationResult = await invocation;
    if (outcome.status === 'completed') {
      const version = Number(outcome.result?.version);
      const items = outcome.result?.items as Array<{ productId: string; qty: number }> | undefined;
      setResult({
        status: 'success',
        receipt: outcome.receipt,
        version,
        items: items ?? [],
      });
    } else if (outcome.status === 'failed') {
      setResult({
        status: 'failed',
        code: outcome.code,
        recovery: outcome.recovery,
      });
    } else if (outcome.status === 'unknown') {
      setResult({
        status: 'unknown',
        receipt: outcome.receipt,
        reconciliation: outcome.reconciliation,
      });
    } else if (outcome.status === 'pending') {
      // pending: the write is not confirmed yet — surface as unknown, never success.
      setResult({ status: 'unknown', receipt: outcome.receipt, code: 'pending' });
    } else {
      // rejected / cancelled: no business write happened — never fabricate success.
      setResult({
        status: 'failed',
        code: outcome.status,
        recovery: outcome.status === 'rejected'
          ? 'authorization or validation rejected the request'
          : 'the operation was cancelled',
      });
    }
  };

  const busy = result?.status === 'loading';

  return (
    <div data-app="cart-demo">
      <div data-part="product-row">
        <Select
          options={PRODUCTS.map((p) => ({ label: p.label, value: p.id }))}
          defaultValue={productId}
          aria-label="Product"
          disabled={busy}
          onValueChange={(e) => setProductId(e.value ?? 'p1')}
        />
        <TextInput
          aria-label="Quantity"
          type="number"
          value={qty}
          onValueChange={(e) => setQty(e.value)}
          disabled={busy}
        />
        <Button
          disabled={busy}
          onClick={() => void runAdd()}
          data-testid="add-to-cart"
        >
          Add to cart
        </Button>
      </div>
      <div data-part="result" data-status={result?.status ?? 'idle'} aria-live="polite">
        {result === null && <span>No operation yet.</span>}
        {result?.status === 'loading' && <span>Adding…</span>}
        {result?.status === 'success' && (
          <span data-testid="cart-result">
            Added. Receipt {result.receipt} (v{result.version}) — {String(result.items?.length ?? 0)} line(s).
          </span>
        )}
        {result?.status === 'failed' && (
          <span data-testid="cart-result" data-code={result.code}>
            Failed: {result.code} — {result.recovery ?? 'no recovery hint'}.
          </span>
        )}
        {result?.status === 'unknown' && (
          <span data-testid="cart-result" data-code="unknown">
            Unknown result for {result.receipt}; query {result.reconciliation} instead of blind-retrying.
          </span>
        )}
      </div>
      <Button
        onClick={() => void runAdd({ mode: 'unknown' })}
        data-testid="add-unknown"
      >
        Add (unknown channel)
      </Button>
    </div>
  );
}

/** Programmatic (agent) path — shares the exact same business action. */
export function programmaticAdd(params: {
  runtime: ReturnType<typeof createCartRuntime>['runtime'];
  productId: string;
  qty: number;
  idempotencyKey: string;
}): Promise<InvocationResult> {
  return params.runtime.invoke({
    capabilityId: 'cart.add',
    input: { productId: params.productId, qty: params.qty },
    invocationId: `agent-${params.idempotencyKey}`,
    idempotencyKey: params.idempotencyKey,
  });
}

export function CartDemoApp({ children }: { children: ReactNode }): JSX.Element {
  return <FutureUIProvider appId="cart-demo">{children}</FutureUIProvider>;
}
