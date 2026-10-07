/**
 * R1-04 (#70) Phase B — deterministic jsdom RENDERED facts for the REAL
 * MV-Auto-Editor Storyboard (P4) and Keyframe (P5) review pages.
 *
 * Mirrors the real inline templates in web/shots.html and web/keyframes.html
 * and turns the OBSERVED DOM into plain, typed render facts. These facts are
 * NOT RenderedEvidence for a frozen rule and are never sealed as
 * interaction proof: the frozen bounded set has no button/text-input rule, so
 * through validateProject these instances are only judged at declared tier and
 * the review semantics stay not-covered. The facts document what the REAL page
 * renders (conditional buttons / disabled states) without claiming a
 * future-ui interaction-verified pass. No browser, no network, no model.
 */

/* ------------------------------- P5 -------------------------------- */

export interface P5FixtureOptions {
  /** per-shot keyframe review state (mirrors keyframe-review.json) */
  candidateStatus?: 'pending' | 'approved' | 'rejected';
  /** this candidate is the currently selected one (select button hidden). */
  isCurrentSelection?: boolean;
  /** the shot is locked → approve/reject/select/upload controls disabled. */
  locked?: boolean;
  /** selection row has an approved selected candidate (enables lock). */
  selected?: boolean;
  /** job lifecycle state; undefined = no job (the REAL current project state). */
  jobStatus?: 'awaiting-upload' | 'completed' | 'failed' | 'canceled';
}

/**
 * Build the REAL candidate card + job history markup for one shot, mirroring
 * keyframes.html renderDetail() candidate grid and job rows.
 */
export function buildP5ShotDetailMarkup(options: P5FixtureOptions = {}): string {
  const {
    candidateStatus = 'pending',
    isCurrentSelection = false,
    locked = false,
    selected = false,
    jobStatus,
  } = options;
  const lockAttr = locked ? 'disabled' : '';
  // select renders ONLY for an approved candidate that is not the current pick
  const selectButton =
    candidateStatus === 'approved' && !isCurrentSelection
      ? `<button data-candidate="c1" data-action="select" ${lockAttr}>选用</button>`
      : '';
  const candidate = `
    <div class="candidate ${isCurrentSelection ? 'selected' : ''} ${locked ? 'locked' : ''}">
      <img alt="" src="">
      <h4>candidate.png</h4>
      <div class="row">
        <button data-candidate="c1" data-action="approve" ${lockAttr}>通过并选用</button>
        <button data-candidate="c1" data-action="reject" class="warn" ${lockAttr}>淘汰</button>
        ${selectButton}
      </div>
    </div>`;
  const lockRow = `
    <button id="lock" ${selected && !locked ? '' : 'disabled'}>锁定当前选图</button>
    <button id="unlock" ${locked ? '' : 'disabled'}>解锁</button>`;
  let jobRow = '';
  if (jobStatus !== undefined) {
    const awaitingActions =
      jobStatus === 'awaiting-upload'
        ? '<button data-job="j1" data-action="copy">复制本次提示词</button>'
          + '<button data-job="j1" data-action="fail">标记失败</button>'
          + '<button data-job="j1" data-action="cancel">取消</button>'
        : '';
    const retryButton =
      jobStatus === 'failed' || jobStatus === 'canceled'
        ? '<button data-job="j1" data-action="retry">重试</button>'
        : '';
    jobRow = `<div class="job"><strong>j1</strong> · ${jobStatus}${awaitingActions}${retryButton}</div>`;
  }
  return `<div id="detail">${candidate}<div class="row">${lockRow}</div><div class="jobs">${jobRow}</div></div>`;
}

export interface P5RenderedFacts {
  approvePresent: boolean;
  approveDisabled: boolean;
  rejectPresent: boolean;
  rejectDisabled: boolean;
  /** select is conditionally rendered (approved && not current). */
  selectPresent: boolean;
  selectDisabled: boolean;
  lockPresent: boolean;
  lockDisabled: boolean;
  unlockPresent: boolean;
  unlockDisabled: boolean;
  retryPresent: boolean;
  jobCancelPresent: boolean;
  jobFailPresent: boolean;
}

