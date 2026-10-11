/**
 * create-future-ui 模板 · `ai:doctor`（R3-WIN-02 / Issue #108）。
 *
 * 检查已安装包、版本、Profile、浏览器导入路径是否与工程声明匹配。
 * 全部为只读检查，不执行任何业务操作；输出机器可解析 JSON。
 *
 * 用法：`node ai/ai-doctor.mjs`（或 `npm run ai:doctor` / `pnpm ai:doctor`）。
 * 退出码：0 = 全部通过；非零 = 至少一项诊断（附修复建议）。
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  PROJECT_ROOT,
  BROWSER_MODULE,
  UI_PACKAGES,
  KNOWN_COMPONENTS,
  projectPackageJson,
  installedPackageMeta,
  loadBrowserSurface,
  collectSourceFiles,
  parseImports,
  themeCssInstalled,
} from './project-info.mjs';

/** 从 file:vendor/<tgz> 引用中提取期望版本；非 file: 形态返回 null（按 not-covered 处理）。 */
const VENDOR_PACKAGE_NAMES = [
  'future-ui-contracts',
  'future-ui-react-provider',
  'future-ui-theme',
  'future-ui-shadcn-adapter',
];

function expectedVersionFromDeclaration(declared) {
  if (!declared || !declared.startsWith('file:')) return null;
  const m = /([^/\\]+)\.tgz$/.exec(declared);
  if (!m) return null;
  const fileName = m[1];
  // tgz 命名 = <已知包名>-<version>.tgz；按完整包名剥离前缀取版本，
  // 避免把包名内的连字符误当作版本分隔（如 future-ui-shadcn-adapter-0.1.0-rc.1）。
  for (const known of VENDOR_PACKAGE_NAMES) {
    if (fileName.startsWith(`${known}-`)) return fileName.slice(known.length + 1);
  }
  return null;
}

