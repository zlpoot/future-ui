# R3-WIN-01 · #107 · create-future-ui Windows 离仓初始化验收

- 任务：https://github.com/zlpoot/future-ui/issues/107
- 授权：Issue #4 Current Grant = R3-WIN-01 / #107 IMPLEMENTATION_READY（ACTIVE）
- Base SHA：`48ad9733c49202bc878c6159929a37073efbbee1`（fetch 核对一致）
- 本地环境：Windows；Node v22.23.2（低于 engines 24.21.0，如实记录；CI node24 为权威）；pnpm 11.28.4；npm 10.9.8
- **Review 增量轮（PR #110）补充：Windows Node 24.21.0 权威验证**（系统 `C:\Program Files\nodejs\node.exe` + npm 11.19.0，见下文）

## 交付产物

- `packages/create-future-ui/`：可独立 pack 的 CLI（bin `create-future-ui`）+ React 19 + Vite 7 + TypeScript 6 + Tailwind CSS v4 + shadcn/Radix 模板（空白启动入口 + fixture 测试，不预置管理页）
- `--local-rc-dir <dir>` 本地 pilot 模式：把四个真实 RC `.tgz` 拷入生成项目 `vendor/future-ui/` 相对目录，依赖改写为 `file:vendor/future-ui/<tgz>`（不依赖 monorepo workspace、源码 alias 或开发机绝对路径）
- root：`tsconfig.json` 排除 `packages/create-future-ui/templates`（模板由生成工程自身 typecheck 覆盖）；`ci.yml` 增加 `pnpm --filter create-future-ui build` 最小检查

## CLI 归档

`create-future-ui-0.1.0-rc.1.tgz`

SHA-256：`CB9D8C7E6A4777890278F12915B09A8ECD803C8613FF3B183455508F8BB9D306`（三轮 Review 修复后新 HEAD 重新打包；历史值 `8A4A9E17…`、`FC7650AE…`、`1F86A5AE…` 均已标记废弃，不与最终候选混淆）

归档内容：`dist/*.js|.d.ts|.map` + `templates/react-vite-ts/**`（含 index.html.tmpl、README.md.tmpl、src/{main,App,theme.tsx,fixture.test.tsx,styles.css}、vite.config.ts、tsconfig.json）。

## 三轮 Review 修复（Review #5481358683，两项 OPEN）

| 项 | 问题 | 修复 | 验证 |
|---|---|---|---|
| P2-1 命名规则漏项 | `[a-z0-9._-]` 放过前导连字符（`-demo`）；排除名仅两个，放过 Node core module 名（`http`/`stream`），与 `validForNewPackages` 不一致 | 新增：拒绝 `startsWith('-')`；`builtinModules` 枚举 Node 内置名（去 `node:` 前缀、取段首）并拒绝（`http`/`stream`/`fs`/`path`/`events`/`buffer` 等）。`name-`、`my_app`、`httpd`/`streams` 仍合法 | 单测新增 3 组用例全过 |
| P2-2 提交失败清理缺口 | `rmdirSync`/`renameSync` 在 catch 外；rename 抛错（Windows 占用/权限）会残留完整暂存目录，已存在空目录先被移除 | 提交纳入 fail-safe try/finally：rename 失败 → `rmSync` 清理暂存 + 目标原本为空目录则 `ensureTargetDir` 恢复原状；原本不存在则保持不存在 | 单测注入可控 `renameSync` EPERM：非零退出、无暂存残骸、原空目录保留、修复后同名重试成功 ✓ |

## 二次 Review 修复（Review #5481310333，两项 OPEN）

