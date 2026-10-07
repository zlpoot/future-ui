// @vitest-environment jsdom
/**
 * R1-04 (#70) Phase A — AUTHORITATIVE validation of the REAL MV-Auto-Editor
 * page evidence through the bounded validator.
 *
 * Runs ONLY when MV_REAL_EVIDENCE_DIR is set (the real-evidence script sets it
 * when driving the live canvas on 127.0.0.1:3001). Loads the evidence JSON
 * collected from the REAL page, seals it into TrustedEvidence (host-owned
 * gate), registers the REAL asset instances and produces the A-Gate report:
 *
 *   declared → rendered (real page) → interaction-verified (jsdom) → not-covered
 *
 * Without the env var the suite is skipped so CI stays hermetic.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type { RenderedEvidence } from '@future-ui/ai-contract-core';
import {
  createMvProjectContext,
  registerMvAssetEditInstance,
  registerRealMvAssetInstances,
  validateMvProject,
  sealProjectEvidence,
  assertEvidenceNotDrifted,
  readMvCurrentUpstream,
  PINNED_MV_CANVAS_BLOB,
  PINNED_MV_HEAD,
  REAL_MV_ASSET_CARDS,
} from '../src/index.js';
import type { MvCurrentUpstream } from '../src/index.js';

const dir = process.env.MV_REAL_EVIDENCE_DIR;

const describeMaybe = dir ? describe : describe.skip;

function load(pathName: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(dir!, pathName), 'utf8'));
}

interface RealPageEvidence extends RenderedEvidence {
  instanceId: string;
  raw?: Record<string, unknown>;
}

function loadReal(pathName: string): RealPageEvidence {
  return load(pathName) as unknown as RealPageEvidence;
}

describeMaybe('R1-04 Phase A — real-page evidence through the bounded validator', () => {
  it('real desktop canvas: #closeInspector is CSS-hidden → R1-DLG-02 fail (rendered, real gap)', () => {
    const ctx = createMvProjectContext();
    registerMvAssetEditInstance(ctx, REAL_MV_ASSET_CARDS[0]);
    const desktop = loadReal('mv-real-desktop.json');
    const evidence = sealProjectEvidence({ rendered: { [desktop.instanceId]: desktop } });
    const report = validateMvProject(ctx, evidence);
    const close = report.findings.find((f) => f.ruleId === 'R1-DLG-02')!;
    // REAL finding: the desktop layout hides the close control (display:none).
    expect(close.status).toBe('fail');
    expect(close.tier).toBe('rendered');
    expect(close.instanceId).toBe(desktop.instanceId);
    expect(close.reason).toContain('no explicit close entry');
    const raw = (desktop as unknown as { raw?: Record<string, unknown> }).raw;
    expect(raw?.closeDisplay).toBe('none');
  });

  it('real embedded canvas: close is visible → R1-DLG-02 pass (rendered)', () => {
    const ctx = createMvProjectContext();
    registerMvAssetEditInstance(ctx, REAL_MV_ASSET_CARDS[0]);
    const embedded = loadReal('mv-real-embedded.json');
    const evidence = sealProjectEvidence({ rendered: { [embedded.instanceId]: embedded } });
    const report = validateMvProject(ctx, evidence);
    expect(report.findings.find((f) => f.ruleId === 'R1-DLG-02')!).toMatchObject({
      status: 'pass',
      tier: 'rendered',
      actual: { closeAffordances: ['/inspector/button[#closeInspector]'] },
    });
  });

  it('all four real cards: identity + capability pass; zero business tools; report printed', () => {
    const ctx = createMvProjectContext();
    registerRealMvAssetInstances(ctx);
    const report = validateMvProject(ctx, undefined);
    expect(report.findings.filter((f) => f.ruleId === 'R1-PRJ-IDENTITY').every((f) => f.status === 'pass')).toBe(true);
    expect(report.findings.filter((f) => f.ruleId === 'R1-PRJ-CAPABILITY').every((f) => f.status === 'pass')).toBe(true);
    console.log('[A-GATE REPORT]', JSON.stringify(report, null, 2));
  });

  it('drift guard (POSITIVE): gate INDEPENDENTLY reads the CURRENT upstream; pinned real evidence passes', () => {
    const combined = load('mv-real-evidence.json');
    const drift = combined.drift as Record<string, unknown>;
    expect(drift.canvasBlobDrifted).toBe(false);
    expect(drift.mvHeadDrifted).toBe(false);
    expect(drift.liveCanvasBlob).toBeTruthy();
    expect(drift.liveMvHead).toBeTruthy();
    // The gate does NOT trust the file's booleans: it reads the live MV checkout
    // itself (real git) right now, independent of when evidence was collected.
    const current = readMvCurrentUpstream();
    expect(current.mvHead).toBe(PINNED_MV_HEAD);
    expect(current.canvasBlob).toBe(PINNED_MV_CANVAS_BLOB);
    expect(assertEvidenceNotDrifted(combined, current))
      .toEqual({ canvasBlobDrifted: false, mvHeadDrifted: false });
  });
});

// Pure, ALWAYS-run drift cases (CI-hermetic: no real file/server, no git). The
// current upstream facts are fed in synthetically; the gated test above is what
// exercises the real readMvCurrentUpstream().
const OTHER_BLOB = '1111111111111111111111111111111111111111';
const OTHER_HEAD = '2222222222222222222222222222222222222222';

function cleanCurrent(): MvCurrentUpstream {
  return { canvasBlob: PINNED_MV_CANVAS_BLOB, mvHead: PINNED_MV_HEAD };
}

interface CleanOverrides {
  liveCanvasBlob?: string;
  pinnedCanvasBlob?: string;
  canvasBlobDrifted?: boolean;
  liveMvHead?: string;
  pinnedMvHead?: string;
  mvHeadDrifted?: boolean;
}

function cleanCombined(overrides: CleanOverrides = {}): { drift: Required<CleanOverrides> } {
  return {
    drift: {
      liveCanvasBlob: PINNED_MV_CANVAS_BLOB,
      pinnedCanvasBlob: PINNED_MV_CANVAS_BLOB,
      canvasBlobDrifted: false,
      liveMvHead: PINNED_MV_HEAD,
      pinnedMvHead: PINNED_MV_HEAD,
      mvHeadDrifted: false,
      ...overrides,
    },
  };
}

describe('R1-04 #70 round 3 (residual P1-2) — gate independently proves freshness; stale evidence fails', () => {
  it('NEGATIVE (the key stale case): stored evidence clean false/false but canvas blob CHANGED → gate FAILS', () => {
    // Evidence was collected while clean; no re-run happened; MV has since moved.
    // The file still says false/false — the gate must catch it from CURRENT facts.
    const current: MvCurrentUpstream = { canvasBlob: OTHER_BLOB, mvHead: PINNED_MV_HEAD };
    expect(() => assertEvidenceNotDrifted(cleanCombined(), current))
      .toThrow(/A-Gate BLOCKED \(drift\)/);
    expect(() => assertEvidenceNotDrifted(cleanCombined(), current))
      .toThrow(/CURRENT upstream has moved/);
    expect(() => assertEvidenceNotDrifted(cleanCombined(), current))
      .toThrow(/canvas\.html blob/);
  });

  it('NEGATIVE (the key stale case): stored evidence clean false/false but MV HEAD CHANGED → gate FAILS', () => {
    const current: MvCurrentUpstream = { canvasBlob: PINNED_MV_CANVAS_BLOB, mvHead: OTHER_HEAD };
    expect(() => assertEvidenceNotDrifted(cleanCombined(), current)).toThrow(/CURRENT upstream has moved/);
    expect(() => assertEvidenceNotDrifted(cleanCombined(), current)).toThrow(/MV HEAD/);
  });

  it('NEGATIVE: CURRENT upstream unresolvable (null git facts) fails closed even with a clean stored record', () => {
    expect(() => assertEvidenceNotDrifted(cleanCombined(), { canvasBlob: null, mvHead: PINNED_MV_HEAD }))
      .toThrow(/independently resolve/);
    expect(() => assertEvidenceNotDrifted(cleanCombined(), { canvasBlob: PINNED_MV_CANVAS_BLOB, mvHead: null }))
      .toThrow(/independently resolve/);
  });

  it('NEGATIVE: a pre-written/replayed file (live ids != current) at the matching pin is still rejected', () => {
    const combined = cleanCombined({ liveCanvasBlob: OTHER_BLOB, liveMvHead: OTHER_HEAD });
    // current is still AT the pin; only the evidence's recorded live ids differ.
    expect(() => assertEvidenceNotDrifted(combined, cleanCurrent()))
      .toThrow(/not produced against the current upstream/);
  });

  it('NEGATIVE: evidence pinned to a different exact commit/sha is rejected', () => {
    const combined = cleanCombined({ pinnedMvHead: OTHER_HEAD, pinnedCanvasBlob: OTHER_BLOB });
    expect(() => assertEvidenceNotDrifted(combined, cleanCurrent())).toThrow(/does not match the frozen pin/);
  });

  it('NEGATIVE: stored drift booleans true still block even if current is at the pin (defense in depth)', () => {
    const combined = cleanCombined({ canvasBlobDrifted: true, mvHeadDrifted: true });
    expect(() => assertEvidenceNotDrifted(combined, cleanCurrent())).toThrow(/marked drifted/);
  });

  it('NEGATIVE: missing / malformed drift record blocks when a usable CURRENT fact is supplied', () => {
    for (const bad of [undefined, null, {}, { drift: undefined }, { drift: null },
      { drift: { canvasBlobDrifted: true } },
      { drift: { canvasBlobDrifted: 'no', mvHeadDrifted: false } },
      { drift: { pinnedCanvasBlob: PINNED_MV_CANVAS_BLOB, pinnedMvHead: PINNED_MV_HEAD,
        liveCanvasBlob: PINNED_MV_CANVAS_BLOB, liveMvHead: PINNED_MV_HEAD } }]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => assertEvidenceNotDrifted(bad as any, cleanCurrent()), JSON.stringify(bad))
        .toThrow(/A-Gate BLOCKED \(drift\)/);
    }
  });

  it('POSITIVE: stored clean + CURRENT at pin + live matching → passes', () => {
    expect(assertEvidenceNotDrifted(cleanCombined(), cleanCurrent()))
      .toEqual({ canvasBlobDrifted: false, mvHeadDrifted: false });
  });
});
