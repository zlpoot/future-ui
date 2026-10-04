# M0-01 工具链与私有包边界决策

日期：2026-10-04  
状态：**Accepted for #5 / active on main**。负责人于 2026-10-04 明确接受本文件的 D01 / D12 方案，并已随 PR #24 合并进入 main（baseline `93ae277199faa18b5a8415228e7c244d37ba7673`）。这只冻结 #5 的工具链与私有包边界，不等于开发授权；#5 仍必须由 #4 Current Grant 单独授权后才可能进入 Ready。

## 目标

为 #5 提供最小、可复现、低耦合的 TypeScript 工程基础。M0-01 只建立 workspace、lint/typecheck/test、轻量 CI 和私有包命名规则；不提前引入 React、Ark UI、WebMCP、DOM 测试环境、bundler、发布工具或模型 SDK。

## D01 已接受工具链

| 项目 | 建议冻结版本 / 规则 | 理由 |
| --- | --- | --- |
| Node.js | `24.21.0` LTS | 选择 LTS 而非 Node 26 Current；作为本地/CI 的统一开发运行时 |
| pnpm | `11.28.4` | 使用 pnpm 11 的稳定线；满足 Node 22+，不为 M0 引入 pnpm 12 的额外多生态能力。初始冻结 11.28.2，因 11.28.2 在 `--frozen-lockfile` 下存在 supply-chain 校验 bug（校验和一致仍误报 `ERR_PNPM_TARBALL_INTEGRITY`，见下方修订记录），升到 11.28.4 |
| TypeScript | `6.0.3` | 虽然最新 TypeScript 已到 7.0.x，但当前 typescript-eslint 官方支持范围仍为 `<6.1.0`；先选择双方正式支持的组合 |
| @types/node | `24.19.1` | 与 Node 24 开发目标对齐，不使用当前默认 latest 的 Node 26 类型 |
| ESLint | `10.12.0` | 当前 ESLint 10 稳定线；采用 flat config |
| typescript-eslint | `8.71.0` | 官方当前支持 ESLint 10，且支持 TypeScript `>=4.8.4 <6.1.0` |
| Vitest | `5.0.3` | 当前 Vitest 5 稳定线；M0 只使用 Node 环境确定性测试 |
| 模块约定 | ESM source；root private；不冻结公开发布 output format | M0 只建立开发事实，不提前决定 D13 的 npm/public distribution |
| Formatter | Deferred | #5 Acceptance 不要求 formatter；避免无关工具膨胀 |
| Bundler/build publisher | Deferred | #5 不需要发布产物；后续按首个真实 package consumer 再决定 |

### 建议 package / workspace 规则

- root `package.json`: `"private": true`。
- `packageManager` 精确记录 `pnpm@11.28.4`；lockfile 提交。
- Node 本地与 CI 固定 `24.21.0`；允许使用 `.node-version` 或等价仓库事实固定。
- devDependencies 使用精确版本，由 lockfile 保证 transitive reproducibility。
- workspace 采用 `packages/*`，但 **#5 不为未来所有逻辑模块预建空包**；具体包在对应 Issue 第一次真实消费时创建。
- lint、typecheck、test 三个入口保持独立；不使用“一个总脚本成功”掩盖某一项未运行。
- M0 test environment 只使用 Node；jsdom / browser mode 留到组件消费者需要时 JIT 冻结。

### 轻量 CI 已接受范围

第一版只跑一个 Linux job，不做 OS / Node 多矩阵：

1. checkout；
2. 安装 Node 24.21.0；
3. 安装 pnpm 11.28.4；
4. `pnpm install --frozen-lockfile`；
5. `pnpm lint`；
6. `pnpm typecheck`；
7. `pnpm test`。

候选 Action 版本：
- `actions/checkout@v7.0.1`
- `actions/setup-node@v7.0.0`
- `pnpm/action-setup@v6.1.0`

这些是 #5 已接受的工具链范围；真正 workflow 只能在 #5 获得 G0 Current Grant 后创建。M0 不跑浏览器、模型、真实 provider 或发布。

## 为什么暂不采用 TypeScript 7

TypeScript 官方当前最新稳定版已经是 7.0.2，但 TypeScript 7 是新的 native compiler 代际；与此同时，typescript-eslint 当前声明的正式 TypeScript 支持范围仍是 `>=4.8.4 <6.1.0`。因此 M0 若采用 ESLint + typescript-eslint，直接选 TS 7 会让项目一开始就进入“核心 lint 工具未声明正式支持”的组合。

