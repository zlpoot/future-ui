import { describe, expect, it } from 'vitest';

import { validateCapability } from '../src/validate.js';
import type { CapabilityContract } from '../src/types.js';

const cartAdd: CapabilityContract = {
  id: 'cart.add',
  contractVersion: '1.0.0',
  description: 'adds a product to the cart',
  input: { type: 'object', properties: { productId: 'string', quantity: 'number' }, requiredFields: ['productId', 'quantity'] },
  output: { type: 'object', properties: { items: 'array', version: 'number' }, description: 'affected entries and new state version' },
  availability: { preconditions: ['product is sellable', 'quantity satisfies business limits', 'identity can operate target cart'] },
  effects: { local: ['cart view projection'], remote: ['cart store write'], irreversible: [] },
  authorization: { hooks: ['identity', 'permission', 'confirmation'] },
  concurrency: { expectedVersion: true, conflictPolicy: 'reject' },
  idempotency: { scope: 'request', retrySafe: true },
  invocation: { invocationId: true, receipt: true, reconciliation: true, idempotencyKeyDistinct: true },
  execution: { states: ['pending', 'executing', 'completed', 'rejected', 'failed', 'unknown', 'cancelled'], cancelImpliesRollback: false },
  failureModes: {
    constraint_violation: { retrySafe: false, recovery: 'fix input and retry' },
    conflict: { retrySafe: true, recovery: 're-read version and re-apply' },
  },
  visibility: { agentAllowlist: ['items', 'version'], redaction: ['billingAddress'] },
};

describe('Capability contract (M0 / D06)', () => {
  it('accepts a valid cart.add capability', () => {
    const result = validateCapability(cartAdd);
    expect(result.valid).toBe(true);
    expect(result.diagnostics).toEqual([]);
  });

  it('rejects unknown major with unknown_major_version', () => {
    const bad = { ...cartAdd, contractVersion: '3.0.0' };
    const result = validateCapability(bad);
    expect(result.valid).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'unknown_major_version', actual: '3.0.0' }),
    );
  });

  it('rejects missing semantic fields with missing_required', () => {
    const { effects: _effects, ...bad } = cartAdd;
    const result = validateCapability(bad);
    expect(result.valid).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'missing_required' }),
    );
  });

  it('rejects type mismatch with type_mismatch', () => {
    const bad = { ...cartAdd, description: 42 };
    const result = validateCapability(bad);
    expect(result.valid).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'type_mismatch', path: '/description' }),
    );
  });

  it('enforces D06(M0) invariant: cancel does not imply rollback', () => {
    const bad = { ...cartAdd, execution: { ...cartAdd.execution, cancelImpliesRollback: true } };
    const result = validateCapability(bad);
    expect(result.valid).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'constraint_violation', path: '/execution/cancelImpliesRollback' }),
    );
  });

  it('enforces D06(M0) invariant: invocation identity is distinct from idempotency key', () => {
    const bad = { ...cartAdd, invocation: { ...cartAdd.invocation, idempotencyKeyDistinct: false } };
    const result = validateCapability(bad);
    expect(result.valid).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ path: '/invocation/idempotencyKeyDistinct' }),
    );
  });
});
