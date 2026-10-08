// @vitest-environment jsdom
/**
 * R1-03 (#69) Phase D — deterministic integration over the REAL shadcn
 * EditDialog. The eight frozen Phase C acceptance anchors are exercised
 * end-to-end: real descriptor → explicit registry → jsdom rendered/interaction
 * evidence SEALED into TrustedEvidence → bounded validator. No model, no
 * network, no source scanning.
 */
import './setup.js';
import { describe, expect, it } from 'vitest';
import {
  buildShadcnProjectView,
  createEditDialogProjectContext,
  registerEditDialogInstance,
  validateEditDialogProject,
  sealProjectEvidence,
  identityRefFor,
  capabilitiesForInstance,
  mountEditDialog,
  collectRenderedEvidence,
  drivePendingInteraction,
} from '../src/index.js';
import { importableModule, type ComponentDefinition, type ModuleImportSource } from '@future-ui/ai-contract-core';

const INSTANCE_ID = 'members/edit-dialog';

/** Narrow a component source to the importable module kind or fail the test. */
function moduleSource(def: ComponentDefinition): ModuleImportSource {
  if (def.source.kind !== 'module-import') throw new Error(`expected module-import source, got ${def.source.kind}`);
  return def.source;
}

function renderedEvidence(scope: ParentNode = document.body) {
  return sealProjectEvidence({ rendered: { [INSTANCE_ID]: collectRenderedEvidence(scope) } });
}

describe('R1-03 Phase D — real shadcn descriptor', () => {
  it('builds three definitions from frozen facts; Dialog supported, Button/TextInput partial', () => {
    const built = buildShadcnProjectView();
    expect(built.diagnostics).toEqual([]);
    const view = built.view!;
    expect(view.generatedFrom.kind).toBe('project-ai-view');
    const types = view.definitions.map((d) => d.componentType).sort();
    expect(types).toEqual(['future-ui.button', 'future-ui.dialog', 'future-ui.text-input']);
    const byType = new Map(view.definitions.map((d) => [d.componentType, d]));
    expect(byType.get('future-ui.dialog')!.mappingStatus).toBe('supported');
    expect(byType.get('future-ui.button')!.mappingStatus).toBe('partial');
    expect(byType.get('future-ui.text-input')!.mappingStatus).toBe('partial');
    // limits are derived from REAL member conclusions, not hand-typed
    expect(byType.get('future-ui.button')!.limits.some((l) => l.member === 'features.loading')).toBe(true);
    expect(byType.get('future-ui.text-input')!.limits.some((l) => l.member === 'accessibility.role')).toBe(true);
    // identity anchors are the frozen shadcn/profile facts
    const dialog = byType.get('future-ui.dialog')!;
    expect(dialog.identity.adapterId).toBe('shadcn-react');
    expect(dialog.identity.profileId).toBe('r1-edit-dialog-reference');
    expect(dialog.source.kind).toBe('module-import');
    expect(importableModule(dialog.source)?.exports).toContain('EditDialog');
  });

  it('B5: all component examples match the real public API (no boolean/pseudocode examples)', () => {
    const view = buildShadcnProjectView().view!;
    const dialogSrc = moduleSource(view.definitions.find((d) => d.componentType === 'future-ui.dialog')!);
    expect(dialogSrc.example).toContain('onOpenChange={({ open: next }) => setOpen(next)}');
    expect(dialogSrc.example).not.toContain('onOpenChange={setOpen}');
    expect(dialogSrc.example).toContain('onSave={async (values) => { await saveMember(values); }}');
    const buttonSrc = moduleSource(view.definitions.find((d) => d.componentType === 'future-ui.button')!);
    expect(buttonSrc.example).toContain('onClick={(event) => handleClick(event)}');
    const textSrc = moduleSource(view.definitions.find((d) => d.componentType === 'future-ui.text-input')!);
    expect(textSrc.example).toContain('onValueChange={(event) => setEmail(event.value)}');
  });
});

