// @vitest-environment jsdom
/**
 * R1-04 (#70) Phase A — deterministic integration over the REAL MV-Auto-Editor
 * asset edit & approval panel.
 *
 * The eight frozen validator anchors are exercised against the MV integration:
 * real Project Profile → real Project AI View → explicit instance registry →
 * jsdom rendered/interaction evidence SEALED into TrustedEvidence → bounded
 * validator. No model, no network, no source scanning.
 */
import { describe, expect, it } from 'vitest';
import { validateProfile } from '@future-ui/shadcn-adapter';
import { importableModule } from '@future-ui/ai-contract-core';
import {
  buildMvProjectView,
  createMvProjectContext,
  registerMvAssetEditInstance,
  registerRealMvAssetInstances,
  validateMvProject,
  sealProjectEvidence,
  mountMvAssetPanel,
  collectMvPanelRenderedEvidence,
  observeMvAssetControls,
  mvAutoEditorProfile,
  MV_UPSTREAM,
  PINNED_MV_CANVAS_BLOB,
  REAL_MV_ASSET_CARDS,
  identityRefFor,
  capabilitiesForInstance,
  executeProjectTool,
} from '../src/index.js';

const INSTANCE_ID = 'assets/cards/character-f8cb8312/edit';

function renderedEvidence(scope: ParentNode = document.body) {
  return sealProjectEvidence({ rendered: { [INSTANCE_ID]: collectMvPanelRenderedEvidence(scope) } });
}

describe('R1-04 Phase A — MV-Auto-Editor real Project Profile & AI View', () => {
  it('profile is a valid D16 Project Profile with real identity and conventions', () => {
    const diagnostics = validateProfile(mvAutoEditorProfile);
    expect(diagnostics).toEqual([]);
    expect(mvAutoEditorProfile.identity.profileId).toBe('mv-auto-editor');
    expect(mvAutoEditorProfile.identity.profileVersion).toBe('1.0.0');
    // real conventions pinned from canvas.html
    expect(mvAutoEditorProfile.dialogConventions.pendingBlocksResubmit).toBe(true);
    expect(mvAutoEditorProfile.dialogConventions.pendingCloseIsConfirmedNeverSilent).toBe(false);
    expect(mvAutoEditorProfile.dialogConventions.focusEnterAndRestore).toBe(false);
    expect(mvAutoEditorProfile.dialogConventions.explicitCloseEntries).toEqual(['cancel-action']);
  });

  it('the gate pin constant is the SAME canvas blob as MV_UPSTREAM.sourceCommit (no divergent pins)', () => {
    // The independent gate reads MV_UPSTREAM-adapted canvas.html; its pinned
    // blob must be one single identity value.
    expect(PINNED_MV_CANVAS_BLOB).toBe(MV_UPSTREAM.sourceCommit);
  });

  it('builds three definitions from pinned MV facts; all partial with REAL limits', () => {
    const built = buildMvProjectView();
    expect(built.diagnostics).toEqual([]);
    const view = built.view!;
    expect(view.generatedFrom.kind).toBe('project-ai-view');
    const types = view.definitions.map((d) => d.componentType).sort();
    expect(types).toEqual(['future-ui.button', 'future-ui.dialog', 'future-ui.text-input']);
    const dialog = view.definitions.find((d) => d.componentType === 'future-ui.dialog')!;
    expect(dialog.mappingStatus).toBe('partial');
    // identity anchors are the frozen adapter/profile/upstream facts
    expect(dialog.identity.adapterId).toBe('shadcn-react');
    expect(dialog.identity.profileId).toBe('mv-auto-editor');
    // The asset editor is a NON-importable, page-owned inline source: it must
    // be recorded honestly and never expose an `import` (P2 contract gap).
    expect(dialog.source.kind).toBe('inline-source');
    if (dialog.source.kind !== 'inline-source') throw new Error('narrow');
    expect(dialog.source.locator).toBe('web/canvas.html');
    expect(dialog.source.symbols).toContain('simpleAssetEditor');
    expect(importableModule(dialog.source)).toBeNull();
    expect(dialog.source.example).toContain('simpleAssetEditor');
    // limits come from REAL MV members, not hand-typed guesses
    const members = dialog.limits.map((l) => l.member);
    expect(members).toContain('accessibility.role');
    expect(members).toContain('close.visibility');
    expect(view.definitions.find((d) => d.componentType === 'future-ui.button')!.limits.some(
      (l) => l.member === 'features.loading')).toBe(true);
    expect(view.definitions.find((d) => d.componentType === 'future-ui.text-input')!.limits.some(
      (l) => l.member === 'features.validation')).toBe(true);
  });
});

