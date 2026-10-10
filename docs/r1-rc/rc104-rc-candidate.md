# R3-RC-001 · 首个可离仓安装 RC 候选（Issue #104）

- 状态：**AWAITING_INDEPENDENT_REVIEW**（Reviewer: ChatGPT，独立 exact-head 只读审查；首轮
  REQUEST_CHANGES 已按 P1-01/P1-02/P1-03/P2-01/P2-02 修复，见第六节 7–11）
- 执行者：doubao-work（Worker）；授权：#4 = R3-RC-001 / #104 IMPLEMENTATION_READY（ACTIVE）
- Base SHA：`0fc68b1cb4457c7458bb5002879158419f25d555`（origin/main，fetch 核对一致，非过期快照）
- Head SHA：以 Push 后 PR 远端读取为准（避免自引用更新循环；本文件不硬编码构成自身的 head）
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
| `packages/{contracts,react-provider,theme,shadcn-adapter}/package.json` | 候选公开（`private:false` + 版本）；**仓库内保持 src/workspace 开发形态**（exports→src、`@future-ui/*`→dependencies `workspace:*`），发布面由 build-rc.mjs 打包时改写 |
| `packages/{contracts,react-provider,theme,shadcn-adapter}/tsconfig.build.json` | 新增：局部 build 配置（tsc 产 JS+.d.ts 到各包 `dist/`） |
| `packages/theme/src/theme.css` | 新增：Light/Dark `--future-ui-*` token（数据源 = examples/material-editor/src/themes.ts，同一 D08 视觉源）+ tailwind v4 `@theme inline` 语义映射 |
| `packages/shadcn-adapter/THIRD_PARTY_LICENSES.md` | 新增（P1-03）：vendored shadcn/ui 的 MIT 许可全文 + 直接运行时依赖许可表；随归档发布 |
| `scripts/build-rc.mjs` | 新增：RC 构建/打包脚本（build → alias 归一化（相对路径 + `.js` 扩展名，P1-01）→ dist 产物校验 → staging 改写 → pack → SHA-256） |
| `scripts/check-rc.mjs` | 新增（P2-01）：归档内容检查门（无 `workspace:*`、无 src 发布入口、exports 目标存在、License 存在、SHA256SUMS 一致） |
| `scripts/check-theme-consistency.mjs` | 新增（P2-02）：theme.css 与 themes.ts 的 Light/Dark token 最小一致性检查 |
| `.github/workflows/ci.yml` | 新增 `build:rc` + `check:rc` + `check:theme` 步骤（P2-01/P2-02） |
| `package.json` / `eslint.config.mjs` / `.gitignore` | 根脚本 `build:rc`/`check:rc`/`check:theme`；eslint 忽略构建产物；`.gitignore` 忽略 `rc-dist/` |
| `docs/r1-rc/evidence/rc104-consumer-{light,dark}.png`、`rc104-rv-dark-saved.png` | 离仓 Consumer 真实浏览器截图证据（本轮新增保存后 dark 截图） |

## 三、最小公开包、版本、exports 与依赖闭包

### 候选公开包（4 个）

> exports 列展示的是**打包后归档形态**（build-rc.mjs staging 改写）；仓库内 manifest 为
> src/workspace 开发形态（见第二节）。

| 包 | 版本 | exports | 说明 |
|---|---|---|---|
| `@future-ui/contracts` | 1.0.0 | `.`（types+default → dist/index.js）、`./schemas/*` → `./schemas/*.json` | framework-agnostic 契约 schema/validator（Node 面；ajv 8.17.1，唯一无 workspace 依赖的候选包） |
| `@future-ui/react-provider` | 0.1.0-rc.1 | `.`（Node 面）、`./component-types`（浏览器安全纯常量） | React 组件类型常量/Provider |
| `@future-ui/theme` | 0.1.0-rc.1 | `.`（Node 面，含 validator）、`./browser`（仅 ThemeProvider/useTheme/useVariantTokens + types）、`./theme.css` | D08 视觉机制 + token CSS 资源 |
| `@future-ui/shadcn-adapter` | 0.1.0-rc.1 | `.`（Node 面）、`./browser`（EditDialog/ShadcnButton/ShadcnTextInput/editDialogProfile/mappings/provenance） | 唯一被 Consumer 浏览器直接消费的入口 |

### 依赖闭包（离仓可解析）

- **dependencies（registry 可拉）**：cn 0.4.0、class-variance-authority 0.7.1、lucide-react 1.52.0、
  radix-ui 1.7.0（shadcn-adapter）；ajv 8.17.1（contracts）。
- **peerDependencies（宿主提供）**：react/react-dom `^19.2.0`。候选包间的 `@future-ui/*` 依赖在
  仓库内为 dependencies（workspace:*，保证开发/CI 解析）；**打包归档时由 build-rc.mjs 改写为
  peerDependencies（显式版本）**——浏览器 UI 生态由离仓宿主显式安装，避免向 npm registry 请求
  未发布的 `@future-ui/*`。
