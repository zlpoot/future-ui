// @vitest-environment jsdom
/**
 * R1-03 (#69) Phase D — deterministic integration over the REAL shadcn
 * EditDialog. The eight frozen Phase C acceptance anchors are exercised
 * end-to-end: real descriptor → explicit registry → jsdom rendered/interaction
 * evidence → bounded validator. No model, no network, no source scanning.
 */
import './setup.js';
import { describe, expect, it } from 'vitest';
import {
  buildShadcnProjectView,
  createEditDialogProjectContext,
  registerEditDialogInstance,
  validateEditDialogProject,
  capabilitiesForInstance,
  mountEditDialog,
  collectRenderedEvidence,
  drivePendingInteraction,
} from '../src/index.js';

function evidenceFor() {
  return { rendered: { 'members/edit-dialog': collectRenderedEvidence(document.body) } };
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
    expect(dialog.actualImport.exports).toContain('EditDialog');
  });
});

describe('R1-03 Phase C anchors over the real EditDialog', () => {
  it('anchor 1: a normal EditDialog renders an explicit close entry → R1-DLG-02 pass (rendered)', () => {
    const ctx = createEditDialogProjectContext();
    registerEditDialogInstance(ctx);
    const handle = mountEditDialog();
    try {
      const evidence = evidenceFor();
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
      const report = validateEditDialogProject(ctx, {
        rendered: { 'members/edit-dialog': collectRenderedEvidence(broken) },
      });
      const close = report.findings.find((f) => f.ruleId === 'R1-DLG-02')!;
      expect(close.status).toBe('fail');
      expect(close.instanceId).toBe('members/edit-dialog');
      expect(close.path).toBe('/dialog[0]');
      expect(close.reason).toContain('no explicit close entry');
      expect(close.repairHint).toContain('close control');
    } finally {
      broken.remove();
    }
  });

  it('anchor 3: blocking fixture does not false-positive the close-entry rule', () => {
    const ctx = createEditDialogProjectContext();
    registerEditDialogInstance(ctx, { blocking: true });
    const handle = mountEditDialog({ blocking: true });
    try {
      // The ORDINARY close entries (X + cancel) are removed; the discard
      // resolution path is allowed to remain and is not an ordinary entry.
      const observed = collectRenderedEvidence(document.body);
      expect(observed.closeAffordances.some((p) => p.includes('dialog-close'))).toBe(false);
      expect(observed.closeAffordances.some((p) => p.includes('edit-dialog-cancel'))).toBe(false);
      expect(observed.closeAffordances.some((p) => p.includes('edit-dialog-discard'))).toBe(true);
      const report = validateEditDialogProject(ctx, { rendered: { 'members/edit-dialog': observed } });
      const close = report.findings.find((f) => f.ruleId === 'R1-DLG-02')!;
      expect(close.status).toBe('pass');
      expect(close.tier).toBe('declared');
    } finally {
      handle.unmount();
    }
  });

  it('anchor 4: pending duplicate-submit + stop-wait/reopen proven by interaction evidence', async () => {
    const ctx = createEditDialogProjectContext();
    registerEditDialogInstance(ctx);
    const observed = await drivePendingInteraction();
    expect(observed.pendingDuplicateSubmitBlocked).toBe(true);
    expect(observed.stopWaitNoSecondClose).toBe(true);
    expect(observed.reopenGenerationSafe).toBe(true);
    const report = validateEditDialogProject(ctx, { interaction: { 'members/edit-dialog': observed } });
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
    const drift = ctx.registry.register({
      instanceId: 'drift-dialog',
      componentType: 'future-ui.dialog',
      scopeId: 'members/edit',
      adapterId: 'ark-react',
      profileId: 'r1-edit-dialog-reference',
      metadata: { path: 'p' },
      visibleState: { allow: [], sensitive: [] },
    });
    // fail-closed: the drifted instance is diagnosed AND never registered
    const diag = drift.diagnostics.find((d) => d.code === 'r1_project_identity_mismatch')!;
    expect(diag.actual).toBe('ark-react');
    expect(diag.expected).toBe('shadcn-react');
    expect(ctx.registry.get('drift-dialog')).toBeUndefined();
    expect(ctx.registry.query().some((i) => i.instanceId === 'drift-dialog')).toBe(false);

    // a profile drift on a registered instance fails via the validator too
    registerEditDialogInstance(ctx, { instanceId: 'ok-dialog' });
    const prof = ctx.registry.update('ok-dialog', { profileId: 'other-profile' });
    expect(prof.diagnostics.some((d) => d.code === 'r1_project_identity_mismatch')).toBe(true);
  });

  it('anchor 6: unregister/scope cleanup makes the instance disappear (not-covered)', () => {
    const ctx = createEditDialogProjectContext();
    registerEditDialogInstance(ctx);
    expect(ctx.registry.size).toBe(1);
    expect(ctx.registry.unregister('members/edit-dialog')).toEqual([]);
    expect(ctx.registry.query()).toEqual([]);

    registerEditDialogInstance(ctx);
    const cleanup = ctx.registry.clearScope('members/edit');
    expect(cleanup.removedInstanceIds).toContain('members/edit-dialog');
    const report = validateEditDialogProject(ctx, {}, 'members/edit');
    expect(report.coverage.find((c) => c.scopeId === 'members/edit')!.coverage).toBe('not-covered');
  });

  it('anchor 7: draft/sensitive fields are not projected by default', () => {
    const ctx = createEditDialogProjectContext();
    registerEditDialogInstance(ctx);
    const snap = ctx.registry.projectVisibleState('members/edit-dialog', {
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
    expect(capabilitiesForInstance(ctx.view, 'members/edit-dialog')).toEqual([]);
    const report = validateEditDialogProject(ctx, {});
    const cap = report.findings.find((f) => f.ruleId === 'R1-PRJ-CAPABILITY')!;
    expect(cap.status).toBe('pass');
    expect(cap.actual).toEqual({ generatedBusinessTools: [] });
  });
});