describe('R1-04 Phase A — positive cases over the real MV asset panel', () => {
  it('embedded layout: explicit close entry rendered → R1-DLG-02 pass (rendered)', () => {
    const ctx = createMvProjectContext();
    registerMvAssetEditInstance(ctx, REAL_MV_ASSET_CARDS[0]);
    const handle = mountMvAssetPanel({ closeVisible: true });
    try {
      const report = validateMvProject(ctx, renderedEvidence());
      const close = report.findings.find((f) => f.ruleId === 'R1-DLG-02')!;
      expect(close.status).toBe('pass');
      expect(close.tier).toBe('rendered');
      expect(close.actual).toEqual({ closeAffordances: ['/inspector/button[#closeInspector]'] });
    } finally {
      handle.unmount();
    }
  });

  it('pending control states are RENDERED facts only; R1-DLG-04/05 stay not-covered (no faked interaction)', () => {
    // --- Real RENDERED facts observed from the fixture mirroring canvas.html ---
    const running = mountMvAssetPanel({ running: true });
    try {
      const facts = observeMvAssetControls(running.container);
      // RENDERED FACT (a different fact from R1-DLG-04): while a job runs the
      // generate control is disabled. A disabled attribute is a render state,
      // NOT proof that a duplicate REAL start handler is a guarded no-op.
      expect(facts.generateDisabled).toBe(true);
      expect(facts.stopPresent).toBe(true);
    } finally {
      running.unmount();
    }
    const canceling = mountMvAssetPanel({ running: true, canceling: true });
    try {
      // RENDERED FACT (a different fact from R1-DLG-05): once stop is requested
      // the stop control renders disabled — the page's "stop generation" is
      // single-shot. MV has no close-callback generation/session lifecycle, so
      // this is NOT R1-DLG-05's "old task settle cannot re-fire close".
      expect(observeMvAssetControls(canceling.container).stopDisabled).toBe(true);
    } finally {
      canceling.unmount();
    }

    // --- Through the frozen validator those facts never reach interaction tier ---
    // No InteractionEvidence is sealed (there is no real handler to drive
    // hermetically), so R1-DLG-04/05 are not-covered for MV.
    const ctx = createMvProjectContext();
    registerMvAssetEditInstance(ctx, REAL_MV_ASSET_CARDS[0]);
    const panel = mountMvAssetPanel({ running: true });
    try {
      const report = validateMvProject(ctx, renderedEvidence(panel.container));
      for (const ruleId of ['R1-DLG-04', 'R1-DLG-05']) {
        const finding = report.findings.find((f) => f.ruleId === ruleId)!;
        expect(finding.status).toBe('not-covered');
        expect(finding.tier).not.toBe('interaction-verified');
      }
    } finally {
      panel.unmount();
    }
  });

  it('visible-state: draft prompt/description are withheld by the allowlist', () => {
    const ctx = createMvProjectContext();
    registerMvAssetEditInstance(ctx, REAL_MV_ASSET_CARDS[0]);
    const snap = ctx.registry.projectVisibleState(INSTANCE_ID, {
      open: true,
      selectedVersionId: 'v3',
      lockedVersionId: null,
      status: 'approved',
      prompt: '草稿提示词',
      description: '草稿设定',
    });
    expect(snap.projected).toEqual({ open: true, selectedVersionId: 'v3', lockedVersionId: null, status: 'approved' });
    expect(snap.withheld).toContain('prompt');
    expect(snap.withheld).toContain('description');
  });

  it('identity: all four real cards pass R1-PRJ-IDENTITY; zero business tools generated', () => {
    const ctx = createMvProjectContext();
    registerRealMvAssetInstances(ctx);
    expect(ctx.registry.size).toBe(4);
    const report = validateMvProject(ctx, undefined);
    const identity = report.findings.filter((f) => f.ruleId === 'R1-PRJ-IDENTITY');
    expect(identity).toHaveLength(4);
    expect(identity.every((f) => f.status === 'pass')).toBe(true);
    for (const card of REAL_MV_ASSET_CARDS) {
      expect(capabilitiesForInstance(ctx.view, `assets/cards/${card.cardId}/edit`)).toEqual([]);
    }
    const cap = report.findings.filter((f) => f.ruleId === 'R1-PRJ-CAPABILITY');
    expect(cap.every((f) => f.status === 'pass')).toBe(true);
    expect(cap[0].actual).toEqual({ generatedBusinessTools: [] });
  });
});

