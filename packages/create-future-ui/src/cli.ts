#!/usr/bin/env node
/**
 * create-future-ui CLI 入口。
 *
 * 用法：
 *   create-future-ui <project-name> [--local-rc-dir <dir>] [--help]
 *
 * - 默认（registry 形态）：生成工程的 package.json 保留 `@future-ui/*` 版本引用
 *   （未来 `npm create future-ui@latest` 消费；当前 npm 未发布，install 会 404，
 *    以本帮助提示为准，不宣称公网可用）。
 * - `--local-rc-dir <dir>`（本地 pilot 模式）：把四个真实 RC `.tgz` 拷入
 *   生成项目 `vendor/future-ui/` 相对目录，依赖改写为 `file:vendor/future-ui/<tgz>`，
 *   脱离 monorepo 后可 install/dev/build。
 */
import { join, resolve, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { builtinModules } from 'node:module';
import { existsSync, renameSync, rmdirSync, rmSync, writeFileSync } from 'node:fs';
import {
  checkTargetUsable,
  CreateError,
  ensureTargetDir,
  renderPackageJson,
  rewriteDepsToVendor,
  writeTemplate,
} from './template.js';
import { planRcVendoring, vendorRcTarballs } from './rc-vendor.js';
import type { VendoredTarball } from './rc-vendor.js';
import { RC_CANDIDATES, TEMPLATE_NAME, VENDOR_REL_DIR, DEFAULT_DEV_PORT } from './constants.js';

/** 生成工程自带的 .gitignore（模板归档不含 dotfiles）。 */
const GITIGNORE_CONTENT = `node_modules/
dist/
*.local
.DS_Store
`;

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const templateDir = join(pkgRoot, 'templates', TEMPLATE_NAME);

const HELP = `
create-future-ui — Future UI Windows React 工程初始化器（本地候选，非 npm 公开发行）

用法:
  create-future-ui <project-name> [--local-rc-dir <dir>]

参数:
  <project-name>          生成项目的目录名（同时作为 package.json 的 name）
  --local-rc-dir <dir>    （本地 pilot）指向含四个 Future UI RC 归档的目录:
                            future-ui-contracts-1.0.0.tgz
                            future-ui-react-provider-0.1.0-rc.1.tgz
                            future-ui-theme-0.1.0-rc.1.tgz
                            future-ui-shadcn-adapter-0.1.0-rc.1.tgz
                          归档将被拷入 <project>/${VENDOR_REL_DIR}/，
                          依赖改写为 file: 相对引用（不依赖 monorepo/绝对路径）。
  --help                  显示本帮助

说明:
  - 当前 @future-ui/* 尚未发布到 npm registry。不带 --local-rc-dir 生成的工程
    无法完成安装（registry 引用 404）；这只是未来公网形态的占位。
  - 生成工程完整可安装/运行/构建：cd <project> && pnpm install && pnpm dev
    （默认仅 loopback 本地开发，端口 ${DEFAULT_DEV_PORT}）。
  - 目标目录已存在且非空时拒绝覆盖，不删除任何现有文件。
`;

export interface CliOptions {
  projectName: string;
  localRcDir?: string;
}

export function parseArgs(argv: string[]): CliOptions | null {
  const args = [...argv];
  if (args.some((a) => a === '--help' || a === '-h') || args.length === 0) {
    return null; // help requested
  }
  const positional: string[] = [];
  let localRcDir: string | undefined;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]!;
    if (arg === '--local-rc-dir') {
      if (i + 1 >= args.length || args[i + 1]!.startsWith('--')) {
        throw new CreateError('--local-rc-dir 需要一个目录参数');
      }
      localRcDir = args[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith('--')) {
      throw new CreateError(`未知参数：${arg}（运行 create-future-ui --help 查看用法）`);
    }
    positional.push(arg);
  }
  if (positional.length === 0) {
    throw new CreateError('缺少 <project-name>（运行 create-future-ui --help 查看用法）');
  }
  if (positional.length > 1) {
    throw new CreateError(`只接受一个 <project-name>，收到：${positional.join(', ')}`);
  }
  const projectName = positional[0]!;
  const nameError = validateProjectName(projectName);
  if (nameError !== null) {
    throw new CreateError(`无效的 <project-name>：${projectName}\n${nameError}`);
  }
  return { projectName, localRcDir };
}

