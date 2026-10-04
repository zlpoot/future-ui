/**
 * Plugin lifecycle: init with failure cleanup, dispose with full release
 * (M0-03, D07(M0) rule 3).
 *
 * - init that throws rolls back every resource registered during that init
 *   call (via `ctx.registerResource`) before the failure is reported; no
 *   half-initialized instance is left behind.
 * - dispose releases the handle's resources, then the handle's own dispose,
 *   then the factory-level dispose. After unload the registry holds no
 *   residue for the plugin.
 */
import type { Diagnostic, PluginContract } from '@future-ui/contracts';
import type { Disposable, InitResult, PluginContext, RegisteredPlugin } from './types.js';

/** Roll back all resources acquired so far, swallowing individual failures. */
export async function releaseAll(resources: ReadonlyArray<Disposable>): Promise<void> {
  for (const resource of [...resources].reverse()) {
    try {
      await resource.dispose();
    } catch {
      // cleanup best effort: a failing resource dispose must not stop the rollback
    }
  }
}

export function createInitContext(
  entry: RegisteredPlugin,
  scope: 'app' | 'request',
  registryProvided: ReadonlySet<string>,
  queryProvider: (provider: string) => Readonly<PluginContract> | undefined,
  acquired: Disposable[],
): PluginContext {
  return {
    instanceId: entry.id,
    scope,
    provided: registryProvided,
    queryProvider,
    registerResource(resource: Disposable): void {
      acquired.push(resource);
    },
  };
}

/**
 * Initialize a plugin. On failure, everything registered during this init is
 * disposed and the plugin returns to `registered` (nothing is left active).
 */
export async function initPlugin(
  entry: RegisteredPlugin,
  scope: 'app' | 'request',
  provided: ReadonlySet<string>,
  queryProvider: (provider: string) => Readonly<PluginContract> | undefined,
): Promise<InitResult> {
  if (entry.status === 'active') {
    return { ok: true, diagnostics: [] };
  }
  if (entry.status === 'disposed') {
    return {
      ok: false,
      diagnostics: [{
        code: 'unavailable',
        path: '/lifecycle',
        expected: 'a registered or active plugin',
        actual: 'disposed',
        explanation: 'cannot initialize a disposed plugin',
      }],
    };
  }

  entry.status = 'initializing';
  const acquired: Disposable[] = [];
  const ctx = createInitContext(entry, scope, provided, queryProvider, acquired);

  try {
    const result = await entry.definition.factory.init(ctx);
    const handle = result ?? undefined;
    if (handle !== undefined) {
      if (handle.resources) acquired.push(...handle.resources);
      entry.handle = handle;
    }
    entry.status = 'active';
    return { ok: true, diagnostics: [] };
  } catch (error) {
    await releaseAll(acquired);
    entry.handle = undefined;
    entry.status = 'registered';
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      diagnostics: [{
        code: 'unavailable',
        path: '/lifecycle/init',
        expected: 'init completes without throwing',
        actual: message,
        explanation: 'plugin init failed; every resource allocated during this init has been rolled back (D07(M0))',
      }],
    };
  }
}

/**
 * Dispose a plugin: release handle resources, call handle.dispose, then
 * factory.dispose. After this the plugin status is `disposed` and the caller
 * is expected to unregister it from the registry (no residue).
 */
export async function disposePlugin(entry: RegisteredPlugin, ctx: PluginContext): Promise<void> {
  const { handle, definition } = entry;
  if (handle !== undefined) {
    if (handle.resources) await releaseAll(handle.resources);
    if (handle.dispose) await handle.dispose();
  }
  if (definition.factory.dispose) {
    await definition.factory.dispose(handle, ctx);
  }
  entry.handle = undefined;
  entry.status = 'disposed';
}

/** Diagnostic for querying a provider that is no longer registered. */
export function nodeNotFoundDiagnostic(provider: string): Diagnostic {
  return {
    code: 'node_not_found',
    path: '/',
    expected: 'a registered provider',
    actual: provider,
    explanation: 'no plugin provides this id in the current scope; the node was not found',
  };
}
