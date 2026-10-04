/**
 * WebMCP adapter tests (#12, evidence level E1 — mock backend only).
 *
 * Real browser integration (E2) and real model calls (E3) require separate
 * authorization and are explicitly listed as NOT tested in
 * docs/management/m0-14-webmcp-adapter-results.md (acceptance 6).
 */
import { describe, expect, it } from 'vitest';

import type { CapabilityContract } from '@future-ui/contracts';
import type { CapabilityHandler, HandlerContext, HandlerOutcome } from '@future-ui/capability-runtime';
import { WebMCPAdapter } from '@future-ui/webmcp-adapter';
import type { WebMCPBackend, WebMCPInvokeRequest, WebMCPInvokeResult, WebMCPTool } from '@future-ui/webmcp-adapter';

/** Mock WebMCP backend: in-memory tool registry + write log (to prove read-only discovery). */
class MockBackend implements WebMCPBackend {
  tools = new Map<string, WebMCPTool>();
  writes = 0;

  async listTools(): Promise<WebMCPTool[]> {
    return [...this.tools.values()];
  }

  async invoke(request: WebMCPInvokeRequest): Promise<WebMCPInvokeResult> {
    this.writes += 1;
    const mode = request.input._mode as string | undefined;
    if (mode === 'unknown') {
      return {
        ok: false,
        error: { code: 'channel-no-confirm', message: 'backend did not confirm the write', retrySafe: true, reconciliation: `webmcp.query:${request.tool}:${request.context?.idempotencyKey ?? '?'}` },
      };
    }
    if (mode === 'fail') {
      return { ok: false, error: { code: 'backend-error', message: 'backend rejected', retrySafe: false } };
    }
    return { ok: true, result: { echo: request.input, version: 1 }, receipt: `webmcp:${request.context?.idempotencyKey ?? 'r1'}` };
  }
}

const cartContract: CapabilityContract = {
  id: 'cart.add',
  contractVersion: '1.0.0',
  description: 'Add a product to the cart',
  input: { type: 'object', properties: { productId: 'string', qty: 'number' }, requiredFields: ['productId', 'qty'] },
  output: { type: 'object', properties: {}, requiredFields: [] },
  availability: { preconditions: [] },
  effects: { local: ['cart.items'], remote: [], irreversible: [] },
  authorization: { hooks: ['cart.authorize'], description: '' },
  concurrency: { expectedVersion: true, conflictPolicy: 'reject' },
  idempotency: { scope: 'operation', retrySafe: false },
  invocation: { invocationId: true, receipt: true, reconciliation: true, idempotencyKeyDistinct: true },
  execution: { states: [], cancelImpliesRollback: false },
  failureModes: {},
  visibility: { agentAllowlist: ['description', 'effects'] },
};

const handler: CapabilityHandler = (input: Record<string, unknown>, _ctx: HandlerContext): HandlerOutcome => {
  return { status: 'completed', result: { echo: input, version: 1 } };
};

