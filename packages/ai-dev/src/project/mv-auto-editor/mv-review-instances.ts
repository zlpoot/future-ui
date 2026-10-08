/**
 * R1-04 (#70) Phase B — explicit instance registration for the REAL
 * MV-Auto-Editor Storyboard (P4) and Keyframe (P5) review pages.
 *
 * Hard rules for this phase:
 *  - registration is EXPLICIT only (no JSX/DOM/source scanning);
 *  - the P4/P5 pages are full-page, NON-MODAL applications, so they are
 *    registered ONLY as future-ui.button / future-ui.text-input instances.
 *    Registering one as future-ui.dialog or declaring metadata.blocking is
 *    rejected here (never dress a full page up as a modal to score DLG rules);
 *  - relations use only real page/data-flow evidence (field-of the save
 *    action, trigger-of the real refresh/lock/retry chains);
 *  - visibleState allowlists carry safe status only — generationPrompt,
 *    candidate.prompt, notes, draft form VALUES and the checked set are never
 *    projected (only the safe checkedShot COUNT is);
 *  - the P5 `input[type=file]` picker is NOT registered (a file picker is no
 *    text input, and text-input provenance excludes keyframes.html); it is
 *    recorded in MV_REVIEW_UNMAPPED_CONTROLS as out-of-scope/unsupported and
 *    projects zero state;
 *  - capabilityBindings stays EMPTY: every review button generates zero
 *    business tools (R1-PRJ-CAPABILITY).
 */
import { identityRefFor, type InstanceRegistration, type InstanceRegistry } from '@future-ui/ai-contract-core';
import type { MvProjectContext } from './mv-project.js';

export const P4_SCOPE = 'p4/storyboard-review';
export const P5_SCOPE = 'p5/keyframe-review';

type ReviewComponentType = 'future-ui.button' | 'future-ui.text-input';
type RelationKind = 'contains' | 'field-of' | 'trigger-of';

interface ReviewSpec {
  instanceId: string;
  scopeId: string;
  componentType: ReviewComponentType;
  /** real locator of the control on the inline page. */
  path: string;
  /** declared hints — CLAIMS, never rendered/interaction proof. */
  declared: Record<string, unknown>;
  /** safe-state allowlist only. */
  allow: string[];
  relations?: Array<{ kind: RelationKind; target: string }>;
}

/* ------------------------------------------------------------------ */
/* P5 — keyframe review (web/keyframes.html, /keyframe-review route)   */
/* ------------------------------------------------------------------ */

