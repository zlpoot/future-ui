/**
 * Phase B (#69) — explicit instance registry.
 *
 * Accepts ONLY explicit register() calls. There is no JSX/template/DOM/source
 * scanning: an unregistered page is reported not-covered, never guessed.
 *
 * Guarantees:
 *  - stable instanceId (caller-provided; duplicate register rejected);
 *  - update/unregister target existing instances;
 *  - unregister / clearScope removes instances with no stale residue;
 *  - EXACT identity (adapter/profile id+version + upstream fingerprint) is
 *    checked on register/update and any drift fails closed;
 *  - visible state leaves the registry ONLY through an explicit allowlist, and
 *    sensitive keys / draft form values are hidden by default;
 *  - coverage is reported per scope (covered | not-covered).
 *
 * Encapsulation: every registration is captured as a defensive deep snapshot
 * and deeply FROZEN; get()/query() return those frozen snapshots. No mutable
 * internal object is ever handed out, so policy (incl. the sensitive/draft
 * allowlist) cannot be changed outside register/update/unregister/clearScope.
 */
import type { ProjectDiagnostic } from './errors.js';
import { identityRefFor } from './identity.js';
import type {
  ComponentDefinition,
  InstanceRegistration,
  ProjectAIView,
  ScopeCoverage,
} from './types.js';

function diag(
  code: ProjectDiagnostic['code'],
  path: string,
  explanation: string,
  expected?: unknown,
  actual?: unknown,
  repairHint?: string,
): ProjectDiagnostic {
  return { code, path, explanation, expected, actual, repairHint };
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim() !== '';
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Deep-clone plain JSON-like registration data (no class/prototype carried). */
function deepSnapshot<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => deepSnapshot(v)) as unknown as T;
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = deepSnapshot(v);
    return out as T;
  }
  // primitives only are expected in the registration data model
  return value;
}

function deepFreeze<T>(value: T): T {
  if (Array.isArray(value) || isPlainObject(value)) {
    if (!Object.isFrozen(value)) {
      for (const v of Object.values(value as Record<string, unknown>)) deepFreeze(v);
      Object.freeze(value);
    }
  }
  return value;
}

/** Snapshot then freeze: the stored record is immutable from the outside. */
function capture<T>(value: T): T {
  return deepFreeze(deepSnapshot(value));
}

export interface RegisterResult {
  diagnostics: ProjectDiagnostic[];
}

export interface ScopeCleanupResult {
  scopeId: string;
  removedInstanceIds: string[];
}

/** A projected state snapshot: only allowlisted, non-sensitive keys survive. */
export interface VisibleStateSnapshot {
  instanceId: string;
  scopeId: string;
  projected: Record<string, unknown>;
  /** requested keys that were withheld (not allowlisted or sensitive/draft). */
  withheld: string[];
  diagnostics: ProjectDiagnostic[];
}

export class InstanceRegistry {
  private readonly instances = new Map<string, InstanceRegistration>();
  /** every scope ever named (including scopes that later become empty). */
  private readonly scopes = new Set<string>();

  constructor(private readonly view: ProjectAIView) {}

  private definitionFor(componentType: string): ComponentDefinition | undefined {
    return this.view.definitions.find((d) => d.componentType === componentType);
  }

  /** Exact-match the registration identity against the current definition. */
  private identityDiagnostics(reg: InstanceRegistration, def: ComponentDefinition, base: string): ProjectDiagnostic[] {
    const out: ProjectDiagnostic[] = [];
    const expected = identityRefFor(def.identity);
    const actual = reg.identityRef;
    if (!isPlainObject(actual)) {
      out.push(diag('r1_project_instance_invalid', `${base}/identityRef`,
        'identityRef { adapterId, adapterVersion, profileId, profileVersion, upstreamFingerprint } is required'));
      return out;
    }
    const checks: Array<{ key: keyof typeof expected; actual: unknown; expected: unknown }> = [
      { key: 'adapterId', actual: actual['adapterId'], expected: expected.adapterId },
      { key: 'adapterVersion', actual: actual['adapterVersion'], expected: expected.adapterVersion },
      { key: 'profileId', actual: actual['profileId'], expected: expected.profileId },
      { key: 'profileVersion', actual: actual['profileVersion'], expected: expected.profileVersion },
      { key: 'upstreamFingerprint', actual: actual['upstreamFingerprint'], expected: expected.upstreamFingerprint },
    ];
    for (const check of checks) {
      if (!isNonEmptyString(check.actual) || check.actual !== check.expected) {
        out.push(diag('r1_project_identity_mismatch', `${base}/identityRef/${check.key}`,
          `instance ${check.key} does not match the current component definition`,
          check.expected, check.actual,
          'rebuild/re-register the instance against the current adapter/profile/upstream definition'));
      }
    }
    return out;
  }

