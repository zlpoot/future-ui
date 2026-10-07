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
  type EvidenceSet,
  type InstanceRegistration,
  type ProjectAIView,
  type ValidationReport,
} from '@future-ui/ai-contract-core';
import { buildShadcnProjectView } from './shadcn-descriptor.js';

export interface EditDialogProjectContext {
  view: ProjectAIView;
  registry: InstanceRegistry;
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
  const registration: InstanceRegistration = {
    instanceId: options.instanceId ?? 'members/edit-dialog',
    componentType: 'future-ui.dialog',
    scopeId: options.scopeId ?? 'members/edit',
    adapterId: 'shadcn-react',
    profileId: 'r1-edit-dialog-reference',
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

/** Run the frozen bounded rules for the EditDialog instance against evidence. */
export function validateEditDialogProject(
  ctx: EditDialogProjectContext,
  evidence: EvidenceSet,
  scopeId?: string,
): ValidationReport {
  return validateProject(ctx.view, ctx.registry, evidence, scopeId === undefined ? {} : { scopeId });
}
