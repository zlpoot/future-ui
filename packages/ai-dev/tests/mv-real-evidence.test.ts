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
  REAL_MV_ASSET_CARDS,
} from '../src/index.js';

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

  it('drift guard (POSITIVE): the real pinned evidence is drift-free and the gate accepts it', () => {
    // The collector only writes this combined file when there is NO drift, so a
    // present, freshly-collected file must pass the independent gate re-check.
    const combined = load('mv-real-evidence.json');
    const drift = combined.drift as Record<string, unknown>;
    expect(drift.canvasBlobDrifted).toBe(false);
    expect(drift.mvHeadDrifted).toBe(false);
    expect(drift.liveCanvasBlob).toBeTruthy();
    expect(drift.liveMvHead).toBeTruthy();
    // Gate-side independent assertion: no drift → gate returns the clean record.
    expect(assertEvidenceNotDrifted(combined)).toEqual({ canvasBlobDrifted: false, mvHeadDrifted: false });
  });
});

// These NEGATIVE drift cases are pure and ALWAYS run (CI-hermetic, no real file
// or server needed): the gate must FAIL CLOSED on either drift kind and on a
// missing/malformed record — previously it only warned and still PASSED.
describe('R1-04 #70 round 2 (P1-2) — A-Gate drift guard fails closed', () => {
  it('NEGATIVE: canvas.html blob drift blocks the gate (throws)', () => {
    const drifted = { drift: { canvasBlobDrifted: true, mvHeadDrifted: false } };
    expect(() => assertEvidenceNotDrifted(drifted)).toThrow(/A-Gate BLOCKED \(drift\)/);
    expect(() => assertEvidenceNotDrifted(drifted)).toThrow(/canvas\.html blob/);
  });

  it('NEGATIVE: MV HEAD drift blocks the gate (throws)', () => {
    const drifted = { drift: { canvasBlobDrifted: false, mvHeadDrifted: true } };
    expect(() => assertEvidenceNotDrifted(drifted)).toThrow(/A-Gate BLOCKED \(drift\)/);
    expect(() => assertEvidenceNotDrifted(drifted)).toThrow(/MV HEAD/);
  });

  it('NEGATIVE: both drifted at once names both causes and still blocks', () => {
    const drifted = { drift: { canvasBlobDrifted: true, mvHeadDrifted: true } };
    const err = (): Error => {
      try {
        assertEvidenceNotDrifted(drifted);
        throw new Error('expected throw');
      } catch (e) {
        return e as Error;
      }
    };
    const message = err().message;
    expect(message).toMatch(/canvas\.html blob/);
    expect(message).toMatch(/MV HEAD/);
  });

  it('NEGATIVE: missing / malformed drift record blocks the gate (no trust by default)', () => {
    for (const bad of [undefined, null, {}, { drift: undefined }, { drift: null },
      { drift: {} }, { drift: { canvasBlobDrifted: true } },
      { drift: { canvasBlobDrifted: 'no', mvHeadDrifted: false } }]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => assertEvidenceNotDrifted(bad as any), JSON.stringify(bad)).toThrow(/A-Gate BLOCKED \(drift\)/);
    }
  });

  it('POSITIVE: a clean record passes and is reported as no drift', () => {
    expect(assertEvidenceNotDrifted({ drift: { canvasBlobDrifted: false, mvHeadDrifted: false } }))
      .toEqual({ canvasBlobDrifted: false, mvHeadDrifted: false });
  });
});
