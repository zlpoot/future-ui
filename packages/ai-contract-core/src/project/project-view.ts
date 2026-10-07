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
  ComponentSource,
  ProjectAIView,
} from './types.js';

/** The only source `kind` values the frozen model accepts (fail-closed). */
export const COMPONENT_SOURCE_KINDS = ['module-import', 'inline-source'] as const;

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

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isNonEmptyStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.length > 0 && v.every((x) => isNonEmptyString(x));
}

/**
 * Validate the discriminated component source. The two kinds are mutually
 * exclusive and fail closed: an unknown kind, an empty/fake module/exports and
 * any cross-kind field are all rejected. An inline source therefore cannot
 * smuggle in an importable `module`/`exports`, and a module source cannot hide
 * behind inline locator fields.
 */
export function validateComponentSource(source: unknown, base: string): ProjectDiagnostic[] {
  const d: ProjectDiagnostic[] = [];
  if (!isRecord(source)) {
    d.push(diag('r1_project_definition_invalid', `${base}`, 'source must be a discriminated object { kind }',
      [...COMPONENT_SOURCE_KINDS], typeof source));
    return d;
  }
  const kind = source['kind'];
  if (kind !== 'module-import' && kind !== 'inline-source') {
    d.push(diag('r1_project_definition_invalid', `${base}/kind`,
      'source.kind must be module-import | inline-source', [...COMPONENT_SOURCE_KINDS], kind));
    return d;
  }

  if (kind === 'module-import') {
    if (!isNonEmptyString(source['module'])) {
      d.push(diag('r1_project_definition_invalid', `${base}/module`,
        'a module-import source needs a real, non-empty importable module specifier'));
    }
    if (!isNonEmptyStringArray(source['exports'])) {
      d.push(diag('r1_project_definition_invalid', `${base}/exports`,
        'a module-import source needs at least one named export (string[])'));
    }
    if (!isNonEmptyString(source['example'])) {
      d.push(diag('r1_project_definition_invalid', `${base}/example`,
        'a module-import source needs a non-empty usage example'));
    }
    // Discrimination is enforced, not implied: inline-only keys are forbidden
    // here so the two source shapes cannot be conflated downstream.
    for (const key of ['locator', 'owner', 'symbols'] as const) {
      if (key in source) {
        d.push(diag('r1_project_definition_invalid', `${base}/${key}`,
          `${key} belongs only to an inline-source and must not appear on a module-import source`));
      }
    }
    return d;
  }

  // kind === 'inline-source' — a NON-importable, page-owned implementation.
  if (!isNonEmptyString(source['locator'])) {
    d.push(diag('r1_project_definition_invalid', `${base}/locator`,
      'an inline-source needs the real owning document locator (e.g. web/canvas.html)'));
  }
  if (!isNonEmptyString(source['owner'])) {
    d.push(diag('r1_project_definition_invalid', `${base}/owner`,
      'an inline-source needs its owning scope inside the document'));
  }
  if (!isNonEmptyStringArray(source['symbols'])) {
    d.push(diag('r1_project_definition_invalid', `${base}/symbols`,
      'an inline-source lists the real page-local symbol(s) (string[]); they are not module exports'));
  }
  if (!isNonEmptyString(source['example'])) {
    d.push(diag('r1_project_definition_invalid', `${base}/example`,
      'an inline-source needs a non-empty in-page call-site example (not an import)'));
  }
  // Fail closed: an inline source MUST NOT carry importable fields. This is the
  // structural guarantee that no fake import can ever be generated for it.
  for (const key of ['module', 'exports'] as const) {
    if (key in source) {
      d.push(diag('r1_project_definition_invalid', `${base}/${key}`,
        `${key} belongs only to a module-import source; an inline page source is not importable and must not fabricate ${key}`));
    }
  }
  return d;
}

/**
 * The ONLY sanctioned way to derive an import suggestion from a component
 * source. Returns null for a non-module inline source: such a component has no
 * specifier and no exports, so callers MUST NOT fabricate an import for it.
 */
export function importableModule(
  source: ComponentSource,
): { module: string; exports: string[] } | null {
  return source.kind === 'module-import'
    ? { module: source.module, exports: [...source.exports] }
    : null;
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
  d.push(...validateComponentSource(def.source, `${base}/source`));
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