const P5_SPECS: ReviewSpec[] = [
  // Targets of trigger-of relations are registered first (registry order rule).
  {
    instanceId: 'p5/candidate-approve', scopeId: P5_SCOPE, componentType: 'future-ui.button',
    path: 'keyframes.html #detail .candidate grid · button[data-action=approve] (通过并选用)',
    declared: { nonModal: true, page: 'web/keyframes.html', dataActions: ['approve'] },
    allow: ['shotId', 'candidateStatus', 'selectionLocked'],
  },
  {
    instanceId: 'p5/candidate-reject', scopeId: P5_SCOPE, componentType: 'future-ui.button',
    path: 'keyframes.html #detail .candidate grid · button[data-action=reject].warn (淘汰)',
    declared: { nonModal: true, page: 'web/keyframes.html', dataActions: ['reject'] },
    allow: ['shotId', 'candidateStatus', 'selectionLocked'],
  },
  {
    instanceId: 'p5/candidate-select', scopeId: P5_SCOPE, componentType: 'future-ui.button',
    path: 'keyframes.html #detail .candidate grid · button[data-action=select] (选用；仅已通过且非当前时渲染)',
    declared: { nonModal: true, page: 'web/keyframes.html', dataActions: ['select'], conditionallyRendered: true },
    allow: ['shotId', 'candidateStatus', 'isCurrentSelection', 'selectionLocked'],
  },
  {
    instanceId: 'p5/candidate-upload', scopeId: P5_SCOPE, componentType: 'future-ui.button',
    path: 'keyframes.html #detail 回传图片 panel · button#upload.primary (上传为候选)',
    declared: { nonModal: true, page: 'web/keyframes.html', triggers: 'refresh-candidate-list' },
    allow: ['shotId', 'hasAwaitingJob', 'selectionLocked'],
    relations: [{ kind: 'trigger-of', target: 'p5/candidate-approve' }],
  },
  {
    instanceId: 'p5/selection-lock', scopeId: P5_SCOPE, componentType: 'future-ui.button',
    path: 'keyframes.html #detail 候选 panel · button#lock (锁定当前选图)',
    declared: { nonModal: true, page: 'web/keyframes.html', requiresApprovedSelected: true },
    allow: ['shotId', 'hasSelectedCandidate', 'lockedCandidateId'],
    relations: [{ kind: 'trigger-of', target: 'p5/candidate-approve' }],
  },
  {
    instanceId: 'p5/selection-unlock', scopeId: P5_SCOPE, componentType: 'future-ui.button',
    path: 'keyframes.html #detail 候选 panel · button#unlock (解锁)',
    declared: { nonModal: true, page: 'web/keyframes.html' },
    allow: ['shotId', 'lockedCandidateId'],
    relations: [{ kind: 'trigger-of', target: 'p5/candidate-approve' }],
  },
  {
    instanceId: 'p5/job-retry', scopeId: P5_SCOPE, componentType: 'future-ui.button',
    path: 'keyframes.html #detail 任务历史 · button[data-action=retry] (重试；仅 failed/canceled 渲染)',
    declared: { nonModal: true, page: 'web/keyframes.html', dataActions: ['retry'], conditionallyRendered: true, terminalStatesOnly: ['failed', 'canceled'] },
    allow: ['shotId', 'jobStatus', 'jobAttempt'],
    relations: [{ kind: 'trigger-of', target: 'p5/candidate-upload' }],
  },
  {
    instanceId: 'p5/job-cancel', scopeId: P5_SCOPE, componentType: 'future-ui.button',
    path: 'keyframes.html #detail 任务历史 · button[data-action=cancel] (取消；仅 awaiting-upload 渲染)',
    declared: { nonModal: true, page: 'web/keyframes.html', dataActions: ['cancel'], conditionallyRendered: true },
    allow: ['shotId', 'jobStatus'],
    relations: [{ kind: 'trigger-of', target: 'p5/job-retry' }],
  },
  {
    instanceId: 'p5/job-fail', scopeId: P5_SCOPE, componentType: 'future-ui.button',
    path: 'keyframes.html #detail 任务历史 · button[data-action=fail] (标记失败；仅 awaiting-upload 渲染)',
    declared: { nonModal: true, page: 'web/keyframes.html', dataActions: ['fail'], conditionallyRendered: true },
    allow: ['shotId', 'jobStatus'],
    relations: [{ kind: 'trigger-of', target: 'p5/job-retry' }],
  },
  {
    instanceId: 'p5/batch-jobs', scopeId: P5_SCOPE, componentType: 'future-ui.button',
    path: 'keyframes.html footer · button#batchJobs (批量建立待上传任务)',
    declared: { nonModal: true, page: 'web/keyframes.html', usesCheckedSet: true },
    allow: ['checkedShotCount', 'planReviewStatus'],
    relations: [{ kind: 'trigger-of', target: 'p5/candidate-upload' }],
  },
  {
    instanceId: 'p5/batch-lock', scopeId: P5_SCOPE, componentType: 'future-ui.button',
    path: 'keyframes.html footer · button#batchLock (批量锁定)',
    declared: { nonModal: true, page: 'web/keyframes.html', usesCheckedSet: true },
    allow: ['checkedShotCount', 'planReviewStatus'],
    relations: [{ kind: 'trigger-of', target: 'p5/selection-lock' }],
  },
];

/* ------------------------------------------------------------------ */
/* P4 — storyboard review (web/shots.html, /shots route)               */
/* ------------------------------------------------------------------ */

const P4_FIELD_ALLOW = ['shotId', 'fieldKind'];

