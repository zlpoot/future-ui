import type { CapabilityContract } from '@future-ui/contracts';
import {
  CapabilityRegistry,
  CapabilityRuntime,
  type RuntimeHooks,
  type RuntimeOptions,
} from '@future-ui/capability-runtime';

import { CartService } from './cart-service.js';

/**
 * cart.add capability contract + fixture wiring for the example app (#10).
 * The business policy (authorization) lives in the runtime hooks; the UI can
 * never replace server-side authorization by disabling a button.
 */
export const cartAddContract: CapabilityContract = {
  id: 'cart.add',
  contractVersion: '1.0.0',
  description: 'Add a product to the cart (example business service)',
  input: {
    type: 'object',
    properties: { productId: 'string', qty: 'number', expectedVersion: 'number', mode: 'string' },
    requiredFields: ['productId', 'qty'],
  },
  output: {
    type: 'object',
    properties: { items: 'array', version: 'number' },
    requiredFields: [],
  },
  availability: { preconditions: ['cart-service-available'] },
  effects: { local: ['cart.items'], remote: [], irreversible: ['cart.items'] },
  authorization: {
    hooks: ['cart.authorize'],
    description: 'business policy: any authed principal may add to their own cart',
  },
  concurrency: { expectedVersion: true, conflictPolicy: 'reject' },
  idempotency: { scope: 'operation', retrySafe: false },
  invocation: { invocationId: true, receipt: true, reconciliation: true, idempotencyKeyDistinct: true },
  execution: {
    states: ['pending', 'executing', 'completed', 'rejected', 'failed', 'unknown', 'cancelled'],
    cancelImpliesRollback: false,
  },
  failureModes: {
    'stale-version': { retrySafe: false, recovery: 're-read cart version and retry' },
    'transient-lock': { retrySafe: true, recovery: 'retry after backoff' },
  },
  visibility: {
    agentAllowlist: ['description', 'effects', 'concurrency', 'idempotency'],
    redaction: ['cookie', 'password', 'token', 'secret', 'credential'],
  },
};

export interface CartDemoHooks {
  authorize?: RuntimeHooks['authorize'];
}

/** Build the example runtime: registry + business service + unified invoke path. */
export function createCartRuntime(options?: {
  lockProductIds?: string[];
  hooks?: CartDemoHooks;
  runtimeOptions?: Partial<RuntimeOptions>;
}): { runtime: CapabilityRuntime; registry: CapabilityRegistry; service: CartService } {
  const registry = new CapabilityRegistry();
  const service = new CartService(options?.lockProductIds);
  registry.register({ contract: cartAddContract, handler: (input, ctx) => service.add(input, ctx) });
  const runtime = new CapabilityRuntime(registry, {
    hooks: options?.hooks,
    defaultConfirmation: 'allow',
    ...options?.runtimeOptions,
  });
  return { runtime, registry, service };
}
