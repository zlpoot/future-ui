import type { BindingContract } from '@future-ui/contracts';
import type { CapabilityRegistry, InvocationRequest, InvocationResult } from '@future-ui/capability-runtime';

import { cartAddContract } from './cart-capability.js';

/**
 * Optional Binding layer (#10 acceptance 1 + 6).
 *
 * The binding consumes ONLY:
 * - the component's public event payload (ButtonClickEvent with appId),
 * - the capability contract (discovery view via the registry — agent-visible
 *   allowlist only),
 * - explicit application-state values (selected product / qty).
 *
 * It never reads provider-private DOM state (no internal refs, no private
 * classes). Removing this module does not break UI-only or the business
 * action — the app can call cart.add directly through the same runtime.
 */
export interface AddToCartBinding {
  /** Map a public Button click (event payload + current draft values) to a cart.add invocation. */
  invokeFromUi: (params: {
    event: { appId: string };
    productId: string;
    qty: number;
    idempotencyKey: string;
    expectedVersion?: number;
    mode?: string;
  }) => Promise<InvocationResult>;
  /** Contract evidence consumed by the binding (discovery view, not handler). */
  contractView: { id: string; agentVisible: Record<string, unknown> };
}

export const addToCartBindingContract: BindingContract = {
  componentInstanceId: 'cart-demo.add-button',
  capabilityId: 'cart.add',
  contractVersion: '1.0.0',
  params: { source: 'userEvent', mapping: { productId: 'selectedProduct', qty: 'qtyInput' } },
  projection: {
    source: 'cart.add',
    direction: 'write',
    agentVisibility: ['description', 'effects', 'concurrency', 'idempotency'],
    mutability: 'mutable',
    redaction: ['cookie', 'password', 'token', 'secret', 'credential'],
  },
  invocationOnly: ['cart.add'],
  subscription: { onChange: false, unmountUnbinds: true },
  lifecycle: { requiresCleanup: false },
};

export function createAddToCartBinding(params: {
  registry: CapabilityRegistry;
  invoke: (request: InvocationRequest) => Promise<InvocationResult>;
}): AddToCartBinding {
  const view = params.registry.discover('cart.add') ?? { id: 'cart.add', agentVisible: {} };
  return {
    contractView: { id: view.id, agentVisible: view.agentVisible },
    invokeFromUi: async ({ event, productId, qty, idempotencyKey, expectedVersion, mode }) => {
      void event; // appId is part of the public payload; passed through as scope context
      return params.invoke({
        capabilityId: cartAddContract.id,
        input: { productId, qty, ...(mode !== undefined ? { mode } : {}) },
        invocationId: `ui-${idempotencyKey}`,
        idempotencyKey,
        ...(expectedVersion !== undefined ? { expectedVersion } : {}),
      });
    },
  };
}
