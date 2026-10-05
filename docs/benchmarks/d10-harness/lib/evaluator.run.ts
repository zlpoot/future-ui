// @vitest-environment jsdom
/**
 * d10-harness · evaluator.run.ts — 组中立隐藏判定（最终裁判）。
 *
 * 与实验组的 ui.test 无关：判定逻辑在 harness 侧实现，两组跑同一份 golden 断言；
 * 使用 harness 自身副本 render.js（workspace 内被模型改过的 render.js 无效）。
 *
 * 环境变量：
 *   EVAL_WORKSPACE   workspace 目录（含最终 spec.json）
 *   EVAL_GOLDEN      golden 断言 JSON 路径
 *   EVAL_OUTPUT      结果 JSON 输出路径
 * 退出：vitest 运行本身恒 0；判定结果写入 EVAL_OUTPUT。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { render } from './render.js';

interface StructureExpect {
  tag?: string;
  part?: string;
  text?: string;
  attrs?: Record<string, string | null>; // null => 属性必须不存在
  absent?: boolean; // true => 该路径节点必须不存在
}
interface StructureCheck {
  id: string;
  type: 'structure';
  path: string;
  expect: StructureExpect;
}
interface InteractionCheck {
  id: string;
  type: 'interaction';
  action: { kind: 'click' | 'change'; target?: string; value?: string };
  expect: { event?: 'click' | 'change' | null; state?: Record<string, unknown> };
}
interface StateCheck {
  id: string;
  type: 'state';
  path: string;
  state: Record<string, unknown>;
}
type Check = StructureCheck | InteractionCheck | StateCheck;

interface Golden {
  taskId: string;
  family: string;
  checks: Check[];
}

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`missing env ${name}`);
  return v;
}

/** 读文本并剥离 UTF-8 BOM（Windows 工具链产物可能带 BOM）。 */
function readText(p: string): string {
  return readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
}

function collectMap(root: HTMLElement): Map<string, Element> {
  const map = new Map<string, Element>();
  const walk = (node: Element, path: string): void => {
    map.set(path, node);
    const counts: Record<string, number> = {};
    for (let i = 0; i < node.children.length; i += 1) {
      const child = node.children[i];
      const tag = child.tagName.toLowerCase();
      const idx = counts[tag] ?? 0;
      counts[tag] = idx + 1;
      walk(child, `${path}/${tag}[${idx}]`);
    }
  };
  walk(root, '');
  return map;
}

function readState(el: Element, key: string): unknown {
  switch (key) {
    case 'disabled':
      return (el as HTMLButtonElement | HTMLSelectElement | HTMLInputElement).disabled;
    case 'value':
      return (el as HTMLSelectElement | HTMLInputElement).value;
    case 'aria-busy':
      return el.getAttribute('aria-busy');
    case 'aria-invalid':
      return el.getAttribute('aria-invalid');
    case 'aria-label':
      return el.getAttribute('aria-label');
    case 'placeholder':
      return (el as HTMLInputElement).placeholder ?? null;
    case 'readOnly':
      return (el as HTMLInputElement).readOnly;
    case 'type':
      return (el as HTMLButtonElement).type;
    case 'text':
      return el.textContent;
    default:
      return undefined;
  }
}

function structureCheck(check: StructureCheck, map: Map<string, Element>): { ok: boolean; actual?: unknown } {
  if (check.expect.absent === true) {
    const exists = map.has(check.path);
    return exists ? { ok: false, actual: { error: `node '${check.path}' should be absent but exists` } } : { ok: true };
  }
  const node = map.get(check.path);
  if (!node) return { ok: false, actual: { error: `node path '${check.path}' not found` } };
  const actual: Record<string, unknown> = {};
  const mismatches: string[] = [];
  const tag = node.tagName.toLowerCase();
  const part = node.getAttribute('data-part') ?? undefined;
  const text = node.textContent ?? '';

  if (check.expect.tag !== undefined && check.expect.tag !== tag) {
    mismatches.push('tag');
    actual.tag = tag;
  }
  if (check.expect.part !== undefined && check.expect.part !== part) {
    mismatches.push('part');
    actual.part = part;
  }
  if (check.expect.text !== undefined && check.expect.text !== text) {
    mismatches.push('text');
    actual.text = text;
  }
  if (check.expect.attrs !== undefined) {
    for (const [name, value] of Object.entries(check.expect.attrs)) {
      const got = node.getAttribute(name);
      if (value === null) {
        if (got !== null) {
          mismatches.push(`attrs.${name}(should be absent)`);
          actual[`attrs.${name}`] = got;
        }
      } else if (got !== value) {
        mismatches.push(`attrs.${name}`);
        actual[`attrs.${name}`] = got;
      }
    }
  }
  if (mismatches.length > 0) return { ok: false, actual };
  return { ok: true };
}