describe('R1-04 Phase A — negative cases fail or are not-covered', () => {
  it('REAL desktop layout: close entry is CSS-hidden → R1-DLG-02 fail with full diagnostics', () => {
    const ctx = createMvProjectContext();
    registerMvAssetEditInstance(ctx, REAL_MV_ASSET_CARDS[0]);
    const handle = mountMvAssetPanel(); // desktop default: display:none
    try {
      const report = validateMvProject(ctx, renderedEvidence());
      const close = report.findings.find((f) => f.ruleId === 'R1-DLG-02')!;
      expect(close.status).toBe('fail');
      expect(close.tier).toBe('rendered');
      expect(close.instanceId).toBe(INSTANCE_ID);
      expect(close.path).toBe('/inspector[0]');
      expect(close.reason).toContain('no explicit close entry');
      expect(close.repairHint).toContain('close control');
    } finally {
      handle.unmount();
    }
  });

  it('removing the close control fails with ruleId+instanceId/path+reason+repairHint', () => {
    const ctx = createMvProjectContext();
    registerMvAssetEditInstance(ctx, REAL_MV_ASSET_CARDS[0]);
    const handle = mountMvAssetPanel({ closeVisible: true });
    try {
      handle.container.querySelector('#closeInspector')?.remove();
      const report = validateMvProject(ctx, renderedEvidence(handle.container));
      const close = report.findings.find((f) => f.ruleId === 'R1-DLG-02')!;
      expect(close.status).toBe('fail');
      expect(close.instanceId).toBe(INSTANCE_ID);
      expect(close.path).toBe('/inspector[0]');
      expect(close.reason).toContain('no explicit close entry');
      expect(close.repairHint).toContain('close control');
    } finally {
      handle.unmount();
    }
  });

  it('wrong blocking: declared-blocking instance still renders an ordinary close entry → fail', () => {
    const ctx = createMvProjectContext();
    registerMvAssetEditInstance(ctx, REAL_MV_ASSET_CARDS[0], { blocking: true });
    const handle = mountMvAssetPanel({ closeVisible: true }); // ordinary close present
    try {
      const report = validateMvProject(ctx, renderedEvidence());
      const close = report.findings.find((f) => f.ruleId === 'R1-DLG-02')!;
      expect(close.status).toBe('fail');
      expect(close.tier).toBe('rendered');
      expect(close.reason).toContain('declared-blocking dialog still renders an ordinary close entry');
    } finally {
      handle.unmount();
    }
  });

  it('declared-only blocking is NOT a pass: no rendered evidence → not-covered', () => {
    const ctx = createMvProjectContext();
    registerMvAssetEditInstance(ctx, REAL_MV_ASSET_CARDS[0], { blocking: true });
    const report = validateMvProject(ctx, undefined);
    expect(report.findings.find((f) => f.ruleId === 'R1-DLG-02')!).toMatchObject({
      status: 'not-covered',
      tier: 'declared',
    });
  });

  it('identity drift on adapter/profile/upstream fails closed at registration', () => {
    const ctx = createMvProjectContext();
    const def = ctx.view.definitions.find((d) => d.componentType === 'future-ui.dialog')!;
    const base = identityRefFor(def.identity);

    const adapterDrift = ctx.registry.register({
      instanceId: 'drift-dialog',
      componentType: 'future-ui.dialog',
      scopeId: 'canvas/asset-edit',
      identityRef: { ...base, adapterId: 'ark-react' },
      metadata: { path: 'p' },
      visibleState: { allow: [], sensitive: [] },
    });
    const diag = adapterDrift.diagnostics.find((d) => d.code === 'r1_project_identity_mismatch')!;
    expect(diag.path).toContain('identityRef/adapterId');
    expect(diag.actual).toBe('ark-react');
    expect(diag.expected).toBe('shadcn-react');
    expect(ctx.registry.get('drift-dialog')).toBeUndefined();

    const profileDrift = ctx.registry.register({
      instanceId: 'profile-drift',
      componentType: 'future-ui.dialog',
      scopeId: 'canvas/asset-edit',
      identityRef: { ...base, profileVersion: '9.9.9' },
      metadata: { path: 'p' },
      visibleState: { allow: [], sensitive: [] },
    });
    expect(profileDrift.diagnostics.some(
      (d) => d.code === 'r1_project_identity_mismatch' && d.path.includes('profileVersion'))).toBe(true);

    const upstreamDrift = ctx.registry.register({
      instanceId: 'upstream-drift',
      componentType: 'future-ui.dialog',
      scopeId: 'canvas/asset-edit',
      identityRef: { ...base, upstreamFingerprint: 'deadbeef' },
      metadata: { path: 'p' },
      visibleState: { allow: [], sensitive: [] },
    });
    expect(upstreamDrift.diagnostics.some(
      (d) => d.code === 'r1_project_identity_mismatch' && d.path.includes('upstreamFingerprint'))).toBe(true);
  });

  it('unregister/scope cleanup makes the instance disappear (not-covered)', () => {
    const ctx = createMvProjectContext();
    registerMvAssetEditInstance(ctx, REAL_MV_ASSET_CARDS[0]);
    expect(ctx.registry.size).toBe(1);
    expect(ctx.registry.unregister(INSTANCE_ID)).toEqual([]);
    expect(ctx.registry.query()).toEqual([]);
    const report = validateMvProject(ctx, undefined, 'canvas/asset-edit');
    expect(report.coverage.find((c) => c.scopeId === 'canvas/asset-edit')!.coverage).toBe('not-covered');
  });
});

