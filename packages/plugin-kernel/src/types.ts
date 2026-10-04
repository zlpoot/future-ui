/**
 * Public types for the M0-03 minimal Plugin Kernel.
 *
 * Frozen by D07(M0) in docs/management/m0-03-plugin-kernel-freeze-proposal.md:
 * - registry belongs to an app instance; explicit app/request scope; no state
 *   leakage across instances or request scopes;
 * - manifest/kind/version/provides/requires/compatibility are validated with
 *   the M0 error codes and code/path/expected/actual/explanation structure;
 * - init failures roll back everything allocated during that init; dispose
 *   releases subscriptions, registrations and listeners; unload leaves no
 *   residue;
 * - the kernel exposes no unrestricted universal hook; permission claims are
 *   constraint/audit data only, never a sandbox.
 */
import type { Diagnostic, PluginContract } from '@future-ui/contracts';

export type { Diagnostic, ErrorCode } from '@future-ui/contracts';

/** Which lifecycle scope a plugin instance is bound to. */
export type PluginScopeKind = 'app' | 'request';

/** Resource the kernel can release (subscriptions, listeners, handles). */
export interface Disposable {
  dispose(): void | Promise<void>;
}

/**
 * Context handed to a plugin factory on init.
 * Read-only view of the owning registry plus a way to register resources that
 * are rolled back automatically if init fails.
 */
export interface PluginContext {
  readonly instanceId: string;
  readonly scope: PluginScopeKind;
  /** provider ids currently visible (parent app scope + own registry). */
  readonly provided: ReadonlySet<string>;
  /** query a provider contract by id; undefined when not provided. */
  queryProvider(provider: string): Readonly<PluginContract> | undefined;
  /**
   * Register a resource bound to this init call. If init fails, every
   * resource registered here is disposed before the failure is reported
   * (D07(M0) init failure cleanup).
   */
  registerResource(resource: Disposable): void;
}

/** Handle returned by a plugin factory; resources are released on dispose. */
export interface PluginHandle {
  dispose?(): void | Promise<void>;
  /** additional resources the kernel must release when this plugin is disposed. */
  resources?: ReadonlyArray<Disposable>;
}

/** Trusted in-build plugin implementation; never loaded remotely. */
export interface PluginFactory {
  init(ctx: PluginContext): PluginHandle | void | Promise<PluginHandle | void>;
  dispose?(handle: PluginHandle | undefined, ctx: PluginContext): void | Promise<void>;
}

/**
 * A plugin as registered in a kernel: a schema-valid M0 manifest plus the
 * trusted in-build factory. `permissions` are declarative claims used only
 * for constraint/audit purposes; the kernel never executes them as a sandbox.
 */
export interface PluginDefinition {
  contract: PluginContract;
  factory: PluginFactory;
  permissions?: ReadonlyArray<string>;
}

export type PluginStatus = 'registered' | 'initializing' | 'active' | 'disposed';

export interface RegisteredPlugin {
  readonly id: string;
  readonly definition: PluginDefinition;
  status: PluginStatus;
  handle: PluginHandle | undefined;
}

export interface RegisterResult {
  ok: boolean;
  diagnostics: Diagnostic[];
}

export interface InitResult {
  ok: boolean;
  diagnostics: Diagnostic[];
}
