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
//     "@/registry/new-york-v4/ui/button") to relative paths so the published
//     dist can be consumed outside the monorepo. tsc does not rewrite paths;
//     the vendored upstream sources stay immutable (digest/provenance intact).
//     Only the emitted dist is normalized.
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
      src = src.replaceAll('from "@/registry/new-york-v4/', `from "${prefix}`);
      src = src.replaceAll("from '@/registry/new-york-v4/", `from '${prefix}`);
      writeFileSync(file, src);
      console.log(`[postprocess] ${pkg}: ${f} -> ${prefix}…`);
    }
  }
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
  const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  resolveWorkspaceDeps(manifest, versions);
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