| 项 | 问题 | 修复 | 验证 |
|---|---|---|---|
| P1-1 事务性生成（阻断） | 预检虽提前，但写入仍在最终目标内进行；`copyFileSync`/写 manifest 中途失败会留非空半成品，同名重试被拒绝 | `run()` 改为三段式：只读预检 → **全部写入父目录下的暂存目录**（`.name.cfu-staging-<rand>`）→ 全部成功后 `renameSync` 一次性提交（同卷原子；目标存在且为空时仅移除空目录后 rename，不触碰未知文件）。任何失败 `rmSync` 清理暂存，最终目标保持原状 | 单测：注入“模板已写入后 vendor 拷贝故障”→ run 返回 1、最终目标不存在、无暂存残骸 → 修复后同名重试成功 ✓；目标存在且为空目录可生成 ✓ |
| P2-2 npm 新包名规则缺口 | 仍允许 `MyApp`（大写）、`my~app`（~）、`node_modules`/`favicon.ico`（保留名） | `validateProjectName` 按 `validate-npm-package-name.validForNewPackages` 补齐：拒绝大写、`~ ' ! ( ) *` 等非 URL 安全字符、首尾空格、`node_modules`/`favicon.ico`；保留 Windows 设备名拒绝（前置检查）与末尾点（Windows 目录约束）；合法字符集收紧为 `[a-z0-9._-]` | 单测 14 组用例全过（含 `MyApp`/`my~app`/`node_modules`/`favicon.ico` 拒绝；`my_app`、`name-` 仍合法） |

## Review 增量修复（PR #110，P1×2 + P2×2）

| 项 | 问题 | 修复 | 验证 |
|---|---|---|---|
| P1-1 | `writeTemplate` 在 `planRcVendoring()` 之前执行；缺归档失败后留下非空工程，无法同名重试 | `run()` 拆为两阶段：先只读预检（`checkTargetUsable` + `planRcVendoring`），全部通过后才 `ensureTargetDir` + 写入 | 单测：坏 rc 失败 → 目标目录不存在 → 同名重试成功（工程完整、vendor 4 个 tgz 就位）✓ |
| P1-2 | `dist/` 被 gitignore，仅 `build` 无 prepack/发布前构建门；CI 未真实 build/pack | package.json 加 `prepack: tsc`；CI 加 create-future-ui build + pack smoke（`pnpm pack` 后校验归档含 `dist/cli.js` 与模板，并 `node dist/cli.js --help`） | 本地 `pnpm pack` 触发 prepack 成功；归档内容已校验 ✓ |
| P2-1 | 仅查 name/version 无法证明与 #105 四份冻结 tgz 同一内容 | `planRcVendoring` 为每个归档记录并打印 SHA-256；验收记录实际参与 pilot 的四包 SHA 并与 #105 `SHA256SUMS.txt` 对照 | 4/4 完全一致（见下表）✓ |
| P2-2 | 项目名正则接受 `.`/`..`、Windows 设备名（CON 等）与非 npm 名 | 新增 `validateProjectName`：拒绝 `.`/`..`、Windows 保留设备名（CON/PRN/AUX/NUL/COM1-9/LPT1-9，含 `CON.txt` 形态）、以 `.`/`_` 开头、以 `.`/`_`/`-` 结尾、超长与非 URL 安全字符 | 单测 12 组用例全过 ✓ |

### P2-1：pilot 四包 SHA-256 与 #105 冻结清单对照（实际参与本次 pilot 的归档）

| 包 | 归档 | SHA-256 | #105 SHA256SUMS.txt |
|---|---|---|---|
| @future-ui/contracts | future-ui-contracts-1.0.0.tgz | `c4e21549…d8afbeb` | 一致 |
| @future-ui/react-provider | future-ui-react-provider-0.1.0-rc.1.tgz | `32a02079…8e17671` | 一致 |
| @future-ui/shadcn-adapter | future-ui-shadcn-adapter-0.1.0-rc.1.tgz | `4ffc55ab…d08e2ce3` | 一致 |
| @future-ui/theme | future-ui-theme-0.1.0-rc.1.tgz | `94d22ced…580533945` | 一致 |

### Windows Node 24 最小 npm 离仓验证（全新目录 `E:\projects\cfu-accept\node24-accept\`，全程系统 Node 24.21.0）