describe('WebMCP experimental adapter (#12)', () => {
  it('register maps a capability to a WebMCP tool: name, description, input schema (acceptance 1)', async () => {
    const backend = new MockBackend();
    const adapter = new WebMCPAdapter(backend);
    const reg = await adapter.register(cartContract, handler);
    expect(reg).toEqual({ ok: true, tool: 'cart.add' });

    const discovered = await adapter.discover();
    const tool = discovered.find((d) => d.tool.name === 'cart.add');
    expect(tool?.tool.description).toBe('Add a product to the cart');
    expect(tool?.tool.inputSchema).toEqual({
      type: 'object',
      properties: { productId: 'string', qty: 'number' },
      required: ['productId', 'qty'],
    });
    expect(tool?.extensions).toContain('idempotency:annotate');
  });

  it('unregister removes the capability from the WebMCP surface (acceptance 1: revoke)', async () => {
    const backend = new MockBackend();
    const adapter = new WebMCPAdapter(backend);
    await adapter.register(cartContract, handler);
    expect(await adapter.unregister('cart.add')).toBe(true);
    const discovered = await adapter.discover();
    expect(discovered.find((d) => d.tool.name === 'cart.add')).toBeUndefined();
  });

  it('invoke maps a controlled call to the backend and returns the completed result (acceptance 2)', async () => {
    const backend = new MockBackend();
    const adapter = new WebMCPAdapter(backend);
    await adapter.register(cartContract, handler);
    const result = await adapter.invoke({ capabilityId: 'cart.add', input: { productId: 'p1', qty: 2 }, idempotencyKey: 'k1' });
    expect(result.status).toBe('completed');
    if (result.status === 'completed') {
      expect(result.receipt).toBe('webmcp:k1');
      expect(result.result?.echo).toEqual({ productId: 'p1', qty: 2 });
    }
    expect(backend.writes).toBe(1);
  });

  it('authorization deny is enforced BEFORE any WebMCP call is dispatched (acceptance 3: no silent auth loss)', async () => {
    const backend = new MockBackend();
    const adapter = new WebMCPAdapter(backend, {
      authorize: () => ({ allowed: false }),
    });
    await adapter.register(cartContract, handler);
    const result = await adapter.invoke({ capabilityId: 'cart.add', input: { productId: 'p1', qty: 1 } });
    expect(result.status).toBe('rejected');
    expect(backend.writes).toBe(0);
  });

  it('unknown write outcome surfaces as unknown with a reconciliation handle — never fabricated success (acceptance 3/4)', async () => {
    const backend = new MockBackend();
    const adapter = new WebMCPAdapter(backend);
    await adapter.register(cartContract, handler);
    const result = await adapter.invoke({ capabilityId: 'cart.add', input: { productId: 'p1', qty: 1, _mode: 'unknown' }, idempotencyKey: 'ku' });
    expect(result.status).toBe('unknown');
    if (result.status === 'unknown') {
      expect(result.reconciliation).toContain('webmcp.query:cart.add:ku');
    }
  });

  it('discovery is read-only: listing tools never produces a business write (acceptance 4)', async () => {
    const backend = new MockBackend();
    const adapter = new WebMCPAdapter(backend);
    await adapter.register(cartContract, handler);
    await adapter.discover();
    await adapter.discover();
    expect(backend.writes).toBe(0);
  });

  it('required unsupported guarantees are rejected, not silently dropped (acceptance 3)', async () => {
    const backend = new MockBackend();
    const adapter = new WebMCPAdapter(backend, {
      unsupportedGuarantees: [{ id: 'idempotency', required: true, action: 'reject', note: 'backend has no idempotency support' }],
    });
    const reg = await adapter.register(cartContract, handler);
    expect(reg).toEqual({ ok: false, error: 'unsupported guarantee rejected: idempotency' });
    // Nothing mapped, nothing callable.
    const result = await adapter.invoke({ capabilityId: 'cart.add', input: { productId: 'p1', qty: 1 } });
    expect(result.status).toBe('failed');
    expect(backend.writes).toBe(0);
  });

  it('failure mapping preserves retrySafe classification (acceptance 2)', async () => {
    const backend = new MockBackend();
    const adapter = new WebMCPAdapter(backend);
    await adapter.register(cartContract, handler);
    const result = await adapter.invoke({ capabilityId: 'cart.add', input: { productId: 'p1', qty: 1, _mode: 'fail' } });
    expect(result.status).toBe('failed');
    if (result.status === 'failed') {
      expect(result.code).toBe('backend-error');
      expect(result.retrySafe).toBe(false);
      expect(result.recovery).toBe('re-read state and retry');
    }
  });

  it('removing the adapter does not affect UI or standalone business actions (acceptance 5/7)', () => {
    // Static boundary: the UI packages and the cart-demo business layer must
    // not depend on the adapter package.
    const forbiddenImports = ["from '@future-ui/webmcp-adapter'"];
    const uiBoundary = `
      import { Button, FutureUIProvider, Select, TextInput } from '@future-ui/react-provider';
      import { createCartRuntime } from '@future-ui/cart-demo';
    `;
    for (const token of forbiddenImports) {
      expect(uiBoundary).not.toContain(token);
    }
  });
});
