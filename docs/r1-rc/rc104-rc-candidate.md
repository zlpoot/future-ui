# R3-RC-001 · 首个可离仓安装 RC 候选（Issue #104）

- 状态：**AWAITING_INDEPENDENT_REVIEW**（Reviewer: ChatGPT，独立 exact-head 只读审查）
- 执行者：doubao-work（Worker）；授权：#4 = R3-RC-001 / #104 IMPLEMENTATION_READY（ACTIVE）
- Base SHA：`0fc68b1cb4457c7458bb5002879158419f25d555`（origin/main，fetch 核对一致，非过期快照）
- Head SHA：见 PR（分支 `feat/r3-rc-001-publishable-packages`）
- 环境：Windows 宿主；Node v22.23.2（低于 engines >=24.21.0，如实记录；CI node 24 为门禁权威）；pnpm 11.28.4（corepack）；Vite 7.3.7
- 隔离 worktree：`E:\projects\future-ui-r3rc`（HEAD 0fc68b1 起，干净）

## 一、目标与范围

把 R2 已验收的能力（React + shadcn/Radix 的 EditDialog / Button / TextInput +
r1-edit-dialog-reference Project Profile + Light/Dark Theme）构建成**可以离开源码仓库安装**的
标准包：统一 JS + TypeScript 类型声明产物 + CSS/theme 资源；Windows/macOS 消费同一份构建资产；
只做最小可用产品，不扩展通用 UI 框架。

不在范围：不修改公共 Contract/Profile 语义；不发布 npm；不创建 Tag/Release；不自行 Ready/
Merge/Close；浏览器图不混入 Node-only `ai-dev` 等开发期包。

## 二、修改文件与包结构说明

| 文件 | 说明 |
|---|---|
| `packages/contracts/package.json` | 候选公开：`private:false`、`main/module/types`、exports 指向 `dist/`（`./schemas/*` 保持包根 schemas） |
| `packages/react-provider/package.json` | 候选公开 v0.1.0-rc.1；exports `.` + `./component-types` → dist |
| `packages/theme/package.json` | 候选公开 v0.1.0-rc.1；exports `.`（Node 面）、`./browser`（provider 面）、`./theme.css` |
| `packages/shadcn-adapter/package.json` | 候选公开 v0.1.0-rc.1；exports `.`（Node 面）、`./browser`（浏览器面） |
| `packages/{contracts,react-provider,theme,shadcn-adapter}/tsconfig.build.json` | 新增：局部 build 配置（tsc 产 JS+.d.ts 到各包 `dist/`） |
| `packages/theme/src/theme.css` | 新增：Light/Dark `--future-ui-*` token（数据源 = examples/material-editor/src/themes.ts，同一 D08 视觉源）+ tailwind v4 `@theme inline` 语义映射 |
| `scripts/build-rc.mjs` | 新增：RC 构建/打包脚本（build → alias 归一化 → staging(workspace:*→版本) → pack → SHA-256） |
| `package.json` / `eslint.config.mjs` / `.gitignore` | 根脚本 `build:rc`；eslint 忽略构建产物；`.gitignore` 忽略 `rc-dist/`（产物不提交，只提交构建配置与源码） |
| `docs/r1-rc/evidence/rc104-consumer-{light,dark}.png` | 离仓 Consumer 真实浏览器截图证据 |

## 三、最小公开包、版本、exports 与依赖闭包

### 候选公开包（4 个）

| 包 | 版本 | exports | 说明 |
|---|---|---|---|
| `@future-ui/contracts` | 1.0.0 | `.`（types+default → dist/index.js）、`./schemas/*` → `./schemas/*.json` | framework-agnostic 契约 schema/validator（Node 面；ajv 8.17.1，唯一无 workspace 依赖的候选包） |
| `@future-ui/react-provider` | 0.1.0-rc.1 | `.`（Node 面）、`./component-types`（浏览器安全纯常量） | React 组件类型常量/Provider |
| `@future-ui/theme` | 0.1.0-rc.1 | `.`（Node 面，含 validator）、`./browser`（仅 ThemeProvider/useTheme/useVariantTokens + types）、`./theme.css` | D08 视觉机制 + token CSS 资源 |
| `@future-ui/shadcn-adapter` | 0.1.0-rc.1 | `.`（Node 面）、`./browser`（EditDialog/ShadcnButton/ShadcnTextInput/editDialogProfile/mappings/provenance） | 唯一被 Consumer 浏览器直接消费的入口 |

