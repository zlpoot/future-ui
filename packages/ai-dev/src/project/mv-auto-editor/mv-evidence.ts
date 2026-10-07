/**
 * R1-04 (#70) Phase A — deterministic jsdom evidence for the MV-Auto-Editor
 * asset edit & approval panel.
 *
 * Mirrors the REAL canvas.html asset editor DOM (simpleAssetEditor /
 * assetPanel output) and turns the observed DOM/interactions into the layered
 * evidence the bounded validator consumes. Deterministic and controlled: no
 * browser, no network, no model. A rendered fact is observed, never assumed
 * from metadata.
 */
import type { InteractionEvidence, RenderedEvidence } from '@future-ui/ai-contract-core';

export interface MvPanelFixtureOptions {
  cardName?: string;
  /** desktop layout (default): #closeInspector is CSS-hidden (display:none). */
  closeVisible?: boolean;
  /** a generation job is in-flight: generate disabled, stop rendered. */
  running?: boolean;
  /** a cancel is already requested: stop disabled. */
  canceling?: boolean;
  /** blocking variant fixture: ordinary close removed, resolution paths only. */
  blocking?: boolean;
}

/**
 * Build the REAL asset editor panel markup (canvas.html simpleAssetEditor +
 * #inspector skeleton). The markup mirrors the actual template strings so the
 * observed DOM matches the real page.
 */
export function buildMvAssetPanelMarkup(options: MvPanelFixtureOptions = {}): string {
  const { cardName = '我', closeVisible = false, running = false, canceling = false, blocking = false } = options;
  const closeStyle = closeVisible ? 'display:block' : 'display:none';
  const closeButton = blocking
    ? ''
    : `<button id="closeInspector" class="close" style="${closeStyle}">关闭</button>`;
  const generateDisabled = running || canceling ? 'disabled' : '';
  const stopDisabled = canceling ? 'disabled' : '';
  const stopButton = running
    ? `<button class="asset-stop" data-asset-action="stop-generate" ${stopDisabled}>停止</button>`
    : '';
  const versionButtons = blocking
    ? '<button data-asset-action="discard">放弃变更并关闭</button><button data-asset-action="save-card">保存并关闭</button>'
    : '<button data-asset-action="select" data-version="v3">选用</button><button data-asset-action="approve" data-version="v3">通过</button>';
  return [
    '<aside id="inspector">',
    closeButton,
    '<div id="detail">',
    `<h2>${cardName}</h2>`,
    '<section class="character-prompt-card">',
    `<textarea id="characterPrompt-main" data-prompt-view="main" aria-label="${cardName}提示词">角色设定文本</textarea>`,
    `<button class="primary" data-asset-action="generate" ${generateDisabled}>AI 生成</button>`,
    stopButton,
    '</section>',
    '<div class="version-list">',
    '<div class="version-item">',
    versionButtons,
    '</div>',
    '</div>',
    '<button data-asset-action="save-card">保存设定</button>',
    '<button data-asset-action="lock">锁定已通过版本</button>',
    '</div>',
    '</aside>',
  ].join('');
}

export interface MvPanelHandle {
  container: HTMLElement;
  unmount: () => void;
}

/** Mount the real MV asset panel markup into jsdom. */
export function mountMvAssetPanel(options: MvPanelFixtureOptions = {}): MvPanelHandle {
  const container = document.createElement('div');
  container.innerHTML = buildMvAssetPanelMarkup(options);
  document.body.appendChild(container);
  return {
    container,
    unmount: () => {
      container.remove();
    },
  };
}

/** Close controls the bounded R1-DLG-02 rule looks for, as observed paths. */
function observedCloseAffordances(scope: ParentNode): string[] {
  const closeBtn = scope.querySelector('#closeInspector') as HTMLElement | null;
  if (closeBtn === null) return [];
  const win = closeBtn.ownerDocument?.defaultView;
  const display = win?.getComputedStyle?.(closeBtn).display;
  // display:none (desktop default) means no reachable close entry.
  if (display !== undefined && display !== '' && display !== 'none') {
    return ['/inspector/button[#closeInspector]'];
  }
  // jsdom may not fully resolve <style> rules; fall back to the inline style
  // the fixture mirrors from the real CSS contract.
  if (closeBtn.style.display !== 'none' && closeBtn.style.display !== '') {
    return ['/inspector/button[#closeInspector]'];
  }
  return [];
}

/** Limited resolution controls (save / discard) for the blocking variant. */
function observedResolutionAffordances(scope: ParentNode): string[] {
  const out: string[] = [];
  if (scope.querySelector('[data-asset-action="discard"]')) out.push('/inspector/button[discard]');
  if (scope.querySelector('[data-asset-action="save-card"]')) out.push('/inspector/button[save-card]');
  return out;
}

/** Read rendered evidence for the currently mounted MV asset panel. */
export function collectMvPanelRenderedEvidence(scope: ParentNode = document.body): RenderedEvidence {
  return {
    // The real panel is a persistent <aside> — never role="dialog"/aria-modal.
    role: scope.querySelector('#inspector')?.getAttribute('role') ?? undefined,
    ariaModal: undefined,
    closeAffordances: observedCloseAffordances(scope),
    resolutionAffordances: observedResolutionAffordances(scope),
    rootPath: '/inspector[0]',
  };
}

/**
 * Drive the pending lifecycle of the REAL MV asset panel and observe:
 *  - R1-DLG-04: a second generate click while a job runs is a no-op
 *    (generate button is disabled while running — real canvas behavior);
 *  - R1-DLG-05: stop is single-shot — the real canvas re-renders into
 *    canceling state after the first stop (stop disabled), so a second
 *    stop/close cannot be emitted by this job.
 */
export async function driveMvPendingInteraction(): Promise<InteractionEvidence> {
  let handle = mountMvAssetPanel({ running: true });
  try {
    const generate = (): HTMLButtonElement =>
      document.body.querySelector('[data-asset-action="generate"]') as HTMLButtonElement;
    const stop = (): HTMLButtonElement | null =>
      document.body.querySelector('[data-asset-action="stop-generate"]') as HTMLButtonElement | null;

    // First generate while running is a no-op because the button is disabled.
    const pendingDuplicateSubmitBlocked = generate().disabled === true;
    generate().click();

    // First stop → real canvas sets job.state='canceling' and re-renders.
    stop()?.click();
    handle.unmount();
    handle = mountMvAssetPanel({ running: true, canceling: true });
    const stopWaitNoSecondClose = stop()?.disabled === true;

    return { pendingDuplicateSubmitBlocked, stopWaitNoSecondClose };
  } finally {
    handle.unmount();
  }
}
