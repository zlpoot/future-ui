/**
 * Per-instance plugin registry (M0-03).
 *
 * The registry belongs to an application instance. App instances each hold an
 * independent registry; a request scope is a child registry that starts from
 * the parent's provided set and is disposed as a whole. No state leaks across
 * instances or request scopes (D07(M0) rule 1).
 */
import type { PluginContract } from '@future-ui/contracts';
import { checkCompatibility, checkManifest } from './compat.js';
import type { PluginDefinition, RegisterResult, RegisteredPlugin } from './types.js';

export interface RegistryOptions {
  platform: string;
  engines?: Readonly<Record<string, string>>;
  /** parent (app-scope) registry; request-scope registries see its providers. */
  parent?: PluginRegistry;
}

export class PluginRegistry {
  private readonly entries = new Map<string, RegisteredPlugin>();
  private readonly providedIndex = new Map<string, string>();

  constructor(private readonly options: RegistryOptions) {}

  /**
   * Register a plugin. Fails with structured diagnostics on structural
   * manifest errors, duplicate id or runtime incompatibility; a failed
   * register leaves the registry unchanged.
   */
  register(def: PluginDefinition): RegisterResult {
    const contract = def.contract;

    const structural = checkManifest(contract);
    if (structural.length > 0) {
      return { ok: false, diagnostics: structural };
    }

    if (this.entries.has(contract.id)) {
      return {
        ok: false,
        diagnostics: [{
          code: 'conflict',
          path: '/id',
          expected: 'a unique plugin id in this instance registry',
          actual: contract.id,
          explanation: 'plugin id is already registered in this instance; refusing to overwrite',
        }],
      };
    }

    const incompat = checkCompatibility(contract, {
      provided: this.visibleProvided(),
      platform: this.options.platform,
      engines: this.options.engines,
    });
    if (incompat.length > 0) {
      return { ok: false, diagnostics: incompat };
    }

    this.entries.set(contract.id, {
      id: contract.id,
      definition: def,
      status: 'registered',
      handle: undefined,
    });
    for (const provided of contract.provides) {
      this.providedIndex.set(provided, contract.id);
    }
    return { ok: true, diagnostics: [] };
  }

  /** Remove a plugin from this registry (dispose is managed by the lifecycle layer). */
  unregister(id: string): boolean {
    const entry = this.entries.get(id);
    if (!entry) return false;
    this.entries.delete(id);
    for (const provided of entry.definition.contract.provides) {
      if (this.providedIndex.get(provided) === id) {
        this.providedIndex.delete(provided);
      }
    }
    return true;
  }

  get(id: string): RegisteredPlugin | undefined {
    return this.entries.get(id);
  }

  list(): ReadonlyArray<RegisteredPlugin> {
    return [...this.entries.values()];
  }

  ids(): ReadonlyArray<string> {
    return [...this.entries.keys()];
  }

  /** Provider ids visible in this scope: local registrations plus the parent scope's. */
  provided(): ReadonlySet<string> {
    return this.visibleProvided();
  }

  private visibleProvided(): ReadonlySet<string> {
    const visible = new Set(this.providedIndex.keys());
    const parent = this.options.parent;
    if (parent) {
      for (const provided of parent.provided()) visible.add(provided);
    }
    return visible;
  }

  hasProvider(provider: string): boolean {
    return this.providedIndex.has(provider) || this.options.parent?.hasProvider(provider) === true;
  }

  /** The plugin id that provides `provider`, if any (parent scope included). */
  providerOwner(provider: string): string | undefined {
    if (this.providedIndex.has(provider)) return this.providedIndex.get(provider);
    return this.options.parent?.providerOwner(provider);
  }

  queryProvider(provider: string): PluginContract | undefined {
    const local = this.providedIndex.get(provider);
    if (local !== undefined) return this.entries.get(local)?.definition.contract;
    return this.options.parent?.queryProvider(provider);
  }
}
