import type { CapabilityContract } from '@future-ui/contracts';
import type { CapabilityHandler } from '@future-ui/capability-runtime';

import type { UnsupportedGuarantee, WebMCPBackend, WebMCPInvokeResult, WebMCPTool } from './webmcp-contract.js';

export interface WebMCPAdapterOptions {
  /** Business policy hook; deny rejects before any WebMCP call is dispatched. */
  authorize?: (params: { capabilityId: string; principal?: string }) => { allowed: boolean };
  /**
   * Guarantees the WebMCP protocol cannot faithfully express for a mapped
   * capability. Each entry decides reject (mapping refused) or annotate
   * (tool exposed with an extension note). Default: idempotency and
   * reconciliation are annotated when the backend is known to not support
   * them (never silently dropped — acceptance 3).
   */
  unsupportedGuarantees?: UnsupportedGuarantee[];
}

export interface WebMCPAdapterInvokeParams {
  capabilityId: string;
  input: Record<string, unknown>;
  principal?: string;
  idempotencyKey?: string;
  expectedVersion?: number;
}

export interface WebMCPAdapterInvokeResult {
  status: 'completed' | 'failed' | 'unknown' | 'rejected';
  result?: Record<string, unknown>;
  receipt?: string;
  code?: string;
  message?: string;
  retrySafe?: boolean;
  recovery?: string;
  reconciliation?: string;
  /** Extension annotations applied because the protocol cannot express the guarantee. */
  extensions?: string[];
}

/**
 * Independent experimental adapter (#12): maps the capability catalog and
 * controlled invocations to a WebMCP backend. Core contracts stay free of
 * the external protocol; replacing or removing this adapter never affects
 * UI-only or standalone business actions (#12 acceptance 5/7).
 */
export class WebMCPAdapter {
  private readonly tools = new Map<string, { contract: CapabilityContract; handler: CapabilityHandler; extensions: string[] }>();
  private readonly guaranteePolicy: Map<string, UnsupportedGuarantee>;

  constructor(
    private readonly backend: WebMCPBackend,
    private readonly options: WebMCPAdapterOptions = {},
  ) {
    this.guaranteePolicy = new Map(
      (options.unsupportedGuarantees ?? []).map((g) => [g.id, g]),
    );
  }

  /** Maps a capability to a WebMCP tool. Rejects when a required guarantee is unsupported. */
  async register(contract: CapabilityContract, handler: CapabilityHandler): Promise<{ ok: true; tool: string } | { ok: false; error: string }> {
    const extensions: string[] = [];

    // Idempotency: the contract declares retry-safety scope; if the backend
    // cannot carry idempotencyKey faithfully, annotate or reject — never drop.
    if (contract.idempotency?.scope) {
      const policy = this.guaranteePolicy.get('idempotency') ?? {
        id: 'idempotency',
        required: contract.idempotency.retrySafe === false,
        action: 'annotate' as const,
        note: 'idempotencyKey is carried best-effort; replay semantics are not guaranteed by WebMCP',
      };
      extensions.push(`${policy.id}:${policy.action}`);
      if (policy.action === 'reject') return { ok: false, error: `unsupported guarantee rejected: ${policy.id}` };
    }

    // Reconciliation (unknown-result boundary): if unsupported, annotate —
    // never silently claim the unknown outcome is resolvable.
    if (contract.invocation?.reconciliation) {
      const policy = this.guaranteePolicy.get('reconciliation') ?? {
        id: 'reconciliation',
        required: false,
        action: 'annotate' as const,
        note: 'unknown results may need a native WebMCP query; adapter surfaces reconciliation handle only if backend returns one',
      };
      extensions.push(`${policy.id}:${policy.action}`);
      if (policy.action === 'reject') return { ok: false, error: `unsupported guarantee rejected: ${policy.id}` };
    }

    this.tools.set(contract.id, { contract, handler, extensions });
    return { ok: true, tool: contract.id };
  }

  /** Unregisters a capability from the WebMCP surface (acceptance 1: register/revoke). */
  async unregister(capabilityId: string): Promise<boolean> {
    return this.tools.delete(capabilityId);
  }

  /** Discovery is read-only: it never produces business writes (acceptance 4). */
  async discover(): Promise<Array<{ tool: WebMCPTool; extensions: string[] }>> {
    const remote = await this.backend.listTools();
    const local: Array<{ tool: WebMCPTool; extensions: string[] }> = [];
    for (const [id, entry] of this.tools) {
      local.push({
        tool: {
          name: id,
          description: entry.contract.description,
          inputSchema: {
            type: 'object',
            properties: entry.contract.input?.properties ?? {},
            required: entry.contract.input?.requiredFields ?? [],
          },
        },
        extensions: entry.extensions,
      });
    }
    // Tools the backend already exposes that we did not map stay untouched
    // (read-only discovery reports the union without writing anything).
    for (const t of remote) {
      if (!this.tools.has(t.name)) {
        local.push({ tool: t, extensions: [] });
      }
    }
    return local;
  }

  /**
   * Controlled invocation path: authorize -> dispatch to the WebMCP backend ->
   * map result. Unknown outcomes surface as unknown with a reconciliation
   * handle when available — never as fabricated success (acceptance 3/4).
   */
  async invoke(params: WebMCPAdapterInvokeParams): Promise<WebMCPAdapterInvokeResult> {
    const entry = this.tools.get(params.capabilityId);
    if (!entry) {
      return { status: 'failed', code: 'unknown-capability', message: `no mapped capability: ${params.capabilityId}`, retrySafe: false };
    }
    const auth = this.options.authorize?.({ capabilityId: params.capabilityId, principal: params.principal });
    if (auth && !auth.allowed) {
      return { status: 'rejected', code: 'denied', message: 'authorization hook denied the invocation' };
    }

    const outcome: WebMCPInvokeResult = await this.backend.invoke({
      tool: params.capabilityId,
      input: params.input,
      context: {
        invocationId: params.idempotencyKey ? `adapter-${params.idempotencyKey}` : undefined,
        idempotencyKey: params.idempotencyKey,
        expectedVersion: params.expectedVersion,
      },
    });

    if (outcome.ok) {
      return { status: 'completed', result: outcome.result, receipt: outcome.receipt, extensions: entry.extensions };
    }
    if (outcome.error.reconciliation) {
      return {
        status: 'unknown',
        code: outcome.error.code,
        message: outcome.error.message,
        reconciliation: outcome.error.reconciliation,
        extensions: entry.extensions,
      };
    }
    return {
      status: 'failed',
      code: outcome.error.code,
      message: outcome.error.message,
      retrySafe: outcome.error.retrySafe,
      recovery: outcome.error.retrySafe ? 'retry after backoff' : 're-read state and retry',
      extensions: entry.extensions,
    };
  }
}
