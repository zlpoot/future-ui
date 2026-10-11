/**
 * create-future-ui 模板 · AI 规范共享库（Node-only，R3-WIN-02 / Issue #108）。
 *
 * 所有事实都从「已安装的真实 RC 资产」派生，禁止把版本/入口硬编码成会漂移的
 * 常量（历史教训：shadcn-descriptor 曾硬编码 0.0.0，实际 RC 为 0.1.0-rc.1）：
 *  - 包版本：直接读 node_modules/<pkg>/package.json（不经模块 exports，无子路径限制）；
 *  - 浏览器入口：动态 import('@future-ui/shadcn-adapter/browser')，读取真实导出与 D15 映射；
 *  - Project Profile：从 browser 导出的 editDialogProfile.identity 读取。
 *
 * 本目录任何文件都不进入 Browser bundle；Browser 只导入
 * `@future-ui/shadcn-adapter/browser` 等浏览器安全入口。
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** 工程根：ai/ 的上一级。 */
export const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Browser-safe 入口（权威，来自 shadcn-adapter 包的 exports ./browser）。 */
export const BROWSER_MODULE = '@future-ui/shadcn-adapter/browser';

/** 参与 AI 规范的 4 个 RC 包（依赖声明的 @future-ui/* 只读集合）。 */
export const UI_PACKAGES = [
  '@future-ui/contracts',
  '@future-ui/react-provider',
  '@future-ui/theme',
  '@future-ui/shadcn-adapter',
];

/** 当前已声明支持的组件目录（与 ai-dev D15 映射的 componentType 一致）。 */
export const KNOWN_COMPONENTS = [
  { componentType: 'future-ui.dialog', exports: ['EditDialog'] },
  { componentType: 'future-ui.button', exports: ['ShadcnButton'] },
  { componentType: 'future-ui.text-input', exports: ['ShadcnTextInput'] },
];

export function readJson(filePath) {
  const text = readFileSync(filePath, 'utf8');
  // 容忍编辑器写出的 UTF-8 BOM（JSON.parse 不接受 BOM）
  return JSON.parse(text.replace(/^\uFEFF/, ''));
}

export function projectPackageJson() {
  return readJson(join(PROJECT_ROOT, 'package.json'));
}

/** 已安装包元数据（fs 直读，不经 exports）。未安装返回 null。 */
export function installedPackageMeta(name) {
  const dir = join(PROJECT_ROOT, 'node_modules', ...name.split('/'));
  const pkgPath = join(dir, 'package.json');
  return existsSync(pkgPath) ? readJson(pkgPath) : null;
}

/** 已安装 @future-ui/theme 的 dist/theme.css 是否存在。 */
export function themeCssInstalled() {
  const dir = join(PROJECT_ROOT, 'node_modules', '@future-ui', 'theme', 'dist');
  return existsSync(join(dir, 'theme.css'));
}

/** 动态读取 browser 安全入口的真实导出（返回模块对象；失败抛错并附诊断）。 */
export async function loadBrowserSurface() {
  const mod = await import(BROWSER_MODULE);
  return mod;
}

/** 从 browser 导出的 D15 映射派生组件支持汇总（不伪造：逐成员统计 unsupported）。 */
export function deriveComponentSupport(mapping) {
  const domains = {};
  let hasUnsupported = false;
  for (const [domain, conclusions] of Object.entries(mapping.domains ?? {})) {
    const unsupported = (conclusions ?? [])
      .filter((c) => c.status === 'unsupported')
      .map((c) => ({ member: c.member, reason: c.reason ?? null }));
    domains[domain] = { total: conclusions?.length ?? 0, unsupported };
    if (unsupported.length > 0) hasUnsupported = true;
  }
  return { status: hasUnsupported ? 'partial' : 'supported', domains, hasUnsupported };
}

/** 递归收集工程 src 下所有 .tsx/.ts 文件（仅 src，不含 node_modules）。 */
export function collectSourceFiles() {
  const out = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) out.push(p);
    }
  };
  walk(join(PROJECT_ROOT, 'src'));
  return out;
}