/** Windows 保留设备名（含带扩展名形态，如 CON.txt 在 Windows 上同样被保留）。 */
const WINDOWS_DEVICE_NAME_RE = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$/i;

/** npm 保留名（不可用作 package name / 目录名）。 */
const NPM_FORBIDDEN_NAMES = new Set(['node_modules', 'favicon.ico']);

/** Node.js 内置模块名（builtins；与 validate-npm-package-name 的 builtin 排除一致）。 */
const NODE_BUILTIN_NAMES = new Set(
  builtinModules.map((m) => (m.startsWith('node:') ? m.slice(5) : m).split('/')[0]),
);

/**
 * 校验项目名（目录名 = npm package name）。
 * 按 npm `validate-npm-package-name` 的 new-packages 规则（validForNewPackages）实现：
 *  - 拒绝空、"."".."、长度 > 214
 *  - 拒绝以 "." / "_" / "-" 开头
 *  - 拒绝大写字母（validForNewPackages 的 warning → 不通过）
 *  - 拒绝 "~ ' ! ( ) *" 等非 URL 安全字符（errors）
 *  - 拒绝首尾空格
 *  - 拒绝 Node.js 内置模块名（http / stream 等，validForNewPackages 的 warning → 不通过）
 * 另加 Windows 路径约束：拒绝以 "." 结尾（Windows 目录名规则）；拒绝 Windows 保留设备名。
 * 另加 npm 保留名：node_modules / favicon.ico。
 * 返回错误描述；合法返回 null。
 */
export function validateProjectName(name: string): string | null {
  if (name === '.' || name === '..') {
    return '不能是 "." 或 ".."';
  }
  if (name.length === 0) {
    return '不能为空';
  }
  if (name.length > 214) {
    return '长度超过 214 字符上限';
  }
  if (name.trim() !== name) {
    return '不能含首尾空格（npm 包名规则）';
  }
  // Windows 保留设备名大小写不敏感，须先于大写/字符集检查命中（如 PRN、CON.txt）。
  if (WINDOWS_DEVICE_NAME_RE.test(name)) {
    return 'Windows 保留设备名，不能用作目录名';
  }
  if (/^[._]/.test(name)) {
    return '不能以 "." 或 "_" 开头（npm 新包名规则）';
  }
  if (name.startsWith('-')) {
    return '不能以 "-" 开头（npm 新包名规则）';
  }
  if (/[A-Z]/.test(name)) {
    return '不能含大写字母（npm 新包名规则 validForNewPackages）';
  }
  if (!/^[a-z0-9._-]+$/.test(name)) {
    return '只能包含小写字母、数字、点、下划线与连字符（npm 禁止 ~ \' ! ( ) * 等特殊字符）';
  }
  if (/\.$/.test(name)) {
    return '不能以 "." 结尾（Windows 目录名约束）';
  }
  if (NPM_FORBIDDEN_NAMES.has(name.toLowerCase())) {
    return 'npm 保留名（node_modules / favicon.ico），不能用作目录名/包名';
  }
  if (NODE_BUILTIN_NAMES.has(name.toLowerCase())) {
    return 'Node 内置模块名（如 http/stream），不能用作目录名/包名（npm 新包名规则）';
  }
  return null;
}

function printNextSteps(projectDir: string, localRcDir?: string): void {
  const name = basename(projectDir);
  const installCmd = localRcDir
    ? 'pnpm install   （或 npm install；本地 RC 归档来自项目内 vendor/future-ui/）'
    : '注意：未指定 --local-rc-dir，@future-ui/* 尚未发布 registry，install 会 404；这是未来公网形态占位。';
  console.log(`\n✔ 已生成 Future UI React 工程：${projectDir}

下一步（Windows，Node >=24.21.0）:
  cd ${name}
  ${installCmd}
  pnpm dev          # 开发（loopback，端口 ${DEFAULT_DEV_PORT}）
  pnpm build        # 产物构建
  pnpm typecheck    # 严格 TypeScript 检查
  pnpm test         # 测试 fixture（Button/TextInput/EditDialog + Light/Dark）

模板说明:
  - React 19 + Vite + TypeScript + Tailwind CSS v4 + shadcn/Radix
  - 已接入 @future-ui/theme/theme.css（Light/Dark token，单一数据源，无第二份色值）
  - 浏览器图只导入 @future-ui/shadcn-adapter/browser 等浏览器安全入口
  - 仅本地演示数据，不预置管理页面；默认仅 loopback 本地开发
`);
}