/** Observe the P5 control render states from the mounted real markup. */
export function observeP5ReviewControls(scope: ParentNode = document.body): P5RenderedFacts {
  const btn = (action: string): HTMLButtonElement | null =>
    scope.querySelector(`button[data-action="${action}"]`);
  const approve = btn('approve');
  const reject = btn('reject');
  const select = btn('select');
  return {
    approvePresent: approve !== null,
    approveDisabled: approve?.disabled === true,
    rejectPresent: reject !== null,
    rejectDisabled: reject?.disabled === true,
    selectPresent: select !== null,
    selectDisabled: select?.disabled === true,
    lockPresent: scope.querySelector('#lock') !== null,
    lockDisabled: (scope.querySelector('#lock') as HTMLButtonElement | null)?.disabled === true,
    unlockPresent: scope.querySelector('#unlock') !== null,
    unlockDisabled: (scope.querySelector('#unlock') as HTMLButtonElement | null)?.disabled === true,
    retryPresent: btn('retry') !== null,
    jobCancelPresent: btn('cancel') !== null,
    jobFailPresent: btn('fail') !== null,
  };
}

/** Mount P5 markup into jsdom (test helper). */
export function mountP5ShotDetail(options: P5FixtureOptions = {}): { container: HTMLElement; unmount: () => void } {
  const container = document.createElement('div');
  container.innerHTML = buildP5ShotDetailMarkup(options);
  document.body.appendChild(container);
  return {
    container,
    unmount: () => container.remove(),
  };
}

/* ------------------------------- P4 -------------------------------- */

export interface P4FixtureOptions {
  isFirstShot?: boolean;
  isLastShot?: boolean;
  audioReady?: boolean;
  anchorLocked?: boolean;
}

/** Build the REAL P4 shot-detail action/form markup (mirrors shots.html). */
export function buildP4ShotDetailMarkup(options: P4FixtureOptions = {}): string {
  const { isFirstShot = false, isLastShot = false, audioReady = false, anchorLocked = false } = options;
  return `
    <div id="detail">
      <div class="topline">
        <button id="prev" ${isFirstShot ? 'disabled' : ''}>← 上一镜</button>
        <button id="next" ${isLastShot ? 'disabled' : ''}>下一镜 →</button>
      </div>
      <textarea id="intent"></textarea>
      <textarea id="notes"></textarea>
      <textarea id="composition"></textarea>
      <textarea id="generationPrompt"></textarea>
      <input id="start" type="number">
      <input id="anchor" type="number" ${anchorLocked ? 'disabled' : ''}>
      <input id="anchorLocked" type="checkbox" ${anchorLocked ? 'checked' : ''}>
      <button id="play" ${audioReady ? '' : 'disabled'}>▶ 从本镜头播放</button>
      <button id="makePrompt">按当前镜头重写提示词</button>
      <div class="row">
        <button id="save" class="primary">保存镜头计划</button>
        <button id="reset">放弃此镜头未保存修改</button>
      </div>
    </div>`;
}

export interface P4RenderedFacts {
  savePresent: boolean;
  resetPresent: boolean;
  makePromptPresent: boolean;
  playPresent: boolean;
  playDisabled: boolean;
  prevDisabled: boolean;
  nextDisabled: boolean;
  anchorDisabled: boolean;
  fieldIds: string[];
  /** the full-page review is NOT a modal: no dialog role anywhere in detail. */
  hasDialogRole: boolean;
  /** no close/ESC affordance is rendered for the review detail. */
  hasCloseEntry: boolean;
}

/** Observe the P4 control/form render states from mounted real markup. */
export function observeP4ReviewControls(scope: ParentNode = document.body): P4RenderedFacts {
  const disabled = (id: string): boolean =>
    (scope.querySelector(`#${id}`) as HTMLButtonElement | null)?.disabled === true;
  return {
    savePresent: scope.querySelector('#save') !== null,
    resetPresent: scope.querySelector('#reset') !== null,
    makePromptPresent: scope.querySelector('#makePrompt') !== null,
    playPresent: scope.querySelector('#play') !== null,
    playDisabled: disabled('play'),
    prevDisabled: disabled('prev'),
    nextDisabled: disabled('next'),
    anchorDisabled: (scope.querySelector('#anchor') as HTMLInputElement | null)?.disabled === true,
    fieldIds: ['intent', 'notes', 'composition', 'generationPrompt', 'start', 'anchor'].filter(
      (id) => scope.querySelector(`#${id}`) !== null,
    ),
    hasDialogRole: scope.querySelector('[role="dialog"]') !== null,
    hasCloseEntry: scope.querySelector('[data-close],button.close,#closeInspector') !== null,
  };
}

/** Mount P4 markup into jsdom (test helper). */
export function mountP4ShotDetail(options: P4FixtureOptions = {}): { container: HTMLElement; unmount: () => void } {
  const container = document.createElement('div');
  container.innerHTML = buildP4ShotDetailMarkup(options);
  document.body.appendChild(container);
  return {
    container,
    unmount: () => container.remove(),
  };
}
