/**
 * R3-RC-001 (#104) · 构建并打包首批可离仓安装的候选包。
 *
 * 流程：
 *   1) 每个候选包 tsc 编译 JS + .d.ts（theme 额外复制 theme.css 到 dist/）。
 *   2) 为每个候选包生成 staging 副本（dist/ + schemas/ + package.json），
 *      其中所有 `workspace:*` 依赖改写为 workspace 内对应包的实际版本号
 *      （交付归档内不得残留消费者无法解析的 workspace:*，见 #4 授权）。
 *   3) 在 staging 目录 pnpm pack 到 rc-dist/（仅本地归档，不发布 npm）。
 *   4) 输出 rc-dist/SHA256SUMS.txt。
 *
 * 不发布 npm；不修改公共 Contract/Profile 语义；产物仅本地产出。
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  cpSync,
  existsSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'rc-dist');
const stagingDir = join(outDir, '_staging');

const CANDIDATE_PACKAGES = [
  '@future-ui/contracts',
  '@future-ui/react-provider',
  '@future-ui/theme',
  '@future-ui/shadcn-adapter',
];

function run(cmd, args, cwd = root) {
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) {
    console.error(`FAILED: ${cmd} ${args.join(' ')} (cwd=${cwd})`);
    process.exit(r.status ?? 1);
  }
}

/** workspace 包名 → 实际版本号（从 packages/<name>/package.json 读取） */
function workspaceVersions() {
  const map = new Map();
  for (const dir of readdirSync(join(root, 'packages'))) {
    const p = join(root, 'packages', dir, 'package.json');
    if (!existsSync(p)) continue;
    const m = JSON.parse(readFileSync(p, 'utf8'));
    if (m.name?.startsWith('@future-ui/')) map.set(m.name, m.version);
  }
  return map;
}

/** 把 dependencies/devDependencies/peerDependencies 中的 workspace:* 改写为版本 */
function resolveWorkspaceDeps(manifest, versions) {
  for (const section of ['dependencies', 'devDependencies', 'peerDependencies']) {
    const deps = manifest[section];
    if (!deps) continue;
    for (const [name, spec] of Object.entries(deps)) {
      if (spec === 'workspace:*' || spec === 'workspace:^' || spec === 'workspace:~') {
        const v = versions.get(name);
        if (!v) {
          console.error(`Cannot resolve workspace dep ${name} to a workspace version`);
          process.exit(1);
        }
        deps[name] = v;
      }
    }
  }
  return manifest;
}

/**
 * 归档 manifest 改写（staging 副本专用；仓库内 manifest 保持 src/workspace 开发形态）：
 *   1) workspace:* → 实际版本号（所有依赖节）
 *   2) dependencies 中的 @future-ui/* 移到 peerDependencies（浏览器 UI 生态由宿主显式安装，
 *      离仓安装不向 registry 请求未发布的 @future-ui/*）
 *   3) exports 的 src 路径 → dist 产物（types + default / 原样资源）
 *   4) 补充 main/module/types
 */
function toDistExportSpec(p) {
  if (p === './schemas/*.json') return './schemas/*.json';
  if (p.endsWith('.css')) return p.replace('./src/', './dist/');
  const base = p.replace('./src/', './dist/').replace(/\.(ts|tsx)$/, '');
  return { types: `${base}.d.ts`, default: `${base}.js` };
}

function stageManifest(manifest, versions) {
  resolveWorkspaceDeps(manifest, versions);
  const uiPeers = {};
  const deps = manifest.dependencies ?? {};
  for (const name of Object.keys(deps)) {
    if (name.startsWith('@future-ui/')) {
      uiPeers[name] = deps[name];
      delete deps[name];
    }
  }
  manifest.peerDependencies = { ...uiPeers, ...(manifest.peerDependencies ?? {}) };
  const stagedExports = {};
  for (const [sub, spec] of Object.entries(manifest.exports ?? {})) {
    stagedExports[sub] = typeof spec === 'string' ? toDistExportSpec(spec) : toDistExportSpec(spec.default);
  }
  manifest.exports = stagedExports;
  manifest.main = './dist/index.js';
  manifest.module = './dist/index.js';
  manifest.types = './dist/index.d.ts';
  return manifest;
}

/** 递归收集 dist 下 .js 文件（相对路径） */
function walkJs(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const rel = e.name;
    if (e.isDirectory()) {
      for (const f of walkJs(join(dir, rel))) out.push(join(rel, f));
    } else if (rel.endsWith('.js')) {
      out.push(rel);
    }
  }
  return out;
}

/**
 * P1-01 · 构建产物校验（防回归门）：
 *   - dist 中不得残留 tsconfig 别名（@/registry/...）——别名无法在仓库外解析；
 *   - 每个相对导入（./ ../ 开头）的目标文件必须真实存在，且带 .js 扩展名
 *     （原生 Node ESM 不做扩展名猜测）。
 * 任一违规即失败，防止"缺扩展名/别名"再次进入归档。
 */
