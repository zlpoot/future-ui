import {
  InstanceRegistry,
  TrustedEvidence,
  validateProject,
  type EvidenceSet,
  type ProjectAIView,
  type ValidationReport,
} from '@future-ui/ai-contract-core';
import { buildMvProjectView } from './mv-view.js';
import {
  PINNED_MV_CANVAS_BLOB,
  PINNED_MV_HEAD,
  type MvCurrentUpstream,
} from './mv-upstream.js';

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

/**
 * Upstream-identity drift record captured by the real-evidence collector.
 */
export interface MvEvidenceDrift {
  canvasBlobDrifted: boolean;
  mvHeadDrifted: boolean;
}

function block(message: string): never {
  throw new Error(`A-Gate BLOCKED (drift): ${message}`);
}

function isNonEmpty(v: unknown): v is string {
  return typeof v === 'string' && v.trim() !== '';
}

/**
 * A-Gate upstream drift guard — FAIL CLOSED and INDEPENDENT.
 *
 * It does NOT trust only the booleans in the evidence file (those were computed
 * at collection time, so a clean file collected before MV moved would still
 * read false/false). The caller must hand in `current`, the upstream facts it
 * RE-DERIVED itself right now (readMvCurrentUpstream → live git). The gate
 * then requires ALL of:
 *  1. the evidence carries a complete drift record (booleans + pinned/live ids);
 *  2. the evidence's pinned ids equal the code's exact pinned commit/sha;
 *  3. the CURRENT independently-read HEAD & canvas blob equal the pinned exact
 *     values — upstream has not moved since pinning (this is what rejects a
 *       stale file: stored false/false + moved upstream ⇒ BLOCK);
 *  4. the current facts equal the evidence's recorded live facts — the evidence
 *     was produced against the same current state, not pre-written/forged;
 *  5. the stored drift booleans are not already reporting drift.
 * Any failure, or an unresolvable current fact (null), blocks the gate.
 */
export function assertEvidenceNotDrifted(
  combined: { drift?: unknown } | null | undefined,
  current: MvCurrentUpstream,
): MvEvidenceDrift {
  const drift = (combined ?? {}).drift;
  const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
  if (
    !drift ||
    typeof drift !== 'object' ||
    !isBool((drift as Partial<MvEvidenceDrift>).canvasBlobDrifted) ||
    !isBool((drift as Partial<MvEvidenceDrift>).mvHeadDrifted) ||
    !isNonEmpty((drift as Record<string, unknown>).pinnedCanvasBlob) ||
    !isNonEmpty((drift as Record<string, unknown>).pinnedMvHead) ||
    !isNonEmpty((drift as Record<string, unknown>).liveCanvasBlob) ||
    !isNonEmpty((drift as Record<string, unknown>).liveMvHead)
  ) {
    block('evidence has no complete, usable drift record; refusing to trust evidence of unknown upstream identity');
  }
  const record = drift as MvEvidenceDrift & {
    pinnedCanvasBlob: string;
    pinnedMvHead: string;
    liveCanvasBlob: string;
    liveMvHead: string;
  };

  // (2) The evidence must be pinned to the SAME exact commit/sha this gate was
  // frozen against — a file written for a different pin cannot be accepted.
  if (record.pinnedCanvasBlob !== PINNED_MV_CANVAS_BLOB || record.pinnedMvHead !== PINNED_MV_HEAD) {
    block(
      `evidence pin ${record.pinnedMvHead}/${record.pinnedCanvasBlob.slice(0, 7)} does not match the `
        + `frozen pin ${PINNED_MV_HEAD}/${PINNED_MV_CANVAS_BLOB.slice(0, 7)}`,
    );
  }

  // Current facts must be independently resolvable — null means the gate could
  // not establish the live upstream and must fail closed rather than pass.
  if (!isNonEmpty(current.canvasBlob) || !isNonEmpty(current.mvHead)) {
    block('could not independently resolve the CURRENT MV HEAD / canvas blob; refusing to validate against evidence whose freshness cannot be proven');
  }

  // (3) INDEPENDENT freshness — the stale-evidence killer. The CURRENT upstream
  // must still equal the pinned exact values regardless of what the stored file
  // says: a clean false/false file after MV moved fails here.
  const moved: string[] = [];
  if (current.canvasBlob !== PINNED_MV_CANVAS_BLOB) {
    moved.push(`canvas.html blob (current=${current.canvasBlob.slice(0, 7)} pinned=${PINNED_MV_CANVAS_BLOB.slice(0, 7)})`);
  }
  if (current.mvHead !== PINNED_MV_HEAD) {
    moved.push(`MV HEAD (current=${current.mvHead.slice(0, 7)} pinned=${PINNED_MV_HEAD.slice(0, 7)})`);
  }
  if (moved.length > 0) {
    block(`CURRENT upstream has moved since the evidence was pinned; the stored evidence is stale — ${moved.join('; ')}`);
  }

  // (4) Same-run binding: the evidence's recorded live facts must equal the
  // facts the gate just read, so a pre-written file cannot be replayed even at
  // a matching pin.
  if (current.canvasBlob !== record.liveCanvasBlob || current.mvHead !== record.liveMvHead) {
    block(
      `evidence was not produced against the current upstream (evidence live=${record.liveMvHead.slice(0, 7)}/`
        + `${record.liveCanvasBlob.slice(0, 7)} current=${current.mvHead.slice(0, 7)}/${current.canvasBlob.slice(0, 7)})`,
    );
  }

  // (5) Explicit stored drift still blocks (defense in depth).
  if (record.canvasBlobDrifted || record.mvHeadDrifted) {
    const which = [
      record.canvasBlobDrifted ? 'canvas.html blob' : null,
      record.mvHeadDrifted ? 'MV HEAD' : null,
    ].filter(Boolean).join(' + ');
    block(`${which} marked drifted in the evidence record; refusing to validate against drifted evidence`);
  }

  return { canvasBlobDrifted: false, mvHeadDrifted: false };
}
