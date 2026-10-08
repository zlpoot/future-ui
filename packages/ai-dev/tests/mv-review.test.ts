// @vitest-environment jsdom
/**
 * R1-04 (#70) Phase B — deterministic integration over the REAL
 * MV-Auto-Editor Storyboard (P4) and Keyframe (P5) review pages.
 *
 * Honesty model for this phase:
 *  - the review pages are full-page, NON-MODAL applications, registered only as
 *    future-ui.button / future-ui.text-input — never as dialog, never blocking;
 *  - the frozen BOUNDED_RULES set has no button/text-input rule, so the review
 *    action semantics (select / approve / reject / retry / lock / pending-
 *    disabled / action-role) are recorded as RENDERED FACTS only. They are
 *    never sealed as interaction-verified PASS; there is simply no applicable
 *    frozen rule (NOT-COVERED), exactly as the Owner decided;
 *  - jsdom markup mirrors the REAL inline templates. The REAL current project
 *    state has P5 jobs=[] and every selection null, so the DEFAULT fixture has
 *    no job row and no retry button; the terminal-state rows are fixture facts,
 *    explicitly NOT a claim about current data and NOT interaction proof;
 *  - no model, no network, no source scanning, no MV product code changed.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  importableModule,
  identityRefFor,
  capabilitiesForInstance,
} from '@future-ui/ai-contract-core';
import {
  createMvProjectContext,
  validateMvProject,
  sealProjectEvidence,
  assertEvidenceNotDrifted,
  readMvCurrentUpstream,
  PINNED_MV_CANVAS_BLOB,
  PINNED_MV_KEYFRAMES_BLOB,
  PINNED_MV_SHOTS_BLOB,
  PINNED_MV_HEAD,
  MV_REVIEW_BUTTON_UPSTREAM,
  registerMvReviewInstances,
  reviewInstanceCounts,
  assertNonModalReview,
  assertInstancePageCovered,
  definitionSourceLocators,
  MV_REVIEW_UNMAPPED_CONTROLS,
  MV_REVIEW_SPECS,
  P4_SCOPE,
  P5_SCOPE,
  mountP4ShotDetail,
  mountP5ShotDetail,
  observeP4ReviewControls,
  observeP5ReviewControls,
} from '../src/index.js';
import type { MvCurrentUpstream } from '../src/index.js';

// Committed read-only evidence captured by scripts/phase-b-real-evidence.mjs
// from the real running MV pages (no clicks that mutate data). This ties the
// jsdom fixture to an actual real-page observation and the frozen pins.
const REAL_B_EVIDENCE_PATH = path.resolve(
  process.cwd(),
  'docs/r1-04/evidence/mv-real-phase-b-evidence.json',
);

const OTHER_BLOB = '1111111111111111111111111111111111111111';

describe('R1-04 Phase B — review component definitions use multi-source provenance', () => {
  it('button/text-input are inline-source-set over the real review pages; dialog stays canvas-only inline-source', () => {
    const ctx = createMvProjectContext();
    const byType = new Map(ctx.view.definitions.map((d) => [d.componentType, d]));

    const dialog = byType.get('future-ui.dialog')!;
    expect(dialog.source.kind).toBe('inline-source');

    for (const type of ['future-ui.button', 'future-ui.text-input'] as const) {
      const def = byType.get(type)!;
      expect(def.source.kind).toBe('inline-source-set');
      if (def.source.kind !== 'inline-source-set') throw new Error('narrow');
      expect(importableModule(def.source)).toBeNull();
      expect('module' in def.source).toBe(false);
      expect('exports' in def.source).toBe(false);
      // every member carries real provenance and is pinned via artifacts
      for (const member of def.source.sources) {
        expect(member.locator).toMatch(/^web\/(canvas|shots|keyframes)\.html$/);
        expect(member.owner).toContain('non-module');
        expect(member.symbols.length).toBeGreaterThan(0);
        expect(member.example).not.toContain('import ');
      }
      const locators = def.source.sources.map((s) => s.locator);
      expect(new Set(locators).size).toBe(locators.length);
      const pinned = def.identity.upstream.artifacts?.map((a) => a.locator);
      expect(pinned).toEqual(locators);
    }

    // Only the review buttons truly span all three pages.
    const button = byType.get('future-ui.button')!;
    if (button.source.kind !== 'inline-source-set') throw new Error('narrow');
    expect(button.source.sources.map((s) => s.locator).sort()).toEqual(
      ['web/canvas.html', 'web/keyframes.html', 'web/shots.html'],
    );
    // text-input has NO keyframes member (that page's only input is a file picker)
    const input = byType.get('future-ui.text-input')!;
    if (input.source.kind !== 'inline-source-set') throw new Error('narrow');
    expect(input.source.sources.map((s) => s.locator).sort()).toEqual(
      ['web/canvas.html', 'web/shots.html'],
    );
  });

  it('single Profile reused: every definition resolves to mv-auto-editor 1.0.0', () => {
    const ctx = createMvProjectContext();
    for (const def of ctx.view.definitions) {
      expect(def.identity.profileId).toBe('mv-auto-editor');
      expect(def.identity.profileVersion).toBe('1.0.0');
      expect(def.identity.adapterId).toBe('shadcn-react');
    }
  });
});

describe('R1-04 Phase B — explicit P4/P5 review instance registry', () => {
  it('registers the real review instances in two scopes with valid relations; zero business tools', () => {
    const ctx = createMvProjectContext();
    const registered = registerMvReviewInstances(ctx);
    const counts = reviewInstanceCounts();
    expect(counts.total).toBe(MV_REVIEW_SPECS.length);
    expect(registered).toHaveLength(counts.total);
    expect(ctx.registry.size).toBe(counts.total);

    const p5 = ctx.registry.query({ scopeId: P5_SCOPE });
    const p4 = ctx.registry.query({ scopeId: P4_SCOPE });
    expect(p5).toHaveLength(counts.p5);
    expect(p4).toHaveLength(counts.p4);

    // none of the review instances are dialogs and none declares blocking
    for (const inst of [...p5, ...p4]) {
      expect(['future-ui.button', 'future-ui.text-input']).toContain(inst.componentType);
      expect(inst.metadata?.blocking).toBeUndefined();
      expect(inst.capabilityBindings).toEqual([]);
      expect(capabilitiesForInstance(ctx.view, inst.instanceId)).toEqual([]);
    }

    // real data-flow relations point at registered targets (registry rule)
    const ids = new Set([...p5, ...p4].map((i) => i.instanceId));
    for (const inst of [...p5, ...p4]) {
      for (const rel of inst.relations ?? []) expect(ids.has(rel.target)).toBe(true);
    }
  });

  it('declared rules pass for review scopes; NO dialog rule is applied and nothing reaches interaction tier', () => {
    const ctx = createMvProjectContext();
    registerMvReviewInstances(ctx);
    for (const scope of [P4_SCOPE, P5_SCOPE]) {
      const report = validateMvProject(ctx, undefined, scope);
      // only declared project rules apply to button/text-input instances
      const ruleIds = new Set(report.findings.map((f) => f.ruleId));
      expect(ruleIds.has('R1-DLG-02')).toBe(false);
      expect(ruleIds.has('R1-DLG-04')).toBe(false);
      expect(ruleIds.has('R1-DLG-05')).toBe(false);
      for (const f of report.findings) {
        expect(['R1-PRJ-IDENTITY', 'R1-PRJ-CAPABILITY', 'R1-PRJ-DRAFT-HIDDEN']).toContain(f.ruleId);
        expect(f.status).toBe('pass');
        expect(f.tier).not.toBe('interaction-verified');
      }
      const cov = report.coverage.find((c) => c.scopeId === scope)!;
      // declared project rules pass; no pending rule applies to button/text-
      // input, so the scope is 'covered' (not the 'full' that sealed interaction
      // evidence would be required for) — the honest NOT-COVERED disposition.
      expect(cov.coverage).toBe('covered');
    }
  });

  it('visible-state allowlist withholds prompts/notes/file/draft values; only safe status is projected', () => {
    const ctx = createMvProjectContext();
    registerMvReviewInstances(ctx);

    // P5: a candidate prompt, notes and the file must never be projected;
    // only safe status, including the checked COUNT (not the set), is exposed.
    const p5Snap = ctx.registry.projectVisibleState('p5/batch-jobs', {
      planReviewStatus: 'pending',
      checkedShotIds: ['shot-01', 'shot-02'],
      checkedShotCount: 2,
      candidatePrompt: '敏感提示词',
      notes: '内部备注',
    });
    expect(p5Snap.projected).toEqual({ planReviewStatus: 'pending', checkedShotCount: 2 });
    for (const hidden of ['checkedShotIds', 'candidatePrompt', 'notes']) {
      expect(p5Snap.withheld).toContain(hidden);
    }

    // P4: draft field VALUES are withheld even though the field is mapped.
    const p4Snap = ctx.registry.projectVisibleState('p4/field-generation-prompt', {
      fieldKind: 'generationPrompt',
      shotId: 'shot-01',
      value: '草稿提示词正文',
      generationPrompt: '草稿提示词正文',
    });
    expect(p4Snap.projected).toEqual({ fieldKind: 'generationPrompt', shotId: 'shot-01' });
    expect(p4Snap.withheld).toEqual(expect.arrayContaining(['value', 'generationPrompt']));

    // The P5 file picker is NOT a registered instance (P1-B): it is recorded as
    // an out-of-scope/unsupported control and carries no visibleState, so it
    // projects zero AI-facing state and cannot be queried in the registry.
    const file = MV_REVIEW_UNMAPPED_CONTROLS.find((c) => c.locator.includes('#uploadFile'))!;
    expect(file).toBeDefined();
    expect(file.disposition).toBe('out-of-scope-unsupported');
    expect(file.page).toBe('web/keyframes.html');
    expect(MV_REVIEW_SPECS.every((s) => s.instanceId !== 'p5/candidate-file')).toBe(true);
    expect(ctx.registry.query().every((i) => i.instanceId !== 'p5/candidate-file')).toBe(true);
    // Querying the unregistered picker is fail-closed: nothing projects, every
    // key is withheld, and an instance-not-found diagnostic is attached (the
    // registry never throws here — it records the illegal projection attempt).
    const fileSnap = ctx.registry.projectVisibleState('p5/candidate-file', { value: 'C:/secret/path.png' });
    expect(fileSnap.projected).toEqual({});
    expect(fileSnap.withheld).toEqual(['value']);
    expect(fileSnap.diagnostics.some((d) => d.code === 'r1_project_instance_not_found')).toBe(true);
  });

  it('NEGATIVE: mapping a review page as dialog or declaring blocking is rejected', () => {
    expect(() =>
      assertNonModalReview({ componentType: 'future-ui.dialog', metadata: { path: 'p' } }),
    ).toThrow(/non-modal/);
    expect(() =>
      assertNonModalReview({ componentType: 'future-ui.button', metadata: { path: 'p', blocking: true } }),
    ).toThrow(/blocking/);
    // no review spec is itself a dialog (typed componentType excludes it;
    // compare as strings to keep the intent explicit under type narrowing)
    expect(MV_REVIEW_SPECS.every((s) => (s.componentType as string) !== 'future-ui.dialog')).toBe(true);
  });

  it('NEGATIVE: an identityRef carrying the old canvas-only fingerprint fails registration', () => {
    const ctx = createMvProjectContext();
    const buttonDef = ctx.view.definitions.find((d) => d.componentType === 'future-ui.button')!;
    const base = identityRefFor(buttonDef.identity);
    // tamper with the multi-artifact fingerprint (simulate a stale Phase A ref)
    const result = ctx.registry.register({
      instanceId: 'p5/stale-fp',
      componentType: 'future-ui.button',
      scopeId: P5_SCOPE,
      identityRef: { ...base, upstreamFingerprint: '00000000' },
      metadata: { path: 'p', declared: {} },
      visibleState: { allow: [], sensitive: [] },
    });
    expect(result.diagnostics.some(
      (d) => d.code === 'r1_project_identity_mismatch' && d.path.includes('upstreamFingerprint'),
    )).toBe(true);
    expect(ctx.registry.get('p5/stale-fp')).toBeUndefined();
  });

  it('NEGATIVE (P1-B): every instance page is covered by its definition provenance; a keyframes text-input would be refused', () => {
    const ctx = createMvProjectContext();
    const byType = new Map(ctx.view.definitions.map((d) => [d.componentType, d]));
    const buttonPages = definitionSourceLocators(byType.get('future-ui.button')!.source);
    const inputPages = definitionSourceLocators(byType.get('future-ui.text-input')!.source);
    expect(buttonPages).toContain('web/keyframes.html');
    expect(inputPages).not.toContain('web/keyframes.html');

    // registration of all real specs succeeds — every declared page is covered
    expect(() => registerMvReviewInstances(ctx)).not.toThrow();

    // The P1-B mismatch itself must now throw: text-input does not pin keyframes
    expect(() =>
      assertInstancePageCovered('future-ui.text-input', 'web/keyframes.html', inputPages, 'p5/candidate-file'),
    ).toThrow(/not covered by[\s\S]*source provenance/);
    // a covered page passes
    expect(() =>
      assertInstancePageCovered('future-ui.text-input', 'web/shots.html', inputPages, 'p4/field-intent'),
    ).not.toThrow();
    // and the honest fix leaves exactly one unmapped control (the file picker)
    expect(MV_REVIEW_UNMAPPED_CONTROLS).toHaveLength(1);
    expect(MV_REVIEW_UNMAPPED_CONTROLS[0].locator).toContain('#uploadFile');
  });

  it('scope cleanup removes every review instance; coverage becomes not-covered', () => {
    const ctx = createMvProjectContext();
    registerMvReviewInstances(ctx);
    expect(ctx.registry.size).toBe(reviewInstanceCounts().total);
    ctx.registry.clearScope(P5_SCOPE);
    expect(ctx.registry.query({ scopeId: P5_SCOPE })).toEqual([]);
    // P4 untouched, P5 gone with no residue
    expect(ctx.registry.query({ scopeId: P4_SCOPE })).toHaveLength(reviewInstanceCounts().p4);
    const dangling = ctx.registry.query().filter(
      (i) => (i.relations ?? []).some((r) => r.target.startsWith('p5/')),
    );
    expect(dangling).toEqual([]);
    ctx.registry.clearScope(P4_SCOPE);
    expect(ctx.registry.size).toBe(0);
  });
});

describe('R1-04 Phase B — P5 keyframe review RENDERED facts (no faked interaction)', () => {
  it('REAL current project state: no jobs → no retry/cancel/fail rows rendered', () => {
    // keyframe-review.json: jobs=[] and 15 pending candidates. The default
    // fixture honestly renders NO job actions for the current state.
    const handle = mountP5ShotDetail();
    try {
      const facts = observeP5ReviewControls(handle.container);
      expect(facts.retryPresent).toBe(false);
      expect(facts.jobCancelPresent).toBe(false);
      expect(facts.jobFailPresent).toBe(false);
      expect(facts.approvePresent).toBe(true);
      expect(facts.rejectPresent).toBe(true);
      // pending candidate is not approved → the conditional select is absent
      expect(facts.selectPresent).toBe(false);
    } finally {
      handle.unmount();
    }
  });

  it('RENDERED fact: select appears only for an approved non-current candidate', () => {
    const approvedOther = mountP5ShotDetail({ candidateStatus: 'approved', isCurrentSelection: false });
    try {
      expect(observeP5ReviewControls(approvedOther.container).selectPresent).toBe(true);
    } finally {
      approvedOther.unmount();
    }
    const current = mountP5ShotDetail({ candidateStatus: 'approved', isCurrentSelection: true });
    try {
      expect(observeP5ReviewControls(current.container).selectPresent).toBe(false);
    } finally {
      current.unmount();
    }
  });

  it('RENDERED fact: locked shot disables approve/reject/select; unlock enabled only when locked', () => {
    const handle = mountP5ShotDetail({ candidateStatus: 'approved', locked: true, selected: true });
    try {
      const facts = observeP5ReviewControls(handle.container);
      expect(facts.approveDisabled).toBe(true);
      expect(facts.rejectDisabled).toBe(true);
      expect(facts.selectDisabled).toBe(true);
      expect(facts.lockDisabled).toBe(true);
      expect(facts.unlockDisabled).toBe(false);
    } finally {
      handle.unmount();
    }
  });

  it('RENDERED fact (fixture only, NOT current data): retry renders only for failed/canceled jobs', () => {
    const awaiting = mountP5ShotDetail({ jobStatus: 'awaiting-upload' });
    try {
      const facts = observeP5ReviewControls(awaiting.container);
      expect(facts.retryPresent).toBe(false);
      expect(facts.jobCancelPresent).toBe(true);
      expect(facts.jobFailPresent).toBe(true);
    } finally {
      awaiting.unmount();
    }
    for (const terminal of ['failed', 'canceled'] as const) {
      const handle = mountP5ShotDetail({ jobStatus: terminal });
      try {
        const facts = observeP5ReviewControls(handle.container);
        expect(facts.retryPresent).toBe(true);
        expect(facts.jobCancelPresent).toBe(false);
      } finally {
        handle.unmount();
      }
    }
  });

  it('rendered facts are NOT sealed as interaction evidence: review semantics stay without an interaction tier', () => {
    const ctx = createMvProjectContext();
    registerMvReviewInstances(ctx);
    const handle = mountP5ShotDetail({ candidateStatus: 'approved' });
    try {
      // Even with rendered facts available we deliberately seal NO interaction
      // evidence (there is no frozen button rule and no hermetic handler); the
      // validator never reports an interaction-verified result for review.
      const evidence = sealProjectEvidence({ rendered: {}, interaction: {} });
      const report = validateMvProject(ctx, evidence, P5_SCOPE);
      expect(report.findings.every((f) => f.tier !== 'interaction-verified')).toBe(true);
    } finally {
      handle.unmount();
    }
  });
});

describe('R1-04 Phase B — P4 storyboard review RENDERED facts', () => {
  it('renders the save/reset/rewrite actions and the draft fields; the page is NOT a modal', () => {
    const handle = mountP4ShotDetail();
    try {
      const facts = observeP4ReviewControls(handle.container);
      expect(facts.savePresent).toBe(true);
      expect(facts.resetPresent).toBe(true);
      expect(facts.makePromptPresent).toBe(true);
      expect(facts.fieldIds).toContain('generationPrompt');
      expect(facts.fieldIds).toContain('intent');
      expect(facts.hasDialogRole).toBe(false);
      expect(facts.hasCloseEntry).toBe(false);
    } finally {
      handle.unmount();
    }
  });

  it('RENDERED fact: prev/next disabled at boundaries; anchor disabled when locked', () => {
    const first = mountP4ShotDetail({ isFirstShot: true, anchorLocked: true });
    try {
      const facts = observeP4ReviewControls(first.container);
      expect(facts.prevDisabled).toBe(true);
      expect(facts.nextDisabled).toBe(false);
      expect(facts.anchorDisabled).toBe(true);
    } finally {
      first.unmount();
    }
    const last = mountP4ShotDetail({ isLastShot: true });
    try {
      const facts = observeP4ReviewControls(last.container);
      expect(facts.nextDisabled).toBe(true);
      expect(facts.prevDisabled).toBe(false);
    } finally {
      last.unmount();
    }
  });
});

describe('R1-04 Phase B — committed real-page evidence matches the fixture default and the pins', () => {
  const evidence = JSON.parse(fs.readFileSync(REAL_B_EVIDENCE_PATH, 'utf8')) as {
    readOnly: boolean;
    pinned: { mvHead: string; blobs: Record<string, string> };
    current: { mvHead: string; canvasBlob: string; keyframesBlob: string; shotsBlob: string };
    drift: {
      pinnedMvHead: string;
      liveMvHead: string;
      mvHeadDrifted: boolean;
      pinnedCanvasBlob: string;
      liveCanvasBlob: string;
      canvasBlobDrifted: boolean;
      pinnedKeyframesBlob: string;
      liveKeyframesBlob: string;
      keyframesBlobDrifted: boolean;
      pinnedShotsBlob: string;
      liveShotsBlob: string;
      shotsBlobDrifted: boolean;
    };
    p5: { facts: Record<string, unknown> };
    p4: { facts: Record<string, unknown> };
  };

  it('evidence carries the complete three-page drift record the consumer gate requires (P1-A)', () => {
    const d = evidence.drift;
    expect(d).toBeDefined();
    expect(d.pinnedMvHead).toBe(PINNED_MV_HEAD);
    expect(d.pinnedCanvasBlob).toBe(PINNED_MV_CANVAS_BLOB);
    expect(d.pinnedKeyframesBlob).toBe(PINNED_MV_KEYFRAMES_BLOB);
    expect(d.pinnedShotsBlob).toBe(PINNED_MV_SHOTS_BLOB);
    // captured clean (assertAtPins gate before collection)
    expect([d.canvasBlobDrifted, d.keyframesBlobDrifted, d.shotsBlobDrifted, d.mvHeadDrifted]).toEqual([false, false, false, false]);
    expect(d.liveCanvasBlob).toBe(d.pinnedCanvasBlob);
    expect(d.liveKeyframesBlob).toBe(d.pinnedKeyframesBlob);
    expect(d.liveShotsBlob).toBe(d.pinnedShotsBlob);
  });

  // P1-A: the COMMITTED record must actually pass the independent gate using a
  // CURRENT checkout read at test time — not just equal stored constants.
  const live = readMvCurrentUpstream();
  const hasLiveRepo = live.mvHead !== null
    && live.canvasBlob !== null
    && live.keyframesBlob !== null
    && live.shotsBlob !== null;

  it.skipIf(!hasLiveRepo)('P1-A: committed evidence passes the independent CURRENT three-page gate right now', () => {
    // The gate re-derives current facts itself; it does not trust the file.
    expect(assertEvidenceNotDrifted(evidence, live)).toEqual({
      canvasBlobDrifted: false,
      keyframesBlobDrifted: false,
      shotsBlobDrifted: false,
      mvHeadDrifted: false,
    });
  });

  it.skipIf(!hasLiveRepo)('P1-A NEGATIVE: a stale committed record (live id moved vs CURRENT) is blocked by the gate', () => {
    // Copy the REAL committed record and simulate staleness on its recorded
    // LIVE keyframes blob only — the CURRENT checkout is still at the pin. The
    // independent gate must reject it even though every drift boolean is false.
    const stale = JSON.parse(JSON.stringify(evidence)) as typeof evidence;
    stale.drift.liveKeyframesBlob = OTHER_BLOB;
    expect(() => assertEvidenceNotDrifted(stale, live)).toThrow(/not produced against the current upstream/);
  });

  it.skipIf(!hasLiveRepo)('P1-A NEGATIVE: a committed record pinned to a different blob is rejected', () => {
    const repinned = JSON.parse(JSON.stringify(evidence)) as typeof evidence;
    repinned.drift.pinnedShotsBlob = OTHER_BLOB;
    repinned.drift.liveShotsBlob = OTHER_BLOB;
    expect(() => assertEvidenceNotDrifted(repinned, live)).toThrow(/frozen pin/);
  });

  it('evidence was a read-only capture against the frozen pins', () => {
    expect(evidence.readOnly).toBe(true);
    expect(evidence.current.mvHead).toBe(PINNED_MV_HEAD);
    expect(evidence.current.canvasBlob).toBe(PINNED_MV_CANVAS_BLOB);
    expect(evidence.current.keyframesBlob).toBe(PINNED_MV_KEYFRAMES_BLOB);
    expect(evidence.current.shotsBlob).toBe(PINNED_MV_SHOTS_BLOB);
    expect(evidence.pinned.blobs['web/canvas.html']).toBe(PINNED_MV_CANVAS_BLOB);
  });

  it('REAL current P5 state has no jobs/retry; the jsdom default mirrors the real observation', () => {
    const f = evidence.p5.facts;
    expect(f.hasDialogRole).toBe(false);
    expect(f.hasCloseEntry).toBe(false);
    expect(f.approveButtons).toBe(1);
    expect(f.rejectButtons).toBe(1);
    expect(f.selectButtons).toBe(0);
    expect(f.retryButtons).toBe(0);
    expect(f.cancelButtons).toBe(0);
    expect(f.failButtons).toBe(0);
    expect(f.jobRows).toBe(0);
    // P1-B cross-check: the file picker REALLY renders on keyframes, is the one
    // and only unmapped control, and is not smuggled in as a text input.
    expect(f.fileInputPresent).toBe(true);
    expect(MV_REVIEW_UNMAPPED_CONTROLS).toHaveLength(1);
    expect(MV_REVIEW_UNMAPPED_CONTROLS[0].page).toBe('web/keyframes.html');
    expect(MV_REVIEW_UNMAPPED_CONTROLS[0].locator).toContain('#uploadFile');
    expect(MV_REVIEW_SPECS.every((s) => s.instanceId !== 'p5/candidate-file')).toBe(true);
    const handle = mountP5ShotDetail();
    try {
      const facts = observeP5ReviewControls(handle.container);
      expect(facts.approvePresent).toBe(true);
      expect(facts.rejectPresent).toBe(true);
      expect(facts.selectPresent).toBe(false);
      expect(facts.retryPresent).toBe(false);
      expect(facts.jobCancelPresent).toBe(false);
      expect(facts.jobFailPresent).toBe(false);
    } finally {
      handle.unmount();
    }
  });

  it('REAL P4 renders the review actions/draft fields and is non-modal; fixture matches', () => {
    const f = evidence.p4.facts;
    expect(f.hasDialogRole).toBe(false);
    expect(f.hasCloseEntry).toBe(false);
    expect(f.savePresent).toBe(true);
    expect(f.resetPresent).toBe(true);
    expect(f.makePromptPresent).toBe(true);
    expect(f.prevPresent).toBe(true);
    expect(f.nextPresent).toBe(true);
    expect(f.draftFieldIds).toEqual(['intent', 'notes', 'composition', 'generationPrompt', 'start', 'anchor']);
    const handle = mountP4ShotDetail();
    try {
      const facts = observeP4ReviewControls(handle.container);
      expect(facts.savePresent).toBe(true);
      expect(facts.resetPresent).toBe(true);
      expect(facts.makePromptPresent).toBe(true);
      expect(facts.fieldIds).toEqual(['intent', 'notes', 'composition', 'generationPrompt', 'start', 'anchor']);
      expect(facts.hasDialogRole).toBe(false);
    } finally {
      handle.unmount();
    }
  });
});

/* -------- Phase B multi-artifact drift guard (CI-hermetic) ---------- */