const P4_SPECS: ReviewSpec[] = [
  {
    instanceId: 'p4/save-shot', scopeId: P4_SCOPE, componentType: 'future-ui.button',
    path: 'shots.html #detail footer · button#save.primary (保存镜头计划)',
    declared: { nonModal: true, page: 'web/shots.html' },
    allow: ['shotId', 'shotStatus', 'hasDraftChanges'],
  },
  {
    instanceId: 'p4/reset-shot', scopeId: P4_SCOPE, componentType: 'future-ui.button',
    path: 'shots.html #detail footer · button#reset (放弃此镜头未保存修改)',
    declared: { nonModal: true, page: 'web/shots.html' },
    allow: ['shotId', 'shotStatus', 'hasDraftChanges'],
  },
  {
    instanceId: 'p4/play', scopeId: P4_SCOPE, componentType: 'future-ui.button',
    path: 'shots.html 时间与锚点 panel · button#play (▶ 从本镜头播放)',
    declared: { nonModal: true, page: 'web/shots.html', requiresAudio: true },
    allow: ['shotId', 'hasAudio'],
  },
  {
    instanceId: 'p4/nav-prev', scopeId: P4_SCOPE, componentType: 'future-ui.button',
    path: 'shots.html #detail topline · button#prev (← 上一镜)',
    declared: { nonModal: true, page: 'web/shots.html', disabledAtBoundary: 'first-shot' },
    allow: ['shotId', 'isFirstShot', 'isLastShot'],
  },
  {
    instanceId: 'p4/nav-next', scopeId: P4_SCOPE, componentType: 'future-ui.button',
    path: 'shots.html #detail topline · button#next (下一镜 →)',
    declared: { nonModal: true, page: 'web/shots.html', disabledAtBoundary: 'last-shot' },
    allow: ['shotId', 'isFirstShot', 'isLastShot'],
  },
  // Text fields: the draft VALUES are withheld (allow lists metadata only).
  {
    instanceId: 'p4/field-intent', scopeId: P4_SCOPE, componentType: 'future-ui.text-input',
    path: 'shots.html #detail textarea#intent (镜头意图与画面描述)',
    declared: { nonModal: true, page: 'web/shots.html', fieldKind: 'intent', draft: true },
    allow: P4_FIELD_ALLOW,
    relations: [{ kind: 'field-of', target: 'p4/save-shot' }],
  },
  {
    instanceId: 'p4/field-notes', scopeId: P4_SCOPE, componentType: 'future-ui.text-input',
    path: 'shots.html #detail textarea#notes (审核备注)',
    declared: { nonModal: true, page: 'web/shots.html', fieldKind: 'notes', draft: true },
    allow: P4_FIELD_ALLOW,
    relations: [{ kind: 'field-of', target: 'p4/save-shot' }],
  },
  {
    instanceId: 'p4/field-composition', scopeId: P4_SCOPE, componentType: 'future-ui.text-input',
    path: 'shots.html #detail textarea#composition (构图)',
    declared: { nonModal: true, page: 'web/shots.html', fieldKind: 'composition', draft: true },
    allow: P4_FIELD_ALLOW,
    relations: [{ kind: 'field-of', target: 'p4/save-shot' }],
  },
  {
    instanceId: 'p4/field-generation-prompt', scopeId: P4_SCOPE, componentType: 'future-ui.text-input',
    path: 'shots.html #detail textarea#generationPrompt (Chat 关键帧生成提示词)',
    declared: { nonModal: true, page: 'web/shots.html', fieldKind: 'generationPrompt', draft: true },
    allow: P4_FIELD_ALLOW,
    relations: [{ kind: 'field-of', target: 'p4/save-shot' }],
  },
  {
    instanceId: 'p4/field-start', scopeId: P4_SCOPE, componentType: 'future-ui.text-input',
    path: 'shots.html #detail input#start[type=number] (开始秒)',
    declared: { nonModal: true, page: 'web/shots.html', fieldKind: 'startSeconds', draft: true },
    allow: P4_FIELD_ALLOW,
    relations: [{ kind: 'field-of', target: 'p4/save-shot' }],
  },
  {
    instanceId: 'p4/field-anchor', scopeId: P4_SCOPE, componentType: 'future-ui.text-input',
    path: 'shots.html #detail input#anchor[type=number] (关键帧锚点秒；anchorLocked 时 disabled)',
    declared: { nonModal: true, page: 'web/shots.html', fieldKind: 'anchorSeconds', draft: true, disabledWhen: 'keyframe.anchorLocked' },
    allow: P4_FIELD_ALLOW,
    relations: [{ kind: 'field-of', target: 'p4/save-shot' }],
  },
  {
    // Rewrites the prompt text ONLY (no image generation on this page).
    instanceId: 'p4/rewrite-prompt', scopeId: P4_SCOPE, componentType: 'future-ui.button',
    path: 'shots.html 关键帧规划 panel · button#makePrompt (按当前镜头重写提示词)',
    declared: { nonModal: true, page: 'web/shots.html', textOnly: true },
    allow: ['shotId', 'shotStatus'],
    relations: [{ kind: 'trigger-of', target: 'p4/field-generation-prompt' }],
  },
];

/** Every Phase B review instance spec, already in relation-topological order. */
export const MV_REVIEW_SPECS: readonly ReviewSpec[] = [...P5_SPECS, ...P4_SPECS];

/**
 * REAL controls deliberately LEFT UNMAPPED in Phase B (Independent Review
 * P1-B fix). The P5 upload form contains a real `input#uploadFile[type=file]`,
 * but a file picker is NOT a text input: the frozen `future-ui.text-input`
 * definition's provenance intentionally covers only canvas/shots (keyframes'
 * only input is this file picker). Registering it under text-input would
 * create a valid-looking instance whose definition/pins cannot cover its own
 * source page. There is no frozen file-input component type and this phase
 * does not invent one, so the honest disposition is OUT OF SCOPE /
 * UNSUPPORTED: the control is not registered, carries no visibleState and
 * therefore projects zero AI-facing state (its selected file is never
 * exposed). Promoting it needs a separate, truthfully-defined component type
 * (Owner decision), not a forced text-input mapping.
 */