已接受策略：
- M0 锁定 TypeScript 6.0.3。
- 将 TypeScript 7 升级作为后续独立 dependency decision；等 typescript-eslint 明确支持后再评估。
- 不为了追“最新版本”牺牲第一条工程基线的可复现性。

## D12 已接受私有 package 命名

### 内部命名

使用 workspace-local scope：

```text
@future-ui/*
```

规则：
- 所有 M0/M1 package 在 D13 之前保持 `"private": true`。
- 内部名称只是仓库 workspace namespace，不代表拥有或承诺未来 npm 公共 scope。
- 包只在真实 Issue 首次需要时创建。例如 #6 可创建 `@future-ui/contracts`；#7 后续才创建其真实需要的 plugin-kernel 包。
- 不提前创建 `@future-ui/react`、`@future-ui/webmcp` 等空包占位。
- 如果 D13 最终发现公共 npm scope 不可用或公开命名策略不同，可以在发布前统一迁移；不让发布决策阻塞本地 M0/M1。

### #5 已接受直接工具/依赖许可记录

| 工具 | 许可 | M0 判断 |
| --- | --- | --- |
| Node.js | MIT（项目主体） | permissive，可作为开发/CI runtime |
| pnpm | MIT | permissive |
| TypeScript | Apache-2.0 | permissive |
| @types/node | MIT | permissive |
| ESLint | MIT | permissive |
| typescript-eslint | MIT | permissive |
| Vitest | MIT | permissive |

当前已接受方案没有直接引入 copyleft runtime dependency。此表只记录 #5 直接选用工具/依赖的许可，不替代未来发布前的完整供应链/NOTICE/传递义务审查；D13 仍保持 Deferred。

## 官方/上游依据

查阅日期：2026-10-04。

- Node.js releases / LTS：https://nodejs.org/en/about/previous-releases
- Node.js 24.21.0：https://nodejs.org/en/download/archive/v24.21.0
- TypeScript download / current：https://www.typescriptlang.org/download/
- TypeScript 6.0 release notes：https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html
- TypeScript license：https://github.com/microsoft/TypeScript/blob/main/LICENSE.txt
- typescript-eslint dependency support：https://typescript-eslint.io/users/dependency-versions/
- pnpm release blog：https://pnpm.io/blog?type=releases
- ESLint releases：https://eslint.org/blog/2026/10/eslint-v10.12.0-released/
- Vitest 5：https://vitest.dev/blog/vitest-5
- GitHub Actions checkout releases：https://github.com/actions/checkout/releases
- GitHub Actions setup-node releases：https://github.com/actions/setup-node/releases
- pnpm/action-setup releases：https://github.com/pnpm/action-setup/releases

## 已接受决定

负责人于 2026-10-04 明确接受以下决定：

1. Node 24.21.0。
2. pnpm 11.28.4（初始 11.28.2，修订原因见 D01 表）。
3. TypeScript 6.0.3（暂不采用 TS 7）。
4. ESLint 10.12.0 + typescript-eslint 8.71.0。
5. Vitest 5.0.3。
6. root private + workspace-local `@future-ui/*`；公共 npm naming 留到 D13。
7. #5 允许创建单 job GitHub Actions CI，并允许 install/lint/typecheck/test。

以上决定只解决 #5 的 D01/D12 前置，不等于授权 #5 开发。D01/D12 已在 main 生效；仍需 #4 Current Grant 明确列出 #5 与允许动作，#5 才可能通过 DoR 进入 Ready。

## 修订记录

- 2026-10-04（#5 实现 PR 阶段）：pnpm 11.28.2 → 11.28.4。CI 在 `pnpm install --frozen-lockfile` 下对 `@typescript-eslint/typescript-estree@8.71.0` 与 `@typescript-eslint/scope-manager@8.71.0` 误报 `ERR_PNPM_TARBALL_INTEGRITY`（Wanted 与 Got 校验和一致仍失败，本地/registry tarball 三方核对无差异）；pnpm 11.28.4 发布说明明确修复了 frozen-lockfile 拒绝若干本应接受的 lockfile 的问题，故升级。属 D01 工具链小版本修订，不改变 Node/TS/ESLint/Vitest 与边界决策。