function cleanCurrentB(): MvCurrentUpstream {
  return {
    canvasBlob: PINNED_MV_CANVAS_BLOB,
    keyframesBlob: PINNED_MV_KEYFRAMES_BLOB,
    shotsBlob: PINNED_MV_SHOTS_BLOB,
    mvHead: PINNED_MV_HEAD,
  };
}

function cleanCombinedB(overrides: Record<string, unknown> = {}): { drift: Record<string, unknown> } {
  return {
    drift: {
      pinnedCanvasBlob: PINNED_MV_CANVAS_BLOB,
      pinnedKeyframesBlob: PINNED_MV_KEYFRAMES_BLOB,
      pinnedShotsBlob: PINNED_MV_SHOTS_BLOB,
      pinnedMvHead: PINNED_MV_HEAD,
      liveCanvasBlob: PINNED_MV_CANVAS_BLOB,
      liveKeyframesBlob: PINNED_MV_KEYFRAMES_BLOB,
      liveShotsBlob: PINNED_MV_SHOTS_BLOB,
      liveMvHead: PINNED_MV_HEAD,
      canvasBlobDrifted: false,
      keyframesBlobDrifted: false,
      shotsBlobDrifted: false,
      mvHeadDrifted: false,
      ...overrides,
    },
  };
}

