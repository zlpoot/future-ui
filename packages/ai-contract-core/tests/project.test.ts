// @vitest-environment node
/**
 * R1-03 (#69) Project AI View + explicit registry + bounded validator.
 *
 * Focuses on the pure deterministic guarantees: the view is NOT the schema
 * catalog; registration is explicit; visible state is allowlisted with
 * drafts/sensitive hidden by default; and the validator only concludes against
 * the required evidence tier (declared < rendered < interaction-verified),
 * emitting not-covered instead of a false pass.
 */
import { describe, expect, it } from 'vitest';
import {
  buildProjectView,
  queryComponents,
  describeComponent,
  capabilitiesForInstance,
  InstanceRegistry,
  validateProject,
  isKnownRule,
} from '../src/index.js';
import type { CapabilityReference, ComponentDefinition, InstanceRegistration, ProjectAIView } from '../src/index.js';

function definition(over: Partial<ComponentDefinition> = {}): ComponentDefinition {
  return {
    componentType: 'future-ui.dialog',
    contractVersion: '1.0.0',
    identity: {
      adapterId: 'shadcn-react',
      adapterVersion: '0.0.0',
      contractVersion: '1.0.0',
      profileId: 'r1-edit-dialog',
      profileVersion: '1.0.0',
      upstream: {
        library: 'shadcn/ui',
        base: 'radix-ui@1.7.0',
        sourceCommit: 'abc123',
        style: 'new-york-v4',
        runtimePackages: [{ name: 'radix-ui', version: '1.7.0' }],
      },
    },
    actualImport: { module: '@future-ui/shadcn-adapter', exports: ['EditDialog'], example: '<EditDialog/>' },
    mappingStatus: 'supported',
    limits: [],
    examples: [{ title: 'basic', code: '<EditDialog/>' }],
    ...over,
  };
}

function makeView(
  defs: ComponentDefinition[] = [definition()],
  capabilities: CapabilityReference[] = [],
): ProjectAIView {
  const result = buildProjectView({ projectName: 'r1-app', definitions: defs, capabilities });
  expect(result.diagnostics).toEqual([]);
  if (!result.view) throw new Error('view should build');
  return result.view;
}

function registration(over: Partial<InstanceRegistration> = {}): InstanceRegistration {
  return {
    instanceId: 'edit-member-dialog',
    componentType: 'future-ui.dialog',
    scopeId: 'members/edit',
    adapterId: 'shadcn-react',
    profileId: 'r1-edit-dialog',
    metadata: { path: 'members/EditMemberDialog' },
    visibleState: { allow: ['open'], sensitive: ['ssn'] },
    ...over,
  };
}

describe('Project AI View (Phase A)', () => {
  it('builds a project view distinguished from the schema catalog', () => {
    const view = makeView();
    expect(view.generatedFrom.kind).toBe('project-ai-view');
    expect(queryComponents(view, { componentType: 'future-ui.dialog' })).toHaveLength(1);
    expect(describeComponent(view, 'future-ui.dialog')?.actualImport.exports).toContain('EditDialog');
    expect(describeComponent(view, 'future-ui.button')).toBeUndefined();
  });

  it('rejects a partial component that lists no limiting members', () => {
    const result = buildProjectView({ projectName: 'x', definitions: [definition({ mappingStatus: 'partial', limits: [] })] });
    expect(result.view).toBeNull();
    expect(result.diagnostics.some((d) => d.code === 'r1_project_definition_invalid')).toBe(true);
  });

  it('rejects an unknown contract major and duplicate component types', () => {
    const badMajor = buildProjectView({ projectName: 'x', definitions: [definition({ contractVersion: '2.0.0' })] });
    expect(badMajor.view).toBeNull();
    const dup = buildProjectView({ projectName: 'x', definitions: [definition(), definition()] });
    expect(dup.diagnostics.some((d) => d.code === 'r1_project_definition_invalid' && d.path === '/definitions/future-ui.dialog')).toBe(true);
  });

  it('exposes capabilities only for explicit bindings (a rendered control is never a tool)', () => {
    const view = makeView(
      [definition()],
      [{ capabilityId: 'cart.add', boundInstanceId: 'edit-member-dialog', bindingSource: 'cart-binding' }],
    );
    expect(capabilitiesForInstance(view, 'edit-member-dialog')).toHaveLength(1);
    expect(capabilitiesForInstance(view, 'other-dialog')).toEqual([]);
  });
});

