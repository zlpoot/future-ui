# R3-WIN-01 · #107 · create-future-ui Windows 离仓初始化验收

- 任务：https://github.com/zlpoot/future-ui/issues/107
- 授权：Issue #4 Current Grant = R3-WIN-01 / #107 IMPLEMENTATION_READY（ACTIVE）
- Base SHA：`48ad9733c49202bc878c6159929a37073efbbee1`（fetch 核对一致）
- 本地环境：Windows；Node v22.23.2（低于 engines 24.21.0，如实记录；CI node24 为权威）；pnpm 11.28.4；npm 10.9.8

## 交付产物

- `packages/create-future-ui/`：可独立 pack 的 CLI（bin `create-future-ui`）+ React 19 + Vite 7 + TypeScript 6 + Tailwind CSS v4 + shadcn/Radix 模板（空白启动入口 + fixture 测试，不预置管理页）
- `--local-rc-dir <dir>` 本地 pilot 模式：把四个真实 RC `.tgz` 拷入生成项目 `vendor/future-ui/` 相对目录，依赖改写为 `file:vendor/future-ui/<tgz>`（不依赖 monorepo workspace、源码 alias 或开发机绝对路径）
- root：`tsconfig.json` 排除 `packages/create-future-ui/templates`（模板由生成工程自身 typecheck 覆盖）；`ci.yml` 增加 `pnpm --filter create-future-ui build` 最小检查

## CLI 归档

`create-future-ui-0.1.0-rc.1.tgz`

SHA-256：`1F86A5AEF4D63EA8DBD9E44517884BE8069A1370C7EBDE1CC59D8A3250FB0838`

归档内容：`dist/*.js|.d.ts|.map` + `templates/react-vite-ts/**`（含 index.html.tmpl、README.md.tmpl、src/{main,App,theme.tsx,fixture.test.tsx,styles.css}、vite.config.ts、tsconfig.json）。

## 离仓初始化验收（全新空目录、源仓库外）

| 步骤 | 命令 | 退出码 | 结果 |
|---|---|---|---|
| 安装 CLI 归档 | `npm install <tgz>`（E:\projects\cfu-accept\cli-consumer） | 0 | 归档可安装，`.bin\create-future-ui.cmd` 可用 |
| 生成 pilot 工程 | `create-future-ui my-fifth --local-rc-dir E:\projects\future-ui-r3rc\rc-dist` | 0 | 生成 `my-fifth`；`vendor/future-ui/` 拷入 4 个 tgz；package.json 依赖为 `file:vendor/future-ui/<tgz>` |
| 安装生成工程 | `pnpm install`（my-fifth 内） | 0 | 依赖解析成功（无 workspace:*、无 src/ 发布入口） |
| 严格 typecheck | `pnpm typecheck` | 0 | `tsc --noEmit`（strict、noUnusedLocals 等）通过 |
| 构建 | `pnpm build` | 0 | `vite build` 通过；CSS 20.46 kB（Tailwind v4 `@source` 扫描生效） |
| fixture 测试 | `pnpm test` | 0 | 5/5 通过（Button / TextInput / EditDialog 预填/取消/保存 pending / Light-Dark data-theme） |
| 迁移 smoke | 复制 `my-fifth` 到新目录 → `pnpm install` + `pnpm typecheck` | 0 / 0 | 工程可整体迁移，不锁绝对路径 |

### CLI 错误场景（均退出码 1，不覆盖未知文件）

- 目标目录已存在且非空 → 拒绝并提示
- `--local-rc-dir` 缺候选归档 → 列出缺失文件名
- 非法 `<project-name>`（含空格）→ 拒绝并显示 help

## 真实 Chrome 验证（loopback 127.0.0.1:5173，端口仅本机监听）

证据截图：`docs/r3-win01/evidence/`（win01-light / win01-dialog-light / win01-pending / win01-dark）。

| 用例 | 操作方式 | 结果 |
|---|---|---|
| 页面渲染 | 真实 Chrome 打开生成工程 | 卡片/按钮/输入框/列表/Dialog 全部渲染，Tailwind 语义类生效 |
| Dialog 预填 | 真实点击“编辑” | 标题=示例任务、描述=本地演示数据，预填正确 |
| 取消不保存 | 真实点击“取消” | Dialog 关闭，列表不变（草稿丢弃） |
| 保存全链路 | 真实键盘输入新标题 → 真实点击“保存并关闭” | pending“保存中…”（按钮 disabled，已截图）→ 自动关闭 → 列表更新为“浏览器保存验证” |
| Light/Dark 切换 | 真实点击右上角 theme-toggle | 按钮文本与全页（含卡片/输入框/列表）视觉同步换肤；`data-theme` 同步 |
| Dialog 打开期间物理换肤 | 真实点击 theme-toggle（Dialog 打开时） | NOT-VERIFIED：被 Radix Modal 外部 inert 设计性阻止（bu 报 covered by another element）；程序化换肤由 fixture 覆盖 |

## 失败修复记录（保留真实过程）

1. **CLI 无入口**：`src/cli.ts` 只导出函数，bin 运行 exit 0 无输出 → 补 `invokedEntry` 判断（仅 CLI 直跑时执行 run）。
2. **npm .cmd shim 无 node 前缀**：归档 `cli.js` 无 shebang → 补 `#!/usr/bin/env node` 后 shim 正常。
3. **theme.ts JSX 解析失败**：含 JSX 但扩展名为 `.ts`（jsx 选项仅对 .tsx 生效）→ 改名 `theme.tsx`。
4. **fixture 未用 act**：`noUnusedLocals` 报错 → 移除 import。
5. **fixture DOM 累积**：vitest 未开 globals、@testing-library 无自动 cleanup → 显式 `afterEach(cleanup)`。
6. **stash 事故**：排查 typecheck 时 stash/pop 冲突导致 tsconfig 回退，已恢复 exclude 并重新全量通过。
7. **webmcp-adapter 模块缺失**：为增量 install 布局差异导致；`pnpm install --frozen-lockfile` 重装后消失（pre-existing，非本轮改动）。

## 未测范围（如实记录）

- **macOS：MAC_NOT_TESTED**（当前无 Mac 访问；资产与命令保留，等待独立执行者验证）。
- **npm registry 公网**：`@future-ui/*` 未发布，`npm create future-ui@latest` 不可用（模板默认保留版本引用的 registry 形态仅为未来占位，本地验收一律走 `--local-rc-dir` pilot）。
- **Dialog 打开期间物理换肤**：NOT-VERIFIED（Radix Modal 边界，见上）。
- **Node 24 权威环境**：本机 Node 22 下 `tests/toolchain.test.ts`（Node major=24 断言）失败为 pre-existing 环境差异；CI（node 24）为权威。
- 不扩大公共 Contract/Schema/Profile 语义；未调用付费模型；未发布 npm/Tag/Release。

## 结论

`create-future-ui` 可独立 pack、可离仓安装、可生成完整可安装/运行/构建/测试的 React 工程；Windows 真实验收通过。停止于 `AWAITING_INDEPENDENT_REVIEW`，交 ChatGPT 对 exact HEAD 独立 Review。