describe('R1-03 Phase C anchors over the real EditDialog', () => {
  it('anchor 1: a normal EditDialog renders an explicit close entry → R1-DLG-02 pass (rendered)', () => {
    const ctx = createEditDialogProjectContext();
    registerEditDialogInstance(ctx);
    const handle = mountEditDialog();
    try {
      const evidence = renderedEvidence();
      const report = validateEditDialogProject(ctx, evidence);
      const close = report.findings.find((f) => f.ruleId === 'R1-DLG-02')!;
      expect(close.status).toBe('pass');
      expect(close.tier).toBe('rendered');
      // aria-modal is set by the composition and observed in the real render
      const rendered = Object.values(evidence.rendered)[0];
      expect(rendered.ariaModal).toBe(true);
      expect(rendered.role).toBe('dialog');
    } finally {
      handle.unmount();
    }
  });

  it('anchor 2: removing the close entry fails with ruleId+instanceId/path+reason+repairHint', () => {
    const ctx = createEditDialogProjectContext();
    registerEditDialogInstance(ctx);
    // A controlled broken fixture: a dialog with NO reachable close control.
    const broken = document.createElement('div');
    const dlg = document.createElement('div');
    dlg.setAttribute('role', 'dialog');
    dlg.setAttribute('aria-modal', 'true');
    broken.appendChild(dlg);
    document.body.appendChild(broken);
    try {
      const report = validateEditDialogProject(ctx, renderedEvidence(broken));
      const close = report.findings.find((f) => f.ruleId === 'R1-DLG-02')!;
      expect(close.status).toBe('fail');
      expect(close.instanceId).toBe(INSTANCE_ID);
      expect(close.path).toBe('/dialog[0]');
      expect(close.reason).toContain('no explicit close entry');
      expect(close.repairHint).toContain('close control');
    } finally {
      broken.remove();
    }
  });

  it('anchor 3: blocking variant verified RENDERED — ordinary entries removed, resolution path present', () => {
    const ctx = createEditDialogProjectContext();
    registerEditDialogInstance(ctx, { blocking: true });
    const handle = mountEditDialog({ blocking: true });
    try {
      // Ordinary entries (X + cancel) are removed; save/discard are LIMITED
      // resolution paths, not ordinary close entries.
      const observed = collectRenderedEvidence(document.body);
      expect(observed.closeAffordances.some((p) => p.includes('dialog-close'))).toBe(false);
      expect(observed.closeAffordances.some((p) => p.includes('edit-dialog-cancel'))).toBe(false);
      expect(observed.closeAffordances.some((p) => p.includes('edit-dialog-discard'))).toBe(false);
      expect(observed.resolutionAffordances?.some((p) => p.includes('edit-dialog-save'))).toBe(true);
      expect(observed.resolutionAffordances?.some((p) => p.includes('edit-dialog-discard'))).toBe(true);

      // declared-only (no render) is NOT a pass: must be not-covered
      const declaredOnly = validateEditDialogProject(ctx, undefined);
      expect(declaredOnly.findings.find((f) => f.ruleId === 'R1-DLG-02')!).toMatchObject({
        status: 'not-covered',
        tier: 'declared',
      });

      const report = validateEditDialogProject(ctx, renderedEvidence(document.body));
      const close = report.findings.find((f) => f.ruleId === 'R1-DLG-02')!;
      expect(close.status).toBe('pass');
      expect(close.tier).toBe('rendered');
    } finally {
      handle.unmount();
    }
  });

  it('anchor 4: pending duplicate-submit + stop-wait/reopen proven by sealed interaction evidence', async () => {
    const ctx = createEditDialogProjectContext();
    registerEditDialogInstance(ctx);
    const observed = await drivePendingInteraction();
    expect(observed.pendingDuplicateSubmitBlocked).toBe(true);
    expect(observed.stopWaitNoSecondClose).toBe(true);
    expect(observed.reopenGenerationSafe).toBe(true);
    const evidence = sealProjectEvidence({ interaction: { [INSTANCE_ID]: observed } });
    const report = validateEditDialogProject(ctx, evidence);
    expect(report.findings.find((f) => f.ruleId === 'R1-DLG-04')!).toMatchObject({
      status: 'pass',
      tier: 'interaction-verified',
    });
    expect(report.findings.find((f) => f.ruleId === 'R1-DLG-05')!).toMatchObject({
      status: 'pass',
      tier: 'interaction-verified',
    });
  });

  it('anchor 5: adapter/profile/upstream identity drift is diagnosed (registration fails closed)', () => {
    const ctx = createEditDialogProjectContext();
    const def = ctx.view.definitions.find((d) => d.componentType === 'future-ui.dialog')!;
    const base = identityRefFor(def.identity);

    // adapter id drift
    const adapterDrift = ctx.registry.register({
      instanceId: 'drift-dialog',
      componentType: 'future-ui.dialog',
      scopeId: 'members/edit',
      identityRef: { ...base, adapterId: 'ark-react' },
      metadata: { path: 'p' },
      visibleState: { allow: [], sensitive: [] },
    });
    const diag = adapterDrift.diagnostics.find((d) => d.code === 'r1_project_identity_mismatch')!;
    expect(diag.path).toContain('identityRef/adapterId');
    expect(diag.actual).toBe('ark-react');
    expect(diag.expected).toBe('shadcn-react');
    expect(ctx.registry.get('drift-dialog')).toBeUndefined();
    expect(ctx.registry.query().some((i) => i.instanceId === 'drift-dialog')).toBe(false);

    // profile version drift on an update fails via the validator/registry too
    registerEditDialogInstance(ctx, { instanceId: 'ok-dialog' });
    const prof = ctx.registry.update('ok-dialog', {
      identityRef: { ...base, profileVersion: '9.9.9' },
    });
    expect(prof.diagnostics.some((d) => d.code === 'r1_project_identity_mismatch' && d.path.includes('profileVersion'))).toBe(true);

    // upstream fingerprint drift is detected independently
    const upstream = ctx.registry.register({
      instanceId: 'upstream-dialog',
      componentType: 'future-ui.dialog',
      scopeId: 'members/edit',
      identityRef: { ...base, upstreamFingerprint: 'deadbeef' },
      metadata: { path: 'p' },
      visibleState: { allow: [], sensitive: [] },
    });
    expect(upstream.diagnostics.some((d) => d.code === 'r1_project_identity_mismatch' && d.path.includes('upstreamFingerprint'))).toBe(true);
  });

  it('anchor 6: unregister/scope cleanup makes the instance disappear (not-covered)', () => {
    const ctx = createEditDialogProjectContext();
    registerEditDialogInstance(ctx);
    expect(ctx.registry.size).toBe(1);
    expect(ctx.registry.unregister(INSTANCE_ID)).toEqual([]);
    expect(ctx.registry.query()).toEqual([]);

    registerEditDialogInstance(ctx);
    const cleanup = ctx.registry.clearScope('members/edit');
    expect(cleanup.removedInstanceIds).toContain(INSTANCE_ID);
    const report = validateEditDialogProject(ctx, undefined, 'members/edit');
    expect(report.coverage.find((c) => c.scopeId === 'members/edit')!.coverage).toBe('not-covered');
  });

  it('anchor 7: draft/sensitive fields are not projected by default', () => {
    const ctx = createEditDialogProjectContext();
    registerEditDialogInstance(ctx);
    const snap = ctx.registry.projectVisibleState(INSTANCE_ID, {
      open: true,
      fields: { displayName: 'draft', ssn: '111' },
      ssn: '111',
    });
    expect(snap.projected).toEqual({ open: true });
    expect(snap.withheld).toContain('fields');
    expect(snap.withheld).toContain('ssn');
  });

  it('anchor 8: with no Capability/Binding, zero business tools are generated', () => {
    const built = buildShadcnProjectView();
    expect(built.view!.capabilities).toEqual([]);
    const ctx = createEditDialogProjectContext();
    registerEditDialogInstance(ctx);
    expect(capabilitiesForInstance(ctx.view, INSTANCE_ID)).toEqual([]);
    const report = validateEditDialogProject(ctx, undefined);
    const cap = report.findings.find((f) => f.ruleId === 'R1-PRJ-CAPABILITY')!;
    expect(cap.status).toBe('pass');
    expect(cap.actual).toEqual({ generatedBusinessTools: [] });
  });
});
