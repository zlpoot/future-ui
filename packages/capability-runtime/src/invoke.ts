/**
 * CapabilityRuntime.invoke — the unified, gated invocation path (M1-02).
 *
 * Order is fixed and every gate runs BEFORE the handler, so a rejection has
 * no business side effect:
 *   capability exists → pre-cancel → idempotency fast path → input validation
 *   → authorization hook → mandatory confirmation (irreversible effects)
 *   → availability precondition re-check → handler → outcome classification.
 *
 * Outcomes map onto execution.states: completed / rejected / failed / unknown
 * / cancelled / pending. Cancellation never implies rollback
 * (rollbackApplied is always false). Unknown results carry a reconciliation
 * handle so the caller can query instead of blind-retrying.
 */
import type { CapabilityContract, Diagnostic } from '@future-ui/contracts';

import { AuditLog, redactValue } from './audit.js';
import { ExecutionStore, type RecordedOutcome } from './execution.js';
import type { CapabilityRegistry } from './registry.js';
import type {
  AuthDecision,
  ConfirmDecision,
  HandlerContext,
  InvocationRequest,
  InvocationResult,
  RuntimeHooks,
  RuntimeOptions,
  StateDecision,
} from './types.js';

export class CapabilityRuntime {
  private readonly store = new ExecutionStore();
  private readonly audit: AuditLog;
  private readonly hooks: RuntimeHooks;
  private readonly defaultAuthorization: 'allow' | 'deny';
  private readonly defaultConfirmation: 'require' | 'allow';
  private readonly now: () => string;

