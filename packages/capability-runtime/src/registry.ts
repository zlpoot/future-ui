/**
 * CapabilityRegistry (M1-02).
 *
 * Explicit register / discover / unregister. Only explicitly registered
 * capabilities are discoverable — undeclared actions are not exposed by
 * default. Metadata (CapabilityContract) is kept separate from the business
 * handler; discovery views expose only the agent-visible fields listed in
 * visibility.agentAllowlist (minimal agent-visible state).
 */
import type { CapabilityContract, Diagnostic } from '@future-ui/contracts';
import { validateCapability } from '@future-ui/contracts';

import type { CapabilityDefinition, CapabilityHandler } from './types.js';

export interface RegisterResult {
  ok: boolean;
  diagnostics: Diagnostic[];
}

/**
 * Discovery view of a capability: identity plus the explicitly allowed
 * agent-visible top-level fields. A handler is never part of this view.
 */
export interface CapabilityView {
  id: string;
  agentVisible: Record<string, unknown>;
}

export class CapabilityRegistry {
  private readonly entries = new Map<string, { contract: CapabilityContract; handler: CapabilityHandler }>();

  /** Register a capability. Fails structurally (validateCapability) or on duplicate id. */
  register(def: CapabilityDefinition): RegisterResult {
    const structural = validateCapability(def.contract);
    if (!structural.valid) {
      return { ok: false, diagnostics: structural.diagnostics };
    }
    if (this.entries.has(def.contract.id)) {
      return {
        ok: false,
        diagnostics: [{
          code: 'conflict',
          path: '/id',
          expected: 'a unique capability id in this registry',
          actual: def.contract.id,
          explanation: 'capability id is already registered; refusing to overwrite',
          repairHint: 'unregister the existing capability first or use a distinct id',
        }],
      };
    }
    this.entries.set(def.contract.id, { contract: def.contract, handler: def.handler });
    return { ok: true, diagnostics: [] };
  }

  /** Remove a capability. Returns false when it was not registered. */
  unregister(id: string): boolean {
    return this.entries.delete(id);
  }

  has(id: string): boolean {
    return this.entries.has(id);
  }

  /** Full internal access for the invocation path. Undefined for undeclared ids. */
  get(id: string): { contract: CapabilityContract; handler: CapabilityHandler } | undefined {
    return this.entries.get(id);
  }

  /**
   * Agent-visible discovery view: only fields named in visibility.agentAllowlist
   * (top-level) plus the identity. Everything else stays out of the read context.
   */
  discover(id: string): CapabilityView | undefined {
    const entry = this.entries.get(id);
    if (!entry) return undefined;
    return toView(entry.contract);
  }

  /** Agent-visible list of all registered capabilities. */
  list(): CapabilityView[] {
    return [...this.entries.values()].map((e) => toView(e.contract));
  }

  ids(): ReadonlyArray<string> {
    return [...this.entries.keys()];
  }
}

function toView(contract: CapabilityContract): CapabilityView {
  const allow = new Set(contract.visibility.agentAllowlist);
  const agentVisible: Record<string, unknown> = {};
  for (const key of allow) {
    const value = (contract as unknown as Record<string, unknown>)[key];
    if (value !== undefined) agentVisible[key] = value;
  }
  return { id: contract.id, agentVisible };
}
