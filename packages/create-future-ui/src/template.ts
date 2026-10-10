/**
 * create-future-ui 模板写入与渲染。
 *
 * - `writeTemplate`：把 `templates/react-vite-ts/` 递归拷入目标目录；
 *   以 `.tmpl` 结尾的文件先做 `{{projectName}}` 占位替换再写为去后缀文件名。
 * - 模板文件本身不含 monorepo workspace、源码 alias 或绝对路径依赖。
 */
import { mkdirSync, readFileSync, readdirSync, cpSync, writeFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';

export class CreateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CreateError';
  }
}

export interface RenderedPackageJson {
  name: string;
  version: string;
  private: boolean;
  type: string;
  engines: { node: string };
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export const BASE_PACKAGE_JSON: RenderedPackageJson = {
  name: '{{projectName}}',
  version: '0.0.0',
  private: true,
  type: 'module',
  engines: { node: '>=24.21.0' },
  scripts: {
    dev: 'vite',
    build: 'vite build',
    preview: 'vite preview',
    typecheck: 'tsc --noEmit',
    test: 'vitest run',
  },
  dependencies: {
    '@future-ui/contracts': '1.0.0',
    '@future-ui/react-provider': '0.1.0-rc.1',
    '@future-ui/theme': '0.1.0-rc.1',
    '@future-ui/shadcn-adapter': '0.1.0-rc.1',
    'class-variance-authority': '0.7.1',
    cn: '0.4.0',
    'lucide-react': '1.52.0',
    'radix-ui': '1.7.0',
    react: '^19.2.0',
    'react-dom': '^19.2.0',
  },
  devDependencies: {
    '@tailwindcss/vite': '^4.1.0',
    '@testing-library/jest-dom': '^6.6.0',
    '@testing-library/react': '^16.1.0',
    '@types/react': '^19.2.0',
    '@types/react-dom': '^19.2.0',
    '@vitejs/plugin-react': '^4.3.0',
    jsdom: '^26.0.0',
    tailwindcss: '^4.1.0',
    typescript: '6.0.3',
    vite: '^7.3.7',
    vitest: '5.0.3',
  },
};

/** 目标目录校验：不存在 → 可创建；存在且空 → 可写；存在且非空 → 拒绝（不覆盖未知文件）。 */
export function assertTargetUsable(targetDir: string): void {
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
    return;
  }
  const entries = readdirSync(targetDir);
  if (entries.length > 0) {
    throw new CreateError(
      `目标目录已存在且非空，拒绝覆盖：${targetDir}\n请选择空目录或不存在的目录名（不会删除/覆盖任何现有文件）。`,
    );
  }
  // 空目录：直接使用
}

/** 递归渲染模板（.tmpl 占位替换）到目标目录。 */
export function writeTemplate(targetDir: string, templateDir: string, projectName: string): void {
  if (!existsSync(templateDir)) {
    throw new CreateError(`模板目录不存在：${templateDir}`);
  }
  for (const entry of readdirSync(templateDir)) {
    const src = join(templateDir, entry);
    const dest = join(targetDir, entry);
    if (entry.endsWith('.tmpl')) {
      const outName = basename(entry, '.tmpl');
      const content = readFileSync(src, 'utf8').replaceAll('{{projectName}}', projectName);
      writeFileSync(join(targetDir, outName), content, 'utf8');
      continue;
    }
    if (entry.endsWith('.tmpl.json')) {
      // 保留双后缀情况（当前未用，防御）
      const content = readFileSync(src, 'utf8').replaceAll('{{projectName}}', projectName);
      writeFileSync(join(targetDir, basename(entry, '.tmpl')), content, 'utf8');
      continue;
    }
    cpSync(src, dest, { recursive: true });
  }
}

/** 生成工程 package.json（渲染后对象）。 */
export function renderPackageJson(projectName: string): RenderedPackageJson {
  const manifest: RenderedPackageJson = JSON.parse(JSON.stringify(BASE_PACKAGE_JSON)) as RenderedPackageJson;
  manifest.name = projectName;
  return manifest;
}

/** 把 4 个 @future-ui/* 依赖改写为 pilot vendor 的 file: 相对引用。 */
export function rewriteDepsToVendor(manifest: RenderedPackageJson, tarballFor: (pkg: string) => string): void {
  const uiPackages = [
    '@future-ui/contracts',
    '@future-ui/react-provider',
    '@future-ui/theme',
    '@future-ui/shadcn-adapter',
  ] as const;
  for (const pkg of uiPackages) {
    if (manifest.dependencies[pkg] !== undefined) {
      manifest.dependencies[pkg] = `file:${tarballFor(pkg)}`;
    }
  }
}
