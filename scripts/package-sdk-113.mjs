#!/usr/bin/env node
/**
 * R3-SDK-01 / #113 · 可重复 SDK 打包脚本（Windows）
 *
 * 用法（PowerShell，Node >=24.21.0）：
 *   node scripts/package-sdk-113.mjs ^
 *     --rc-dist <build:rc 产物目录（rc-dist）> ^
 *     --cli-tgz <create-future-ui tgz 绝对路径> ^
 *     --out <外置交付目录>
 *
 * 行为：
 *  1. 校验五个 tgz 存在；
 *  2. 校验四 RC 包 SHA-256 与冻结权威值一致（contracts/react-provider/shadcn-adapter/theme）；
 *  3. 组装 future-ui-react-sdk-0.1.0-rc.1/（packages/ 五 tgz + docs/ 手册 + examples/ + manifest.json + SHA256SUMS.txt）；
 *  4. 压缩为 future-ui-react-sdk-0.1.0-rc.1.zip；
 *  5. 输出 ZIP 绝对路径、大小与 SHA-256（SHA 写入 ZIP 外的交付记录，不放进 ZIP 形成自引用）。
 *
 * 依赖：Node 内置（crypto / fs / zlib / child_process）。ZIP 压缩用系统 tar（Windows 10+ 自带）。
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, copyFileSync, writeFileSync, rmSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');

// —— 冻结权威 SHA-256（#105/#108 已验证，build:rc 每次重建必须一致） ——
const FROZEN = {
  'future-ui-contracts-1.0.0.tgz': 'c4e21549cd9c6ba53bcd6ad9edef4b3a622e0e30ef4a70d02a8fa5255d8afbeb',
  'future-ui-react-provider-0.1.0-rc.1.tgz': '32a020793604d6b818ef2f33424e14f30e4ed17891f6976003730006e8e17671',
  'future-ui-shadcn-adapter-0.1.0-rc.1.tgz': 'a474a793f224452eff071bac80dd68b4dc52e06e998ce59d4bb6e087410413cf',
  'future-ui-theme-0.1.0-rc.1.tgz': 'd7c1d0fcea33d3d468a38b12f81880808e187e80a8a662ec7dfe8ef2461f516c',
};

const CLI_TGZ = 'create-future-ui-0.1.0-rc.1.tgz';
const SDK_DIR_NAME = 'future-ui-react-sdk-0.1.0-rc.1';
const ZIP_NAME = SDK_DIR_NAME + '.zip';

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function parseArgs(argv) {
  const args = { '--rc-dist': null, '--cli-tgz': null, '--out': null };
  for (let i = 0; i < argv.length; i += 2) {
    const k = argv[i];
    const v = argv[i + 1];
    if (k in args && v) args[k] = resolve(v);
  }
  return args;
}

function main() {
  const { '--rc-dist': rcDist, '--cli-tgz': cliTgz, '--out': outDir } = parseArgs(process.argv.slice(2));
  for (const [k, v] of [['--rc-dist', rcDist], ['--cli-tgz', cliTgz], ['--out', outDir]]) {
    if (!v) throw new Error(`missing ${k}`);
  }
  if (!existsSync(rcDist)) throw new Error(`rc-dist not found: ${rcDist}`);
  if (!existsSync(cliTgz)) throw new Error(`cli-tgz not found: ${cliTgz}`);
  mkdirSync(outDir, { recursive: true });

  // 1) 收集五包（四 RC 从 rc-dist，CLI 独立路径）
  const rcTgz = readdirSync(rcDist).filter((f) => f.endsWith('.tgz') && f in FROZEN);
  if (rcTgz.length !== 4) throw new Error(`expected 4 RC tgz in rc-dist, got ${rcTgz.length}`);
  const five = {};
  for (const f of rcTgz) five[f] = join(rcDist, f);
  five[CLI_TGZ] = cliTgz;

  // 2) 校验四 RC SHA 与冻结值一致
  for (const f of rcTgz) {
    const actual = sha256(five[f]);
    if (actual !== FROZEN[f]) {
      throw new Error(`RC SHA mismatch for ${f}: ${actual} != ${FROZEN[f]}`);
    }
  }
  const allSha = {};
  for (const [f, path] of Object.entries(five)) allSha[f] = sha256(path);

  // 3) 组装 SDK 目录
  const sdkDir = join(outDir, SDK_DIR_NAME);
  if (existsSync(sdkDir)) rmSync(sdkDir, { recursive: true, force: true });
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

  // manifest.json（真实 source HEAD + 包 SHA）
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO_ROOT }).toString().trim();
  const manifest = {
    sdk: {
      name: 'future-ui-react-sdk',
      version: '0.1.0-rc.1',
      format: 'zip',
      builtAt: new Date().toISOString().slice(0, 10),
      sourceHead: head,
      sourceRepo: 'https://github.com/zlpoot/future-ui',
      environment: { os: 'Windows', node: '>=24.21.0' },
      publishStatus: 'UNPUBLISHED',
      macStatus: 'MAC_NOT_TESTED',
    },
    packages: Object.keys(five).map((f) => {
      const name = f.replace(/\.tgz$/, '');
      return { name, file: f, sha256: allSha[f].toUpperCase() };
    }),
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

  // 4) 压缩 ZIP（系统 tar，PowerShell/Windows 10+ 自带）
  const zipPath = join(outDir, ZIP_NAME);
  if (existsSync(zipPath)) rmSync(zipPath, { force: true });
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
    `- source HEAD: ${head}`,
    '',
    '## 五包 SHA-256（与 ZIP 内 SHA256SUMS.txt 一致）',
    ...sumLines.map((l) => '- ' + l),
    '',
  ].join('\n');
  writeFileSync(join(outDir, 'SDK-PACK-RECORD.txt'), record, 'utf8');

  console.log(`ZIP: ${zipPath}`);
  console.log(`size: ${size} bytes`);
  console.log(`SHA-256: ${zipSha}`);
  console.log(`HEAD: ${head}`);
}

try {
  main();
} catch (err) {
  console.error(`pack failed: ${err.message}`);
  process.exit(1);
}
