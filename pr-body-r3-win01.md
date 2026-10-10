# R3-WIN-01 (#107) · create-future-ui CLI + React 19 / Vite / TS / Tailwind v4 模板

## 状态
Draft · 停 AWAITING_INDEPENDENT_REVIEW（Review 四项已修复 + Node 24 权威验证补充，交 ChatGPT 对 exact HEAD 增量复核）

- Base SHA：`48ad9733c49202bc878c6159929a37073efbbee1`（main）
- Head SHA：见本 PR 远端 HEAD（Review 修复后新 commit；原 `3ff3907` 已过时）

## 目标
建立第一个可离开 Future UI 源仓库使用的 React 新工程初始化器：
`npm create future-ui@latest my-admin` 为未来公网形态；**当前 npm 未发布**，本轮通过可 pack 的本地 CLI + 四个真实 RC 归档完成 Windows 验收（不假称公网命令可用）。

## 改动文件与包结构

- `packages/create-future-ui/`（新）
  - `src/cli.ts`：bin 入口（`create-future-ui`），参数校验（`validateProjectName`）、两阶段执行（先只读预检、后安全写入）、错误处理、下一步指引
  - `src/template.ts`：目标目录只读预检（`checkTargetUsable`，非空拒绝不覆盖）+ 创建（`ensureTargetDir`）、模板渲染、package.json 生成与 file: 改写
  - `src/rc-vendor.ts`：`--local-rc-dir` 校验（4 个真实归档文件名 + tgz 内 name/version 内容校验 + **SHA-256 记录**）并 vendoring
  - `src/constants.ts`：候选 RC 包/归档清单、vendor 相对目录
  - `templates/react-vite-ts/`：React 19 + Vite 7 + TS 6（strict）+ Tailwind v4 + shadcn/Radix 空白启动入口 + fixture 测试（不预置管理页）
  - `tests/cli.test.ts`：CLI 单测（17 例，含 P1-1 失败后同名重试、P2-2 项目名校验边界）
- `tsconfig.json`：排除 `packages/create-future-ui/templates`（模板由生成工程自身 typecheck 覆盖）
- `.github/workflows/ci.yml`：增加 `pnpm --filter create-future-ui build` + **pack/bin smoke**（prepack 构建门 + 归档内容校验）
- `docs/r3-win01/`：验收报告（含 Review 修复记录、Node 24 验证、SHA 对照）+ 证据截图

## 关键设计

- **pilot 模式**：`--local-rc-dir <dir>` 把四个真实 `.tgz` 拷入生成项目 `vendor/future-ui/`，依赖改写为 `file:vendor/future-ui/<tgz>` —— 工程不依赖 monorepo workspace、源码 alias 或开发机绝对路径，可整体迁移。
- **Tailwind v4 扫描**：`styles.css` 用 `@source "../node_modules/@future-ui/shadcn-adapter/dist"` 显式扫描打包组件类（不能仅以 React 渲染通过即宣称 PASS）。
- **主题单一数据源**：`@future-ui/theme/theme.css`（Light/Dark token），模板不复制第二份色值，切换只同步 `data-theme` 到 `<html>`（Radix Portal 内 Dialog 随主题换肤）。
- 浏览器图只导入 `@future-ui/shadcn-adapter/browser` 等浏览器安全入口，不触碰 `@future-ui/contracts` Node-only 校验器或 ai-dev。
- 不预置完整管理页；默认仅 loopback 本地开发。

## CLI 归档

`create-future-ui-0.1.0-rc.1.tgz`

SHA-256：`FC7650056596C227AD0EAE40700CBDB0A5B449F014A8FF707F501D9407307507`（Review 修复后新 HEAD 重新打包；历史值 `1F86A5AE…` 已废弃）

内容：`dist/`（ESM JS + .d.ts + map）+ `templates/react-vite-ts/**`。

## Review 增量修复（本轮）

- **P1-1 安全失败**：`run()` 拆两阶段——先只读预检（目标目录 + RC 资产），全部通过后才写入；缺归档失败不再留下非空工程，同名重试可成功。新增 run() 级失败重试测试（真实构造 tgz）。
- **P1-2 干净 checkout 打包风险**：package.json 增加 `prepack`（tsc 构建门）；CI 增加 `create-future-ui build` + pack/bin smoke（`pnpm pack` → 校验归档含 `dist/cli.js` 与模板 → `node dist/cli.js --help`）。
- **P2-1 RC 资产完整性**：`planRcVendoring` 记录并打印每包 SHA-256；验收文档与 #105 `SHA256SUMS.txt` 对照 **4/4 一致**（见下表）。
- **P2-2 项目名校验**：`validateProjectName` 拒绝 `.`/`..`、Windows 保留设备名（CON/PRN/AUX/NUL/COM1-9/LPT1-9 含 `CON.txt`）、以 `.`/`_` 开头、以 `.`/`_`/`-` 结尾、超长与非 URL 安全字符；12 组回归用例。

### pilot 四包 SHA-256（与 #105 冻结清单对照）

