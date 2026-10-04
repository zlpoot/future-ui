/**
 * M0-03 minimal Plugin Kernel entry point.
 *
 * The kernel owns one app-scope registry plus request-scope children. It
 * exposes a fixed, narrow API surface: register / init / dispose / unload /
 * query / audit. There is deliberately no unrestricted universal hook, no
 * remote loading and no sandbox claim (D07(M0) rule 4).
 */
import type { Diagnostic, PluginContract } from '@future-ui/contracts';
import { createInitContext, disposePlugin, initPlugin, nodeNotFoundDiagnostic } from './lifecycle.js';
import { PluginRegistry } from './registry.js';
import type { InitResult, PluginDefinition, PluginScopeKind, RegisterResult } from './types.js';

export type {
  Diagnostic,
  Disposable,
  ErrorCode,
  InitResult,
  PluginContext,
  PluginDefinition,
  PluginFactory,
  PluginHandle,
  PluginScopeKind,
  PluginStatus,
  RegisterResult,
  RegisteredPlugin,
} from './types.js';
export type { CompatibilityContext } from './compat.js';
export type { RegistryOptions } from './registry.js';
export { checkCompatibility, checkManifest, satisfies } from './compat.js';
export { PluginRegistry } from './registry.js';
export { nodeNotFoundDiagnostic, releaseAll } from './lifecycle.js';

export interface KernelOptions {
  /** current runtime platform, e.g. 'node' | 'browser'. */
  platform: string;
  /** current runtime engine versions, e.g. { node: '24.21.0' }. */
  engines?: Readonly<Record<string, string>>;
}

/** A request-scope child of an app kernel: isolated registry, bulk unload. */
export interface RequestScope {
  readonly registry: PluginRegistry;
  register(def: PluginDefinition): RegisterResult;
  init(id: string): Promise<InitResult>;
  /** Dispose and unload every plugin in this request scope. */
  disposeAll(): Promise<void>;
}

/** The fixed public API of the plugin kernel. No unrestricted hooks. */
export interface PluginKernel {
  readonly registry: PluginRegistry;
  register(def: PluginDefinition): RegisterResult;
  init(id: string): Promise<InitResult>;
  dispose(id: string): Promise<boolean>;
  /** Dispose every plugin and clear the app registry. */
  unloadAll(): Promise<void>;
  /** Provider contract lookup; undefined when not provided. */
  queryProvider(provider: string): PluginContract | undefined;
  /** Diagnostic for an absent provider (node_not_found). */
  missingProviderDiagnostic(provider: string): Diagnostic;
  /** Create an isolated request-scope child. */
  createRequestScope(): RequestScope;
  /** Declarative permission claims of a plugin; audit/constraint only, never enforced as a sandbox. */
  auditPermissions(id: string): ReadonlyArray<string> | undefined;
}

const APP_SCOPE: PluginScopeKind = 'app';
const REQUEST_SCOPE: PluginScopeKind = 'request';

export function createPluginKernel(options: KernelOptions): PluginKernel {
  const registry = new PluginRegistry({ platform: options.platform, engines: options.engines });

  const queryProvider = (provider: string): PluginContract | undefined =>
    registry.queryProvider(provider);

  async function init(id: string): Promise<InitResult> {
    const entry = registry.get(id);
    if (!entry) {
      return {
        ok: false,
        diagnostics: [{
          code: 'node_not_found',
          path: '/id',
          expected: 'a registered plugin id',
          actual: id,
          explanation: 'cannot initialize an unregistered plugin',
        }],
      };
    }
    return initPlugin(entry, APP_SCOPE, registry.provided(), queryProvider);
  }

  async function dispose(id: string): Promise<boolean> {
    const entry = registry.get(id);
    if (!entry) return false;
    const ctx = createInitContext(entry, APP_SCOPE, registry.provided(), queryProvider, []);
    await disposePlugin(entry, ctx);
    registry.unregister(id);
    return true;
  }

  async function unloadAll(): Promise<void> {
    for (const id of registry.ids()) {
      const entry = registry.get(id);
      if (!entry) continue;
      const ctx = createInitContext(entry, APP_SCOPE, registry.provided(), queryProvider, []);
      await disposePlugin(entry, ctx);
    }
    for (const id of registry.ids()) {
      registry.unregister(id);
    }
  }

  function createRequestScope(): RequestScope {
    const requestRegistry = new PluginRegistry({
      platform: options.platform,
      engines: options.engines,
      parent: registry,
    });
    const requestQuery = (provider: string): PluginContract | undefined =>
      requestRegistry.queryProvider(provider) ?? queryProvider(provider);
    const requestProvided = (): ReadonlySet<string> => requestRegistry.provided();

    return {
      registry: requestRegistry,
      register(def: PluginDefinition): RegisterResult {
        return requestRegistry.register(def);
      },
      async init(id: string): Promise<InitResult> {
        const entry = requestRegistry.get(id);
        if (!entry) {
          return {
            ok: false,
            diagnostics: [{
              code: 'node_not_found',
              path: '/id',
              expected: 'a registered request-scope plugin id',
              actual: id,
              explanation: 'cannot initialize an unregistered request-scope plugin',
            }],
          };
        }
        return initPlugin(entry, REQUEST_SCOPE, requestProvided(), requestQuery);
      },
      async disposeAll(): Promise<void> {
        for (const id of requestRegistry.ids()) {
          const entry = requestRegistry.get(id);
          if (!entry) continue;
          const ctx = createInitContext(entry, REQUEST_SCOPE, requestProvided(), requestQuery, []);
          await disposePlugin(entry, ctx);
        }
        for (const id of requestRegistry.ids()) {
          requestRegistry.unregister(id);
        }
      },
    };
  }

  return {
    registry,
    register(def: PluginDefinition): RegisterResult {
      return registry.register(def);
    },
    init,
    dispose,
    unloadAll,
    queryProvider,
    missingProviderDiagnostic(provider: string): Diagnostic {
      return nodeNotFoundDiagnostic(provider);
    },
    createRequestScope,
    auditPermissions(id: string): ReadonlyArray<string> | undefined {
      return registry.get(id)?.definition.permissions;
    },
  };
}
