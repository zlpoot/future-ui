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

/** 从源码文件解析 `import ... from 'specifier'`（含 type import / as 别名），返回条目列表。 */
export function parseImports(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const out = [];
  const re = /import\s+(?:type\s+)?(?:(?:[\w$]+\s*,)?\s*\{([^}]*)\}|([\w$]+))\s+from\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(text)) !== null) {
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
    out.push({ file: filePath, specifier: m[3], names });
  }
  return out;
}