- **交付归档内无 `workspace:*`**：build-rc.mjs 在 pack 前把 staging 副本中的 `workspace:*` 改写为
  workspace 内实际版本号（#4 授权要求）。
- **浏览器图不加载 Node-only 包**：`ai-dev`、`ai-contract-core`、`conformance`、`ark-ui-adapter`、
  `capability-runtime` 等保持 private，不进闭包；浏览器面（`/browser`、`/component-types`、
  `theme/browser`）均零 `node:` 导入。

## 四、构建产物清单与 SHA-256（rc-dist/）

**最终候选（本轮 Review 修复后重建，check:rc 校验一致）：**

```
c4e21549cd9c6ba53bcd6ad9edef4b3a622e0e30ef4a70d02a8fa5255d8afbeb  future-ui-contracts-1.0.0.tgz
32a020793604d6b818ef2f33424e14f30e4ed17891f6976003730006e8e17671  future-ui-react-provider-0.1.0-rc.1.tgz
4ffc55abbfd83ae8a4916a108307cba6fb5295fa542bbf053be9dd00d08e2ce3  future-ui-shadcn-adapter-0.1.0-rc.1.tgz
94d22cedf12462f373ec7d5b9140366c8ac834245404a8a44f3f924580533945  future-ui-theme-0.1.0-rc.1.tgz
```

**历史版本（不再使用，仅保留可追溯记录；与最终候选明确区分）：**

```
6b11edea489229e0ffc94059210db73608c17371af35d42f4cf72a052c4dc104  future-ui-contracts-1.0.0.tgz   （首次 build）
1eecb0fa2c2fcb2132c078616605324382ad8c7f26d83e305f76651745071a57  future-ui-react-provider-0.1.0-rc.1.tgz（首次 build）
90e37092bcbaf7a19413d007adaa74d341e819714ba8fb298814b9efdb10b8da  future-ui-shadcn-adapter-0.1.0-rc.1.tgz（首次 build）
2b86f43e1a97ee9366cdd8e1e6091077db7878ce64ab375dcc6c244f715a984c  future-ui-theme-0.1.0-rc.1.tgz（首次 build）
0d2569184f219dd5d373dad8aa1ef668b7a558545b88e7ec9c34774c3c327cde  future-ui-shadcn-adapter-0.1.0-rc.1.tgz（CI 404 修复后）
```

（`rc-dist/` 为本地产物，不入库；最终哈希可复现：`corepack pnpm run build:rc`（确定性产物：
contracts/react-provider/theme 与上一版本一致，shadcn-adapter 因 P1-01 `.js` 扩展名修复与
P1-03 License 加入而更新）。
归档 manifest 由 build-rc.mjs 在 staging 阶段改写：exports→dist、`@future-ui/*` 依赖→peer、
`workspace:*`→显式版本、补 main/module/types；仓库内 manifest 保持 src/workspace 开发形态。）

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
| 修改 → 保存 → pending（"保存中…"、按钮 disabled、重复提交被阻止）→ 完成后关闭 → 列表更新 | PASS（本轮 ref 真实点击："保存中…"+disabled → 自动关闭 → 列表更新为"Review 修复后草稿"） |
| Dialog 打开期间切换主题 → 输入草稿与业务状态保留 | PASS（修改后的草稿经 light→dark 切换后仍保留；切换路径为程序化 click，见"真实鼠标换肤"项） |
| Light/Dark token 生效（HTML data-theme + --future-ui-bg 等 CSS 变量） | PASS（light bg #ffffff / dark bg #0b1220） |
| **真实鼠标点击换肤（Dialog 打开期间）** | **NOT-VERIFIED**（见下；本轮 elementFromPoint 证实顶部按钮被 Modal 遮罩覆盖，物理点击被模态边界阻止） |
| Node 原生 ESM 根入口导入（P1-01，仓库外） | PASS（`verify-esm.mjs`：contracts 7 / react-provider 18 / theme 6 / shadcn-adapter 44 / `/browser` 16 exports 全部 importable） |
| TypeScript 类型解析（P1-01，仓库外 tsc nodenext strict） | PASS（`verify-types.ts` 引用 4 包公开类型零错误） |
| 归档内容检查（P2-01：无 workspace:*、无 src 发布入口、exports 目标存在、License 存在、SHA256SUMS 一致） | PASS（`check:rc` 4 归档全过） |
| theme.css 与 themes.ts token 一致性（P2-02） | PASS（`check:theme`：light 12 + dark 12 全部一致） |

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
6. **CI typecheck 404（push 后首轮 CI failure）**：候选包 exports 一度直接指向 `dist/`，而 dist 为
   构建产物不入库，CI 干净环境下其他 workspace 包 import `@future-ui/*` 时无 dist 可解析；
   同时 `@future-ui/*` 依赖 peer 化导致 CI frozen-lockfile 无链接记录。修复：仓库内 manifest 恢复
   src/workspace 开发形态（exports→src、`@future-ui/*`→dependencies workspace:*），发布面
   （dist exports、`@future-ui/*`→peer、`workspace:*`→版本、main/module/types）全部由
   build-rc.mjs 在打包阶段对 staging 副本改写。本地 typecheck 恢复通过，CI 复跑通过。

