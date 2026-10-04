/**
 * Public types for the M1-02 Capability Runtime.
 *
 * Semantics follow D06(M0) / capability.schema.json:
 * - metadata (CapabilityContract) is separated from the business handler;
 * - schema-valid != authorized != executed: the unified path always runs
 *   input validation, authorization hooks, confirmation and state checks
 *   BEFORE the handler, so a rejection has no business side effect;
 * - authorization.hooks are application-integrable check interfaces; a
 *   contract.description is never treated as an authorization;
 * - invocation identity is distinct from idempotency key; unknown results
 *   carry a reconciliation handle and must not be blind-retried;
 * - cancellation does not imply rollback (cancelImpliesRollback=false);
 * - agent-visible state is minimized to visibility.agentAllowlist, with
 *   audit redaction for secrets (cookies/tokens/credentials).
 */
import type { CapabilityContract, Diagnostic } from '@future-ui/contracts';

import type { AuditLog } from './audit.js';

/** Business handler outcome — the only way a handler may report effects. */
export type HandlerOutcome =
  | {
      status: 'completed';
      result: Record<string, unknown>;
      /** business receipt / execution identifier, when supported */
      receipt?: string;
    }
  | {
      status: 'failed';
      code: string;
      message: string;
      /** per failureModes classification: whether a retry is safe */
      retrySafe: boolean;
      recovery?: string;
    }
  | {
      status: 'unknown';
      reason: string;
      /** reconciliation handle; the caller can query the result later */
      reconciliation: string;
      receipt?: string;
    }
  | {
      status: 'pending';
      receipt: string;
    };

/** Context handed to a handler by the runtime (never includes secrets). */
export interface HandlerContext {
  readonly invocationId: string;
  readonly idempotencyKey?: string;
  /** principal label after the authorization hook passed it (already minimal). */
  readonly principal?: string;
  /** confirmation items the caller already supplied. */
  readonly confirmations: ReadonlySet<string>;
  /** expected state version passed by the caller (business-layer conflict policy). */
  readonly expectedVersion?: number;
}

/** Business function registered for a capability. Purely executes; never validates policy. */
export type CapabilityHandler = (
  input: Record<string, unknown>,
  ctx: HandlerContext,
) => HandlerOutcome | Promise<HandlerOutcome>;

/** A registered capability: metadata (contract) and business handler are separate objects. */
export interface CapabilityDefinition {
  contract: CapabilityContract;
  handler: CapabilityHandler;
}

/** Application-integrable hook interfaces named by authorization.hooks. */
export interface RuntimeHooks {
  /** identity/policy check. Absent hook + defaultAuthorization=deny ⇒ reject. */
  authorize?(req: AuthRequest): AuthDecision | Promise<AuthDecision>;
  /** mandatory confirmation for irreversible effects. */
  confirm?(req: ConfirmRequest): ConfirmDecision | Promise<ConfirmDecision>;
  /** execution-time re-check of availability.preconditions. */
  checkState?(req: StateCheckRequest): StateDecision | Promise<StateDecision>;
}

export interface AuthRequest {
  capabilityId: string;
  principal?: string;
  input: Readonly<Record<string, unknown>>;
}

export type AuthDecision = { allowed: boolean; reason?: string };

export interface ConfirmRequest {
  capabilityId: string;
  /** irreversible effects requiring confirmation. */
  required: readonly string[];
  /** confirmation items the caller already supplied. */
  provided: ReadonlySet<string>;
}

export type ConfirmDecision = { approved: boolean; missing?: string[] };

export interface StateCheckRequest {
  capabilityId: string;
  /** preconditions declared in the contract. */
  preconditions: readonly string[];
}

export type StateDecision = { ok: boolean; reason?: string };

export interface RuntimeOptions {
  hooks?: RuntimeHooks;
  /**
   * Default policy when no authorize hook is configured.
   * Default 'deny': a capability without a live policy hook is NOT callable —
   * a policy description is never an execution permission.
   */
  defaultAuthorization?: 'allow' | 'deny';
  /**
   * Default confirmation policy when irreversible effects exist but no confirm
   * hook is configured. Default 'require': irreversible effects demand
   * explicit confirmation.
   */
  defaultConfirmation?: 'require' | 'allow';
  audit?: AuditLog;
  now?: () => string;
}

export interface InvocationRequest {
  capabilityId: string;
  input: Record<string, unknown>;
  /** stable per-call identity; distinct from idempotencyKey. */
  invocationId: string;
  /** idempotency key; same key + different params must not count as same success. */
  idempotencyKey?: string;
  principal?: string;
  expectedVersion?: number;
  /** confirmation items the caller explicitly supplies (e.g. accepted irreversible effects). */
  confirmation?: string[];
  /** cancellation signal (unmount / teardown). */
  signal?: AbortSignal;
}

export type InvocationResult =
  | {
      status: 'completed';
      capabilityId: string;
      invocationId: string;
      receipt?: string;
      result: Record<string, unknown>;
    }
  | {
      status: 'rejected';
      capabilityId: string;
      invocationId: string;
      diagnostics: Diagnostic[];
      reason?: string;
    }
  | {
      status: 'failed';
      capabilityId: string;
      invocationId: string;
      code: string;
      message: string;
      retrySafe: boolean;
      recovery?: string;
    }
  | {
      status: 'unknown';
      capabilityId: string;
      invocationId: string;
      reconciliation: string;
      receipt?: string;
    }
  | {
      status: 'cancelled';
      capabilityId: string;
      invocationId: string;
      note: string;
      /** D06(M0): cancellation never pretends a rollback happened. */
      rollbackApplied: false;
    }
  | {
      status: 'pending';
      capabilityId: string;
      invocationId: string;
      receipt: string;
    };

export type InvocationStatus = InvocationResult['status'];

export type { CapabilityContract, Diagnostic };