  constructor(
    private readonly registry: CapabilityRegistry,
    options: RuntimeOptions = {},
  ) {
    this.audit = options.audit ?? new AuditLog();
    this.hooks = options.hooks ?? {};
    this.defaultAuthorization = options.defaultAuthorization ?? 'deny';
    this.defaultConfirmation = options.defaultConfirmation ?? 'require';
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async invoke(req: InvocationRequest): Promise<InvocationResult> {
    const entry = this.registry.get(req.capabilityId);
    if (!entry) {
      return this.rejected(req, [
        {
          code: 'capability_conflict',
          path: '/capabilityId',
          expected: 'a registered capability id',
          actual: req.capabilityId,
          explanation: 'capability is not registered; undeclared actions are not exposed',
          repairHint: 'register the capability before invoking it',
        },
      ]);
    }
    const { contract, handler } = entry;

    if (req.signal?.aborted) {
      return this.cancelled(req, 'cancelled before start');
    }

    const scope = contract.idempotency.scope;
    if (scope !== 'none') {
      const look = this.store.lookup(contract, req);
      if (look.kind === 'completed') {
        return this.replay(req, look.record, contract);
      }
      if (look.kind === 'pending') {
        return this.pending(req, 'already executing for the same idempotency identity; not blind-retried');
      }
      if (look.kind === 'key-conflict') {
        return this.rejected(
          req,
          [
            {
              code: 'conflict',
              path: '/idempotencyKey',
              expected: 'same key + same params to reuse a result',
              actual: req.idempotencyKey ?? 'absent',
              explanation: 'same idempotency key with different params must not count as the same success (idempotencyKeyDistinct)',
              repairHint: 'use a fresh idempotency key for different parameters',
            },
          ],
          'idempotency key reused with different parameters',
        );
      }
    }

    const inputDiags = checkInput(req.input, contract.input);
    if (inputDiags.length > 0) {
      return this.rejected(req, inputDiags);
    }

    const auth = await this.authorize(contract, req);
    if (!auth.allowed) {
      return this.rejected(
        req,
        [
          {
            code: 'unauthorized',
            path: '/authorization',
            expected: 'authorization hook approval',
            actual: 'denied',
            explanation: auth.reason ?? 'policy check failed; a policy description is never an execution permission',
          },
        ],
        auth.reason ?? 'not authorized',
      );
    }

    if (needsConfirmation(contract)) {
      const conf = await this.confirm(contract, req);
      if (!conf.approved) {
        return this.rejected(
          req,
          [
            {
              code: 'unauthorized',
              path: '/confirmation',
              expected: `confirmation for: ${conf.missing?.join(', ') ?? 'irreversible effects'}`,
              actual: 'not confirmed',
              explanation: 'mandatory confirmation for irreversible effects was not approved',
            },
          ],
          `confirmation required: ${conf.missing?.join(', ') ?? 'irreversible effects'}`,
        );
      }
    }

    const state = await this.checkState(contract);
    if (!state.ok) {
      return this.rejected(
        req,
        [
          {
            code: 'unavailable',
            path: '/availability/preconditions',
            expected: 'all preconditions satisfied',
            actual: 'not satisfied',
            explanation: state.reason ?? 'availability precondition failed',
          },
        ],
        state.reason ?? 'unavailable',
      );
    }

    if (scope !== 'none' && !this.store.begin(contract, req)) {
      return this.pending(req, 'already executing for the same idempotency identity; not blind-retried');
    }

    try {
      if (req.signal?.aborted) {
        return this.cancelled(req, 'cancelled before handler execution');
      }
      const ctx: HandlerContext = {
        invocationId: req.invocationId,
        idempotencyKey: req.idempotencyKey,
        principal: req.principal,
        confirmations: new Set(req.confirmation ?? []),
        expectedVersion: req.expectedVersion,
      };
      const outcome = await handler(req.input, ctx);
      switch (outcome.status) {
        case 'completed': {
          const record: RecordedOutcome = { status: 'completed', result: outcome.result, receipt: outcome.receipt };
          this.store.record(contract, req, record);
          this.auditEntry(req, 'completed', outcome.result, 'completed');
          return {
            status: 'completed',
            capabilityId: contract.id,
            invocationId: req.invocationId,
            receipt: outcome.receipt,
            result: outcome.result,
          };
        }
        case 'failed': {
          const record: RecordedOutcome = {
            status: 'failed',
            code: outcome.code,
            message: outcome.message,
            retrySafe: outcome.retrySafe,
            recovery: outcome.recovery,
          };
          this.store.record(contract, req, record);
          this.auditEntry(req, 'failed', undefined, `${outcome.code}: ${outcome.message}`);
          return {
            status: 'failed',
            capabilityId: contract.id,
            invocationId: req.invocationId,
            code: outcome.code,
            message: outcome.message,
            retrySafe: outcome.retrySafe,
            recovery: outcome.recovery,
          };
        }
        case 'unknown': {
          const record: RecordedOutcome = {
            status: 'unknown',
            reconciliation: outcome.reconciliation,
            receipt: outcome.receipt,
          };
          this.store.record(contract, req, record);
          this.auditEntry(req, 'unknown', undefined, `result unknown; reconcile via ${outcome.reconciliation}`);
          return {
            status: 'unknown',
            capabilityId: contract.id,
            invocationId: req.invocationId,
            reconciliation: outcome.reconciliation,
            receipt: outcome.receipt,
          };
        }
        case 'pending': {
          this.store.record(contract, req, { status: 'pending', receipt: outcome.receipt });
          this.auditEntry(req, 'pending', undefined, 'async work started; query the receipt for the result');
          return {
            status: 'pending',
            capabilityId: contract.id,
            invocationId: req.invocationId,
            receipt: outcome.receipt,
          };
        }
        default: {
          // Exhaustive over HandlerOutcome; defensive fallback for future statuses.
          return this.failedResult(req, 'unreachable_outcome', 'handler returned an unknown outcome status', false);
        }
      }
    } catch (err) {
      if (req.signal?.aborted) {
        return this.cancelled(req, 'handler interrupted by cancellation; rollback is not implied');
      }
      const message = err instanceof Error ? err.message : String(err);
      const record: RecordedOutcome = { status: 'failed', code: 'handler_error', message, retrySafe: false };
      this.store.record(contract, req, record);
      this.auditEntry(req, 'failed', undefined, `handler_error: ${message}`);
      return {
        status: 'failed',
        capabilityId: contract.id,
        invocationId: req.invocationId,
        code: 'handler_error',
        message,
        retrySafe: false,
      };
    } finally {
      if (scope !== 'none') this.store.end(contract, req);
    }
  }

  auditEntries() {
    return this.audit.entries();
  }

  private async authorize(contract: CapabilityContract, req: InvocationRequest): Promise<AuthDecision> {
    const hook = this.hooks.authorize;
    if (hook) return hook({ capabilityId: contract.id, principal: req.principal, input: req.input });
    if (this.defaultAuthorization === 'allow') return { allowed: true, reason: 'default-allow (no authorize hook configured)' };
    return {
      allowed: false,
      reason: contract.authorization.hooks.length > 0
        ? `authorization hook not configured for: ${contract.authorization.hooks.join(', ')}`
        : 'no authorization hook configured; default deny',
    };
  }

  private async confirm(contract: CapabilityContract, req: InvocationRequest): Promise<ConfirmDecision> {
    const required = contract.effects.irreversible ?? [];
    const provided = new Set(req.confirmation ?? []);
    if (required.every((r) => provided.has(r))) return { approved: true };
    const missing = required.filter((r) => !provided.has(r));
    const hook = this.hooks.confirm;
    if (hook) return hook({ capabilityId: contract.id, required, provided });
    if (this.defaultConfirmation === 'allow') return { approved: true };
    return { approved: false, missing };
  }

  private async checkState(contract: CapabilityContract): Promise<StateDecision> {
    const hook = this.hooks.checkState;
    if (hook) return hook({ capabilityId: contract.id, preconditions: contract.availability.preconditions });
    return { ok: true };
  }

  private auditEntry(req: InvocationRequest, status: string, result: Record<string, unknown> | undefined, note: string | undefined): void {
    this.audit.record({
      at: this.now(),
      capabilityId: req.capabilityId,
      invocationId: req.invocationId,
      principal: req.principal,
      status,
      input: redactValue(req.input) as Record<string, unknown>,
      result: result === undefined ? undefined : (redactValue(result) as Record<string, unknown>),
      note,
    });
  }

  private rejected(req: InvocationRequest, diagnostics: Diagnostic[], reason?: string): InvocationResult {
    this.auditEntry(req, 'rejected', undefined, reason);
    return {
      status: 'rejected',
      capabilityId: req.capabilityId,
      invocationId: req.invocationId,
      diagnostics,
      reason,
    };
  }

  private cancelled(req: InvocationRequest, note: string): InvocationResult {
    this.auditEntry(req, 'cancelled', undefined, note);
    return {
      status: 'cancelled',
      capabilityId: req.capabilityId,
      invocationId: req.invocationId,
      note,
      rollbackApplied: false,
    };
  }

  private pending(req: InvocationRequest, note: string): InvocationResult {
    this.auditEntry(req, 'pending', undefined, note);
    return {
      status: 'pending',
      capabilityId: req.capabilityId,
      invocationId: req.invocationId,
      receipt: `pending:${req.invocationId}`,
    };
  }

  /**
   * Replay a previously recorded outcome. The recorded status is preserved:
   * an unknown/failed/pending result is never replayed as a fabricated
   * success (D06: unknown results must not be blind-retried).
   */
  private replay(req: InvocationRequest, record: RecordedOutcome, contract: CapabilityContract): InvocationResult {
    switch (record.status) {
      case 'completed':
        this.auditEntry(req, 'completed', record.result, 'replayed from idempotency store');
        return {
          status: 'completed',
          capabilityId: contract.id,
          invocationId: req.invocationId,
          receipt: record.receipt,
          result: record.result ?? {},
        };
      case 'failed':
        this.auditEntry(req, 'failed', undefined, `${record.code ?? 'failed'}: replayed from idempotency store`);
        return {
          status: 'failed',
          capabilityId: contract.id,
          invocationId: req.invocationId,
          code: record.code ?? 'failed',
          message: record.message ?? 'previous attempt failed',
          retrySafe: record.retrySafe ?? false,
          recovery: record.recovery,
        };
      case 'unknown':
        this.auditEntry(req, 'unknown', undefined, 'replayed unknown result; reconcile instead of blind-retrying');
        return {
          status: 'unknown',
          capabilityId: contract.id,
          invocationId: req.invocationId,
          reconciliation: record.reconciliation ?? `query:${req.invocationId}`,
          receipt: record.receipt,
        };
      case 'pending':
        return this.pending(req, 'replayed pending result; query the receipt');
    }
  }

  private failedResult(req: InvocationRequest, code: string, message: string, retrySafe: boolean): InvocationResult {
    this.auditEntry(req, 'failed', undefined, `${code}: ${message}`);
    return {
      status: 'failed',
      capabilityId: req.capabilityId,
      invocationId: req.invocationId,
      code,
      message,
      retrySafe,
    };
  }
}

function needsConfirmation(contract: CapabilityContract): boolean {
  return (contract.effects.irreversible?.length ?? 0) > 0;
}

/** Input validation against the capability data shape (before any authorization). */
export function checkInput(input: unknown, shape: { type: 'object'; properties?: Record<string, unknown>; requiredFields?: string[] }): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    diagnostics.push({
      code: 'type_mismatch',
      path: '/',
      expected: 'object',
      actual: input === null ? 'null' : typeof input,
      explanation: 'capability input must be an object',
    });
    return diagnostics;
  }
  const record = input as Record<string, unknown>;
  for (const field of shape.requiredFields ?? []) {
    if (!(field in record) || record[field] === undefined) {
      diagnostics.push({
        code: 'missing_required',
        path: `/${field}`,
        expected: `required field: ${field}`,
        actual: 'absent',
        explanation: 'input is missing a required field',
      });
    }
  }
  for (const [name, type] of Object.entries(shape.properties ?? {})) {
    if (!(name in record) || record[name] === undefined) continue;
    const expected = typeof type === 'object' && type !== null && 'type' in type
      ? String((type as { type: unknown }).type)
      : String(type);
    const actual = typeof record[name];
    if (expected !== 'object' && actual !== expected) {
      diagnostics.push({
        code: 'type_mismatch',
        path: `/${name}`,
        expected: `type: ${expected}`,
        actual: `type: ${actual}`,
        explanation: `input field ${name} has the wrong type`,
      });
    }
  }
  return diagnostics;
}
