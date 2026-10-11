#!/usr/bin/env node
/**
 * R3-SDK-01 / #113 · 可重复 SDK 打包脚本（Windows）
 *
 * 用法（PowerShell，Node >=24.21.0）：
 *   node scripts/package-sdk-113.mjs ^
 *     --rc-dist <build:rc 产物目录（rc-dist）> ^
 *     --cli-tgz <create-future-ui tgz 绝对路径> ^
 *     --out <外置交付目录> [--force]
 *
 * 行为：
 *  1. 校验五个 tgz 存在，且 SHA-256 全部与冻结权威值一致（含 CLI，防错误 CLI 混入）；
 *  2. 从每个 tgz 内 package/package.json 读取真实 name/version，校验与固定发行版本一致；
 *  3. 校验必要入口（CLI 必须有 bin；四 RC 包必须有 exports / main / types，shadcn-adapter 必须有 ./browser）；
 *  4. 组装 future-ui-react-sdk-0.1.0-rc.1/（packages/ 五 tgz + docs/ 手册 + examples/ + manifest.json + SHA256SUMS.txt）；
 *  5. 压缩为 future-ui-react-sdk-0.1.0-rc.1.zip；
 *  6. 输出 ZIP 绝对路径、大小与 SHA-256（SHA 写入 ZIP 外的交付记录，不放进 ZIP 形成自引用）。
 *
 * 覆盖保护：默认拒绝覆盖已存在的 SDK 目录或同名 ZIP（P1）；显式 --force 才允许覆盖，且删除前打印被删对象。
 * sourceHead：以 --base-sha（默认冻结受信 main）为准记录构建资产来源；若当前 git HEAD 不同，
 *             在 manifest 与交付记录中标注 builtFromDifferentHead，不静默把运行时的 HEAD 当资产来源。
 *
 * 依赖：Node 内置（crypto / fs / zlib / child_process）。tgz 读取与 ZIP 压缩用系统 tar（Windows 10+ 自带）。
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, copyFileSync, writeFileSync, rmSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');

// —— 固定发行版本（R3-SDK-01 / #113）：五包 SHA-256 与内部 name/version 全部冻结，不可漂移 ——
const FROZEN = {
  'create-future-ui-0.1.0-rc.1.tgz': {
    sha: 'a229d32897e2bc1bf8801811a4f5952bb32e6e753e894186318a7e7a3c2bfd89',
    name: 'create-future-ui',
    version: '0.1.0-rc.1',
    entry: 'bin', // create-future-ui CLI 必须声明 bin
  },
  'future-ui-contracts-1.0.0.tgz': {
    sha: 'c4e21549cd9c6ba53bcd6ad9edef4b3a622e0e30ef4a70d02a8fa5255d8afbeb',
    name: '@future-ui/contracts',
    version: '1.0.0',
    entry: 'main', // 至少存在 main / module / types / exports 之一
  },
  'future-ui-react-provider-0.1.0-rc.1.tgz': {
    sha: '32a020793604d6b818ef2f33424e14f30e4ed17891f6976003730006e8e17671',
    name: '@future-ui/react-provider',
    version: '0.1.0-rc.1',
    entry: 'main',
  },
  'future-ui-shadcn-adapter-0.1.0-rc.1.tgz': {
    sha: 'a474a793f224452eff071bac80dd68b4dc52e06e998ce59d4bb6e087410413cf',
    name: '@future-ui/shadcn-adapter',
    version: '0.1.0-rc.1',
    entry: 'browser', // exports 必须含 ./browser（浏览器唯一合法入口）
  },
  'future-ui-theme-0.1.0-rc.1.tgz': {
    sha: 'd7c1d0fcea33d3d468a38b12f81880808e187e80a8a662ec7dfe8ef2461f516c',
    name: '@future-ui/theme',
    version: '0.1.0-rc.1',
    entry: 'main',
  },
};

const FROZEN_BASE = '748919996d770ceeebd558bdfce60776d779cb5a'; // 受信 main（#113）
const CLI_TGZ = 'create-future-ui-0.1.0-rc.1.tgz';
const SDK_DIR_NAME = 'future-ui-react-sdk-0.1.0-rc.1';
const ZIP_NAME = SDK_DIR_NAME + '.zip';

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function parseArgs(argv) {
  const args = { '--rc-dist': null, '--cli-tgz': null, '--out': null, '--base-sha': FROZEN_BASE, '--force': false };
  for (let i = 0; i < argv.length; i += 1) {
    const k = argv[i];
    if (k in args) {
      if (k === '--force') args[k] = true;
      else args[k] = resolve(argv[i + 1] ?? '');
    }
  }
  return args;
}

/** 从 tgz 内读取 package/package.json（pnpm pack 产物结构） */
function readTgzPackageJson(tgz) {
  const raw = execFileSync('tar', ['-xOf', tgz, 'package/package.json'], { encoding: 'utf8' });
  return JSON.parse(raw);
}