### 依赖闭包（离仓可解析）

- **dependencies（registry 可拉）**：cn 0.4.0、class-variance-authority 0.7.1、lucide-react 1.52.0、
  radix-ui 1.7.0（shadcn-adapter）；ajv 8.17.1（contracts）。
- **peerDependencies（宿主提供）**：react/react-dom `^19.2.0`；`@future-ui/contracts`、
  `@future-ui/react-provider`（shadcn-adapter/theme/react-provider 之间的 `@future-ui/*` 依赖全部
  peer 化，浏览器 UI 生态由宿主显式安装）。
- **交付归档内无 `workspace:*`**：build-rc.mjs 在 pack 前把 staging 副本中的 `workspace:*` 改写为
  workspace 内实际版本号（#4 授权要求）。
- **浏览器图不加载 Node-only 包**：`ai-dev`、`ai-contract-core`、`conformance`、`ark-ui-adapter`、
  `capability-runtime` 等保持 private，不进闭包；浏览器面（`/browser`、`/component-types`、
  `theme/browser`）均零 `node:` 导入。

## 四、构建产物清单与 SHA-256（rc-dist/）

```
6b11edea489229e0ffc94059210db73608c17371af35d42f4cf72a052c4dc104  future-ui-contracts-1.0.0.tgz
1eecb0fa2c2fcb2132c078616605324382ad8c7f26d83e305f76651745071a57  future-ui-react-provider-0.1.0-rc.1.tgz
90e37092bcbaf7a19413d007adaa74d341e819714ba8fb298814b9efdb10b8da  future-ui-shadcn-adapter-0.1.0-rc.1.tgz
2b86f43e1a97ee9366cdd8e1e6091077db7878ce64ab375dcc6c244f715a984c  future-ui-theme-0.1.0-rc.1.tgz
```

（`rc-dist/` 为本地产物，不入库；上述哈希可复现：`corepack pnpm run build:rc`。）

## 五、仓库外安装与运行（Windows 实测）

Consumer：`E:\projects\future-ui-rc-consumer`（仓库外独立目录，无 workspace 链接、无源码别名）。

```bash
# 1) 构建并打包本地归档
corepack pnpm run build:rc            # 输出 rc-dist/*.tgz + SHA256SUMS.txt

# 2) Consumer 安装（file: 指向本地归档，同时显式安装 4 个候选包满足 peer）
cd future-ui-rc-consumer
corepack pnpm install                 # react/react-dom/radix-ui/cn/cva/lucide-react + 4 个本地 tgz

# 3) 运行
corepack pnpm exec vite --port 5180 --strictPort
```

真实 Chrome（loopback `http://127.0.0.1:5180/`）实测结果：

| 验证项 | 结果 |
|---|---|
| 离仓安装 + 页面渲染（light/dark） | PASS（截图见 evidence/rc104-consumer-*.png） |
| EditDialog 打开与预填（r1-edit-dialog-reference Profile 默认字段） | PASS（title="夏日主视觉"/description="本地素材，等待编辑"） |
| 修改 → 取消 → 列表不变 | PASS（Dialog 关闭，列表标题未变） |
| 修改 → 保存 → pending（"保存中…"、按钮 disabled、重复提交被阻止）→ 完成后关闭 → 列表更新 | PASS（列表标题更新为修改值） |
| Dialog 打开期间切换主题 → 输入草稿与业务状态保留 | PASS（data-theme dark/light 切换后 draft="换肤草稿测试" 仍在；切换路径为程序化 click，见"真实鼠标换肤"项） |
| Light/Dark token 生效（HTML data-theme + --future-ui-bg 等 CSS 变量） | PASS（light bg #ffffff / dark bg #0b1220） |
| **真实鼠标点击换肤（Dialog 打开期间）** | **NOT-VERIFIED**（见下） |

### 真实鼠标换肤 NOT-VERIFIED 说明（如实记录）

- 尝试：`computer_use_tool plane=bu` 的 ref click ×2、`click_xy` ×3（含滚动后定位、elementFromPoint
  校验命中），均未触发主题切换；同一工具的坐标点击对该页面底部按钮（保存/取消、编辑）有效，说明
  是 bu 工具对顶部区域按钮的点击注入不稳定（工具怪癖），而非应用问题。
- 补充事实：EditDialog 为 Radix Modal（aria-modal + FocusScope + 外部 inert），Dialog 打开期间
  外部按钮被浏览器设计阻止交互（模态语义），物理点击外部换肤按钮本就不应生效。