  /** Explicit registration only. */
  register(reg: InstanceRegistration): RegisterResult {
    const diagnostics: ProjectDiagnostic[] = [];
    const p = `/instances/${reg.instanceId}`;

    if (!isNonEmptyString(reg.instanceId)) {
      diagnostics.push(diag('r1_project_instance_invalid', `${p}/instanceId`, 'instanceId is required'));
    } else if (this.instances.has(reg.instanceId)) {
      diagnostics.push(diag('r1_project_instance_duplicate', p,
        'instanceId already registered; use update() to change an existing instance',
        'a new unique instanceId', reg.instanceId,
        'choose a stable unique id or call update()'));
    }
    if (!isNonEmptyString(reg.scopeId)) {
      diagnostics.push(diag('r1_project_instance_invalid', `${p}/scopeId`, 'scopeId is required for coverage'));
    }
    if (!reg.metadata || !isNonEmptyString(reg.metadata.path)) {
      diagnostics.push(diag('r1_project_instance_invalid', `${p}/metadata/path`, 'metadata.path (locator) is required'));
    }
    if (!Array.isArray(reg.visibleState?.allow)) {
      diagnostics.push(diag('r1_project_instance_invalid', `${p}/visibleState/allow`,
        'visibleState.allow must be an explicit (possibly empty) allowlist'));
    }

    const def = this.definitionFor(String(reg.componentType));
    if (def === undefined) {
      diagnostics.push(diag('r1_project_definition_invalid', `${p}/componentType`,
        'componentType has no definition in the Project AI View',
        this.view.definitions.map((d) => d.componentType), reg.componentType,
        'register an instance of a component the project actually provides'));
    } else {
      diagnostics.push(...this.identityDiagnostics(reg, def, p));
    }

    // Validate relation targets exist (registered or about to be registered).
    for (const rel of reg.relations ?? []) {
      if (!isNonEmptyString(rel.target) || !this.instances.has(rel.target)) {
        diagnostics.push(diag('r1_project_instance_invalid', `${p}/relations/${rel.kind}`,
          'relation target must reference an already-registered instanceId', 'an existing instanceId', rel.target));
      }
    }

    if (diagnostics.length === 0) {
      const stored = capture(reg);
      this.instances.set(stored.instanceId, stored);
      this.scopes.add(stored.scopeId);
    }
    return { diagnostics };
  }

  /** Partial/full replacement of an existing instance; identity is re-validated. */
  update(instanceId: string, patch: Partial<InstanceRegistration>): RegisterResult {
    const current = this.instances.get(instanceId);
    if (current === undefined) {
      return { diagnostics: [diag('r1_project_instance_not_found', `/instances/${instanceId}`,
        'cannot update an instance that is not registered', 'a registered instanceId', instanceId,
        'call register() first')] };
    }
    // Re-validate by removing then registering the merged record.
    this.instances.delete(instanceId);
    const merged: InstanceRegistration = {
      ...current,
      ...patch,
      // identity/componentType/scope are immutable via update unless provided
      instanceId,
      metadata: { ...current.metadata, ...(patch.metadata ?? {}) },
      visibleState: patch.visibleState ?? current.visibleState,
      identityRef: patch.identityRef ?? current.identityRef,
    };
    const result = this.register(merged);
    if (result.diagnostics.length > 0) {
      // roll back so a failed update never silently drops the instance
      this.instances.set(instanceId, current);
      this.scopes.add(current.scopeId);
    }
    return result;
  }