## 六之二、独立 Review（ChatGPT REQUEST_CHANGES）修复记录

7. **P1-01 · Node ESM 发布入口缺 `.js` 扩展名**：build-rc.mjs 的 alias 改写把
   `@/registry/new-york-v4/ui/button` 改写为 `../ui/button`（无扩展名），原生 Node ESM 不做扩展名
   猜测，无法保证解析。修复：改写规则生成相对路径 + 显式 `.js`（`from "../ui/button.js"`），并新增
   `verifyDist()` 防回归门——dist 无 `@/registry/` 残留、相对导入均带 `.js` 且目标文件真实存在，
   任一违规构建即失败。实测：`dist/upstream/registry/new-york-v4/ui/dialog.js` 含
   `from "../ui/button.js"`；仓库外 Consumer 用 `node --input-type=module` 原生 import 五个入口
   全部成功；Vite 浏览器入口同时保持正常（不修改冻结的 vendored 源码，provenance 指纹不变）。
8. **P1-02 · SHA-256 证据不一致 / 旧 HEAD 硬编码**：统一最终 SHA（见第四节）；旧哈希保留但明确
   标注"历史版本"；`pr-body-rc104.md` 这类含旧 HEAD 的临时交接文件从仓库移除（PR body 才是交接
   载体）；构成 HEAD 的文件不再硬编码自身 head SHA，以 Push 后 PR 远端读取为准。
9. **P1-03 · 第三方 License 缺失**：vendored shadcn/ui 组件来自上游仓库 MIT（commit
   `7ff7dbf8669fa3392c294ee745dc8d8c3cee842c`，LICENSE.md：MIT，Copyright (c) 2023 shadcn）。
   新增 `packages/shadcn-adapter/THIRD_PARTY_LICENSES.md`（MIT 全文 + 直接运行时依赖许可表），
   `files` 加入该文件；`check:rc` 验证归档内实际存在且含 MIT 声明；冻结源码与 provenance 指纹未改。
10. **P2-01 · CI 未覆盖发布构建**：`ci.yml` 在既有四步后新增 `pnpm build:rc` + `pnpm check:rc`
    （+ `check:theme`）；`check-rc.mjs` 逐包验证无 `workspace:*`、exports 无 `src/` 入口、
    exports 目标文件存在（glob 如 `./schemas/*` 按匹配判定）、shadcn-adapter 带 License、
    SHA256SUMS 与实际哈希一致。仓库内 manifest 保持 src/workspace 开发形态，不引入干净 CI
    找不到 dist 的问题；未扩大跨平台 CI 矩阵。
11. **P2-02 · Theme 数据源重复**：`check-theme-consistency.mjs` 解析 theme.css 与 themes.ts 的
    Light/Dark token（各 12 个）逐项比对，防止静默漂移（本轮 PASS）。不重构 Theme 系统；更完整的
    单一数据源重构记为后续 P2，不阻塞本 RC。

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
  CI node 24 通过）；typecheck 通过；lint 通过；`check:rc` 4 归档 PASS；`check:theme` PASS。
- 公共 Contract/Schema/Profile 语义：未修改（若需修改将触发 BLOCKED: CONTRACT_GAP，未触发）。

## 九、未测试范围与缺口

- 真实鼠标点击换肤（Dialog 打开期间）：NOT-VERIFIED（模态边界 + bu 工具顶部坐标不稳定；程序化
  换肤验证正常，二者明确区分，不以程序化 click 冒充真实鼠标）。
- macOS 离仓 smoke：MAC_NOT_TESTED（同一组归档 + 安装命令已保留，待后续独立执行者验证）。
- Theme 单一数据源重构（消除 theme.css 与 themes.ts 双载体）：记为后续 P2，本轮以一致性检查
  防漂移，不阻塞 RC。
- 生产 WebMCP、正式 npm 安装、付费模型 API：不在 R3-RC-001 范围。
- Consumer 仅覆盖 Windows 本地 loopback；正式发布前的最终冒烟建议由 Owner/ChatGPT 复核后单独授权。

## 十、停止门

PR 创建后停止于 **AWAITING_INDEPENDENT_REVIEW**。Reviewer（ChatGPT）对 exact head 做只读代码审查。
未经 Owner 新授权，不自行 Ready、Merge、关闭 #104、创建 Tag、GitHub Release、npm publish 或部署。