function assertEntry(pkg, file, rule) {
  if (rule === 'bin') {
    if (!pkg.bin || typeof pkg.bin !== 'object') {
      throw new Error(`entry check failed: ${file} missing bin declaration`);
    }
    return;
  }
  if (rule === 'browser') {
    const exportsMap = pkg.exports;
    const hasBrowser = exportsMap && (exportsMap['./browser'] || (exportsMap['.'] && exportsMap['.'].browser));
    if (!hasBrowser) throw new Error(`entry check failed: ${file} exports missing ./browser`);
    return;
  }
  // rule === 'main'：exports / main / module / types 至少存在其一
  if (!pkg.exports && !pkg.main && !pkg.module && !pkg.types) {
    throw new Error(`entry check failed: ${file} has no exports/main/module/types`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const { '--rc-dist': rcDist, '--cli-tgz': cliTgz, '--out': outDir, '--base-sha': baseSha, '--force': force } = args;
  for (const [k, v] of [['--rc-dist', rcDist], ['--cli-tgz', cliTgz], ['--out', outDir]]) {
    if (!v) throw new Error(`missing ${k}`);
  }
  if (!existsSync(rcDist)) throw new Error(`rc-dist not found: ${rcDist}`);
  if (!existsSync(cliTgz)) throw new Error(`cli-tgz not found: ${cliTgz}`);
  mkdirSync(outDir, { recursive: true });

  // P1 覆盖保护：目标已存在默认拒绝；--force 才允许覆盖（删除前打印）
  const sdkDir = join(outDir, SDK_DIR_NAME);
  const zipPath = join(outDir, ZIP_NAME);
  for (const [label, p] of [['SDK dir', sdkDir], ['ZIP', zipPath]]) {
    if (existsSync(p)) {
      if (!force) {
        throw new Error(`refusing to overwrite existing ${label}: ${p}（请使用新的空 out 目录，或显式 --force）`);
      }
      console.warn(`[force] removing existing ${label}: ${p}`);
      if (label === 'SDK dir') rmSync(p, { recursive: true, force: true });
      else rmSync(p, { force: true });
    }
  }

  // 1) 收集五包（四 RC 从 rc-dist，CLI 独立路径）
  const rcTgz = readdirSync(rcDist).filter((f) => f.endsWith('.tgz') && f in FROZEN);
  if (rcTgz.length !== 4) throw new Error(`expected 4 RC tgz in rc-dist, got ${rcTgz.length}`);
  const five = {};
  for (const f of rcTgz) five[f] = join(rcDist, f);
  five[CLI_TGZ] = cliTgz;

  // 2) 五包 SHA + 内部 name/version + 必要入口 全部校验（P2）
  const allSha = {};
  const pkgMeta = {};
  for (const [f, path] of Object.entries(five)) {
    const frozen = FROZEN[f];
    if (!frozen) throw new Error(`unexpected tgz: ${f}`);
    const actualSha = sha256(path);
    if (actualSha !== frozen.sha) {
      throw new Error(`SHA mismatch for ${f}: ${actualSha} != ${frozen.sha}`);
    }
    allSha[f] = actualSha;

    const inner = readTgzPackageJson(path);
    if (inner.name !== frozen.name || inner.version !== frozen.version) {
      throw new Error(
        `package meta mismatch for ${f}: inner=${inner.name}@${inner.version}, expected=${frozen.name}@${frozen.version}`,
      );
    }
    assertEntry(inner, f, frozen.entry);
    pkgMeta[f] = { name: inner.name, version: inner.version, entry: frozen.entry };
  }

  // sourceHead：以固定发行基线为准（不把运行时 git HEAD 静默当作资产来源）
  let gitHead = null;
  try {
    gitHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO_ROOT }).toString().trim();
  } catch {
    gitHead = null;
  }
  const builtFromDifferentHead = gitHead !== null && gitHead !== baseSha;

  // 3) 组装 SDK 目录
  mkdirSync(join(sdkDir, 'packages'), { recursive: true });
  mkdirSync(join(sdkDir, 'docs'), { recursive: true });
  mkdirSync(join(sdkDir, 'examples'), { recursive: true });
  for (const [f, path] of Object.entries(five)) copyFileSync(path, join(sdkDir, 'packages', f));

  // 手册与示例（仓库 docs/r3-sdk-01/ 为准）
  const docSrc = join(REPO_ROOT, 'docs', 'r3-sdk-01');
  copyFileSync(join(docSrc, 'README.md'), join(sdkDir, 'README.md'));
  for (const f of ['快速开始.md', '组件使用手册.md', '主题与样式.md', 'AI开发指南.md']) {
    copyFileSync(join(docSrc, 'docs', f), join(sdkDir, 'docs', f));
  }
  copyFileSync(join(docSrc, 'examples', 'README.md'), join(sdkDir, 'examples', 'README.md'));

  // SHA256SUMS.txt（五个 tgz）
  const sumLines = Object.entries(allSha)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([f, h]) => `${h}  ${f}`);
  writeFileSync(join(sdkDir, 'SHA256SUMS.txt'), sumLines.join('\n') + '\n', 'utf8');

  // manifest.json：name/version 来自 tgz 内 package.json，非文件名派生
  const manifest = {
    sdk: {
      name: 'future-ui-react-sdk',
      version: '0.1.0-rc.1',
      format: 'zip',
      builtAt: new Date().toISOString().slice(0, 10),
      sourceHead: baseSha,
      sourceRepo: 'https://github.com/zlpoot/future-ui',
      environment: { os: 'Windows', node: '>=24.21.0' },
      publishStatus: 'UNPUBLISHED',
      macStatus: 'MAC_NOT_TESTED',
      ...(builtFromDifferentHead ? { builtFromDifferentHead: true, scriptGitHead: gitHead } : {}),
    },
    packages: Object.keys(five).map((f) => ({
      name: pkgMeta[f].name,
      version: pkgMeta[f].version,
      file: f,
      sha256: allSha[f].toUpperCase(),
    })),
    consumption: {
      requiresNetwork: true,
      workspaceFree: true,
      sourceRepoFree: true,
      installFlow: [
        'unzip sdk',
        'npm exec --yes --package="<SDK>/packages/create-future-ui-0.1.0-rc.1.tgz" -- create-future-ui <app> --local-rc-dir "<SDK>/packages"',
        'cd <app> && npm install',
        'npm install-scripts approve esbuild',
        'npm run dev | typecheck | build | test | ai:view | ai:doctor | ai:check',
      ],
    },
  };
  writeFileSync(join(sdkDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  // 4) 压缩 ZIP（系统 tar，Windows 10+ 自带）
  execFileSync('tar', ['-a', '-c', '-f', zipPath, SDK_DIR_NAME], { cwd: outDir, stdio: 'inherit' });
  const size = statSync(zipPath).size;
  const zipSha = sha256(zipPath).toUpperCase();

  // 5) 交付记录（ZIP SHA 写 ZIP 外，不放进 ZIP）
  const record = [
    '# Future UI React SDK · 打包记录（scripts/package-sdk-113.mjs）',
    '',
    `- ZIP: ${zipPath}`,
    `- size: ${size} bytes`,
    `- SHA-256: ${zipSha}`,
    `- source HEAD: ${baseSha}`,
    ...(builtFromDifferentHead ? [`- warning: script ran at git HEAD ${gitHead}（≠ 冻结 base，见 manifest.builtFromDifferentHead）`] : []),
    '',
    '## 五包 SHA-256（与 ZIP 内 SHA256SUMS.txt 一致）',
    ...sumLines.map((l) => '- ' + l),
    '',
  ].join('\n');
  writeFileSync(join(outDir, 'SDK-PACK-RECORD.txt'), record, 'utf8');

  console.log(`ZIP: ${zipPath}`);
  console.log(`size: ${size} bytes`);
  console.log(`SHA-256: ${zipSha}`);
  console.log(`source HEAD: ${baseSha}`);
  if (builtFromDifferentHead) console.log(`warning: git HEAD=${gitHead} differs from frozen base`);
}

try {
  main();
} catch (err) {
  console.error(`pack failed: ${err.message}`);
  process.exit(1);
}
