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
 *  - visible state leaves the registry ONLY through an explicit allowlist, and
 *    sensitive keys / draft form values are hidden by default;
 *  - coverage is reported per scope (covered | not-covered).
 */
import type { ProjectDiagnostic } from './errors.js';
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
      if (reg.adapterId !== def.identity.adapterId) {
        diagnostics.push(diag('r1_project_identity_mismatch', `${p}/adapterId`,
          'registered adapterId does not match the component definition', def.identity.adapterId, reg.adapterId));
      }
      if (reg.profileId !== def.identity.profileId) {
        diagnostics.push(diag('r1_project_identity_mismatch', `${p}/profileId`,
          'registered profileId does not match the component definition', def.identity.profileId, reg.profileId));
      }
    }

    // Validate relation targets exist (registered or about to be registered).
    for (const rel of reg.relations ?? []) {
      if (!isNonEmptyString(rel.target) || !this.instances.has(rel.target)) {
        diagnostics.push(diag('r1_project_instance_invalid', `${p}/relations/${rel.kind}`,
          'relation target must reference an already-registered instanceId', 'an existing instanceId', rel.target));
      }
    }

    if (diagnostics.length === 0) {
      this.instances.set(reg.instanceId, { ...reg, relations: reg.relations ? [...reg.relations] : undefined,
        capabilityBindings: reg.capabilityBindings ? [...reg.capabilityBindings] : undefined });
      this.scopes.add(reg.scopeId);
    }
    return { diagnostics };
  }

  /** Partial/full replacement of an existing instance; identity fields are re-validated. */
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
    };
    const result = this.register(merged);
    if (result.diagnostics.length > 0) {
      // roll back so a failed update never silently drops the instance
      this.instances.set(instanceId, current);
      this.scopes.add(current.scopeId);
    }
    return result;
  }

  get(instanceId: string): InstanceRegistration | undefined {
    return this.instances.get(instanceId);
  }

  query(filter: { scopeId?: string; componentType?: string } = {}): InstanceRegistration[] {
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