describe('explicit instance registry (Phase B)', () => {
  it('registers/queries and rejects duplicate or unknown-component instances', () => {
    const registry = new InstanceRegistry(makeView());
    expect(registry.register(registration()).diagnostics).toEqual([]);
    expect(registry.register(registration()).diagnostics[0]?.code).toBe('r1_project_instance_duplicate');
    const unknown = registry.register(registration({ instanceId: 'x', componentType: 'future-ui.text-input' }));
    expect(unknown.diagnostics.some((d) => d.code === 'r1_project_definition_invalid')).toBe(true);
    expect(registry.query({ scopeId: 'members/edit' })).toHaveLength(1);
  });

  it('flags adapter/profile identity drift', () => {
    const registry = new InstanceRegistry(makeView());
    const drift = registry.register(registration({ instanceId: 'd2', adapterId: 'ark-react' }));
    expect(drift.diagnostics.some((d) => d.code === 'r1_project_identity_mismatch')).toBe(true);
  });

  it('update() validates and rolls back on failure; unregister removes fully', () => {
    const registry = new InstanceRegistry(makeView());
    registry.register(registration());
    const bad = registry.update('edit-member-dialog', { adapterId: 'wrong' });
    expect(bad.diagnostics.some((d) => d.code === 'r1_project_identity_mismatch')).toBe(true);
    // rollback keeps the original registration
    expect(registry.get('edit-member-dialog')?.adapterId).toBe('shadcn-react');
    expect(registry.unregister('edit-member-dialog')).toEqual([]);
    expect(registry.unregister('edit-member-dialog')[0]?.code).toBe('r1_project_instance_not_found');
  });

  it('scope cleanup removes all instances and coverage becomes not-covered', () => {
    const registry = new InstanceRegistry(makeView());
    registry.register(registration());
    registry.register(registration({ instanceId: 'd2', metadata: { path: 'a' } }));
    const res = registry.clearScope('members/edit');
    expect(res.removedInstanceIds.sort()).toEqual(['d2', 'edit-member-dialog']);
    expect(registry.coverage('members/edit').coverage).toBe('not-covered');
    expect(registry.size).toBe(0);
  });

  it('projects only allowlisted state; sensitive and draft values are withheld by default', () => {
    const registry = new InstanceRegistry(makeView());
    registry.register(registration());
    const snap = registry.projectVisibleState('edit-member-dialog', {
      open: true,
      ssn: '123',
      fields: { name: 'draft' },
      secret: 'x',
    });
    expect(snap.projected).toEqual({ open: true });
    expect(snap.withheld.sort()).toEqual(['fields', 'secret', 'ssn']);
  });
});

