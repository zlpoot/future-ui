// @vitest-environment node
/**
 * R1-03 (#69) Project AI View + explicit registry + bounded validator.
 *
 * Focuses on the pure deterministic guarantees: the view is NOT the schema
 * catalog; registration is explicit and pins EXACT identity; the registry is
 * encapsulation-safe (frozen snapshots); visible state is allowlisted with
 * drafts/sensitive hidden by default; and the validator only concludes against
 * the required evidence tier (declared < rendered < interaction-verified) using
 * SEALED trusted evidence, emitting not-covered instead of a false pass.
 */
import { describe, expect, it } from 'vitest';
import {
  buildProjectView,
  queryComponents,
  describeComponent,
  importableModule,
  capabilitiesForInstance,
  InstanceRegistry,
  validateProject,
  TrustedEvidence,
  validateEvidenceShape,
  identityRefFor,
  isKnownRule,
} from '../src/index.js';
import type {
  CapabilityReference,
  ComponentDefinition,
  InlinePageSource,
  InstanceIdentityRef,
  InstanceRegistration,
  ProjectAIView,
} from '../src/index.js';

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
    source: { kind: 'module-import', module: '@future-ui/shadcn-adapter', exports: ['EditDialog'], example: '<EditDialog/>' },
    mappingStatus: 'supported',
    limits: [],
    examples: [{ title: 'basic', code: '<EditDialog/>' }],
    ...over,
  };
}

const DIALOG_DEF = definition();
const DIALOG_REF = identityRefFor(DIALOG_DEF.identity);

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
    identityRef: { ...DIALOG_REF },
    metadata: { path: 'members/EditMemberDialog' },
    visibleState: { allow: ['open'], sensitive: ['ssn'] },
    ...over,
  };
}

function driftRef(patch: Partial<InstanceIdentityRef>): InstanceIdentityRef {
  return { ...DIALOG_REF, ...patch };
}

function seal(rendered?: unknown, interaction?: unknown): TrustedEvidence {
  return TrustedEvidence.seal({
    ...(rendered === undefined ? {} : { rendered: rendered as never }),
    ...(interaction === undefined ? {} : { interaction: interaction as never }),
  });
}

