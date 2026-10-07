// @vitest-environment jsdom
/**
 * R1-03 (#69) Phase E — dev-only, READ-ONLY MCP thin projection.
 *
 * Verifies the tool surface is frozen and minimal, strictly read-only (no
 * register/update/unregister/edit/shell/exec/business-invocation tool), never
 * leaks draft/sensitive state, and never mutates the registry.
 */
import './setup.js';
import { describe, expect, it } from 'vitest';
import {
  FROZEN_PROJECT_TOOL_NAMES,
  PROJECT_TOOL_DESCRIPTORS,
  executeProjectTool,
  createEditDialogProjectContext,
  registerEditDialogInstance,
  sealProjectEvidence,
} from '../src/index.js';

function ctxWithInstance() {
  const ctx = createEditDialogProjectContext();
  registerEditDialogInstance(ctx);
  return ctx;
}

describe('R1-03 Phase E — frozen read-only MCP projection', () => {
  it('freezes exactly five read-only tools', () => {
    expect([...FROZEN_PROJECT_TOOL_NAMES]).toEqual([
      'project.catalog',
      'project.describeComponent',
      'project.listInstances',
      'project.describeInstance',
      'project.validate',
    ]);
    expect(PROJECT_TOOL_DESCRIPTORS).toHaveLength(5);
    for (const d of PROJECT_TOOL_DESCRIPTORS) {
      expect(d.readOnly).toBe(true);
      expect(FROZEN_PROJECT_TOOL_NAMES).toContain(d.name);
    }
  });

  it('rejects mutation/edit/shell/exec/business tools (they do not exist)', () => {
    const ctx = ctxWithInstance();
    for (const forbidden of [
      'project.register',
      'project.unregister',
      'file.edit',
      'shell.exec',
      'capability.invoke',
      'project.catalog.invoke',
    ]) {
      const res = executeProjectTool(ctx, forbidden, {});
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.code).toBe('project_tool_unknown');
    }
  });

  it('catalog returns real components, mapping status and zero explicit capabilities by default', () => {
    const ctx = ctxWithInstance();
    const res = executeProjectTool(ctx, 'project.catalog', {});
    expect(res.ok).toBe(true);
    if (res.ok) {
      const data = res.data as {
        components: Array<{ componentType: string; mappingStatus: string; limitMembers: string[] }>;
        explicitCapabilities: string[];
      };
      expect(data.components.map((c) => c.componentType).sort()).toEqual([
        'future-ui.button',
        'future-ui.dialog',
        'future-ui.text-input',
      ]);
      expect(data.components.find((c) => c.componentType === 'future-ui.dialog')!.mappingStatus).toBe('supported');
      expect(data.explicitCapabilities).toEqual([]);
    }
  });

  it('describeComponent returns the definition or a structured not-found / arg error', () => {
    const ctx = ctxWithInstance();
    const ok = executeProjectTool(ctx, 'project.describeComponent', { componentType: 'future-ui.dialog' });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect((ok.data as { identity: { adapterId: string } }).identity.adapterId).toBe('shadcn-react');

    const missing = executeProjectTool(ctx, 'project.describeComponent', { componentType: 'future-ui.select' });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.error.code).toBe('project_tool_not_found');

    const badArg = executeProjectTool(ctx, 'project.describeComponent', {});
    expect(badArg.ok).toBe(false);
    if (!badArg.ok) expect(badArg.error.code).toBe('project_tool_arg_invalid');
  });

  it('lists/describes only explicit instances with safe metadata (never draft/sensitive values)', () => {
    const ctx = ctxWithInstance();
    const list = executeProjectTool(ctx, 'project.listInstances', {});
    expect(list.ok).toBe(true);
    if (list.ok) {
      const rows = (list.data as { instances: Array<Record<string, unknown>> }).instances;
      expect(rows).toHaveLength(1);
      expect(rows[0]!['instanceId']).toBe('members/edit-dialog');
      expect(rows[0]).not.toHaveProperty('fields');
      expect(rows[0]).not.toHaveProperty('draft');
      expect(rows[0]).not.toHaveProperty('rawState');
    }

    const one = executeProjectTool(ctx, 'project.describeInstance', { instanceId: 'members/edit-dialog' });
    expect(one.ok).toBe(true);
    if (one.ok) {
      const data = one.data as { coverage: string; boundCapabilities: string[]; visibleState: { sensitiveKeys: string[] } };
      expect(data.coverage).toBe('covered');
      expect(data.boundCapabilities).toEqual([]);
      expect(data.visibleState.sensitiveKeys).toContain('ssn');
    }

    const missing = executeProjectTool(ctx, 'project.describeInstance', { instanceId: 'ghost' });
    expect(missing.ok).toBe(false);
  });

  it('validate is read-only: with NO host evidence rendered/interaction rules are not-covered', () => {
    const ctx = ctxWithInstance();
    const before = ctx.registry.size;
    const res = executeProjectTool(ctx, 'project.validate', {});
    expect(res.ok).toBe(true);
    if (res.ok) {
      const report = res.data as {
        findings: Array<{ ruleId: string; status: string; tier: string }>;
      };
      expect(report.findings.find((f) => f.ruleId === 'R1-DLG-02')!.status).toBe('not-covered');
      expect(report.findings.find((f) => f.ruleId === 'R1-DLG-05')!.status).toBe('not-covered');
    }
    expect(ctx.registry.size).toBe(before);
  });

  it('B4: rejects caller-supplied evidence (rendered/interaction) and cannot be forged to pass', () => {
    const ctx = ctxWithInstance();
    for (const forged of [
      { evidence: { interaction: { x: { pendingDuplicateSubmitBlocked: true, stopWaitNoSecondClose: true } } } },
      { rendered: { 'members/edit-dialog': { rootPath: '/d', closeAffordances: ['x'] } } },
      { interaction: { 'members/edit-dialog': { pendingDuplicateSubmitBlocked: true, stopWaitNoSecondClose: true } } },
    ]) {
      const res = executeProjectTool(ctx, 'project.validate', forged);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.code).toBe('project_tool_arg_invalid');
    }
  });

  it('B4: HOST-injected TrustedEvidence can elevate rendered/interaction findings to pass', () => {
    const ctx = ctxWithInstance();
    // Only the dev host (next to the controlled jsdom driver) can seal and
    // inject evidence; simulate that host injection here.
    ctx.evidence = sealProjectEvidence({
      rendered: {
        'members/edit-dialog': { rootPath: '/dialog[0]', closeAffordances: ['/dialog[0]/button[cancel]'] },
      },
      interaction: {
        'members/edit-dialog': { pendingDuplicateSubmitBlocked: true, stopWaitNoSecondClose: true },
      },
    });
    const res = executeProjectTool(ctx, 'project.validate', {});
    expect(res.ok).toBe(true);
    if (res.ok) {
      const report = res.data as { findings: Array<{ ruleId: string; status: string; tier: string }> };
      expect(report.findings.find((f) => f.ruleId === 'R1-DLG-02')!).toMatchObject({
        status: 'pass',
        tier: 'rendered',
      });
      expect(report.findings.find((f) => f.ruleId === 'R1-DLG-04')!).toMatchObject({
        status: 'pass',
        tier: 'interaction-verified',
      });
      expect(report.findings.find((f) => f.ruleId === 'R1-DLG-05')!).toMatchObject({
        status: 'pass',
        tier: 'interaction-verified',
      });
    }
  });
});