```
c4e21549cd9c6ba53bcd6ad9edef4b3a622e0e30ef4a70d02a8fa5255d8afbeb  future-ui-contracts-1.0.0.tgz
32a020793604d6b818ef2f33424e14f30e4ed17891f6976003730006e8e17671  future-ui-react-provider-0.1.0-rc.1.tgz
4ffc55abbfd83ae8a4916a108307cba6fb5295fa542bbf053be9dd00d08e2ce3  future-ui-shadcn-adapter-0.1.0-rc.1.tgz
94d22cedf12462f373ec7d5b9140366c8ac834245404a8a44f3f924580533945  future-ui-theme-0.1.0-rc.1.tgz
```

## 离仓初始化验收（Windows，全新空目录，源仓库外）

| 步骤 | 命令 | 退出码 |
|---|---|---|
| 安装 CLI 归档 | `npm install <cli.tgz>` | 0 |
| 生成 pilot 工程 | `create-future-ui my-fifth --local-rc-dir E:\projects\future-ui-r3rc\rc-dist` | 0 |
| 安装生成工程 | `pnpm install`（my-fifth 内，file: vendor 依赖） | 0 |
| 严格 typecheck | `pnpm typecheck`（tsc --noEmit strict） | 0 |
| 构建 | `pnpm build`（vite build，CSS 20.46 kB） | 0 |
| fixture 测试 | `pnpm test`（5/5） | 0 |
| 迁移 smoke | 复制工程到新目录 → install + typecheck | 0 / 0 |

CLI 错误场景（退出码 1）：非空目录拒绝、`--local-rc-dir` 缺归档列出缺失、非法 projectName 拒绝。

## Windows Node 24 最小 npm 离仓验证（本轮 Review 补充，全新目录 `E:\projects\cfu-accept\node24-accept\`）

绝对路径固定执行（不依赖 PATH 里的 sandbox Node22）：`$node24 = 'C:\Program Files\nodejs\node.exe'`（**v24.21.0**）、`$npmCli = 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js'`（npm 11.19.0）。

| 步骤 | 命令 | 退出码 |
|---|---|---|
| 安装 CLI 归档 | `& $node24 $npmCli install <cli.tgz> --prefix installer` | 0 |
| 生成 pilot 工程 | `& $node24 installer\...\dist\cli.js my-node24 --local-rc-dir <rc-dist>` | 0 |
| 安装生成工程 | `& $node24 $npmCli install`（my-node24 内；npm11 拦截 esbuild postinstall → `install-scripts approve esbuild` 后放行） | 0 |
| 构建 | `& $node24 node_modules\vite\bin\vite.js build` | 0（CSS 20.46 kB） |
| typecheck | `& $node24 node_modules\typescript\bin\tsc --noEmit` | 0 |
| fixture 测试 | `& $node24 node_modules\vitest\vitest.mjs run` | 0（5/5） |

## 真实 Chrome 验证（loopback 127.0.0.1:5173）

- Dialog 打开即预填（标题/描述）✓
- 取消不保存 → 列表不变 ✓
- 保存全链路：真实键盘输入 → “保存中…” pending（按钮 disabled，截图）→ 自动关闭 → 列表更新 ✓
- Light/Dark 真实点击切换：全页（卡片/输入框/列表）+ Dialog 视觉同步换肤 ✓
- **Dialog 打开期间物理点击主题按钮：NOT-VERIFIED**（被 Radix Modal 外部 inert 设计性阻止，同 #104 边界；程序化换肤由 fixture 覆盖）

## 失败修复记录（保留真实过程）

1. CLI 无入口（bin 空跑 exit 0）→ 补 invokedEntry 判断
2. npm .cmd shim 无 node 前缀 → cli.js 补 shebang
3. theme.ts 含 JSX 但扩展名 .ts → 改名 theme.tsx
4. fixture 未用 act（noUnusedLocals）→ 移除 import
5. fixture DOM 跨用例累积 → 显式 afterEach(cleanup)
6. 本地增量 install 布局差异导致 webmcp-adapter 解析失败 → frozen-lockfile 重装后消失（pre-existing，非本轮改动）
7. Review P1-2 首次 typecheck：`readSync` 4 参 overload 在 @types/node 24 不存在 → 改 5 参数（offset/length/position）
8. Review P1-1 重试测试：合法候选 tgz 由测试内 `tar -czf` 构造（package/package.json 含 name/version），不依赖真实 rc-dist

## 未测范围

- **macOS：MAC_NOT_TESTED**（无 Mac 访问；资产与命令保留）
- **npm registry 公网**：`@future-ui/*` 未发布，`npm create future-ui@latest` 不可用（registry 形态仅为占位）
- **Dialog 打开期间物理换肤**：NOT-VERIFIED（Radix Modal 边界，程序化换肤由 fixture 覆盖）
- 本机 PATH 首位为 sandbox Node 22，Node 22 下 `tests/toolchain.test.ts`（Node major=24 断言）失败为 pre-existing 环境差异；本轮已用系统 **Node 24.21.0** 完成权威 npm 离仓验证，CI（node 24）亦为权威
- 未调用付费模型；未扩大公共 Contract/Schema/Profile 语义；未发布 npm/Tag/Release

## Review 请求

请对 exact HEAD 增量 Review：CLI 归档可安装/运行、pilot vendoring 正确性（含 SHA 对照）、模板可离仓构建（Node 22 pnpm + Node 24 npm 双通道）、prepack/CI pack smoke 生效、无 workspace:*/src alias/绝对路径残留、Tailwind v4 扫描与主题一致性、项目名校验边界。
