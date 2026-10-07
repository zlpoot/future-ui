/**
 * Phase E (#69) — dev-only, READ-ONLY MCP thin projection.
 *
 * Tool names are FROZEN in `FROZEN_PROJECT_TOOL_NAMES` below and must not be
 * renamed/extended without an explicit change. The surface is deliberately
 * minimal and strictly read-only:
 *
 *   project.catalog            — list real components + explicit capabilities
 *   project.describeComponent  — one full component definition
 *   project.listInstances      — list EXPLICIT instances (safe metadata only)
 *   project.describeInstance   — one instance + coverage + bound capability ids
 *   project.validate           — run the frozen bounded rules over HOST-OWNED
 *                                trusted evidence (never caller-supplied JSON)
 *
 * Hard boundaries (R1-03):
 *  - dev-time only; this module is never imported by any UI production package;
 *  - read-only: there is NO register/update/unregister/edit/shell/exec tool and
 *    no business Capability invocation (a rendered control is never a tool);
 *  - TRUST BOUNDARY: rendered/interaction evidence can only come from the
 *    controlled jsdom driver via TrustedEvidence.seal(), injected by the host
 *    into the tool context. A caller CANNOT pass evidence JSON to
 *    project.validate — doing so returns project_tool_arg_invalid, and even if
 *    forged it carries no trust brand and can never reach rendered/interaction
 *    tiers;
 *  - no MCP SDK / network / model dependency — this is a pure dispatcher a dev
 *    host can expose over stdio; without that host the core API and UI are
 *    completely unaffected;
 *  - kept separate from `webmcp-adapter` (business capability invocation).
 */
import {
  capabilitiesForInstance,
  describeComponent,
  validateProject,
  TrustedEvidence,
  type InstanceRegistry,
  type ProjectAIView,
  type ValidationReport,
} from '@future-ui/ai-contract-core';

/** Frozen tool surface. Adding/removing a name is an explicit, reviewed change. */
export const FROZEN_PROJECT_TOOL_NAMES = [
  'project.catalog',
  'project.describeComponent',
  'project.listInstances',
  'project.describeInstance',
  'project.validate',
] as const;

export type ProjectToolName = (typeof FROZEN_PROJECT_TOOL_NAMES)[number];

export interface ProjectToolDescriptor {
  name: ProjectToolName;
  description: string;
  readOnly: true;
  /** declared input fields (all optional unless marked required) */
  inputs: ReadonlyArray<{ name: string; required?: boolean; type: 'string' | 'object' }>;
}

export const PROJECT_TOOL_DESCRIPTORS: readonly ProjectToolDescriptor[] = [
  {
    name: 'project.catalog',
    description: 'List the components this project can actually use (real import, identity, mapping status/limits) and the explicit capability references. Read-only.',
    readOnly: true,
    inputs: [],
  },
  {
    name: 'project.describeComponent',
    description: 'Return the full definition (actual import, frozen adapter/upstream identity, mapping limits, examples) for one componentType. Read-only.',
    readOnly: true,
    inputs: [{ name: 'componentType', required: true, type: 'string' }],
  },
  {
    name: 'project.listInstances',
    description: 'List EXPLICITLY registered instances (safe metadata only; never draft/sensitive values). Optional scopeId/componentType filters. Read-only.',
    readOnly: true,
    inputs: [
      { name: 'scopeId', type: 'string' },
      { name: 'componentType', type: 'string' },
    ],
  },
  {
    name: 'project.describeInstance',
    description: 'Describe one explicit instance, its scope coverage and bound capability ids (zero business tools when unbound). Read-only.',
    readOnly: true,
    inputs: [{ name: 'instanceId', required: true, type: 'string' }],
  },
  {
    name: 'project.validate',
    description: 'Run the frozen bounded rules (optionally one ruleId/scopeId) using HOST-OWNED trusted evidence from the controlled driver. Read-only; does NOT accept caller-supplied evidence.',
    readOnly: true,
    inputs: [
      { name: 'scopeId', type: 'string' },
      { name: 'ruleId', type: 'string' },
    ],
  },
];

export type ProjectToolErrorCode =
  | 'project_tool_unknown'
  | 'project_tool_arg_invalid'
  | 'project_tool_not_found';

export interface ProjectToolError {
  code: ProjectToolErrorCode;
  path: string;
  message: string;
  expected?: unknown;
  actual?: unknown;
}

export type ProjectToolResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: ProjectToolError };

export interface ProjectToolContext {
  view: ProjectAIView;
  registry: InstanceRegistry;
  /**
   * HOST-OWNED trusted evidence produced by the controlled jsdom driver.
   * Populated only by the dev host, never from a tool argument. Absent →
   * declared-tier validation only.
   */
  evidence?: TrustedEvidence;
}

function isString(v: unknown): v is string {
  return typeof v === 'string' && v.trim() !== '';
}

