/**
 * R3-RC-001 (#104) · P2-01 · 归档内容检查（CI 门）。
 *
 * 对 rc-dist/*.tgz 逐一验证发布归档的真实内容：
 *   1) manifest 不残留 workspace:*（消费者无法解析）；
 *   2) exports 发布入口不指向仓库内 src/*.ts（离仓可消费 dist 产物）；
 *   3) exports 声明的 types/default/资源文件在包内真实存在；
 *   4) shadcn-adapter 归档必须携带 THIRD_PARTY_LICENSES.md（P1-03）；
 *   5) SHA256SUMS.txt 与每个 .tgz 的实际 SHA-256 一致（P1-02）。
 *
 * 任一失败 exit 1。不解析依赖图，不做跨平台矩阵。
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'rc-dist');

/** tar 解包读取包内文件（pnpm pack 的 tgz 顶层为 package/） */
function readFromTgz(tgz, entry) {
  // use system tar for extraction to stdout
  const buf = execFileSync('tar', ['-xOf', tgz, entry], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  return buf;
}

function listEntries(tgz) {
  const out = execFileSync('tar', ['-tf', tgz], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  return out.split(/\r?\n/).filter(Boolean);
}

function sha256File(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

let failures = 0;
const tgzFiles = readdirSync(outDir).filter((f) => f.endsWith('.tgz')).sort();
if (tgzFiles.length === 0) {
  console.error('rc-dist 为空：请先运行 corepack pnpm run build:rc');
  process.exit(1);
}

// 0) SHA256SUMS 一致性（P1-02）
const sumsPath = join(outDir, 'SHA256SUMS.txt');
if (!existsSync(sumsPath)) {
  console.error('缺少 rc-dist/SHA256SUMS.txt');
  process.exit(1);
}
const sums = new Map(
  readFileSync(sumsPath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [h, f] = line.trim().split(/\s+/);
      return [f, h];
    }),
);
for (const f of tgzFiles) {
  const actual = sha256File(join(outDir, f));
  const recorded = sums.get(f);
  if (recorded !== actual) {
    failures++;
    console.error(`SHA 不一致 ${f}: SUMS=${recorded} actual=${actual}`);
  } else {
    console.log(`[sha256] ${f} ${actual}`);
  }
}

for (const f of tgzFiles) {
  const pkgName = f.replace(/\.tgz$/, '');
  console.log(`\n=== check ${f} ===`);
  const entries = listEntries(join(outDir, f));
  const manifest = JSON.parse(readFromTgz(join(outDir, f), 'package/package.json'));

  // 1) workspace:* 残留
  const allDeps = { ...(manifest.dependencies ?? {}), ...(manifest.devDependencies ?? {}), ...(manifest.peerDependencies ?? {}) };
  const ws = Object.entries(allDeps).filter(([, v]) => typeof v === 'string' && v.startsWith('workspace:'));
  if (ws.length > 0) {
    failures++;
    console.error(`  workspace:* 残留: ${JSON.stringify(ws)}`);
  } else {
    console.log('  [workspace:*] 无残留');
  }

  // 2)+3) exports 入口 → 包内文件存在
  for (const [sub, spec] of Object.entries(manifest.exports ?? {})) {
    const targets = typeof spec === 'string' ? [spec] : [spec.types, spec.default].filter(Boolean);
    for (const t of targets) {
      if (t.startsWith('./src/')) {
        failures++;
        console.error(`  exports ${sub} 指向仓库内源码: ${t}`);
        continue;
      }
      // glob 模式（如 ./schemas/*）为动态匹配，按存在任意候选文件判定
      if (t.includes('*')) {
        const prefix = `package/${t.replace(/^\.\//, '').split('*')[0]}`;
        if (entries.some((e) => e.startsWith(prefix))) {
          console.log(`  [exports] ${sub} -> ${t} OK (glob)`);
          continue;
        }
        failures++;
        console.error(`  exports ${sub} glob 无匹配文件: ${t}`);
        continue;
      }
      const entry = `package/${t.replace(/^\.\//, '')}`;
      if (!entries.includes(entry)) {
        failures++;
        console.error(`  exports ${sub} 文件缺失: ${entry}`);
      } else {
        console.log(`  [exports] ${sub} -> ${t} OK`);
      }
    }
  }

  // 4) License（P1-03）
  const licenseEntry = 'package/THIRD_PARTY_LICENSES.md';
  if (pkgName.startsWith('future-ui-shadcn-adapter') && !entries.includes(licenseEntry)) {
    failures++;
    console.error('  shadcn-adapter 归档缺少 THIRD_PARTY_LICENSES.md');
  } else if (pkgName.startsWith('future-ui-shadcn-adapter')) {
    const lic = readFromTgz(join(outDir, f), licenseEntry);
    const hasShadcn = lic.includes('Copyright (c) 2023 shadcn') && lic.includes('MIT License');
    if (!hasShadcn) {
      failures++;
      console.error('  THIRD_PARTY_LICENSES.md 内容缺少 shadcn/ui MIT 声明');
    } else {
      console.log('  [license] THIRD_PARTY_LICENSES.md 含 shadcn/ui MIT 声明 OK');
    }
  }

  // 附加：归档内 dist 主入口存在（防御）
  const distIndex = 'package/dist/index.js';
  if ((manifest.exports?.['.'] ?? undefined) && !entries.includes(distIndex)) {
    // main 入口也可能是 ./dist/index.js；此处仅对声明过 dist 的包做存在性防御
    failures++;
    console.error(`  缺少 ${distIndex}`);
  }
}

if (failures > 0) {
  console.error(`\n=== check:rc FAILED (${failures}) ===`);
  process.exit(1);
}
console.log(`\n=== check:rc PASS (${tgzFiles.length} 个归档) ===`);
