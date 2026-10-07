#!/usr/bin/env node
/**
 * R1-04 (#70) Phase B — REAL-PAGE rendered-fact collection for the
 * MV-Auto-Editor Storyboard (P4) and Keyframe (P5) review pages.
 *
 * Drives the real running MV-Auto-Editor (p1-server.mjs @ 127.0.0.1:3001,
 * project song-20260928043747) in headless Chrome over CDP and OBSERVES the
 * REAL DOM only. It never clicks approve/reject/select/retry/lock/upload and
 * never posts anything, so the real project data is never mutated.
 *
 * The facts collected are RENDERED facts. Because the frozen BOUNDED_RULES set
 * has NO button/text-input rule, these facts are not sealed as a future-ui
 * interaction-verified pass anywhere; they document what the real pages render
 * (and, honestly, what the current project state lacks: jobs=[] / no retry).
 *
 * FAIL-CLOSED drift gate (same discipline as Phase A): before launching Chrome
 * it independently reads the CURRENT MV HEAD and the CURRENT blob of ALL THREE
 * pinned pages (canvas/shots/keyframes). Any drift — or an unresolvable git
 * fact — aborts BEFORE collection and leaves no evidence behind.
 *
 * Usage:  node packages/ai-dev/scripts/phase-b-real-evidence.mjs
 * Prereq: MV p1-server.mjs running on http://127.0.0.1:3001 (read-only GET).
 * Never writes to the MV repo; reads the real pages only; no model, no API.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const repoRoot = path.resolve(import.meta.dirname, '..', '..', '..');
const outDir = path.join(repoRoot, 'docs', 'r1-04', 'evidence');
fs.mkdirSync(outDir, { recursive: true });

const MV_REPO = 'E:/projects/MV-Auto-Editor';
const PINNED_MV_HEAD = 'd77fc2b77e75cd593733daa8a7e3c31dc2df8a16';
const PINS = [
  { rel: 'web/canvas.html', flag: 'canvasBlob', short: 'canvas' },
  { rel: 'web/keyframes.html', flag: 'keyframesBlob', short: 'keyframes' },
  { rel: 'web/shots.html', flag: 'shotsBlob', short: 'shots' },
];
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9226;
const PROJECT = 'song-20260928043747';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const git = (args) => {
  const r = spawnSync('git', ['-C', MV_REPO, ...args], { encoding: 'utf8' });
  const out = r.status === 0 ? r.stdout?.trim() : '';
  return out || null;
};

function currentFacts() {
  const current = { mvHead: git(['rev-parse', 'HEAD']) };
  for (const p of PINS) current[p.flag] = git(['hash-object', path.join(MV_REPO, p.rel)]);
  return current;
}

function assertAtPins(current) {
  const problems = [];
  if (!current.mvHead) problems.push('MV HEAD unresolvable');
  else if (current.mvHead !== PINNED_MV_HEAD) problems.push(`MV HEAD moved (${current.mvHead})`);
  for (const p of PINS) {
    const live = current[p.flag];
    if (!live) {
      problems.push(`${p.rel} blob unresolvable`);
      continue;
    }
    const expected = PIN_LOOKUP[p.rel];
    if (live !== expected) problems.push(`${p.rel} blob drifted (${live.slice(0, 7)} pinned ${expected.slice(0, 7)})`);
  }
  if (problems.length > 0) {
    throw new Error(
      `upstream drift detected — ${problems.join('; ')}. Refusing to collect Phase B evidence; `
      + 'no evidence written. Re-pin deliberately (and review) before collecting again.',
    );
  }
}

// Exact pins (also defined in mv-upstream.ts); kept literal here so the
// standalone collector has no build dependency.
const PIN_LOOKUP = {
  'web/canvas.html': '52aa42c8ad7dc5217bafb7653dcc0e47ee175131',
  'web/keyframes.html': 'c8522aaca047e9fd8c2b08c3584d35a61ced9bc9',
  'web/shots.html': '64f8cd2864d3f7addc17531b24788a352b9d7823',
};

async function main() {
  const current = currentFacts();
  assertAtPins(current);

  const chrome = spawn(
    CHROME,
    ['--headless=new', '--disable-gpu', '--no-first-run', `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${path.join(repoRoot, '.local', 'phase-b-chrome-profile')}`, '--window-size=1440,900'],
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
    const page = pages?.find((p) => p.type === 'page');
    if (!page) throw new Error('Headless Chrome did not expose a page');
    ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

    let next = 0;
    const pending = new Map();
    ws.onmessage = (e) => {
      const d = JSON.parse(e.data);
      if (!d.id) return;
      const t = pending.get(d.id);
      if (!t) return;
      pending.delete(d.id);
      clearTimeout(t.timer);
      if (d.error) t.reject(new Error(d.error.message));
      else t.resolve(d.result);
    };
    const call = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++next;
      const timer = setTimeout(() => reject(new Error(`CDP timeout: ${method}`)), 10000);
      pending.set(id, { resolve, reject, timer });
      ws.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async (expr) => (await call('Runtime.evaluate', { expression: expr, returnByValue: true })).result?.value;
    await call('Runtime.enable');
    await call('Page.enable');

    async function observe(url, expr, name, selectFirstShot) {
      await call('Page.navigate', { url });
      await wait(2500); // let the inline script fetch its real data
      if (selectFirstShot) {
        // Selecting a shot is a PURE in-page state change (a click on
        // button.shot[data-shot]); it performs no POST and cannot mutate data.
        const clicked = await evaluate(`(() => {
          const b = document.querySelector('button.shot[data-shot]');
          if (!b) return false;
          b.click();
          return true;
        })()`);
        if (!clicked) throw new Error(`first shot selector not found on ${url}`);
        await wait(600);
      }
      const facts = await evaluate(expr);
      const shot = await call('Page.captureScreenshot', { format: 'png' });
      const pngPath = path.join(outDir, `mv-real-phase-b-${name}.png`);
      fs.writeFileSync(pngPath, Buffer.from(shot.data, 'base64'));
      return { facts, screenshot: pngPath, url };
    }

    const p5Expr = `(() => ({
      hasDialogRole: !!document.querySelector('[role="dialog"]'),
      hasCloseEntry: !!document.querySelector('[data-close],button.close,#closeInspector'),
      approveButtons: document.querySelectorAll('button[data-action="approve"]').length,
      rejectButtons: document.querySelectorAll('button[data-action="reject"]').length,
      selectButtons: document.querySelectorAll('button[data-action="select"]').length,
      retryButtons: document.querySelectorAll('button[data-action="retry"]').length,
      cancelButtons: document.querySelectorAll('button[data-action="cancel"]').length,
      failButtons: document.querySelectorAll('button[data-action="fail"]').length,
      lockPresent: !!document.querySelector('#lock'),
      uploadPresent: !!document.querySelector('#upload'),
      fileInputPresent: !!document.querySelector('#uploadFile[type=file]'),
      jobRows: document.querySelectorAll('.job').length,
      location: location.pathname,
    }))()`;
    const p4Expr = `(() => ({
      hasDialogRole: !!document.querySelector('[role="dialog"]'),
      hasCloseEntry: !!document.querySelector('[data-close],button.close,#closeInspector'),
      savePresent: !!document.querySelector('#save'),
      resetPresent: !!document.querySelector('#reset'),
      makePromptPresent: !!document.querySelector('#makePrompt'),
      prevPresent: !!document.querySelector('#prev'),
      nextPresent: !!document.querySelector('#next'),
      draftFieldIds: ['intent','notes','composition','generationPrompt','start','anchor']
        .filter((id) => !!document.querySelector('#'+id)),
      location: location.pathname,
    }))()`;

    const p5 = await observe(`http://127.0.0.1:3001/keyframes?project=${PROJECT}`, p5Expr, 'p5-keyframes', true);
    const p4 = await observe(`http://127.0.0.1:3001/shots?project=${PROJECT}`, p4Expr, 'p4-shots', true);

    const combined = {
      project: PROJECT,
      collectedAt: new Date().toISOString(),
      readOnly: true,
      pinned: { mvHead: PINNED_MV_HEAD, blobs: PIN_LOOKUP },
      current,
      p5,
      p4,
    };
    fs.writeFileSync(path.join(outDir, 'mv-real-phase-b-evidence.json'), JSON.stringify(combined, null, 2));
    console.log(JSON.stringify(combined, null, 2));
  } finally {
    if (ws) ws.close();
    chrome.kill();
  }
}

main().catch((err) => {
  console.error(`phase-b-real-evidence failed: ${err.message}`);
  process.exit(1);
});
