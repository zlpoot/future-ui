/**
 * Public type definitions for the future-ui contracts package (M0-02, D05).
 *
 * These interfaces mirror the authoritative JSON Schemas in ./schemas: the
 * schemas are the single source of truth and the types are generated/mapped
 * from them. Diagnostics reuse the frozen M0 error code structure.
 */

import type { Diagnostic } from './diagnostics.js';

export type { Diagnostic };

/** Machine-readable component/contract description consumed by the AI Contract Core (D14). */
export interface ContractMetadata {
  componentType: string;
  contractVersion: string;
  features: Record<string, boolean>;
}

export interface ComponentProp {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';
  default?: unknown;
  required?: boolean;
  enum?: unknown[];
  description?: string;
}

export interface ComponentEvent {
  description: string;
  payload: Record<string, unknown>;
}

export interface ComponentState {
  /** 'controlled' / 'uncontrolled' / 'hybrid' (controlled while a value prop is provided, otherwise uncontrolled) — D05. */
  ownership: 'controlled' | 'uncontrolled' | 'hybrid';
  fields?: Record<string, string | number | boolean | null>;
}

export interface ComponentPart {
  required: boolean;
  description?: string;
  slots?: string[];
}

export interface ControlMethod {
  params: Record<string, unknown>;
  returns?: string;
  description?: string;
}

export interface ComponentAccessibility {
  role: string;
  keyboard?: boolean;
  focus?: boolean;
  semanticRelations?: boolean;
  description?: string;
}

export interface ComponentLifecycle {
  requiresCleanup: boolean;
}

/**
 * Component M0 minimal field families (D05): identity/version, features,
 * props, events, state, parts, control, accessibility, lifecycle.
 */
export interface ComponentContract extends ContractMetadata {
  props: Record<string, ComponentProp>;
  events: Record<string, ComponentEvent>;
  state: ComponentState;
  parts: Record<string, ComponentPart>;
  control: Record<string, ControlMethod>;
  accessibility: ComponentAccessibility;
  lifecycle: ComponentLifecycle;
}

export interface BindingContract {
  componentInstanceId: string;
  capabilityId: string;
  params?: Record<string, unknown>;
  projection?: Record<string, unknown>;
  'invocation-only'?: boolean;
  subscription?: boolean;
}

export interface CapabilityContract {
  id: string;
  contractVersion: string;
  description: string;
  input: { type: 'object'; properties?: Record<string, unknown>; requiredFields?: string[] };
  output: { type: 'object'; properties?: Record<string, unknown>; requiredFields?: string[] };
  availability: { preconditions: string[] };
  effects: { local: string[]; remote: string[]; irreversible?: string[] };
  authorization: { hooks: string[]; description: string };
  concurrency: { expectedVersion: boolean; conflictPolicy: 'reject' | 'queue' };
  idempotency: { scope: 'none' | 'request' | 'operation'; retrySafe: boolean };
  invocation: { invocationId: boolean; receipt: boolean; reconciliation: boolean; idempotencyKeyDistinct: boolean };
  execution: { states: string[]; cancelImpliesRollback: boolean };
  failureModes: Record<string, { retrySafe: boolean; recovery?: string }>;
  visibility: { agentAllowlist: string[]; redaction: string[] };
}

export type { Diagnostic };