/** Safe, value-free projection of an instance (no draft/sensitive state). */
function safeInstanceRow(i: ReturnType<InstanceRegistry['query']>[number]) {
  return {
    instanceId: i.instanceId,
    componentType: i.componentType,
    scopeId: i.scopeId,
    adapterId: i.identityRef.adapterId,
    adapterVersion: i.identityRef.adapterVersion,
    profileId: i.identityRef.profileId,
    profileVersion: i.identityRef.profileVersion,
    upstreamFingerprint: i.identityRef.upstreamFingerprint,
    path: i.metadata.path,
    blocking: i.metadata.blocking === true,
    visibleState: {
      allowedKeys: [...i.visibleState.allow],
      sensitiveKeys: [...i.visibleState.sensitive],
      draftProjected: i.visibleState.exposeDraft === true,
    },
    relations: (i.relations ?? []).map((r) => ({ kind: r.kind, target: r.target })),
  };
}

/**
 * Dispatch one frozen read-only tool. Pure/deterministic; never mutates the
 * registry and never invokes a business capability. Unknown/non-read-only
 * names are rejected.
 */
export function executeProjectTool(
  ctx: ProjectToolContext,
  name: string,
  args: Record<string, unknown> = {},
): ProjectToolResult {
  if (!(FROZEN_PROJECT_TOOL_NAMES as readonly string[]).includes(name)) {
    return {
      ok: false,
      error: {
        code: 'project_tool_unknown',
        path: `/tool/${name}`,
        message: 'tool is not in the frozen read-only project tool surface; edit/shell/exec/business-invocation tools do not exist',
        expected: [...FROZEN_PROJECT_TOOL_NAMES],
        actual: name,
      },
    };
  }

  switch (name as ProjectToolName) {
    case 'project.catalog':
      return {
        ok: true,
        data: {
          project: ctx.view.project,
          components: ctx.view.definitions.map((d) => ({
            componentType: d.componentType,
            mappingStatus: d.mappingStatus,
            limitMembers: d.limits.map((l) => l.member),
            actualImport: d.actualImport,
          })),
          explicitCapabilities: ctx.view.capabilities.map((c) => c.capabilityId),
        },
      };

    case 'project.describeComponent': {
      if (!isString(args['componentType'])) {
        return { ok: false, error: { code: 'project_tool_arg_invalid', path: '/args/componentType', message: 'componentType (non-empty string) is required' } };
      }
      const def = describeComponent(ctx.view, args['componentType']);
      if (def === undefined) {
        return { ok: false, error: { code: 'project_tool_not_found', path: '/args/componentType', message: 'no component definition for componentType', actual: args['componentType'] } };
      }
      return { ok: true, data: def };
    }

    case 'project.listInstances': {
      const scopeId = args['scopeId'];
      const componentType = args['componentType'];
      if (scopeId !== undefined && !isString(scopeId)) {
        return { ok: false, error: { code: 'project_tool_arg_invalid', path: '/args/scopeId', message: 'scopeId must be a non-empty string' } };
      }
      if (componentType !== undefined && !isString(componentType)) {
        return { ok: false, error: { code: 'project_tool_arg_invalid', path: '/args/componentType', message: 'componentType must be a non-empty string' } };
      }
      const instances = ctx.registry.query({
        ...(isString(scopeId) ? { scopeId } : {}),
        ...(isString(componentType) ? { componentType } : {}),
      });
      return { ok: true, data: { instances: instances.map(safeInstanceRow) } };
    }

    case 'project.describeInstance': {
      if (!isString(args['instanceId'])) {
        return { ok: false, error: { code: 'project_tool_arg_invalid', path: '/args/instanceId', message: 'instanceId (non-empty string) is required' } };
      }
      const inst = ctx.registry.get(args['instanceId']);
      if (inst === undefined) {
        return { ok: false, error: { code: 'project_tool_not_found', path: '/args/instanceId', message: 'no explicit instance registered with instanceId', actual: args['instanceId'] } };
      }
      return {
        ok: true,
        data: {
          ...safeInstanceRow(inst),
          coverage: ctx.registry.coverage(inst.scopeId).coverage,
          boundCapabilities: capabilitiesForInstance(ctx.view, inst.instanceId).map((c) => c.capabilityId),
        },
      };
    }

    case 'project.validate': {
      const scopeId = args['scopeId'];
      const ruleId = args['ruleId'];
      // Trust boundary: evidence is never read from tool arguments. A caller
      // attempting to provide forged evidence is rejected outright.
      if ('evidence' in args || 'rendered' in args || 'interaction' in args) {
        return {
          ok: false,
          error: {
            code: 'project_tool_arg_invalid',
            path: '/args/evidence',
            message: 'evidence cannot be supplied by the caller; rendered/interaction verification is produced only by the host-controlled jsdom driver',
            actual: 'caller-provided evidence',
            expected: 'no evidence argument (host injects TrustedEvidence)',
          },
        };
      }
      if (scopeId !== undefined && !isString(scopeId)) {
        return { ok: false, error: { code: 'project_tool_arg_invalid', path: '/args/scopeId', message: 'scopeId must be a non-empty string' } };
      }
      if (ruleId !== undefined && !isString(ruleId)) {
        return { ok: false, error: { code: 'project_tool_arg_invalid', path: '/args/ruleId', message: 'ruleId must be a non-empty string' } };
      }
      const report: ValidationReport = validateProject(
        ctx.view,
        ctx.registry,
        ctx.evidence,
        {
          ...(isString(scopeId) ? { scopeId } : {}),
          ...(isString(ruleId) ? { ruleId } : {}),
        },
      );
      return { ok: true, data: report };
    }
  }
}