/**
 * 从源码文件解析 import 引用（P2-02：覆盖 ESM 全部常见静态形态）。
 * 返回条目列表，每条约含 specifier / names / kind：
 *  - named：`import { a, b as c } from 'x'`（含 `import type {...} from`、默认+具名混合）
 *  - namespace：`import * as X from 'x'`
 *  - side-effect：`import 'x'`
 *  - dynamic：静态字面量 `import('x')`（非字面量的动态 import 无法静态解析 → 不匹配，调用方按 not-covered 处理）
 */
export function parseImports(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const out = [];
  const push = (specifier, names, kind) => out.push({ file: filePath, specifier, names, kind });

  // 1) 具名 / 默认 import（含 type import 与 as 别名）
  const namedRe = /import\s+(?:type\s+)?(?:(?:[\w$]+\s*,)?\s*\{([^}]*)\}|([\w$]+))\s+from\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = namedRe.exec(text)) !== null) {
    const named = m[1];
    const names = named
      ? named
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => s.split(/\s+as\s+/)[0].trim())
      : m[2]
        ? [m[2]]
        : [];
    push(m[3], names, 'named');
  }
  // 2) namespace import：`import * as X from 'x'`
  const nsRe = /import\s+(?:type\s+)?\*\s+as\s+[\w$]+\s+from\s+['"]([^'"]+)['"]/g;
  while ((m = nsRe.exec(text)) !== null) push(m[1], [], 'namespace');
  // 3) side-effect import：`import 'x'`
  const sideRe = /import\s+['"]([^'"]+)['"]/g;
  while ((m = sideRe.exec(text)) !== null) push(m[1], [], 'side-effect');
  // 4) 静态字面量动态 import：`import('x')`
  const dynRe = /import\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((m = dynRe.exec(text)) !== null) push(m[1], [], 'dynamic');
  return out;
}

/**
 * 提取文本中 <tag ...> 的全部 JSX opening element（P2-03）。
 * 花括号/字符串/模板/注释感知：属性表达式（如回调内嵌 JSX 或 `/>`）不会提前截断；
 * 每个元素独立返回，供调用方按元素统计属性，避免"多元素只要一个含 prop 就 pass"。
 * 返回元素文本数组（以 `>` 或 `/>` 结尾）；解析失败（未闭合）的片段跳过。
 */
export function findJsxOpeningElements(text, tag) {
  const out = [];
  const re = new RegExp(`<${tag}\\b`, 'g');
  let m;
  while ((m = re.exec(text)) !== null) {
    // 前一个字符是标识符/`.` 时是其它标识符的一部分（如 MyEditDialog、Comp.EditDialog）
    if (m.index > 0 && /[A-Za-z0-9_$.]/.test(text[m.index - 1])) continue;
    const seg = extractJsxOpeningElement(text, m.index);
    if (seg) out.push(seg);
  }
  return out;
}

function extractJsxOpeningElement(text, start) {
  let i = start;
  const n = text.length;
  let inString = null;
  let depth = 0; // 花括号表达式深度（JSX 属性值 { ... }）
  while (i < n) {
    const ch = text[i];
    if (inString !== null) {
      if (ch === '\\') {
        i += 2;
        continue;
      }
      if (ch === inString) inString = null;
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inString = ch;
      i += 1;
      continue;
    }
    if (ch === '{') {
      depth += 1;
      i += 1;
      continue;
    }
    if (ch === '}') {
      depth -= 1;
      i += 1;
      continue;
    }
    if (depth === 0) {
      if (ch === '/' && text[i + 1] === '/') {
        const nl = text.indexOf('\n', i);
        i = nl === -1 ? n : nl + 1;
        continue;
      }
      if (ch === '/' && text[i + 1] === '*') {
        const end = text.indexOf('*/', i + 2);
        i = end === -1 ? n : end + 2;
        continue;
      }
      if (ch === '>') return text.slice(start, i + 1);
    }
    i += 1;
  }
  return null;
}

/** 单元素文本上某个 prop 的出现次数（`prop=` 独立词边界）。 */
export function countPropInElement(elementText, prop) {
  const re = new RegExp(`(?:^|[^\\w$])${prop}\\s*=`, 'g');
  const hits = elementText.match(re);
  return hits ? hits.length : 0;
}

/** 元素是否含展开属性 `{...props}`（该元素回调无法静态判定 → not-covered）。 */
export function elementHasSpreadProps(elementText) {
  return /\{\.\.\./.test(elementText);
}
