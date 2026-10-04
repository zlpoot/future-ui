/**
 * @future-ui/capability-runtime — structured capability runtime (M1-02).
 *
 * Explicit capability registration with metadata/handler separation,
 * a unified gated invocation path (validation → authorization → confirmation
 * → state checks → execution), D06(M0) execution semantics (idempotency
 * distinct from invocation identity, no blind retry on unknown results,
 * cancellation never implies rollback) and minimal agent-visible state with
 * audit redaction. No dependency on component providers, React, Ark UI or any
 * external agent protocol.
 */
export { CapabilityRegistry } from './registry.js';
export type { CapabilityView, RegisterResult } from './registry.js';
export { CapabilityRuntime, checkInput } from './invoke.js';
export { AuditLog, redactValue } from './audit.js';
export type { AuditEntry } from './audit.js';
export type {
  AuthDecision,
  AuthRequest,
  CapabilityDefinition,
  CapabilityHandler,
  ConfirmDecision,
  ConfirmRequest,
  HandlerContext,
  HandlerOutcome,
  InvocationRequest,
  InvocationResult,
  InvocationStatus,
  RuntimeHooks,
  RuntimeOptions,
  StateCheckRequest,
  StateDecision,
} from './types.js';
export type { CapabilityContract, Diagnostic } from '@future-ui/contracts';
