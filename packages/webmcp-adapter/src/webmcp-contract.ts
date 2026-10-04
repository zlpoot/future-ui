/**
 * WebMCP boundary types for the experimental adapter (#12).
 *
 * The adapter never writes WebMCP's protocol into the core contracts: these
 * types describe the external protocol's shape so the adapter can map
 * capability catalog / controlled invocation to it, and can decide — per
 * contract guarantee — whether to map, reject or annotate (#12 acceptance 3).
 */
export interface WebMCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface WebMCPInvokeRequest {
  tool: string;
  input: Record<string, unknown>;
  /** Transported call context that the protocol CAN express (best-effort). */
  context?: {
    invocationId?: string;
    idempotencyKey?: string;
    expectedVersion?: number;
  };
}

export type WebMCPInvokeResult =
  | { ok: true; result: Record<string, unknown>; receipt?: string }
  | {
      ok: false;
      error: { code: string; message: string; retrySafe: boolean; reconciliation?: string };
    };

/**
 * Minimal WebMCP backend surface the adapter talks to. A mock backend is used
 * in tests (evidence level E1); a real browser-integrated WebMCP client and
 * real model calls are NOT part of this task's authorization and stay listed
 * as not-tested (#12 acceptance 6).
 */
export interface WebMCPBackend {
  listTools(): Promise<WebMCPTool[]>;
  invoke(request: WebMCPInvokeRequest): Promise<WebMCPInvokeResult>;
}

/**
 * A contract guarantee the WebMCP protocol cannot faithfully express.
 * The adapter must NOT silently drop authorization/idempotency semantics:
 * it either rejects the mapping (action: 'reject') or marks the mapped tool
 * as carrying an extension annotation (action: 'annotate').
 */
export interface UnsupportedGuarantee {
  id: string;
  required: boolean;
  action: 'reject' | 'annotate';
  note: string;
}