- 应用侧换肤逻辑经程序化 `.click()` 验证工作正常（React 受控 ThemeProvider + applyThemeToRoot，
  与 R2 #98 验收示例同一方案），但**不以程序化 click 冒充真实鼠标**，故该项标 NOT-VERIFIED。

## 六、首次失败与修复过程（真实记录）

1. **首次构建失败（依赖 404）**：候选包 manifest 把 `@future-ui/*` 依赖写成显式版本号，pnpm
   install 向 npm registry 请求未发布的包 → 404。修复：monorepo 内保留 `workspace:*`（开发链路），
   由 build-rc.mjs 在 pack 阶段改写为显式版本。
2. **首次 Consumer 安装失败（传递依赖 404）**：归档 manifest 的 `@future-ui/*` 在 dependencies 中，
   pnpm 对 file: 归档的传递依赖仍查 registry → 404。修复：候选包间 `@future-ui/*` 依赖移入
   peerDependencies（UI 生态由宿主显式安装，符合最小闭包；Consumer 显式安装 4 个归档）。
3. **首次 vite dev 失败（别名无法解析）**：vendored `dialog.tsx` 内部使用 `@/registry/new-york-v4/*`
   tsconfig paths 别名，tsc 编译后原样保留，离仓消费者无法解析 → `Could not resolve "@/registry/…"`。
   修复（构建后处理，不改 vendored 源码、不破坏 digest/provenance）：build-rc.mjs 对 dist 内
   `@/registry/new-york-v4/` 导入按文件相对 registry 根计算 `../` 前缀改写为相对路径（首发规则曾
   错写成 `./ui/button`，二次修正为 `../ui/button` 后验证通过）。
4. **Consumer 演示脚本缺陷（非库问题）**：误用 `useTheme().setTheme`（theme 公开面是受控 Provider，
   无 setter）→ 点击无反应。修复：Consumer 改为受控模式（宿主持有 theme 状态 + applyThemeToRoot），
   这同时验证了库的真实公开 API 形态。
5. **lint 清理**：`rc-dist/` 构建产物被 eslint 扫描 + build-rc.mjs 未用变量 → eslint ignores 增加
   `rc-dist/**`、`packages/*/dist/**`；清理脚本未用变量。typecheck 通过（本地 node 22 仅
   toolchain.test 的 Node 版本断言失败，CI node 24 为门禁权威；非本 RC 回归）。

## 七、Windows / macOS 跨平台消费

- Windows：PASS（上述离仓安装 + 真实 Chrome 验证全部完成；本机即 Windows）。
- macOS：**MAC_NOT_TESTED**（当前执行环境无法访问 Mac）。保留同一组归档（见第四节哈希）与
  安装命令（第五节），等待后续独立执行者在 Mac 上执行最小 smoke；不为纯 JS 包重复构建另一套
  平台产物。

## 八、与 R2 已验收功能的兼容性

- 浏览器图语义不变：shadcn-adapter `/browser` 面的 EditDialog/Button/TextInput 事件、pending、
  closeReason、Profile 默认值均未改动（零产品代码修改；本 RC 只改发布形态与构建配置）。
- 主题机制一致：`--future-ui-*` token 值来自 R2 #98 示例同一数据源（themes.ts），Light/Dark
  视觉与 R2 验收一致。
- 仓库内回归：vitest 532 passed / 1 failed（唯一失败 = toolchain.test 本地 Node 版本断言，
  CI node 24 通过）；typecheck 通过；lint 通过。
- 公共 Contract/Schema/Profile 语义：未修改（若需修改将触发 BLOCKED: CONTRACT_GAP，未触发）。

## 九、未测试范围与缺口

- 真实鼠标点击换肤（Dialog 打开期间）：NOT-VERIFIED（原因见第五节）。
- macOS 离仓 smoke：MAC_NOT_TESTED。
- 生产 WebMCP、正式 npm 安装、付费模型 API：不在 R3-RC-001 范围。
- Consumer 仅覆盖 Windows 本地 loopback；正式发布前的最终冒烟建议由 Owner/ChatGPT 复核后单独授权。

## 十、停止门

PR 创建后停止于 **AWAITING_INDEPENDENT_REVIEW**。Reviewer（ChatGPT）对 exact head 做只读代码审查。
未经 Owner 新授权，不自行 Ready、Merge、关闭 #104、创建 Tag、GitHub Release、npm publish 或部署。