export function run(argv: string[]): number {
  let options: CliOptions | null;
  try {
    options = parseArgs(argv);
  } catch (e) {
    console.error(`\n${(e as Error).message}`);
    console.log(HELP);
    return 1;
  }
  if (options === null) {
    console.log(HELP);
    return 0;
  }

  const projectDir = resolve(options.projectName);
  try {
    // 阶段 1 · 只读预检：目标目录可用性 + RC 资产完整性。任何失败都不产生写入，
    // 同名重试前工作区保持原状（#107 安全失败要求）。
    checkTargetUsable(projectDir);
    let planned: VendoredTarball[] | undefined;
    if (options.localRcDir) {
      planned = planRcVendoring(resolve(options.localRcDir));
    }

    // 阶段 2 · 事务性生成：全部写入先在父目录下的暂存目录完成，
    // 中途任何失败都清理暂存并保持最终目标原状（半成品不会阻塞同名重试）；
    // 全部成功后再一次性 rename 提交（同卷原子）。不触碰/删除最终目标内的未知文件。
    const stagingDir = join(
      dirname(projectDir),
      `.${options.projectName}.cfu-staging-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    );
    ensureTargetDir(stagingDir);
    try {
      writeTemplate(stagingDir, templateDir, options.projectName);
      const manifest = renderPackageJson(options.projectName);

      if (planned !== undefined && options.localRcDir) {
        vendorRcTarballs(stagingDir, planned);
        const fileRefByName = new Map(RC_CANDIDATES.map((c, i) => [c.packageName, planned[i]!.fileRef]));
        rewriteDepsToVendor(manifest, (pkg) => fileRefByName.get(pkg) ?? pkg);
        console.log(
          `\n[pilot] 已 vendoring 四个 RC 归档 → ${VENDOR_REL_DIR}/（依赖改写为 file: 相对引用）`,
        );
      } else {
        console.log(
          `\n[registry 形态] 生成工程依赖保留 @future-ui/* 版本引用（当前 npm 未发布，仅占位；请使用 --local-rc-dir 完成本地验收）`,
        );
      }

      writeFileSync(join(stagingDir, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
      writeFileSync(join(stagingDir, '.gitignore'), GITIGNORE_CONTENT, 'utf8');
    } catch (e) {
      rmSync(stagingDir, { recursive: true, force: true });
      throw e;
    }

    // 阶段 3 · 提交（纳入 fail-safe）：目标不存在 → rename（同卷原子）；
    // 目标存在且为空（预检已保证）→ 仅移除该空目录（不含任何文件，不触碰未知文件）后 rename。
    // rename 失败（Windows 占用/权限等）时 finally 清理暂存并恢复目标原状：
    // 原本为空目录则重建空目录；原本不存在则保持不存在。不留暂存残骸。
    const targetExisted = existsSync(projectDir);
    let committed = false;
    try {
      if (targetExisted) {
        rmdirSync(projectDir);
      }
      renameSync(stagingDir, projectDir);
      committed = true;
    } finally {
      if (!committed) {
        rmSync(stagingDir, { recursive: true, force: true });
        if (targetExisted) {
          ensureTargetDir(projectDir); // 恢复原空目录状态
        }
      }
    }
    printNextSteps(projectDir, options.localRcDir);
    return 0;
  } catch (e) {
    if (e instanceof CreateError) {
      console.error(`\n✗ ${e.message}`);
      return 1;
    }
    console.error(`\n✗ 初始化失败（未知错误）：${String(e)}`);
    return 1;
  }
}

// bin 入口：仅在作为 CLI 直接执行时运行（被 import 时不执行）。
const invokedEntry = (() => {
  try {
    const invoked = process.argv[1];
    if (!invoked) return false;
    return fileURLToPath(import.meta.url).toLowerCase() === resolve(invoked).toLowerCase();
  } catch {
    return false;
  }
})();

if (invokedEntry) {
  process.exitCode = run(process.argv.slice(2));
}