export interface MvUnmappedReviewControl {
  locator: string;
  page: string;
  reason: 'no-frozen-component-type';
  disposition: 'out-of-scope-unsupported';
}

export const MV_REVIEW_UNMAPPED_CONTROLS: readonly MvUnmappedReviewControl[] = [
  {
    locator: 'keyframes.html #detail 回传图片 panel · input#uploadFile[type=file]',
    page: 'web/keyframes.html',
    reason: 'no-frozen-component-type',
    disposition: 'out-of-scope-unsupported',
  },
];

/**
 * Locator-vs-definition consistency guard (Independent Review P1-B fix).
 * Returns the REAL source document locators a component definition actually
 * covers: the single locator of an inline-source, or every member locator of
 * an inline-source-set.
 */
export function definitionSourceLocators(source: { kind: string; locator?: string; sources?: ReadonlyArray<{ locator: string }> }): string[] {
  if (source.kind === 'inline-source-set') return source.sources?.map((m) => m.locator) ?? [];
  if (source.kind === 'inline-source' && source.locator) return [source.locator];
  return [];
}

/**
 * Every registered review instance MUST live on a document its definition's
 * provenance actually covers. This turns the P1-B mismatch into a registration-
 * time failure instead of a silently accepted, misleading instance.
 */
export function assertInstancePageCovered(
  componentType: string,
  page: unknown,
  coveredLocators: readonly string[],
  instanceId: string,
): void {
  if (typeof page !== 'string' || !coveredLocators.includes(page)) {
    throw new Error(
      `review instance ${instanceId} (${componentType}) lives on ${String(page)} which is not covered by `
        + `that definition's source provenance [${coveredLocators.join(', ')}]; `
        + 'map it to a definition that pins its real page or record it as an out-of-scope unmapped control',
    );
  }
}

/**
 * Guard enforcing the NON-MODAL nature of the review pages. A review instance
 * must never be a future-ui.dialog and must never declare blocking — the P4/P5
 * pages have no modal/close/ESC semantics, so faking them would be dishonest.
 */
export function assertNonModalReview(reg: Pick<InstanceRegistration, 'componentType' | 'metadata'>): void {
  if (reg.componentType === 'future-ui.dialog') {
    throw new Error('P4/P5 review pages are full-page, non-modal applications; they must not be mapped as future-ui.dialog');
  }
  if (reg.metadata?.blocking === true) {
    throw new Error('P4/P5 review pages have no blocking/modal semantics; metadata.blocking must not be declared');
  }
}

function toRegistration(ctx: MvProjectContext, spec: ReviewSpec): InstanceRegistration {
  const def = ctx.view.definitions.find((d) => d.componentType === spec.componentType);
  if (def === undefined) throw new Error(`${spec.componentType} definition missing from MV project view`);
  assertInstancePageCovered(
    spec.componentType,
    spec.declared['page'],
    definitionSourceLocators(def.source),
    spec.instanceId,
  );
  const registration: InstanceRegistration = {
    instanceId: spec.instanceId,
    componentType: spec.componentType,
    scopeId: spec.scopeId,
    identityRef: identityRefFor(def.identity),
    metadata: {
      path: spec.path,
      // review pages never block: blocking is intentionally absent.
      declared: { ...spec.declared },
    },
    visibleState: { allow: spec.allow, sensitive: [] },
    capabilityBindings: [], // review actions are NOT business tools in this phase
    relations: spec.relations?.map((r) => ({ kind: r.kind, target: r.target })),
  };
  assertNonModalReview(registration);
  return registration;
}

/**
 * Register all real P4/P5 review instances. Specs are ordered so every
 * relation target is already registered (the registry requirement).
 */
export function registerMvReviewInstances(ctx: MvProjectContext): InstanceRegistration[] {
  const out: InstanceRegistration[] = [];
  for (const spec of MV_REVIEW_SPECS) {
    const registration = toRegistration(ctx, spec);
    const result = ctx.registry.register(registration);
    if (result.diagnostics.length > 0) {
      throw new Error(
        `register MV review instance ${spec.instanceId} failed: ${result.diagnostics.map((d) => `${d.code}@${d.path}`).join(', ')}`,
      );
    }
    out.push(registration);
  }
  return out;
}

/** Number of registered review instances per scope (reporting helper). */
export function reviewInstanceCounts(): { p4: number; p5: number; total: number } {
  return {
    p5: P5_SPECS.length,
    p4: P4_SPECS.length,
    total: P5_SPECS.length + P4_SPECS.length,
  };
}

export type { InstanceRegistry };
