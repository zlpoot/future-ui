/**
 * create-future-ui · local RC pilot vendoring。
 *
 * `--local-rc-dir <dir>` 要求提供 #104/PR #105 确定的四个真实 `.tgz` 归档
 * （文件名精确匹配 + 读取 tgz 内 package/package.json 校验 name/version）。
 * 通过后拷入生成项目 `vendor/future-ui/` 相对目录，避免生成工程依赖
 * monorepo workspace、源码 alias 或开发机绝对路径。
 *
 * 校验失败时给出可理解错误并安全退出（不写入任何文件）。
 */
import { execFileSync } from 'node:child_process';
import { closeSync, copyFileSync, existsSync, mkdirSync, openSync, readSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { CreateError } from './template.js';
import { RC_CANDIDATES, VENDOR_REL_DIR } from './constants.js';

/** 读取 tgz 内 package/package.json（依赖系统 tar；Windows 10+ 自带 bsdtar）。 */
function readTgzManifestNameVersion(tgzPath: string): { name: string; version: string } {
  try {
    const out = execFileSync('tar', ['-xOf', tgzPath, 'package/package.json'], {
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    });
    const parsed = JSON.parse(out) as { name?: string; version?: string };
    if (typeof parsed.name !== 'string' || typeof parsed.version !== 'string') {
      throw new Error('manifest 缺少 name/version');
    }
    return { name: parsed.name, version: parsed.version };
  } catch (e) {
    throw new CreateError(`无法读取归档 ${tgzPath} 的 package.json（tar 失败或内容非法）：${String(e)}`);
  }
}

export interface VendoredTarball {
  /** 归档绝对路径（源） */
  sourcePath: string;
  /** 归档文件名 */
  fileName: string;
  /** 相对生成工程根的 file: 引用 */
  fileRef: string;
  /** 归档 SHA-256（应与 #105 rc-dist/SHA256SUMS.txt 冻结清单一致） */
  sha256: string;
}

function sha256Of(filePath: string): string {
  const hash = createHash('sha256');
  const buf = Buffer.alloc(256 * 1024);
  const fd = openSync(filePath, 'r');
  try {
    let bytes = 0;
    while ((bytes = readSync(fd, buf, 0, buf.length, null)) > 0) {
      hash.update(buf.subarray(0, bytes));
    }
  } finally {
    closeSync(fd);
  }
  return hash.digest('hex');
}

/** 校验 rc 目录并返回 4 个归档的 vendoring 计划；任一不匹配即抛错。 */
export function planRcVendoring(rcDir: string): VendoredTarball[] {
  if (!existsSync(rcDir)) {
    throw new CreateError(`--local-rc-dir 目录不存在：${rcDir}`);
  }
  const files = new Set(readdirSync(rcDir));
  const missing: string[] = [];
  for (const cand of RC_CANDIDATES) {
    if (!files.has(cand.tarballName)) missing.push(cand.tarballName);
  }
  if (missing.length > 0) {
    throw new CreateError(
      `--local-rc-dir 缺少以下候选归档（应为 #104 的 rc-dist 产物）：\n  ${missing.join('\n  ')}`,
    );
  }

  const planned: VendoredTarball[] = [];
  for (const cand of RC_CANDIDATES) {
    const src = join(rcDir, cand.tarballName);
    const manifest = readTgzManifestNameVersion(src);
    if (manifest.name !== cand.packageName || manifest.version !== cand.version) {
      throw new CreateError(
        `归档内容与期望不符：${cand.tarballName}\n  期望 ${cand.packageName}@${cand.version}，实际 ${manifest.name}@${manifest.version}`,
      );
    }
    planned.push({
      sourcePath: src,
      fileName: cand.tarballName,
      fileRef: `${VENDOR_REL_DIR}/${cand.tarballName}`,
      sha256: sha256Of(src),
    });
  }
  return planned;
}

/** 把 4 个归档拷入目标项目 vendor 目录，并打印参与 pilot 的 SHA-256 证据。 */
export function vendorRcTarballs(projectDir: string, planned: VendoredTarball[]): void {
  const vendorDir = join(projectDir, VENDOR_REL_DIR);
  mkdirSync(vendorDir, { recursive: true });
  for (const t of planned) {
    copyFileSync(t.sourcePath, join(vendorDir, t.fileName));
    console.log(`  ${t.sha256}  ${t.fileName}`);
  }
}