describe('R1-04 Phase B — three-page upstream drift guard', () => {
  it('POSITIVE: all three page blobs + HEAD at the pins pass independently', () => {
    expect(assertEvidenceNotDrifted(cleanCombinedB(), cleanCurrentB())).toEqual({
      canvasBlobDrifted: false,
      keyframesBlobDrifted: false,
      shotsBlobDrifted: false,
      mvHeadDrifted: false,
    });
  });

  it('NEGATIVE: drift of ANY pinned page blob (canvas/keyframes/shots) blocks', () => {
    for (const key of ['canvasBlob', 'keyframesBlob', 'shotsBlob'] as const) {
      const current = { ...cleanCurrentB(), [key]: OTHER_BLOB };
      expect(() => assertEvidenceNotDrifted(cleanCombinedB(), current)).toThrow(/CURRENT upstream has moved/);
    }
  });

  it('NEGATIVE (stale evidence): stored record clean but keyframes/shots blob moved → block', () => {
    const current = { ...cleanCurrentB(), keyframesBlob: OTHER_BLOB };
    expect(() => assertEvidenceNotDrifted(cleanCombinedB(), current)).toThrow(/keyframes\.html blob/);
  });

  it('NEGATIVE: an unresolvable page blob (null) fails closed', () => {
    expect(() => assertEvidenceNotDrifted(cleanCombinedB(), { ...cleanCurrentB(), shotsBlob: null }))
      .toThrow(/independently resolve/);
  });

  it('NEGATIVE: a Phase B record missing one page pin is rejected as incomplete', () => {
    const combined = cleanCombinedB();
    delete (combined.drift as Record<string, unknown>)['pinnedShotsBlob'];
    expect(() => assertEvidenceNotDrifted(combined, cleanCurrentB())).toThrow(/A-Gate BLOCKED/);
  });

  it('legacy Phase A call shape (canvas+HEAD only) keeps its original behavior', () => {
    const current = { canvasBlob: PINNED_MV_CANVAS_BLOB, mvHead: PINNED_MV_HEAD };
    const combined = {
      drift: {
        pinnedCanvasBlob: PINNED_MV_CANVAS_BLOB,
        pinnedMvHead: PINNED_MV_HEAD,
        liveCanvasBlob: PINNED_MV_CANVAS_BLOB,
        liveMvHead: PINNED_MV_HEAD,
        canvasBlobDrifted: false,
        mvHeadDrifted: false,
      },
    };
    expect(assertEvidenceNotDrifted(combined, current)).toEqual({
      canvasBlobDrifted: false,
      mvHeadDrifted: false,
    });
    expect(() => assertEvidenceNotDrifted(combined, { canvasBlob: OTHER_BLOB, mvHead: PINNED_MV_HEAD }))
      .toThrow(/canvas\.html blob/);
  });
});

describe('R1-04 Phase B — real upstream pins are consistent with the live MV checkout', () => {
  // Read-only real git check; skipped automatically if the MV repo is absent.
  const live = readMvCurrentUpstream();
  const hasRepo = live.mvHead !== null;
  it.skipIf(!hasRepo)('live MV HEAD and the three pinned page blobs match (no drift at handoff)', () => {
    expect(live.mvHead).toBe(PINNED_MV_HEAD);
    expect(live.canvasBlob).toBe(PINNED_MV_CANVAS_BLOB);
    expect(live.keyframesBlob).toBe(PINNED_MV_KEYFRAMES_BLOB);
    expect(live.shotsBlob).toBe(PINNED_MV_SHOTS_BLOB);
    expect(MV_REVIEW_BUTTON_UPSTREAM.artifacts.map((a) => a.contentHash).sort())
      .toEqual([PINNED_MV_CANVAS_BLOB, PINNED_MV_KEYFRAMES_BLOB, PINNED_MV_SHOTS_BLOB].sort());
  });
});
