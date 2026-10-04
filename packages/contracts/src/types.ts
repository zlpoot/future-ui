import type { Diagnostic } from './diagnostics.js';

/** semver string, e.g. "1.0.0" */
export type SemVer = string;

export interface ComponentContract {
  componentType: string;
  contractVersion: SemVer;
  features: Record<string, boolean>;
  props: Record<string, ComponentProp>;
  events: Record<string, ComponentEvent>;
  state: ComponentState;
  parts: Record<string, ComponentPart>;
  control: Record<string, ControlMethod>;
  accessibility: AccessibilityObligations;
  lifecycle: Lifecycle;
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
  ownership: 'controlled' | 'uncontrolled';
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

export interface AccessibilityObligations {
  role: string;
  keyboard?: boolean;
  focus?: boolean;
  semanticRelations?: boolean;
  description?: string;
}

export interface Lifecycle {
  requiresCleanup: boolean;
  description?: string;
}

export interface CapabilityContract {
  id: string;
  contractVersion: SemVer;
  description: string;
  input: DataShape;
  output: DataShape;
  availability: { preconditions: string[]; unavailableReason?: string };
  effects: { local: string[]; remote: string[]; irreversible?: string[] };
  authorization: { hooks: string[]; description?: string };
  concurrency: { expectedVersion?: boolean; conflictPolicy: 'reject' | 'no-op' | 'none' };
  idempotency: { scope: 'none' | 'request' | 'operation'; retrySafe?: boolean };
  invocation: {
    invocationId: boolean;
    receipt: boolean;
    reconciliation: boolean;
    idempotencyKeyDistinct?: boolean;
  };
  execution: {
    states: Array<'pending' | 'executing' | 'completed' | 'rejected' | 'failed' | 'unknown' | 'cancelled'>;
    cancelImpliesRollback?: boolean;
  };
  failureModes: Record<string, { retrySafe: boolean; recovery?: string }>;
  visibility: { agentAllowlist: string[]; redaction?: string[] };
}

export interface DataShape {
  type: 'object';
  properties?: Record<string, unknown>;
  requiredFields?: string[];
  description?: string;
}

export interface BindingContract {
  componentInstanceId: string;
  capabilityId: string;
  contractVersion: SemVer;
  params: { source: 'userEvent' | 'agent' | 'discovery'; mapping: Record<string, string | number | boolean | null> };
  projection: {
    source: string;
    direction: 'read' | 'write' | 'read-write';
    agentVisibility: string[];
    mutability: 'readonly' | 'mutable';
    redaction: string[];
  };
  invocationOnly: string[];
  subscription: { onChange: boolean; unmountUnbinds?: boolean };
  lifecycle: Lifecycle;
}

export interface PluginContract {
  kind: 'protocol' | 'component' | 'theme' | 'capability';
  id: string;
  contractVersion: SemVer;
  provides: string[];
  requires: string[];
  compatibility: { platform: string; engines?: Record<string, string> };
  scope: { app: boolean; request: boolean; description?: string };
  lifecycle: { init: boolean; dispose: boolean; cleanupOnFailure?: boolean };
}

export type { Diagnostic };