describe('evaluator', () => {
  it('runs golden checks against the final workspace spec', () => {
    const workspace = env('EVAL_WORKSPACE');
    const goldenPath = env('EVAL_GOLDEN');
    const outPath = env('EVAL_OUTPUT');

    const golden: Golden = JSON.parse(readText(goldenPath));
    const spec = JSON.parse(readText(join(workspace, 'spec.json')));

    const container = document.createElement('div');
    document.body.appendChild(container);
    render(spec, container);
    const map = collectMap(container);

    // 事件记录：click/change 监听（disabled 时按契约语义不投递）
    const clickLog: string[] = [];
    const changeLog: { path: string; value: string }[] = [];
    for (const [path, el] of map.entries()) {
      el.addEventListener('click', () => clickLog.push(path));
      if (el.tagName.toLowerCase() === 'select') {
        el.addEventListener('change', () => changeLog.push({ path, value: (el as HTMLSelectElement).value }));
      }
    }

    const results: { checkId: string; ok: boolean; actual?: unknown }[] = [];
    for (const check of golden.checks) {
      if (check.type === 'structure') {
        const r = structureCheck(check, map);
        results.push({ checkId: check.id, ok: r.ok, actual: r.actual });
        continue;
      }
      if (check.type === 'state') {
        const node = map.get(check.path);
        if (!node) {
          results.push({ checkId: check.id, ok: false, actual: { error: `path '${check.path}' not found` } });
          continue;
        }
        const actual: Record<string, unknown> = {};
        const mismatches: string[] = [];
        for (const [key, value] of Object.entries(check.state)) {
          const got = readState(node, key);
          if (got !== value) {
            mismatches.push(`state.${key}`);
            actual[`state.${key}`] = got;
          }
        }
        results.push({ checkId: check.id, ok: mismatches.length === 0, actual: mismatches.length > 0 ? actual : undefined });
        continue;
      }
      // interaction
      const targetPath = check.action.target ?? '/button[0]';
      const target = map.get(targetPath);
      if (!target) {
        results.push({ checkId: check.id, ok: false, actual: { error: `target '${targetPath}' not found` } });
        continue;
      }
      const logBeforeC = clickLog.length;
      const logBeforeV = changeLog.length;
      let suppressed = false;
      if (check.action.kind === 'click') {
        (target as HTMLElement).click(); // jsdom: disabled 元素不派发 click
      } else {
        const select = target as HTMLSelectElement;
        if (select.disabled) suppressed = true; // 契约语义：disabled 不投递 change
        if (!suppressed) {
          select.value = check.action.value ?? '';
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      const expectedEvent = check.expect.event;
      const gotEvent =
        check.action.kind === 'click'
          ? (clickLog.length > logBeforeC ? 'click' : null)
          : (changeLog.length > logBeforeV ? 'change' : null);
      const actual: Record<string, unknown> = { event: gotEvent };
      const mismatches: string[] = [];
      if (expectedEvent !== undefined && gotEvent !== expectedEvent) mismatches.push('event');
      if (check.expect.state !== undefined) {
        for (const [key, value] of Object.entries(check.expect.state)) {
          const got = readState(target, key);
          if (got !== value) {
            mismatches.push(`state.${key}`);
            actual[`state.${key}`] = got;
          }
        }
      }
      results.push({ checkId: check.id, ok: mismatches.length === 0, actual: mismatches.length > 0 ? actual : undefined });
    }

    const passed = results.filter((r) => r.ok).length;
    const summary = { total: results.length, passed, failed: results.length - passed };
    const verdict = { taskId: golden.taskId, family: golden.family, pass: passed === results.length, summary, results };
    writeFileSync(outPath, JSON.stringify(verdict, null, 2), 'utf8');
    expect(passed).toBe(results.length); // vitest 层面也给出通过/失败信号
    container.remove();
  });
});
