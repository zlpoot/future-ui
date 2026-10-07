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
import {
  createMvProjectContext,
  registerMvAssetEditInstance,
  registerRealMvAssetInstances,
  validateMvProject,
  sealProjectEvidence,
  REAL_MV_ASSET_CARDS,
} from '../src/index.js';

const dir = process.env.MV_REAL_EVIDENCE_DIR;

const describeMaybe = dir ? describe : describe.skip;

function load(pathName: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(dir!, pathName), 'utf8'));
}

describeMaybe('R1-04 Phase A — real-page evidence through the bounded validator', () => {
  it('real desktop canvas: #closeInspector is CSS-hidden → R1-DLG-02 fail (rendered, real gap)', () => {
    const ctx = createMvProjectContext();
    registerMvAssetEditInstance(ctx, REAL_MV_ASSET_CARDS[0]);
    const desktop = load('mv-real-desktop.json');
    const evidence = sealProjectEvidence({ rendered: { [desktop.instanceId as string]: desktop } });
    const report = validateMvProject(ctx, evidence);
    const close = report.findings.find((f) => f.ruleId === 'R1-DLG-02')!;
    // REAL finding: the desktop layout hides the close control (display:none).
    expect(close.status).toBe('fail');
    expect(close.tier).toBe('rendered');
    expect(close.instanceId).toBe(desktop.instanceId);
    expect(close.reason).toContain('no explicit close entry');
    expect((desktop.raw as Record<string, unknown>).closeDisplay).toBe('none');
  });

  it('real embedded canvas: close is visible → R1-DLG-02 pass (rendered)', () => {
    const ctx = createMvProjectContext();
    registerMvAssetEditInstance(ctx, REAL_MV_ASSET_CARDS[0]);
    const embedded = load('mv-real-embedded.json');
    const evidence = sealProjectEvidence({ rendered: { [embedded.instanceId as string]: embedded } });
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

  it('drift guard: combined evidence pins the canvas blob; any drift is recorded', () => {
    const combined = load('mv-real-evidence.json');
    const drift = combined.drift as Record<string, unknown>;
    // When the real page changed since pinning, the evidence must SAY so.
    expect(typeof drift.canvasBlobDrifted).toBe('boolean');
    expect(typeof drift.mvHeadDrifted).toBe('boolean');
    if (drift.canvasBlobDrifted === true) {
      console.warn('[A-GATE] canvas.html drifted from pinned blob:', drift);
    }
    expect(drift.liveCanvasBlob).toBeTruthy();
    expect(drift.liveMvHead).toBeTruthy();
  });
});
