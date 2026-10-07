import {
  InstanceRegistry,
  TrustedEvidence,
  validateProject,
  type EvidenceSet,
  type ProjectAIView,
  type ValidationReport,
} from '@future-ui/ai-contract-core';
import { buildMvProjectView } from './mv-view.js';

/**
 * R1-04 (#70) Phase A — MV-Auto-Editor project integration convenience layer.
 *
 * Mirrors ./edit-dialog-project.ts: wires the real MV Project AI View, an
 * explicit instance registry and the controlled jsdom / real-page evidence
 * into the bounded validator. Adds no rules and scans nothing.
 */
export interface MvProjectContext {
  view: ProjectAIView;
  registry: InstanceRegistry;
  /**
   * HOST-OWNED trusted evidence for validateMvProject, injected only by the
   * dev host next to the controlled driver. Never derived from tool args.
   */
  evidence?: TrustedEvidence;
}

/** Build the real MV view and an empty explicit registry. */
export function createMvProjectContext(): MvProjectContext {
  const built = buildMvProjectView();
  if (built.view === null) {
    throw new Error(`MV project view failed to build: ${built.diagnostics.map((d) => d.code).join(', ')}`);
  }
  return { view: built.view, registry: new InstanceRegistry(built.view) };
}

/**
 * Seal raw evidence produced by the controlled driver into trusted evidence.
 * This is the trust gate: only code running in the dev host next to the driver
 * can seal; an external MCP caller cannot.
 */
export function sealProjectEvidence(raw: EvidenceSet): TrustedEvidence {
  return TrustedEvidence.seal(raw);
}

/** Run the frozen bounded rules for the MV instances against trusted evidence. */
export function validateMvProject(
  ctx: MvProjectContext,
  evidence: TrustedEvidence | undefined,
  scopeId?: string,
): ValidationReport {
  return validateProject(ctx.view, ctx.registry, evidence, scopeId === undefined ? {} : { scopeId });
}
