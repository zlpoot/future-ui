/**
 * Phase D (#69) — shadcn EditDialog project integration convenience layer.
 *
 * Wires the real descriptor (view), an explicit instance registry and the
 * jsdom rendered/interaction evidence into the bounded validator. This file
 * adds no rules and scans nothing; it only assembles the pieces and renders
 * the controlled fixture.
 */
import {
  InstanceRegistry,
  validateProject,
  identityRefFor,
  TrustedEvidence,
  type EvidenceSet,
  type InstanceRegistration,
  type ProjectAIView,
  type ValidationReport,
} from '@future-ui/ai-contract-core';
import { buildShadcnProjectView } from './shadcn-descriptor.js';

export interface EditDialogProjectContext {
  view: ProjectAIView;
  registry: InstanceRegistry;
  /**
   * HOST-OWNED trusted evidence for project.validate, injected only by the dev
   * host next to the controlled jsdom driver. Never derived from tool args.
   */
  evidence?: TrustedEvidence;
}

/** Build the real shadcn view and an empty explicit registry. */
export function createEditDialogProjectContext(): EditDialogProjectContext {
  const built = buildShadcnProjectView();
  if (built.view === null) {
    throw new Error(`shadcn project view failed to build: ${built.diagnostics.map((d) => d.code).join(', ')}`);
  }
  return { view: built.view, registry: new InstanceRegistry(built.view) };
}

export interface EditDialogInstanceOptions {
  instanceId?: string;
  scopeId?: string;
  blocking?: boolean;
  pending?: boolean;
  /** projected state keys that are safe to expose (open state only by default). */
  allowedState?: string[];
  sensitive?: string[];
}

/** Register the real EditDialog reference instance (explicit, allowlisted). */
export function registerEditDialogInstance(
  ctx: EditDialogProjectContext,
  options: EditDialogInstanceOptions = {},
): InstanceRegistration {
  const def = ctx.view.definitions.find((d) => d.componentType === 'future-ui.dialog');
  if (def === undefined) throw new Error('future-ui.dialog definition missing from shadcn view');
  const registration: InstanceRegistration = {
    instanceId: options.instanceId ?? 'members/edit-dialog',
    componentType: 'future-ui.dialog',
    scopeId: options.scopeId ?? 'members/edit',
    identityRef: identityRefFor(def.identity),
    metadata: {
      path: 'members/EditMemberDialog',
      blocking: options.blocking,
      declared: { pending: options.pending ?? true },
    },
    // Draft form values/sensitive inputs are NOT on the allowlist.
    visibleState: {
      allow: options.allowedState ?? ['open'],
      sensitive: options.sensitive ?? ['ssn', 'password'],
    },
  };
  const result = ctx.registry.register(registration);
  if (result.diagnostics.length > 0) {
    throw new Error(`register EditDialog instance failed: ${result.diagnostics.map((d) => `${d.code}@${d.path}`).join(', ')}`);
  }
  return registration;
}

/**
 * Seal raw evidence produced by the controlled jsdom driver into trusted
 * evidence. This is the trust gate: only code running in the dev host next to
 * the driver can seal; an external MCP caller cannot.
 */
export function sealProjectEvidence(raw: EvidenceSet): TrustedEvidence {
  return TrustedEvidence.seal(raw);
}

/** Run the frozen bounded rules for the EditDialog instance against trusted evidence. */
export function validateEditDialogProject(
  ctx: EditDialogProjectContext,
  evidence: TrustedEvidence | undefined,
  scopeId?: string,
): ValidationReport {
  return validateProject(ctx.view, ctx.registry, evidence, scopeId === undefined ? {} : { scopeId });
}
