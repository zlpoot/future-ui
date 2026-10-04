import { describe, expect, it } from 'vitest';

import { validateContract } from '../src/validate.js';
import type { ContractKind } from '../src/validate.js';

const component = {
  componentType: 'dialog',
  contractVersion: '1.0.0',
  features: { dismissible: true },
  props: { open: { type: 'boolean', default: false } },
  events: { openChange: { description: 'open state changed', payload: { open: 'boolean' } } },
  state: { ownership: 'controlled', fields: { open: false } },
  parts: { root: { required: true } },
  control: { show: { params: {} } },
  accessibility: { role: 'dialog' },
  lifecycle: { requiresCleanup: false },
};

const capability = {
  id: 'cart.add',
  contractVersion: '1.0.0',
  description: 'add an item to the cart',
  input: { type: 'object', properties: { sku: 'string' }, requiredFields: ['sku'] },
  output: { type: 'object', properties: { cartId: 'string' } },
  availability: { preconditions: ['session'] },
  effects: { local: ['cart'], remote: [] },
  authorization: { hooks: ['cart.write'] },
  concurrency: { conflictPolicy: 'reject', expectedVersion: true },
  idempotency: { scope: 'operation', retrySafe: true },
  invocation: { invocationId: true, receipt: true, reconciliation: true, idempotencyKeyDistinct: true },
  execution: { states: ['pending', 'executing', 'completed', 'failed'], cancelImpliesRollback: false },
  failureModes: { network: { retrySafe: true } },
  visibility: { agentAllowlist: ['cartId'] },
};

const binding = {
  componentInstanceId: 'component:dialog',
  capabilityId: 'cart.add',
  contractVersion: '1.0.0',
  params: { source: 'userEvent', mapping: { sku: 'sku' } },
  projection: { source: 'cart', direction: 'read', agentVisibility: ['cartId'], mutability: 'readonly', redaction: [] },
  invocationOnly: ['sessionToken'],
  subscription: { onChange: true, unmountUnbinds: true },
  lifecycle: { requiresCleanup: true },
};

const plugin = {
  kind: 'component',
  id: 'theme.base',
  contractVersion: '1.0.0',
  provides: ['theme:base'],
  requires: [],
  compatibility: { platform: 'web', engines: { futureUi: '>=1.0.0' } },
  scope: { app: true, request: false },
  lifecycle: { init: true, dispose: true },
};

describe('validateContract (D14 rule 3: consume the M0 validators directly)', () => {
  it('accepts valid fixtures for every contract kind', () => {
    const cases: Array<[ContractKind, unknown]> = [
      ['component', component],
      ['capability', capability],
      ['binding', binding],
      ['plugin', plugin],
    ];
    for (const [kind, data] of cases) {
      const result = validateContract(kind, data);
      expect(result.valid, `kind=${kind}`).toBe(true);
      expect(result.diagnostics).toEqual([]);
    }
  });

  it('reports missing_required with a stable code/path for an incomplete component', () => {
    const bad = { ...component };
    delete (bad as { componentType?: string }).componentType;
    const result = validateContract('component', bad);
    expect(result.valid).toBe(false);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'missing_required', path: '/' }));
  });

  it('rejects an unknown contract major with unknown_major_version', () => {
    const result = validateContract('plugin', { ...plugin, contractVersion: '2.0.0' });
    expect(result.diagnostics[0]?.code).toBe('unknown_major_version');
    expect(result.diagnostics[0]?.path).toBe('/contractVersion');
  });

  it('keeps the frozen D06(M0) capability invariant (cancel does not imply rollback)', () => {
    const bad = { ...capability, execution: { states: ['pending', 'completed'], cancelImpliesRollback: true } };
    const result = validateContract('capability', bad);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'constraint_violation', path: '/execution/cancelImpliesRollback' }),
    );
  });

  it('reports capability_conflict when a binding references an unknown capability', () => {
    const result = validateContract('binding', binding, { knownCapabilities: new Set(['cart.remove']) });
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'capability_conflict', path: '/capabilityId' }),
    );
  });

  it('rejects an unknown kind', () => {
    expect(() => validateContract('unknown' as ContractKind, {})).toThrow(/unknown contract kind/);
  });
});
