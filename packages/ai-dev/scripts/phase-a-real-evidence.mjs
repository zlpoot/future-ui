#!/usr/bin/env node
/**
 * R1-04 (#70) Phase A — REAL-PAGE evidence collection for the MV-Auto-Editor
 * Asset Edit & Approval panel.
 *
 * Drives the real, running MV-Auto-Editor canvas (p1-server.mjs @
 * 127.0.0.1:3001, project song-20260928043747) in headless Chrome over CDP,
 * selects the REAL asset card editor node (「我」 character card) and observes
 * the REAL DOM/CSS. Emits:
 *   - docs/r1-04/evidence/mv-real-desktop.json   (1440×900 desktop layout)
 *   - docs/r1-04/evidence/mv-real-embedded.json  (?embedded=1 layout)
 *   - docs/r1-04/evidence/mv-real-desktop.png / -embedded.png (screenshots)
 *   - docs/r1-04/evidence/mv-real-evidence.json  (combined, RenderedEvidence
 *     shaped for the bounded validator + drift check vs the pinned blob)
 *
 * Usage:  node packages/ai-dev/scripts/phase-a-real-evidence.mjs
 * Prereq: MV p1-server.mjs running on 127.0.0.1:3001 (real project data).
 * Never writes to the MV repo; reads the real page only.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const repoRoot = path.resolve(import.meta.dirname, '..', '..', '..');
const outDir = path.join(repoRoot, 'docs', 'r1-04', 'evidence');
fs.mkdirSync(outDir, { recursive: true });

const MV_REPO = 'E:/projects/MV-Auto-Editor';
const PINNED_MV_HEAD = 'd77fc2b77e75cd593733daa8a7e3c31dc2df8a16';
const PINNED_CANVAS_BLOB = '52aa42c8ad7dc5217bafb7653dcc0e47ee175131';
const CARD_ID = 'asset-character-f8cb8312'; // 「我」 character card (song-20260928043747)
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9225;
const URL = 'http://127.0.0.1:3001/canvas?project=song-20260928043747';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function gitFacts() {
  const blob = spawnSync('git', ['-C', MV_REPO, 'hash-object', path.join(MV_REPO, 'web', 'canvas.html')], {
    encoding: 'utf8',
  }).stdout?.trim();
  const head = spawnSync('git', ['-C', MV_REPO, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout?.trim();
  return { liveCanvasBlob: blob || null, liveMvHead: head || null };
}

async function main() {
  const facts = gitFacts();
  const drift = {
    liveCanvasBlob: facts.liveCanvasBlob,
    pinnedCanvasBlob: PINNED_CANVAS_BLOB,
    canvasBlobDrifted: facts.liveCanvasBlob !== PINNED_CANVAS_BLOB,
    liveMvHead: facts.liveMvHead,
    pinnedMvHead: PINNED_MV_HEAD,
    mvHeadDrifted: facts.liveMvHead !== PINNED_MV_HEAD,
  };

  const chrome = spawn(
    CHROME,
    ['--headless=new', '--disable-gpu', '--no-first-run', `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${path.join(repoRoot, '.local', 'phase-a-chrome-profile')}`, '--window-size=1440,900'],
    { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] },
  );

  let ws;
  try {
    let pages;
    for (let i = 0; i < 60; i++) {
      try {
        pages = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
        if (pages.some((p) => p.type === 'page')) break;
      } catch {}
      await wait(250);
    }
    const page = pages?.find((item) => item.type === 'page');
    if (!page) throw new Error('Headless Chrome did not expose a page');
    ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });

    let next = 0;
    const pending = new Map();
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (!data.id) return;
      const task = pending.get(data.id);
      if (!task) return;
      pending.delete(data.id);
      clearTimeout(task.timer);
      data.error ? task.reject(new Error(data.error.message)) : task.resolve(data.result);
    };
    const call = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = ++next;
        const timer = setTimeout(() => reject(new Error(`CDP timeout: ${method}`)), 10000);
        pending.set(id, { resolve, reject, timer });
        ws.send(JSON.stringify({ id, method, params }));
      });
    const evaluate = async (expression) => (await call('Runtime.evaluate', { expression, returnByValue: true })).result?.value;
    await call('Runtime.enable');
    await call('Page.enable');

    /** Navigate, wait for the canvas, select the real asset card node, collect. */
    async function collectVariant(suffix) {
      await call('Page.navigate', { url: `${URL}${suffix}` });
      for (let i = 0; i < 80; i++) {
        if (await evaluate(`document.querySelectorAll('.node').length > 0`)) break;
        await wait(250);
      }
      const nodes = await evaluate(`Array.from(document.querySelectorAll('.node')).map((n) => n.dataset.id)`);
      const target = (nodes || []).find((id) => id === CARD_ID);
      if (!target) throw new Error(`asset node ${CARD_ID} not rendered; nodes=${JSON.stringify(nodes)}`);

      // REAL user path: canvas.html selects a node on pointerdown (#nodes
      // listener, line 273) — a plain .click() does NOT select.
      await evaluate(`(() => {
        const el = document.querySelector('.node[data-id=${JSON.stringify(CARD_ID)}]');
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        el.dispatchEvent(new PointerEvent('pointerdown', {
          bubbles: true, cancelable: true, isPrimary: true, pointerId: 1,
          clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2,
        }));
        return true;
      })()`);
      await wait(900);

      const raw = await evaluate(`(() => {
        const insp = document.querySelector('#inspector');
        const close = document.querySelector('#closeInspector');
        const detail = document.querySelector('#detail');
        const closeDisplay = close ? getComputedStyle(close).display : '(absent)';
        return {
          inspectorRole: insp ? (insp.getAttribute('role') || '(none)') : '(absent)',
          closeExists: !!close,
          closeDisplay,
          panelTitle: detail?.querySelector('h2')?.textContent || '(none)',
          panelIntro: detail?.querySelector('p.muted')?.textContent || '(none)',
          actionButtons: Array.from(detail?.querySelectorAll('button[data-asset-action]') || [])
            .map((b) => ({ action: b.dataset.assetAction, text: b.textContent.trim(), disabled: b.disabled })),
          versionRows: Array.from(detail?.querySelectorAll('.version-item, .version-row') || [])
            .slice(0, 6).map((r) => r.textContent.trim().replace(/\\s+/g, ' ').slice(0, 120)),
          bodyClass: document.documentElement.className,
          innerWidth: window.innerWidth,
        };
      })()`);

      const closeAffordances =
        raw.closeExists && raw.closeDisplay !== 'none' && raw.closeDisplay !== '' && raw.closeDisplay !== '(absent)'
          ? ['/inspector/button[#closeInspector]']
          : [];
      const evidence = {
        kind: 'rendered',
        instanceId: `assets/cards/${CARD_ID.replace('asset-', '')}/edit`,
        role: raw.inspectorRole === '(none)' ? undefined : raw.inspectorRole,
        ariaModal: undefined,
        closeAffordances,
        resolutionAffordances: [],
        rootPath: '/inspector[0]',
        raw,
      };

      const shot = await call('Page.captureScreenshot', { format: 'png' });
      const pngPath = path.join(outDir, `mv-real-${suffix.includes('embedded') ? 'embedded' : 'desktop'}.png`);
      fs.writeFileSync(pngPath, Buffer.from(shot.data, 'base64'));
      return { evidence, screenshot: pngPath };
    }

    const desktop = await collectVariant('');
    const embedded = await collectVariant('&embedded=1');

    const combined = {
      project: 'song-20260928043747',
      card: CARD_ID,
      collectedAt: new Date().toISOString(),
      pinned: { mvHead: PINNED_MV_HEAD, canvasBlob: PINNED_CANVAS_BLOB },
      drift,
      variants: { desktop: desktop.evidence, embedded: embedded.evidence },
      screenshots: { desktop: desktop.screenshot, embedded: embedded.screenshot },
    };
    fs.writeFileSync(path.join(outDir, 'mv-real-desktop.json'), JSON.stringify(desktop.evidence, null, 2));
    fs.writeFileSync(path.join(outDir, 'mv-real-embedded.json'), JSON.stringify(embedded.evidence, null, 2));
    fs.writeFileSync(path.join(outDir, 'mv-real-evidence.json'), JSON.stringify(combined, null, 2));

    console.log(JSON.stringify(combined, null, 2));
  } finally {
    ws?.close();
    chrome.kill();
  }
}

main().catch((err) => {
  console.error(`phase-a-real-evidence failed: ${err.message}`);
  process.exit(1);
});