async function main() {
  const pkg = projectPackageJson();
  const checks = [];
  const fail = (id, level, detail, fix) => checks.push({ id, verdict: level, detail, fix });
  const pass = (id, detail) => checks.push({ id, verdict: 'pass', detail });

  // 1) 每个 UI 包：声明 vs 实际安装版本
  for (const name of UI_PACKAGES) {
    const declared = pkg.dependencies?.[name] ?? null;
    const meta = installedPackageMeta(name);
    if (!meta) {
      fail(`dep-${name}`, 'diagnose', `未安装 ${name}`, `运行依赖安装（pnpm install / npm install）后再执行`);
      continue;
    }
    const expected = expectedVersionFromDeclaration(declared);
    if (expected !== null) {
      if (meta.version === expected) {
        pass(`dep-${name}`, `${name} 声明 ${expected} = 实际安装 ${meta.version}`);
      } else {
        fail(
          `dep-${name}`,
          'diagnose',
          `${name} 声明 ${declared}（期望 ${expected}），实际安装 ${meta.version}`,
          `重新安装与声明一致的归档，避免版本漂移（如历史 0.0.0 vs 实际 0.1.0-rc.1）`,
        );
      }
    } else {
      checks.push({
        id: `dep-${name}`,
        verdict: 'pass',
        detail: `${name} 声明 ${declared ?? '（未声明）'}，实际安装 ${meta.version}`,
        note: 'registry semver 形态：仅报告实际安装版本；精确一致性以 file:vendor 归档形态为准',
      });
    }
  }

  // 2) file:vendor 引用的归档真实存在
  for (const [name, declared] of Object.entries(pkg.dependencies ?? {})) {
    if (!declared || !declared.startsWith('file:') || !UI_PACKAGES.includes(name)) continue;
    const rel = declared.slice('file:'.length);
    const tgz = resolve(PROJECT_ROOT, rel);
    if (existsSync(tgz)) {
      pass(`vendor-${name}`, `vendor 归档存在：${rel}`);
    } else {
      fail(`vendor-${name}`, 'diagnose', `vendor 归档缺失：${rel}`, '用 create-future-ui --local-rc-dir 重新生成，或补回 vendor/future-ui 归档');
    }
  }

  // 3) browser 入口可加载且导出真实组件
  try {
    const browser = await loadBrowserSurface();
    const missing = [];
    for (const c of KNOWN_COMPONENTS) {
      for (const exp of c.exports) {
        if (browser[exp] === undefined) missing.push(`${c.componentType}.${exp}`);
      }
    }
    if (missing.length === 0) {
      pass('browser-entry', `${BROWSER_MODULE} 可加载，导出 ${KNOWN_COMPONENTS.flatMap((c) => c.exports).join('/')}`);
    } else {
      fail('browser-entry', 'diagnose', `${BROWSER_MODULE} 缺少导出：${missing.join(', ')}`, '检查 shadcn-adapter 归档是否完整（dist/browser.js + 组件）');
    }
  } catch (err) {
    fail('browser-entry', 'diagnose', `${BROWSER_MODULE} 加载失败：${err?.message ?? err}`, '确认 @future-ui/shadcn-adapter 已安装且为浏览器安全入口');
  }

  // 4) Profile 身份
  try {
    const browser = await loadBrowserSurface();
    const id = browser.editDialogProfile?.identity;
    if (id && id.profileId === 'r1-edit-dialog-reference' && id.profileVersion === '1.0.0') {
      pass('profile', `Profile ${id.profileId}@${id.profileVersion}`);
    } else {
      fail('profile', 'diagnose', `Profile 身份异常：${JSON.stringify(id ?? null)}`, '检查 @future-ui/shadcn-adapter 安装资产的 browser 导出');
    }
  } catch (err) {
    fail('profile', 'diagnose', `Profile 读取失败：${err?.message ?? err}`, '确认依赖已安装');
  }

  // 5) 浏览器导入路径：禁止根入口导入 @future-ui/shadcn-adapter（Node-only validators 会拖 node:fs）
  {
    const files = collectSourceFiles();
    const rootImports = [];
    for (const f of files) {
      for (const imp of parseImports(f)) {
        if (imp.specifier === '@future-ui/shadcn-adapter') rootImports.push({ file: f, names: imp.names });
        if (imp.specifier === '@future-ui/ai-dev') rootImports.push({ file: f, names: imp.names, aiDev: true });
      }
    }
    const bad = rootImports.filter((r) => !r.aiDev);
    if (bad.length === 0) {
      pass('browser-import', 'src 未导入 @future-ui/shadcn-adapter 根入口（Node-only 校验器未进浏览器）');
    } else {
      fail(
        'browser-import',
        'diagnose',
        `src 使用了根入口：${bad.map((r) => r.file).join(', ')}`,
        '改为从 @future-ui/shadcn-adapter/browser 导入（浏览器安全入口）',
      );
    }
    if (rootImports.some((r) => r.aiDev)) {
      fail('no-ai-dev-in-browser', 'diagnose', 'src 导入了 @future-ui/ai-dev（私有 Node-only）', '浏览器代码不得依赖 ai-dev；删除该导入');
    }
  }

  // 6) theme.css 资源存在
  if (themeCssInstalled()) {
    pass('theme-css', '@future-ui/theme/theme.css（dist/theme.css）已安装，Light/Dark token 单一数据源就绪');
  } else {
    fail('theme-css', 'diagnose', '@future-ui/theme 的 dist/theme.css 缺失', '检查 @future-ui/theme 归档是否包含 dist/theme.css');
  }

  const failed = checks.filter((c) => c.verdict !== 'pass');
  const report = {
    schema: 'future-ui.ai-doctor@1',
    project: pkg.name,
    status: failed.length === 0 ? 'ok' : 'diagnose',
    checks,
    summary: { total: checks.length, pass: checks.length - failed.length, diagnose: failed.length },
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((err) => {
  process.stderr.write(`ai:doctor 失败：${err?.message ?? String(err)}\n`);
  process.exit(2);
});