执行方式（绝对路径固定，不依赖 PATH 里的 sandbox Node22）：
`$node24 = 'C:\Program Files\nodejs\node.exe'`（v24.21.0）；`$npmCli = 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js'`（npm 11.19.0）；一律 `& $node24 $npmCli …`。

| 步骤 | 命令 | 退出码 |
|---|---|---|
| 安装 CLI 归档 | `& $node24 $npmCli install <cli.tgz> --prefix installer` | 0（added 1 package） |
| 生成 pilot 工程 | `& $node24 installer\node_modules\create-future-ui\dist\cli.js my-node24 --local-rc-dir <rc-dist>` | 0（vendor 4 tgz 就位） |
| 安装生成工程 | `& $node24 $npmCli install`（my-node24 内） | 0（added 243 packages；npm11 拦截 esbuild postinstall，`install-scripts approve esbuild` 后放行） |
| 构建 | `& $node24 node_modules\vite\bin\vite.js build` | 0（CSS 20.46 kB，与 pnpm 产物一致） |
| typecheck | `& $node24 node_modules\typescript\bin\tsc --noEmit` | 0 |
| fixture 测试 | `& $node24 node_modules\vitest\vitest.mjs run` | 0（5/5） |

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
8. **Review P1-2 首次 typecheck 失败（TS2575）**：`readSync` 4 参数 overload 在 @types/node 24 不存在 → 改 5 参数形式（offset/length/position）后通过。
9. **Review P1-1 重试测试构造**：合法候选 tgz 由测试内 `tar -czf` 构造（package/package.json 含 name/version），验证 planRcVendoring 全链路，不依赖真实 rc-dist。
10. **二次 Review P1-1 顺序缺陷**：设备名检查置于大写检查之后，`PRN` 等先命中“不能含大写”→ 将 Windows 设备名检查前置（本身大小写不敏感）后 21/21 全过。
11. **二次 Review P2-2 事务回归测试注入**：`vi.mock` 包装 `vendorRcTarballs`（vi.hoisted 故障开关），模拟“模板已写入后复制故障”，验证暂存清理与同名重试。
12. **三轮 Review P2-1 合法用例冲突**：原“非设备名前缀合法”用例用 `console`，而 `console` 恰为 Node builtin（新规则正确命中）→ 换用 `concurrent` 后 24/24 全过。
13. **三轮 Review P2-2 提交失败回归注入**：`vi.mock` 包装 `node:fs.renameSync`（vi.hoisted EPERM 开关），验证 rename 失败清理与空目录恢复。

## 未测范围（如实记录）

- **macOS：MAC_NOT_TESTED**（当前无 Mac 访问；资产与命令保留，等待独立执行者验证）。
- **npm registry 公网**：`@future-ui/*` 未发布，`npm create future-ui@latest` 不可用（模板默认保留版本引用的 registry 形态仅为未来占位，本地验收一律走 `--local-rc-dir` pilot）。
- **Dialog 打开期间物理换肤**：NOT-VERIFIED（Radix Modal 边界，见上）。
- **Node 22 本地环境**：本机 PATH 首位为 sandbox Node 22，`tests/toolchain.test.ts`（Node major=24 断言）在 Node 22 下失败为 pre-existing 环境差异；本轮已用系统 **Node 24.21.0** 完成权威 npm 离仓验证，CI（node 24）亦为权威。
- 不扩大公共 Contract/Schema/Profile 语义；未调用付费模型；未发布 npm/Tag/Release。

## 结论

`create-future-ui` 可独立 pack（prepack 构建门）、可离仓安装（Node 22 pnpm 与 Node 24 npm 双通道）、可生成完整可安装/运行/构建/测试的 React 工程；三轮 Review 全部指出的问题（事务性生成、npm 新包名规则含前导 `-` 与 builtin、提交 fail-safe）均已修复并补充 Node 24 权威证据。Windows 真实验收通过。停止于 `AWAITING_INDEPENDENT_REVIEW`，等待增量 Review。
