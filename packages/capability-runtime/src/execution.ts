/**
 * ExecutionStore (M1-02): idempotency and in-flight gating.
 *
 * D06(M0) semantics:
 * - invocation identity (invocationId) is distinct from idempotency key;
 * - scope=request dedupes by invocationId; scope=operation dedupes by
 *   idempotencyKey and, with idempotencyKeyDistinct, rejects the same key with
 *   different params instead of counting it as the same success;
 * - an in-flight same-identity call returns a pending marker so the caller
 *   does not blind-retry;
 * - cancellation is handled by the invocation path, never here as a rollback.
 */
import type { CapabilityContract } from '@future-ui/contracts';

import type { InvocationRequest } from './types.js';

export interface RecordedOutcome {
  status: 'completed' | 'failed' | 'unknown' | 'pending';
  result?: Record<string, unknown>;
  receipt?: string;
  reconciliation?: string;
  code?: string;
  message?: string;
  retrySafe?: boolean;
  recovery?: string;
}

export type LookupResult =
  | { kind: 'completed'; record: RecordedOutcome }
  | { kind: 'pending' }
  | { kind: 'key-conflict' }
  | { kind: 'none' };

export class ExecutionStore {
  private readonly byInvocation = new Map<string, RecordedOutcome>();
  private readonly byKey = new Map<string, { paramsHash: string; record: RecordedOutcome }>();
  private readonly inflight = new Set<string>();

  lookup(contract: CapabilityContract, req: InvocationRequest): LookupResult {
    const scope = contract.idempotency.scope;
    if (scope === 'none') return { kind: 'none' };
    if (scope === 'request') {
      const record = this.byInvocation.get(req.invocationId);
      if (record) return { kind: 'completed', record };
      if (this.inflight.has(req.invocationId)) return { kind: 'pending' };
      return { kind: 'none' };
    }
    const key = req.idempotencyKey;
    if (key === undefined) return { kind: 'none' };
    const existing = this.byKey.get(key);
    if (existing) {
      if (existing.paramsHash !== paramsHash(req.input)) return { kind: 'key-conflict' };
      return { kind: 'completed', record: existing.record };
    }
    if (this.inflight.has(key)) return { kind: 'pending' };
    return { kind: 'none' };
  }

  /** Claim the gating identity for the duration of the call. False = already in flight. */
  begin(contract: CapabilityContract, req: InvocationRequest): boolean {
    const scope = contract.idempotency.scope;
    if (scope === 'none') return true;
    const identity = scope === 'request' ? req.invocationId : req.idempotencyKey;
    if (identity === undefined) return true;
    if (this.inflight.has(identity)) return false;
    this.inflight.add(identity);
    return true;
  }

  end(contract: CapabilityContract, req: InvocationRequest): void {
    const scope = contract.idempotency.scope;
    if (scope === 'none') return;
    const identity = scope === 'request' ? req.invocationId : req.idempotencyKey;
    if (identity !== undefined) this.inflight.delete(identity);
  }

  record(contract: CapabilityContract, req: InvocationRequest, outcome: RecordedOutcome): void {
    const scope = contract.idempotency.scope;
    if (scope === 'none') return;
    if (scope === 'request') {
      this.byInvocation.set(req.invocationId, outcome);
      return;
    }
    const key = req.idempotencyKey;
    if (key !== undefined) this.byKey.set(key, { paramsHash: paramsHash(req.input), record: outcome });
  }
}

/** Deterministic shallow content hash for idempotency param comparison. */
export function paramsHash(input: Record<string, unknown>): string {
  const keys = Object.keys(input).sort();
  return JSON.stringify(keys.map((k) => [k, input[k]]));
}