describe('Project AI View (Phase A)', () => {
  it('builds a project view distinguished from the schema catalog', () => {
    const view = makeView();
    expect(view.generatedFrom.kind).toBe('project-ai-view');
    expect(queryComponents(view, { componentType: 'future-ui.dialog' })).toHaveLength(1);
    expect(importableModule(describeComponent(view, 'future-ui.dialog')!.source)?.exports).toContain('EditDialog');
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

describe('Project AI View — discriminated component source (R1-04 #70 amendment)', () => {
  // A REAL, non-importable, page-owned implementation (MV web/canvas.html case).
  const inlineSource: InlinePageSource = {
    kind: 'inline-source',
    locator: 'web/canvas.html',
    owner: 'inline classic <script> on the /canvas route (non-module, page-owned)',
    symbols: ['simpleAssetEditor', 'assetPanel'],
    example: "$('#detail').innerHTML = `<h2>${esc(card.name)}</h2>` + simpleAssetEditor(card, n);",
  };

  it('accepts a non-importable inline page source; the ONLY import derivation yields null', () => {
    const view = makeView([definition({ source: inlineSource })]);
    const def = describeComponent(view, 'future-ui.dialog')!;
    expect(def.source.kind).toBe('inline-source');
    if (def.source.kind !== 'inline-source') throw new Error('narrow');
    expect(def.source.locator).toBe('web/canvas.html');
    expect(def.source.symbols).toEqual(['simpleAssetEditor', 'assetPanel']);
    // An inline source carries no module/exports and must yield NO import.
    expect(importableModule(def.source)).toBeNull();
    expect('module' in def.source).toBe(false);
    expect('exports' in def.source).toBe(false);
  });

  it('keeps a real module-import source importable (back-compat for shadcn consumers)', () => {
    const view = makeView();
    const def = describeComponent(view, 'future-ui.dialog')!;
    expect(def.source.kind).toBe('module-import');
    expect(importableModule(def.source)).toEqual({ module: '@future-ui/shadcn-adapter', exports: ['EditDialog'] });
    expect('locator' in def.source).toBe(false);
  });

  it('NEGATIVE: an inline source that fabricates module/exports is rejected (no fake import)', () => {
    const fake = { ...inlineSource, module: 'web/canvas.html', exports: ['simpleAssetEditor'] };
    const res = buildProjectView({ projectName: 'x', definitions: [definition({ source: fake as ComponentDefinition['source'] })] });
    expect(res.view).toBeNull();
    const paths = res.diagnostics
      .filter((d) => d.code === 'r1_project_definition_invalid')
      .map((d) => d.path);
    expect(paths).toContain('/definitions/future-ui.dialog/source/module');
    expect(paths).toContain('/definitions/future-ui.dialog/source/exports');
  });

  it('NEGATIVE: a module-import source cannot carry inline-only fields (kinds stay exclusive)', () => {
    const mixed = {
      kind: 'module-import',
      module: '@future-ui/shadcn-adapter',
      exports: ['EditDialog'],
      example: '<EditDialog/>',
      locator: 'web/canvas.html',
    };
    const res = buildProjectView({ projectName: 'x', definitions: [definition({ source: mixed as ComponentDefinition['source'] })] });
    expect(res.view).toBeNull();
    expect(res.diagnostics.some((d) => d.code === 'r1_project_definition_invalid' && d.path.endsWith('/source/locator'))).toBe(true);
  });

  it('rejects unknown/missing/non-object kind and malformed source shapes', () => {
    const cases: Array<[string, unknown]> = [
      ['unknown kind', { kind: 'cdn', module: 'x', exports: ['A'], example: 'e' }],
      ['missing kind', { module: 'x', exports: ['A'], example: 'e' }],
      ['non-object', null],
      ['inline missing locator', { kind: 'inline-source', owner: 'o', symbols: ['s'], example: 'e' }],
      ['inline missing owner', { kind: 'inline-source', locator: 'l', symbols: ['s'], example: 'e' }],
      ['inline empty symbols', { kind: 'inline-source', locator: 'l', owner: 'o', symbols: [], example: 'e' }],
      ['module blank module', { kind: 'module-import', module: '  ', exports: ['A'], example: 'e' }],
      ['module empty exports', { kind: 'module-import', module: '@x/y', exports: [], example: 'e' }],
    ];
    for (const [label, source] of cases) {
      const res = buildProjectView({
        projectName: 'x',
        definitions: [definition({ source: source as ComponentDefinition['source'] })],
      });
      expect(res.view, label).toBeNull();
      expect(res.diagnostics.some((d) => d.code === 'r1_project_definition_invalid'), label).toBe(true);
    }
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

  it('B1: detects adapter id, adapter version, profile version and upstream fingerprint drift', () => {
    const registry = new InstanceRegistry(makeView());
    const cases: Array<[string, Partial<InstanceIdentityRef>, string]> = [
      ['adapter id', { adapterId: 'ark-react' }, 'adapterId'],
      ['adapter version', { adapterVersion: '9.9.9' }, 'adapterVersion'],
      ['profile version', { profileVersion: '2.0.0' }, 'profileVersion'],
      ['upstream fingerprint', { upstreamFingerprint: 'deadbeef' }, 'upstreamFingerprint'],
    ];
    for (const [label, patch, key] of cases) {
      const res = registry.register(registration({ instanceId: `drift-${key}`, identityRef: driftRef(patch) }));
      const d = res.diagnostics.find((x) => x.code === 'r1_project_identity_mismatch');
      expect(d, label).toBeDefined();
      expect(d?.path, label).toContain(`identityRef/${key}`);
      expect(registry.get(`drift-${key}`), `${label} must not be stored`).toBeUndefined();
    }
  });

  it('B1: identity drift also fails the R1-PRJ-IDENTITY rule at the validator', () => {
    const view = makeView();
    const registry = new InstanceRegistry(view);
    // correct id but bumped profile version passes the registry id/shape checks
    // only if exact identity matches; here it must be rejected by register.
    const res = registry.register(registration({ identityRef: driftRef({ profileVersion: '9.9.9' }) }));
    expect(res.diagnostics.some((d) => d.code === 'r1_project_identity_mismatch')).toBe(true);
  });

  it('update() validates exact identity and rolls back on failure; unregister removes fully', () => {
    const registry = new InstanceRegistry(makeView());
    registry.register(registration());
    const bad = registry.update('edit-member-dialog', { identityRef: driftRef({ upstreamFingerprint: '00000000' }) });
    expect(bad.diagnostics.some((d) => d.code === 'r1_project_identity_mismatch')).toBe(true);
    // rollback keeps the original exact identity
    expect(registry.get('edit-member-dialog')?.identityRef.upstreamFingerprint).toBe(DIALOG_REF.upstreamFingerprint);
    expect(registry.unregister('edit-member-dialog')).toEqual([]);
    expect(registry.unregister('edit-member-dialog')[0]?.code).toBe('r1_project_instance_not_found');
  });

  it('B2: mutating the input, get() result or query() result cannot affect the registry/projection', () => {
    const registry = new InstanceRegistry(makeView());
    // runtime-only mutable view (static fields are readonly); no `any` used.
    type WritableReg = {
      identityRef: { adapterVersion: string };
      visibleState: { allow: string[]; sensitive: string[]; exposeDraft?: boolean };
      scopeId: string;
    };
    const input = registration();
    registry.register(input);

    // mutate the caller's original object after registration
    const writableInput = input as unknown as WritableReg;
    writableInput.identityRef.adapterVersion = 'hacked';
    writableInput.visibleState.allow.push('ssn');
    writableInput.visibleState.sensitive.length = 0;
    writableInput.visibleState.exposeDraft = true;

    const got = registry.get('edit-member-dialog')! as unknown as WritableReg;
    expect(Object.isFrozen(got)).toBe(true);
    expect(() => { got.identityRef.adapterVersion = 'x'; }).toThrow(TypeError);
    expect(() => { got.visibleState.allow.push('ssn'); }).toThrow(TypeError);

    const row = registry.query()[0] as unknown as WritableReg;
    expect(Object.isFrozen(row)).toBe(true);
    expect(() => { row.scopeId = 'evicted'; }).toThrow(TypeError);

    // projection still withholds sensitive/draft keys
    const snap = registry.projectVisibleState('edit-member-dialog', { open: true, ssn: '123', fields: { n: 'd' } });
    expect(snap.projected).toEqual({ open: true });
    expect(snap.withheld.sort()).toEqual(['fields', 'ssn']);
    expect(registry.get('edit-member-dialog')?.identityRef.adapterVersion).toBe(DIALOG_REF.adapterVersion);
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
    const view = makeView();
    const registry = new InstanceRegistry(view);
    registry.register(registration({ metadata: { path: 'p', declared: { pending: true } } }));
    const report = validateProject(view, registry, undefined);
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
    const report = validateProject(view, registry,
      seal({ 'edit-member-dialog': { rootPath: '/dialog[0]', closeAffordances: [] } }));
    const close = report.findings.find((f) => f.ruleId === 'R1-DLG-02')!;
    expect(close.status).toBe('fail');
    expect(close.tier).toBe('rendered');
    expect(close.path).toBe('/dialog[0]');
    expect(close.repairHint).toContain('close');
  });

  it('R1-DLG-02 passes rendered when an ordinary close entry exists', () => {
    const view = makeView();
    const registry = new InstanceRegistry(view);
    registry.register(registration());
    const report = validateProject(view, registry,
      seal({ 'edit-member-dialog': { rootPath: '/dialog[0]', closeAffordances: ['/dialog[0]/button[0]'] } }));
    const close = report.findings.find((f) => f.instanceId === 'edit-member-dialog' && f.ruleId === 'R1-DLG-02')!;
    expect(close.status).toBe('pass');
    expect(close.tier).toBe('rendered');
  });

  it('B3: a declared-blocking dialog is not-covered without render, and passes rendered only with a resolution path', () => {
    const view = makeView();

    // declared only → not-covered (no metadata-only pass), even with blocking
    const declaredOnly = new InstanceRegistry(view);
    declaredOnly.register(registration({ instanceId: 'blk1', metadata: { path: 'b', blocking: true } }));
    const noEvidence = validateProject(view, declaredOnly, undefined);
    const nc = noEvidence.findings.find((f) => f.instanceId === 'blk1' && f.ruleId === 'R1-DLG-02')!;
    expect(nc.status).toBe('not-covered');
    expect(nc.tier).toBe('declared');

    // rendered but ordinary entry still present → fail
    const ordinaryPresent = new InstanceRegistry(view);
    ordinaryPresent.register(registration({ instanceId: 'blk2', metadata: { path: 'b', blocking: true } }));
    const stillOrdinary = validateProject(view, ordinaryPresent, seal({
      blk2: { rootPath: '/dialog[0]', closeAffordances: ['/dialog[0]/x'], resolutionAffordances: ['/dialog[0]/save'] },
    }));
    expect(stillOrdinary.findings.find((f) => f.instanceId === 'blk2' && f.ruleId === 'R1-DLG-02')!.status).toBe('fail');

    // rendered, no ordinary entry and no resolution path → fail (unclosable)
    const unclosable = new InstanceRegistry(view);
    unclosable.register(registration({ instanceId: 'blk3', metadata: { path: 'b', blocking: true } }));
    const noResolution = validateProject(view, unclosable, seal({
      blk3: { rootPath: '/dialog[0]', closeAffordances: [], resolutionAffordances: [] },
    }));
    expect(noResolution.findings.find((f) => f.instanceId === 'blk3' && f.ruleId === 'R1-DLG-02')!.status).toBe('fail');

    // rendered, ordinary removed + resolution present → pass at rendered
    const good = new InstanceRegistry(view);
    good.register(registration({ instanceId: 'blk4', metadata: { path: 'b', blocking: true } }));
    const ok = validateProject(view, good, seal({
      blk4: { rootPath: '/dialog[0]', closeAffordances: [], resolutionAffordances: ['/dialog[0]/save', '/dialog[0]/discard'] },
    }));
    const f = ok.findings.find((f) => f.instanceId === 'blk4' && f.ruleId === 'R1-DLG-02')!;
    expect(f.status).toBe('pass');
    expect(f.tier).toBe('rendered');
  });

  it('pending rules require SEALED interaction evidence and pass/fail on observed behavior', () => {
    const view = makeView();
    const registry = new InstanceRegistry(view);
    registry.register(registration({ metadata: { path: 'p', declared: { pending: true } } }));

    const renderedOnly = validateProject(view, registry,
      seal({ 'edit-member-dialog': { rootPath: '/d', closeAffordances: ['x'] } }));
    expect(renderedOnly.findings.find((f) => f.ruleId === 'R1-DLG-05')!.status).toBe('not-covered');

    const good = validateProject(view, registry, seal(
      undefined,
      { 'edit-member-dialog': { pendingDuplicateSubmitBlocked: true, stopWaitNoSecondClose: true } },
    ));
    expect(good.findings.find((f) => f.ruleId === 'R1-DLG-04')!.status).toBe('pass');
    expect(good.findings.find((f) => f.ruleId === 'R1-DLG-05')!.status).toBe('pass');

    const bad = validateProject(view, registry, seal(
      undefined,
      { 'edit-member-dialog': { pendingDuplicateSubmitBlocked: false, stopWaitNoSecondClose: false } },
    ));
    expect(bad.findings.find((f) => f.ruleId === 'R1-DLG-04')!.status).toBe('fail');
    expect(bad.findings.find((f) => f.ruleId === 'R1-DLG-05')!.repairHint).toContain('generation');
  });

  it('B4: raw evidence is shape-validated and only sealed evidence is trusted', () => {
    // malformed raw evidence is rejected, not consumed
    expect(validateEvidenceShape({ interaction: { x: { pendingDuplicateSubmitBlocked: true } } })[0]?.code)
      .toBe('r1_project_evidence_invalid');
    expect(validateEvidenceShape('nope')[0]?.code).toBe('r1_project_evidence_invalid');
    expect(() => TrustedEvidence.seal({ rendered: { x: { closeAffordances: [1] } } as never })).toThrow(/malformed/);

    // residual B4: rootPath is required and must be a string
    const badRootPath = validateEvidenceShape(
      { rendered: { x: { rootPath: 42, closeAffordances: [] } } },
    );
    expect(badRootPath.some((d) => d.path === '/evidence/rendered/x/rootPath')).toBe(true);
    expect(() => TrustedEvidence.seal({ rendered: { x: { closeAffordances: [] } } as never })).toThrow(/rootPath/);

    // residual B4: resolutionAffordances must be a string[] — a bare string
    // ("fake") has a truthy .length and must NOT be sealable into a pass
    const badResolution = validateEvidenceShape(
      { rendered: { x: { rootPath: '/d', closeAffordances: [], resolutionAffordances: 'fake' } } },
    );
    expect(badResolution.some((d) => d.path === '/evidence/rendered/x/resolutionAffordances')).toBe(true);
    expect(() => TrustedEvidence.seal({
      rendered: { x: { rootPath: '/d', closeAffordances: [], resolutionAffordances: 'fake' } },
    } as never)).toThrow(/resolutionAffordances/);

    // a well-formed resolution array seals fine
    expect(TrustedEvidence.seal({
      rendered: { x: { rootPath: '/d', closeAffordances: [], resolutionAffordances: ['/save'] } },
    })).toBeDefined();

    // a plain object that LOOKS like evidence does not carry the trust brand
    const forged = { interaction: { x: { pendingDuplicateSubmitBlocked: true, stopWaitNoSecondClose: true } } };
    expect(TrustedEvidence.is(forged)).toBe(false);
    const sealed = TrustedEvidence.seal(forged);
    expect(TrustedEvidence.is(sealed)).toBe(true);
    expect(Object.isFrozen(sealed)).toBe(true);
  });

  it('B4: validateProject enforces the trust boundary at RUNTIME, not just via types', () => {
    const view = makeView();
    const registry = new InstanceRegistry(view);
    registry.register(registration({ metadata: { path: 'p', blocking: true, declared: { pending: true } } }));

    // A plain object (cast to bypass the compiler) must be refused at runtime
    // and must NEVER elevate a finding to rendered/interaction — no findings at
    // all are produced from untrusted evidence.
    const forged = {
      rendered: { 'edit-member-dialog': { rootPath: '/d', closeAffordances: [], resolutionAffordances: ['/save'] } },
      interaction: { 'edit-member-dialog': { pendingDuplicateSubmitBlocked: true, stopWaitNoSecondClose: true } },
    } as unknown as Parameters<typeof validateProject>[2];

    const report = validateProject(view, registry, forged);
    expect(report.diagnostics[0]?.code).toBe('r1_project_evidence_invalid');
    expect(report.findings).toEqual([]);

    // undefined remains a valid declared-tier input (normal path unaffected)
    const declared = validateProject(view, registry, undefined);
    expect(declared.diagnostics).toEqual([]);
    expect(declared.findings.some((f) => f.ruleId === 'R1-DLG-02' && f.status === 'not-covered')).toBe(true);
  });

  it('unbound capability binding fails; bound instance otherwise generates no tool', () => {
    const view = makeView();
    const registry = new InstanceRegistry(view);
    registry.register(registration({ capabilityBindings: [{ capabilityId: 'ghost.cap', bindingSource: 'g' }] }));
    const report = validateProject(view, registry, undefined);
    const cap = report.findings.find((f) => f.ruleId === 'R1-PRJ-CAPABILITY')!;
    expect(cap.status).toBe('fail');
    expect(cap.actual).toBe('ghost.cap');
  });

  it('rejects an unknown rule id and reports scope coverage', () => {
    const view = makeView();
    const registry = new InstanceRegistry(view);
    registry.register(registration());
    const bad = validateProject(view, registry, undefined, { ruleId: 'R1-NOT-A-RULE' });
    expect(bad.diagnostics[0]?.code).toBe('r1_project_rule_unknown');
    expect(bad.findings).toEqual([]);
    const scoped = validateProject(view, registry, undefined, { scopeId: 'unknown/page' });
    expect(scoped.coverage.find((c) => c.scopeId === 'unknown/page')?.coverage).toBe('not-covered');
    expect(isKnownRule('R1-DLG-02')).toBe(true);
  });
});
