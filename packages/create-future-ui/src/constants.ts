/**
 * create-future-ui 核心常量。
 *
 * 模板与候选 RC 包的对应关系（与 #104/PR #105 的四个离仓归档一致）：
 *  - @future-ui/contracts 1.0.0
 *  - @future-ui/react-provider 0.1.0-rc.1
 *  - @future-ui/theme 0.1.0-rc.1
 *  - @future-ui/shadcn-adapter 0.1.0-rc.1
 *
 * 模板默认保留 registry 版本引用（未来 `npm create future-ui@latest` 形态）；
 * `--local-rc-dir` pilot 模式把真实 `.tgz` 归档拷入生成项目的
 * `vendor/future-ui/` 相对目录，并把依赖改写为 `file:vendor/future-ui/<tgz>`
 * —— 生成工程不依赖 monorepo workspace、源码 alias 或任何开发机绝对路径。
 */
export const TEMPLATE_NAME = 'react-vite-ts' as const;

export interface RcCandidate {
  /** 候选包名（模板依赖键） */
  packageName: string;
  /** 期望版本 */
  version: string;
  /** pnpm pack 产物文件名（精确匹配，来自 #105 的 rc-dist） */
  tarballName: string;
}

export const RC_CANDIDATES: readonly RcCandidate[] = [
  { packageName: '@future-ui/contracts', version: '1.0.0', tarballName: 'future-ui-contracts-1.0.0.tgz' },
  { packageName: '@future-ui/react-provider', version: '0.1.0-rc.1', tarballName: 'future-ui-react-provider-0.1.0-rc.1.tgz' },
  { packageName: '@future-ui/theme', version: '0.1.0-rc.1', tarballName: 'future-ui-theme-0.1.0-rc.1.tgz' },
  { packageName: '@future-ui/shadcn-adapter', version: '0.1.0-rc.1', tarballName: 'future-ui-shadcn-adapter-0.1.0-rc.1.tgz' },
] as const;

/** pilot vendor 相对目录（相对生成工程根） */
export const VENDOR_REL_DIR = 'vendor/future-ui' as const;

/** 生成工程的默认端口（模板 vite.config.ts 需保持一致） */
export const DEFAULT_DEV_PORT = 5173 as const;