describe('bounded validator (Phase C)', () => {
  it('declared rules pass; rendered-only rule is not-covered without evidence (no metadata pass)', () => {
    const registry = new InstanceRegistry(makeView());
    registry.register(registration({ metadata: { path: 'p', declared: { pending: true } } }));
    const report = validateProject(makeView(), registry, {});
    const identity = report.findings.find((f) => f.ruleId === 'R1-PRJ-IDENTITY')!;
    const close = report.findings.find((f) => f.ruleId === 'R1-DLG-02')!;
    const pending = report.findings.find((f) => f.ruleId === 'R1-DLG-04')!;
    expect(identity.status).toBe('pass');
    expect(close.status).toBe('not-covered');
    expect(close.tier).toBe('declared');
    expect(pending.status).toBe('not-covered');
    expect(pending.tier).toBe('declared');
  });

  it('R1-DLG-02 fails with locatable details when no close affordance is rendered', () => {
    const view = makeView();
    const registry = new InstanceRegistry(view);
    registry.register(registration());
    const report = validateProject(view, registry, {
      rendered: { 'edit-member-dialog': { rootPath: '/dialog[0]', closeAffordances: [] } },
    });
    const close = report.findings.find((f) => f.ruleId === 'R1-DLG-02')!;
    expect(close.status).toBe('fail');
    expect(close.tier).toBe('rendered');
    expect(close.path).toBe('/dialog[0]');
    expect(close.repairHint).toContain('close');
  });

  it('R1-DLG-02 passes when a close entry is rendered, and does not false-positive blocking', () => {
    const view = makeView();
    const registry = new InstanceRegistry(view);
    registry.register(registration());
    registry.register(registration({ instanceId: 'blocking', metadata: { path: 'b', blocking: true } }));
    const report = validateProject(view, registry, {
      rendered: { 'edit-member-dialog': { rootPath: '/dialog[0]', closeAffordances: ['/dialog[0]/button[0]'] } },
    });
    expect(report.findings.find((f) => f.instanceId === 'edit-member-dialog' && f.ruleId === 'R1-DLG-02')!.status).toBe('pass');
    const blocking = report.findings.find((f) => f.instanceId === 'blocking' && f.ruleId === 'R1-DLG-02')!;
    expect(blocking.status).toBe('pass');
    expect(blocking.tier).toBe('declared');
  });

  it('pending rules require interaction evidence and pass/fail on observed behavior', () => {
    const view = makeView();
    const registry = new InstanceRegistry(view);
    registry.register(registration({ metadata: { path: 'p', declared: { pending: true } } }));

    const renderedOnly = validateProject(view, registry, {
      rendered: { 'edit-member-dialog': { rootPath: '/d', closeAffordances: ['x'] } },
    });
    expect(renderedOnly.findings.find((f) => f.ruleId === 'R1-DLG-05')!.status).toBe('not-covered');

    const good = validateProject(view, registry, {
      interaction: { 'edit-member-dialog': { pendingDuplicateSubmitBlocked: true, stopWaitNoSecondClose: true } },
    });
    expect(good.findings.find((f) => f.ruleId === 'R1-DLG-04')!.status).toBe('pass');
    expect(good.findings.find((f) => f.ruleId === 'R1-DLG-05')!.status).toBe('pass');

    const bad = validateProject(view, registry, {
      interaction: { 'edit-member-dialog': { pendingDuplicateSubmitBlocked: false, stopWaitNoSecondClose: false } },
    });
    expect(bad.findings.find((f) => f.ruleId === 'R1-DLG-04')!.status).toBe('fail');
    expect(bad.findings.find((f) => f.ruleId === 'R1-DLG-05')!.repairHint).toContain('generation');
  });

  it('unbound capability binding fails; bound instance otherwise generates no tool', () => {
    const view = makeView();
    const registry = new InstanceRegistry(view);
    registry.register(registration({ capabilityBindings: [{ capabilityId: 'ghost.cap', bindingSource: 'g' }] }));
    const report = validateProject(view, registry, {});
    const cap = report.findings.find((f) => f.ruleId === 'R1-PRJ-CAPABILITY')!;
    expect(cap.status).toBe('fail');
    expect(cap.actual).toBe('ghost.cap');
  });

  it('rejects an unknown rule id and reports scope coverage', () => {
    const view = makeView();
    const registry = new InstanceRegistry(view);
    registry.register(registration());
    const bad = validateProject(view, registry, {}, { ruleId: 'R1-NOT-A-RULE' });
    expect(bad.diagnostics[0]?.code).toBe('r1_project_rule_unknown');
    expect(bad.findings).toEqual([]);
    const scoped = validateProject(view, registry, {}, { scopeId: 'unknown/page' });
    expect(scoped.coverage.find((c) => c.scopeId === 'unknown/page')?.coverage).toBe('not-covered');
    expect(isKnownRule('R1-DLG-02')).toBe(true);
  });
});
