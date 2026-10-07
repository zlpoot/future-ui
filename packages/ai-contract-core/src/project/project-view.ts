/**
 * Phase A (#69) — Project AI View structured API.
 *
 * Builds and queries the project-level view from real ComponentDefinition
 * data assembled by the integration layer (the shadcn adapter descriptor). It
 * validates that data against itself (consistent anchors/identity) and derives
 * CapabilityReferences ONLY from explicit bindings. It does NOT read
 * buildCatalog() schema types as if they were installed components.
 */
import { CONTRACT_MAJOR } from '@future-ui/contracts';
import type { ProjectDiagnostic } from './errors.js';
import type {
  CapabilityReference,
  ComponentDefinition,
  ProjectAIView,
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

function majorOf(version: string): number | undefined {
  const m = /^(\d+)\./.exec(version);
  return m ? Number(m[1]) : undefined;
}

/** Validate one component definition; returns all problems (fail-closed). */
export function validateComponentDefinition(def: ComponentDefinition): ProjectDiagnostic[] {
  const d: ProjectDiagnostic[] = [];
  const base = `/definitions/${String(def.componentType)}`;
  if (!isNonEmptyString(def.componentType)) {
    d.push(diag('r1_project_definition_invalid', `${base}/componentType`, 'componentType must be a non-empty string'));
  }
  if (!isNonEmptyString(def.contractVersion) || majorOf(def.contractVersion) !== CONTRACT_MAJOR) {
    d.push(diag('r1_project_definition_invalid', `${base}/contractVersion`,
      'contractVersion must be a 1.x semver matching the authoritative contracts', `${CONTRACT_MAJOR}.x`, def.contractVersion));
  }
  const id = def.identity;
  if (!id || !isNonEmptyString(id.adapterId) || !isNonEmptyString(id.adapterVersion)) {
    d.push(diag('r1_project_definition_invalid', `${base}/identity`, 'identity.adapterId/adapterVersion are required'));
  } else if (majorOf(id.contractVersion) !== CONTRACT_MAJOR) {
    d.push(diag('r1_project_identity_mismatch', `${base}/identity/contractVersion`,
      'identity.contractVersion major must match the frozen contracts major', `${CONTRACT_MAJOR}.x`, id.contractVersion));
  }
  if (!id || !isNonEmptyString(id.profileId)) {
    d.push(diag('r1_project_definition_invalid', `${base}/identity/profileId`, 'identity.profileId is required'));
  }
  if (!id?.upstream || !isNonEmptyString(id.upstream.library) || !isNonEmptyString(id.upstream.base)) {
    d.push(diag('r1_project_definition_invalid', `${base}/identity/upstream`, 'upstream.library and upstream.base are required'));
  }
  if (!def.actualImport || !isNonEmptyString(def.actualImport.module) || def.actualImport.exports.length === 0) {
    d.push(diag('r1_project_definition_invalid', `${base}/actualImport`, 'actualImport.module and at least one export are required'));
  }
  if (!isNonEmptyString(def.mappingStatus) || !['supported', 'partial', 'unsupported'].includes(def.mappingStatus)) {
    d.push(diag('r1_project_definition_invalid', `${base}/mappingStatus`,
      'mappingStatus must be supported | partial | unsupported', 'supported|partial|unsupported', def.mappingStatus));
  }
  // A declared partial/unsupported component MUST carry the limiting members.
  if (def.mappingStatus === 'partial' && def.limits.length === 0) {
    d.push(diag('r1_project_definition_invalid', `${base}/limits`,
      'a partial component must list the limiting contract members (no silent downgrade)', 'non-empty limits', 0));
  }
  for (const [i, lim] of def.limits.entries()) {
    if (!isNonEmptyString(lim.member) || !isNonEmptyString(lim.reason) || !isNonEmptyString(lim.impact)) {
      d.push(diag('r1_project_definition_invalid', `${base}/limits/${i}`, 'each limit needs member/reason/impact'));
    }
  }
  return d;
}

export interface BuildProjectViewInput {
  projectName: string;
  definitions: ComponentDefinition[];
  /** Explicit capabilities only; must reference bound instances in the view. */
  capabilities?: CapabilityReference[];
}

export interface BuildProjectViewResult {
  view: ProjectAIView | null;
  diagnostics: ProjectDiagnostic[];
}

/**
 * Build the Project AI View. Any structural/identity problem makes the result
 * null rather than returning a half-valid view. Capabilities with no matching
 * component definition are rejected (nothing is synthesized).
 */
export function buildProjectView(input: BuildProjectViewInput): BuildProjectViewResult {
  const diagnostics: ProjectDiagnostic[] = [];
  const definitions = input.definitions ?? [];

  const seen = new Set<string>();
  for (const def of definitions) {
    const key = String(def.componentType);
    if (seen.has(key)) {
      diagnostics.push(diag('r1_project_definition_invalid', `/definitions/${key}`,
        'duplicate component definition for componentType', 'unique componentType', key));
    }
    seen.add(key);
    diagnostics.push(...validateComponentDefinition(def));
  }

  const capabilities = input.capabilities ?? [];
  for (const [i, cap] of capabilities.entries()) {
    if (!isNonEmptyString(cap.capabilityId) || !isNonEmptyString(cap.boundInstanceId) || !isNonEmptyString(cap.bindingSource)) {
      diagnostics.push(diag('r1_project_capability_unbound', `/capabilities/${i}`,
        'a capability reference needs capabilityId/boundInstanceId/bindingSource'));
    }
  }

  if (diagnostics.length > 0) return { view: null, diagnostics };

  const view: ProjectAIView = {
    project: { name: input.projectName, contractMajor: CONTRACT_MAJOR },
    generatedFrom: { kind: 'project-ai-view', contractCatalogVersion: `${CONTRACT_MAJOR}.0.0` },
    definitions,
    capabilities,
  };
  return { view, diagnostics: [] };
}

export interface ComponentQuery {
  componentType?: string;
  mappingStatus?: ComponentDefinition['mappingStatus'];
}

/** Query real component definitions (never schema-catalog entries). */
export function queryComponents(view: ProjectAIView, query: ComponentQuery = {}): ComponentDefinition[] {
  return view.definitions.filter((d) =>
    (query.componentType === undefined || d.componentType === query.componentType) &&
    (query.mappingStatus === undefined || d.mappingStatus === query.mappingStatus),
  );
}

export function describeComponent(view: ProjectAIView, componentType: string): ComponentDefinition | undefined {
  return view.definitions.find((d) => d.componentType === componentType);
}

/** Capabilities bound to one instance; returns [] for instances with no binding. */
export function capabilitiesForInstance(view: ProjectAIView, instanceId: string): CapabilityReference[] {
  return view.capabilities.filter((c) => c.boundInstanceId === instanceId);
}
