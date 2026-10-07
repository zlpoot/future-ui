/**
 * R1-04 (#70) Phase A — MV-Auto-Editor pinned upstream identity + INDEPENDENT
 * current-facts reader for the A-Gate drift guard.
 *
 * Why this exists (second-review correction, residual P1-2): the gate must not
 * trust only the booleans baked into the collected evidence file — those were
 * computed at collection time, so a clean file collected yesterday still says
 * false/false after MV moves today. The gate therefore RE-DERIVES the current
 * upstream facts itself (real `git`, against the live MV checkout) and compares
 * them against the pinned exact values AND the evidence's recorded values, so a
 * stale or pre-written evidence file can never pass.
 *
 * Dev-host only (ai-dev): uses node child_process; never runs in a browser or
 * in the UI production dependency graph.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';

/** Absolute path of the real MV-Auto-Editor checkout the gate validates. */
export const MV_REPO_PATH = 'E:/projects/MV-Auto-Editor';

/** Path of the adapted page inside the MV repo. */
export const MV_CANVAS_REL_PATH = path.join('web', 'canvas.html');

/**
 * Pinned exact MV commit under which Phase A was collected. Must equal
 * `d77fc2b…` (parent `7cc09cb…`) and the PINNED_MV_HEAD constant in
 * scripts/phase-a-real-evidence.mjs.
 */
export const PINNED_MV_HEAD = 'd77fc2b77e75cd593733daa8a7e3c31dc2df8a16';

/**
 * Pinned web/canvas.html blob (git hash-object). This is the same value as
 * MV_UPSTREAM.sourceCommit in ./mv-view.ts and PINNED_CANVAS_BLOB in the
 * collector script.
 */
export const PINNED_MV_CANVAS_BLOB = '52aa42c8ad7dc5217bafb7653dcc0e47ee175131';

/**
 * Current upstream facts, obtained INDEPENDENTLY by the gate right now (not
 * read from the evidence file). A field is null when git cannot resolve it
 * (missing repo / command failure) — the guard treats null as fail-closed.
 */
export interface MvCurrentUpstream {
  /** Current `git hash-object web/canvas.html` in the live checkout. */
  canvasBlob: string | null;
  /** Current `git rev-parse HEAD` of the live checkout. */
  mvHead: string | null;
}

function git(mvRepoDir: string, args: string[]): string | null {
  const result = spawnSync('git', ['-C', mvRepoDir, ...args], { encoding: 'utf8' });
  if (result.status !== 0) return null;
  const out = result.stdout?.trim();
  return out ? out : null;
}

/**
 * Independently read the CURRENT MV HEAD and web/canvas.html blob from the real
 * checkout. This is the gate's own fact source, deliberately separate from the
 * collected evidence so upstream movement after collection cannot be hidden by
 * a stale false/false drift record.
 */
export function readMvCurrentUpstream(mvRepoDir: string = MV_REPO_PATH): MvCurrentUpstream {
  const canvasBlob = git(mvRepoDir, ['hash-object', path.join(mvRepoDir, MV_CANVAS_REL_PATH)]);
  const mvHead = git(mvRepoDir, ['rev-parse', 'HEAD']);
  return { canvasBlob, mvHead };
}
