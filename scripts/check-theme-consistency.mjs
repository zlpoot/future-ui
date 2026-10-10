/**
 * R3-RC-001 (#104) · P2-02 · Light/Dark token 最小一致性检查。
 *
 * packages/theme/src/theme.css 与 examples/material-editor/src/themes.ts
 * 是同一 D08 视觉数据源的两份载体（RC 归档消费 theme.css；R2 示例消费
 * themes.ts）。本检查解析两处的 --future-ui-* token 值并逐项比对，
 * 防止任一载体单独修改导致视觉静默漂移。不一致即 exit 1。
 *
 * 最小范围：12 light + 12 dark token 值比对；不重构 Theme 系统。
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(root, 'packages/theme/src/theme.css'), 'utf8');
const ts = readFileSync(join(root, 'examples/material-editor/src/themes.ts'), 'utf8');

/** 从 CSS 提取 { light: {token:value}, dark: {...} } */
function parseCss(src) {
  const out = { light: {}, dark: {} };
  // :root, [data-theme='light'] { ... } 与 [data-theme='dark'] { ... }
  const blockRe = /(?::root\s*,\s*)?\[data-theme='(light|dark)'\]\s*\{([^}]*)\}/g;
  let m;
  while ((m = blockRe.exec(src))) {
    const theme = m[1];
    for (const line of m[2].split('\n')) {
      const t = line.match(/^\s*(--future-ui-[a-z-]+)\s*:\s*([^;]+);/);
      if (t) out[theme][t[1]] = t[2].trim();
    }
  }
  return out;
}

/** 从 TS 提取 { light: {token:value}, dark: {...} }（name: 'light' 块内的 tokens） */
function parseTs(src) {
  const out = { light: {}, dark: {} };
  const blockRe = /name:\s*'(light|dark)',\s*tokens:\s*\{([^}]*)\}/g;
  let m;
  while ((m = blockRe.exec(src))) {
    const theme = m[1];
    for (const line of m[2].split('\n')) {
      const t = line.match(/^\s*'(--future-ui-[a-z-]+)'\s*:\s*'([^']+)',?/);
      if (t) out[theme][t[1]] = t[2].trim();
    }
  }
  return out;
}

const cssTokens = parseCss(css);
const tsTokens = parseTs(ts);

let failures = 0;
for (const theme of ['light', 'dark']) {
  const cssKeys = Object.keys(cssTokens[theme]).sort();
  const tsKeys = Object.keys(tsTokens[theme]).sort();
  if (cssKeys.join(',') !== tsKeys.join(',')) {
    failures++;
    console.error(`[${theme}] token 集合不一致`);
    console.error(`  css: ${cssKeys.join(',')}`);
    console.error(`  ts : ${tsKeys.join(',')}`);
  }
  for (const key of cssKeys) {
    if (cssTokens[theme][key] !== tsTokens[theme][key]) {
      failures++;
      console.error(`[${theme}] ${key}: css=${cssTokens[theme][key]} ts=${tsTokens[theme][key]}`);
    }
  }
}

const expectedLight = 12;
const expectedDark = 12;
if (Object.keys(cssTokens.light).length !== expectedLight || Object.keys(cssTokens.dark).length !== expectedDark) {
  failures++;
  console.error(`token 数量异常: css light=${Object.keys(cssTokens.light).length} dark=${Object.keys(cssTokens.dark).length}（期望 ${expectedLight}/${expectedDark}）`);
}

if (failures > 0) {
  console.error(`\n=== check:theme FAILED (${failures}) ===`);
  process.exit(1);
}
console.log(`check:theme PASS — light ${expectedLight} + dark ${expectedDark} token 值与 themes.ts 完全一致`);
