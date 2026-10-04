/**
 * Shared fixtures for the capability-runtime tests (M1-02).
 *
 * The cart.add fixture is a REAL business-layer service (not mock metadata):
 * it owns state versioning, idempotency replay, failure classification and a
 * result-query boundary, exactly as the acceptance requires the application
 * business layer to do.
 */
import type { CapabilityContract } from '@future-ui/contracts';

import { CapabilityRegistry, CapabilityRuntime } from '../src/index.js';
import type { HandlerContext, HandlerOutcome, RuntimeHooks, RuntimeOptions } from '../src/index.js';

export const cartAddContract: CapabilityContract = {
  id: 'cart.add',
  contractVersion: '1.0.0',
  description: 'Add a product to the cart (fixture business service)',
  input: {
    type: 'object',
    properties: { productId: 'string', qty: 'number', expectedVersion: 'number', mode: 'string' },
    requiredFields: ['productId', 'qty'],
  },
  output: {
    type: 'object',
    properties: { items: 'array', version: 'number' },
    requiredFields: [],
  },
  availability: { preconditions: ['cart-service-available'] },
  effects: { local: ['cart.items'], remote: [], irreversible: ['cart.items'] },
  authorization: {
    hooks: ['cart.authorize'],
    description: 'business policy: any authed principal may add to their own cart',
  },
  concurrency: { expectedVersion: true, conflictPolicy: 'reject' },
  idempotency: { scope: 'operation', retrySafe: false },
  invocation: { invocationId: true, receipt: true, reconciliation: true, idempotencyKeyDistinct: true },
  execution: {
    states: ['pending', 'executing', 'completed', 'rejected', 'failed', 'unknown', 'cancelled'],
    cancelImpliesRollback: false,
  },
  failureModes: {
    'stale-version': { retrySafe: false, recovery: 're-read cart version and retry' },
    'transient-lock': { retrySafe: true, recovery: 'retry after backoff' },
  },
  visibility: {
    agentAllowlist: ['description', 'effects', 'concurrency', 'idempotency'],
    redaction: ['cookie', 'password', 'token', 'secret', 'credential'],
  },
};

export interface CartItem {
  productId: string;
  qty: number;
}

export type CartOpStatus = 'completed' | 'failed' | 'unknown' | 'pending';

export interface CartOpRecord {
  status: CartOpStatus;
  result?: Record<string, unknown>;
  code?: string;
  receipt?: string;
}

/**
 * Application business layer for cart.add: state version + idempotency are
 * enforced HERE (acceptance: "cart.add example is implemented by the
 * application business layer"). The runtime never fabricates business state.
 */
export class CartService {
  items: CartItem[] = [];
  version = 0;
  private readonly opLog = new Map<string, CartOpRecord>();
  private readonly locks = new Set<string>();

  constructor(private readonly lockProductIds: string[] = []) {}

  add(input: Record<string, unknown>, ctx: HandlerContext): HandlerOutcome {
    const productId = String(input.productId);
    const qty = Number(input.qty);
    const key = ctx.idempotencyKey;
    const receiptBase = key ?? `v${this.version + 1}`;

    if (key !== undefined) {
      const existing = this.opLog.get(key);
      if (existing) {
        switch (existing.status) {
          case 'completed':
            return { status: 'completed', result: existing.result ?? {}, receipt: existing.receipt };
          case 'pending':
            return { status: 'pending', receipt: existing.receipt ?? `cart:${key}` };
          case 'unknown':
            return {
              status: 'unknown',
              reason: 'result unknown; query by receipt instead of blind-retrying',
              reconciliation: `cart.query:${existing.receipt}`,
              receipt: existing.receipt,
            };
          case 'failed':
            return {
              status: 'failed',
              code: existing.code ?? 'cart_error',
              message: 'previous attempt failed',
              retrySafe: true,
              recovery: 'retry with the same key to resume',
            };
        }
      }
    }

    if (ctx.expectedVersion !== undefined && ctx.expectedVersion !== this.version) {
      return {
        status: 'failed',
        code: 'stale-version',
        message: `expected version ${ctx.expectedVersion}, actual ${this.version}`,
        retrySafe: false,
        recovery: 're-read cart version and retry',
      };
    }

    if (this.lockProductIds.includes(productId)) {
      return {
        status: 'failed',
        code: 'transient-lock',
        message: `product ${productId} is temporarily locked`,
        retrySafe: true,
        recovery: 'retry after backoff',
      };
    }

    if (input.mode === 'unknown') {
      const receipt = `cart:${receiptBase}-pending`;
      if (key !== undefined) this.opLog.set(key, { status: 'unknown', receipt });
      return {
        status: 'unknown',
        reason: 'fulfilment channel did not confirm the write',
        reconciliation: `cart.query:${receipt}`,
        receipt,
      };
    }

    if (this.locks.has(productId)) {
      return {
        status: 'failed',
        code: 'transient-lock',
        message: `product ${productId} is locked by a concurrent write`,
        retrySafe: true,
        recovery: 'retry after backoff',
      };
    }
    this.locks.add(productId);
    try {
      this.items.push({ productId, qty });
      this.version += 1;
      const receipt = `cart:${receiptBase}`;
      const result: Record<string, unknown> = { items: this.items, version: this.version, receipt };
      if (key !== undefined) this.opLog.set(key, { status: 'completed', result, receipt });
      return { status: 'completed', result, receipt };
    } finally {
      this.locks.delete(productId);
    }
  }

  /** Result-query boundary: a caller with an unknown outcome queries here. */
  queryByReceipt(receipt: string): { status: CartOpStatus; result?: Record<string, unknown> } | undefined {
    const key = receipt.replace(/^cart:/, '').replace(/-pending$/, '');
    const record = this.opLog.get(key);
    if (!record) {
      return { status: 'unknown' };
    }
    return { status: record.status, result: record.result };
  }
}

export function makeRuntime(overrides?: {
  hooks?: RuntimeHooks;
  options?: Partial<RuntimeOptions>;
  lockProductIds?: string[];
}): { runtime: CapabilityRuntime; registry: CapabilityRegistry; service: CartService } {
  const registry = new CapabilityRegistry();
  const service = new CartService(overrides?.lockProductIds);
  registry.register({ contract: cartAddContract, handler: (input, ctx) => service.add(input, ctx) });
  // The business fixture defaults to confirmation allowed; the mandatory
  // confirmation gate semantics are covered explicitly in invoke.test.ts.
  const runtime = new CapabilityRuntime(registry, {
    hooks: overrides?.hooks,
    defaultConfirmation: 'allow',
    ...overrides?.options,
  });
  return { runtime, registry, service };
}

/** Minimal request-scope idempotency contract for unified-path tests. */
export const requestIdemContract: CapabilityContract = {
  ...cartAddContract,
  id: 'request.echo',
  idempotency: { scope: 'request', retrySafe: false },
  invocation: { invocationId: true, receipt: true, reconciliation: true, idempotencyKeyDistinct: true },
  effects: { local: [], remote: [], irreversible: [] },
  visibility: { agentAllowlist: ['description'], redaction: [] },
};