  /** Returns the frozen snapshot (safe to read; cannot be mutated). */
  get(instanceId: string): Readonly<InstanceRegistration> | undefined {
    return this.instances.get(instanceId);
  }

  /** Returns frozen snapshots (the array is fresh; records are immutable). */
  query(filter: { scopeId?: string; componentType?: string } = {}): ReadonlyArray<Readonly<InstanceRegistration>> {
    return [...this.instances.values()].filter(
      (i) =>
        (filter.scopeId === undefined || i.scopeId === filter.scopeId) &&
        (filter.componentType === undefined || i.componentType === filter.componentType),
    );
  }

  /** Explicit unregister; afterwards the instance id is fully gone. */
  unregister(instanceId: string): ProjectDiagnostic[] {
    if (!this.instances.has(instanceId)) {
      return [diag('r1_project_instance_not_found', `/instances/${instanceId}`,
        'cannot unregister an instance that is not registered', 'a registered instanceId', instanceId)];
    }
    this.instances.delete(instanceId);
    return [];
  }

  /** Remove every instance in a scope (navigation/teardown). Leaves no stale ids. */
  clearScope(scopeId: string): ScopeCleanupResult {
    const removedInstanceIds: string[] = [];
    for (const inst of this.instances.values()) {
      if (inst.scopeId === scopeId) removedInstanceIds.push(inst.instanceId);
    }
    for (const id of removedInstanceIds) this.instances.delete(id);
    this.scopes.delete(scopeId);
    return { scopeId, removedInstanceIds };
  }

  coverage(scopeId: string): { coverage: ScopeCoverage; instanceIds: string[] } {
    const ids = this.query({ scopeId }).map((i) => i.instanceId);
    // A scope is covered only if at least one live explicit instance remains.
    return { coverage: ids.length > 0 ? 'covered' : 'not-covered', instanceIds: ids };
  }

  get size(): number {
    return this.instances.size;
  }

  /**
   * Project runtime state for an instance through its explicit allowlist.
   * Sensitive keys are always withheld; draft keys are withheld unless the
   * instance explicitly opts in. Never mutates or reads beyond `rawState`.
   */
  projectVisibleState(instanceId: string, rawState: Record<string, unknown>): VisibleStateSnapshot {
    const inst = this.instances.get(instanceId);
    if (inst === undefined) {
      return {
        instanceId, scopeId: '', projected: {}, withheld: Object.keys(rawState),
        diagnostics: [diag('r1_project_instance_not_found', `/instances/${instanceId}`,
          'cannot project state for an instance that is not registered', 'a registered instanceId', instanceId)],
      };
    }
    const allow = new Set(inst.visibleState.allow);
    const sensitive = new Set(inst.visibleState.sensitive);
    const exposeDraft = inst.visibleState.exposeDraft === true;
    const projected: Record<string, unknown> = {};
    const withheld: string[] = [];
    for (const key of Object.keys(rawState)) {
      const allowed = allow.has(key);
      const isSensitive = sensitive.has(key);
      // Convention: keys under "fields"/"draft" hold draft form values.
      const isDraft = key === 'fields' || key === 'draft' || key.startsWith('fields.') || key.startsWith('draft.');
      if (!allowed || isSensitive || (isDraft && !exposeDraft)) {
        withheld.push(key);
        continue;
      }
      projected[key] = rawState[key];
    }
    const diagnostics: ProjectDiagnostic[] = [];
    for (const key of allow) {
      if (sensitive.has(key)) {
        diagnostics.push(diag('r1_project_visible_state_forbidden', `/instances/${instanceId}/visibleState/allow/${key}`,
          'a key cannot be both allowlisted and sensitive; it will never be projected', 'not in sensitive', key));
      }
    }
    return { instanceId, scopeId: inst.scopeId, projected, withheld, diagnostics };
  }
}