function verifyDist(dir) {
  const problems = [];
  const files = walkJs(dir);
  for (const f of files) {
    const src = readFileSync(join(dir, f), 'utf8');
    if (src.includes('@/registry/')) {
      problems.push(`${f}: 残留 tsconfig 别名 import（@/registry/...）`);
    }
    const dirOf = dirname(f);
    for (const m of src.matchAll(/(?:from|import\()\s*(['"])(\.{1,2}\/[^'"]+)\1/g)) {
      const spec = m[2];
      if (spec.endsWith('.css') || spec.endsWith('.json') || spec.endsWith('.node')) continue;
      if (!spec.endsWith('.js')) {
        problems.push(`${f}: 相对导入缺少 .js 扩展名 -> ${spec}`);
        continue;
      }
      const resolved = join(dir, dirOf, spec);
      if (!existsSync(resolved)) {
        problems.push(`${f}: 相对导入目标不存在 -> ${spec} (${resolved})`);
      }
    }
  }
  if (problems.length > 0) {
    console.error('\n=== dist 校验失败（P1-01 防回归门）===');
    for (const p of problems) console.error(' - ' + p);
    process.exit(1);
  }
  console.log(`[verifyDist] ${dir}: ${files.length} 个 .js 文件通过（无别名残留、相对导入均带 .js 且存在）`);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const versions = workspaceVersions();

// 1) build each candidate package (JS + .d.ts + theme.css)
for (const pkg of CANDIDATE_PACKAGES) {
  console.log(`\n=== build ${pkg} ===`);
  // full rebuild: tsc incremental would skip unchanged files and leave stale
  // dist output behind (e.g. earlier alias-normalized files)
  const pkgDir = join(root, 'packages', pkg.replace('@future-ui/', ''));
  rmSync(join(pkgDir, 'dist'), { recursive: true, force: true });
  run('corepack', ['pnpm', '--filter', pkg, 'build']);
}

// 1b) dist postprocess: rewrite tsconfig path-alias imports (e.g.
//     "@/registry/new-york-v4/ui/button") to relative paths + explicit `.js`
//     extension so the published dist can be consumed by native Node ESM
//     outside the monorepo. tsc does not rewrite paths; the vendored upstream
//     sources stay immutable (digest/provenance intact). Only the emitted dist
//     is normalized.
//     The alias "@/registry/new-york-v4/*" maps to src/upstream/registry/new-york-v4/*;
//     in dist the same tree lives under dist/upstream/registry/new-york-v4, so the
//     prefix is resolved as a relative path from the importing file's directory.
for (const pkg of CANDIDATE_PACKAGES) {
  const dir = join(root, 'packages', pkg.replace('@future-ui/', ''));
  const distDir = join(dir, 'dist');
  if (!existsSync(distDir)) continue;
  for (const f of walkJs(distDir)) {
    const file = join(distDir, f);
    let src = readFileSync(file, 'utf8');
    if (src.includes('@/registry/new-york-v4/')) {
      // depth of the importing file below the registry root
      const fileDir = dirname(f);
      const relParts = fileDir.split(/[\\/]/);
      const registryIdx = relParts.indexOf('new-york-v4');
      const depth = registryIdx >= 0 ? relParts.length - registryIdx - 1 : 0;
      const prefix = '../'.repeat(depth);
      // bare alias -> relative specifier + .js extension (Node ESM)
      src = src.replace(/from (['"])@\/registry\/new-york-v4\/([^'"]+)\1/g, (m, q, p) => `from ${q}${prefix}${p}.js${q}`);
      writeFileSync(file, src);
      console.log(`[postprocess] ${pkg}: ${f} -> ${prefix}…`);
    }
  }
  // P1-01 gate: alias-free + resolvable relative imports with .js extension
  verifyDist(distDir);
}

// 2) staging copy with workspace:* resolved
for (const pkg of CANDIDATE_PACKAGES) {
  console.log(`\n=== stage ${pkg} ===`);
  const dir = join(root, 'packages', pkg.replace('@future-ui/', ''));
  const stage = join(stagingDir, pkg);
  rmSync(stage, { recursive: true, force: true });
  mkdirSync(stage, { recursive: true });
  cpSync(join(dir, 'dist'), join(stage, 'dist'), { recursive: true });
  if (existsSync(join(dir, 'schemas'))) {
    cpSync(join(dir, 'schemas'), join(stage, 'schemas'), { recursive: true });
  }
  // P1-03: vendored upstream license/attribution must ship in the archive
  if (existsSync(join(dir, 'THIRD_PARTY_LICENSES.md'))) {
    cpSync(join(dir, 'THIRD_PARTY_LICENSES.md'), join(stage, 'THIRD_PARTY_LICENSES.md'));
  }
  const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  stageManifest(manifest, versions);
  writeFileSync(join(stage, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  run('corepack', ['pnpm', 'pack', '--pack-destination', outDir], stage);
}

// 3) SHA-256 manifest
const shas = {};
for (const f of readdirSync(outDir).filter((f) => f.endsWith('.tgz'))) {
  const buf = readFileSync(join(outDir, f));
  shas[f] = createHash('sha256').update(buf).digest('hex');
}
const sums = Object.entries(shas)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([f, h]) => `${h}  ${f}`)
  .join('\n');
writeFileSync(join(outDir, 'SHA256SUMS.txt'), `${sums}\n`);
console.log(`\n=== SHA-256 ===\n${sums}`);