describe('R1-04 #70 round 2 (P2) — inline page source is never offered as an import', () => {
  it('project.catalog / describeComponent expose kind=inline-source and import=null for every MV component', () => {
    const ctx = createMvProjectContext();
    registerRealMvAssetInstances(ctx);

    type CatalogRow = {
      componentType: string;
      source: { kind: string };
      import: { module: string; exports: string[] } | null;
    };
    const catalog = executeProjectTool(ctx, 'project.catalog', {});
    if (!catalog.ok) throw new Error(`catalog failed: ${JSON.stringify(catalog.error)}`);
    const rows = (catalog.data as { components: CatalogRow[] }).components;
    expect(rows.map((r) => r.componentType).sort()).toEqual([
      'future-ui.button',
      'future-ui.dialog',
      'future-ui.text-input',
    ]);
    for (const row of rows) {
      expect(row.source.kind).toBe('inline-source');
      // The AI-facing surface MUST NOT turn an inline page source into an import.
      expect(row.import).toBeNull();
    }

    const described = executeProjectTool(ctx, 'project.describeComponent', { componentType: 'future-ui.dialog' });
    if (!described.ok) throw new Error(`describe failed: ${JSON.stringify(described.error)}`);
    const def = described.data as { source: { kind: string }; import: unknown };
    expect(def.source.kind).toBe('inline-source');
    expect(def.import).toBeNull();
  });
});
