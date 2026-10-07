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
  PINNED_MV_KEYFRAMES_BLOB,
  PINNED_MV_SHOTS_BLOB,
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
 * Phase A checks only canvas/HEAD; Phase B additionally pins keyframes.html and
 * shots.html (those flags are present only on a Phase B collector record).
 */
export interface MvEvidenceDrift {
  canvasBlobDrifted: boolean;
  mvHeadDrifted: boolean;
  keyframesBlobDrifted?: boolean;
  shotsBlobDrifted?: boolean;
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
 *  3. the CURRENT independently-read HEAD & EVERY pinned page blob equal the
 *     pinned exact values — upstream has not moved since pinning (this is what
 *     rejects a stale file: stored false/false + moved upstream ⇒ BLOCK);
 *  4. the current facts equal the evidence's recorded live facts — the evidence
 *     was produced against the same current state, not pre-written/forged;
 *  5. the stored drift booleans are not already reporting drift.
 * Any failure, or an unresolvable current fact (null), blocks the gate.
 *
 * Phase B extension: when `current` carries keyframesBlob/shotsBlob the guard
 * enforces those two additional page artifacts in exactly the same way. When
 * only canvasBlob/mvHead are supplied (legacy Phase A call shape) behavior,
 * messages and the return object remain byte-identical to Phase A.
 */
export function assertEvidenceNotDrifted(
  combined: { drift?: unknown } | null | undefined,
  current: MvCurrentUpstream,
): MvEvidenceDrift {
  const phaseB = 'keyframesBlob' in current || 'shotsBlob' in current;
  const blobChecks: Array<{
    locator: string;
    label: string;
    currentKey: 'canvasBlob' | 'keyframesBlob' | 'shotsBlob';
    flagKey: 'canvasBlobDrifted' | 'keyframesBlobDrifted' | 'shotsBlobDrifted';
    pinnedKey: string;
    liveKey: string;
    frozenPin: string;
  }> = [
    {
      locator: 'web/canvas.html', label: 'canvas.html blob', currentKey: 'canvasBlob',
      flagKey: 'canvasBlobDrifted', pinnedKey: 'pinnedCanvasBlob', liveKey: 'liveCanvasBlob',
      frozenPin: PINNED_MV_CANVAS_BLOB,
    },
  ];
  if (phaseB) {
    blobChecks.push(
      {
        locator: 'web/keyframes.html', label: 'keyframes.html blob', currentKey: 'keyframesBlob',
        flagKey: 'keyframesBlobDrifted', pinnedKey: 'pinnedKeyframesBlob', liveKey: 'liveKeyframesBlob',
        frozenPin: PINNED_MV_KEYFRAMES_BLOB,
      },
      {
        locator: 'web/shots.html', label: 'shots.html blob', currentKey: 'shotsBlob',
        flagKey: 'shotsBlobDrifted', pinnedKey: 'pinnedShotsBlob', liveKey: 'liveShotsBlob',
        frozenPin: PINNED_MV_SHOTS_BLOB,
      },
    );
  }

  const drift = (combined ?? {}).drift;
  const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
  const rec = (drift ?? {}) as Record<string, unknown>;
  const completeRecord =
    !!drift &&
    typeof drift === 'object' &&
    isBool(rec['mvHeadDrifted']) &&
    blobChecks.every(
      (c) =>
        isBool(rec[c.flagKey]) &&
        isNonEmpty(rec[c.pinnedKey]) &&
        isNonEmpty(rec[c.liveKey]),
    ) &&
    isNonEmpty(rec['pinnedMvHead']) &&
    isNonEmpty(rec['liveMvHead']);
  if (!completeRecord) {
    block('evidence has no complete, usable drift record; refusing to trust evidence of unknown upstream identity');
  }
  const record = drift as MvEvidenceDrift & Record<string, unknown>;

  // (2) The evidence must be pinned to the SAME exact commit/sha this gate was
  // frozen against — a file written for a different pin cannot be accepted.
  const pinMismatch =
    record['pinnedMvHead'] !== PINNED_MV_HEAD ||
    blobChecks.some((c) => record[c.pinnedKey] !== c.frozenPin);
  if (pinMismatch) {
    const expected = [PINNED_MV_HEAD, ...blobChecks.map((c) => c.frozenPin.slice(0, 7))].join('/');
    const actual = [
      record['pinnedMvHead'],
      ...blobChecks.map((c) => String(record[c.pinnedKey]).slice(0, 7)),
    ].join('/');
    block(`evidence pin ${actual} does not match the frozen pin ${expected}`);
  }

  // Current facts must be independently resolvable — null means the gate could
  // not establish the live upstream and must fail closed rather than pass.
  if (!isNonEmpty(current.mvHead) || blobChecks.some((c) => !isNonEmpty(current[c.currentKey]))) {
    block('could not independently resolve the CURRENT MV HEAD / pinned page blob(s); refusing to validate against evidence whose freshness cannot be proven');
  }

  // (3) INDEPENDENT freshness — the stale-evidence killer. The CURRENT upstream
  // must still equal the pinned exact values regardless of what the stored file
  // says: a clean false/false file after MV moved fails here.
  const moved: string[] = [];
  for (const c of blobChecks) {
    const value = current[c.currentKey] as string;
    if (value !== c.frozenPin) {
      moved.push(`${c.label} (current=${value.slice(0, 7)} pinned=${c.frozenPin.slice(0, 7)})`);
    }
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
  const liveMismatch =
    current.mvHead !== record['liveMvHead'] ||
    blobChecks.some((c) => (current[c.currentKey] as string) !== record[c.liveKey]);
  if (liveMismatch) {
    const live = [record['liveMvHead'], ...blobChecks.map((c) => String(record[c.liveKey]).slice(0, 7))].join('/');
    const now = [current.mvHead, ...blobChecks.map((c) => (current[c.currentKey] as string).slice(0, 7))].join('/');
    block(`evidence was not produced against the current upstream (evidence live=${live} current=${now})`);
  }

  // (5) Explicit stored drift still blocks (defense in depth).
  const driftedLabels = blobChecks.filter((c) => record[c.flagKey] === true).map((c) => c.label);
  if (record['mvHeadDrifted'] === true) driftedLabels.push('MV HEAD');
  if (driftedLabels.length > 0) {
    block(`${driftedLabels.join(' + ')} marked drifted in the evidence record; refusing to validate against drifted evidence`);
  }

  const result: MvEvidenceDrift = { canvasBlobDrifted: false, mvHeadDrifted: false };
  if (phaseB) {
    result.keyframesBlobDrifted = false;
    result.shotsBlobDrifted = false;
  }
  return result;
}
