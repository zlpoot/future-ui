import type { HandlerContext, HandlerOutcome } from '@future-ui/capability-runtime';

/**
 * Application business layer for cart.add — lives ONLY in this example app
 * (#10 acceptance 7). Server-authoritative state (items/version) plus
 * idempotency replay, operation log and a result-query boundary are enforced
 * HERE; the runtime never fabricates business state.
 */
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

  /** Result-query boundary: an unknown-outcome caller queries here. */
  queryByReceipt(receipt: string): { status: CartOpStatus; result?: Record<string, unknown> } | undefined {
    const key = receipt.replace(/^cart:/, '').replace(/-pending$/, '');
    const record = this.opLog.get(key);
    if (!record) return { status: 'unknown' };
    return { status: record.status, result: record.result };
  }
}
