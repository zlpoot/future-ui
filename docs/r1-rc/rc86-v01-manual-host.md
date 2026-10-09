# R1-RC-001 (#86) · v0.1 本地手动验收 host — 实现与证据

> 状态：实现完成 + 四项最小修复（P1×2 / P2×2，PR #93 评论 6073860420 派发）已完成，停在
> **AWAITING_INDEPENDENT_REVIEW**（Draft PR #93，未合并 / 未发布）。本文档记录设计、边界、
> 证据分层与真实质量记录；首次交付质量不被最终绿灯覆盖，新旧失败证据均保留。

## 1. 授权与边界（R1-RC-001，来自 #4 / #86 / PR #87）

- 唯一 Current Grant：`R1-RC-001 / #86 ONLY`；AGENTS-only 激活 PR #87 已独立 Review ACCEPT 并经 Owner 授权 squash merge。
- 执行基线：实时 `origin/main`（本文记录时 `1990506f09ef40483b58727b8594c4eac7e97acf`；如 main 前进以执行时实测为准）。
- 硬禁止：不修改 public Schema / `$id` / `CONTRACT_MAJOR` / core diagnostics / `BOUNDED_RULES`；
  不实现 #71 WebMCP / AWH Dashboard / 通用源码 DOM 编译；无付费模型/API、无外部账号/公网请求；
  不 deploy / npm publish / tag / release；不写 MV-Auto-Editor 真实业务/数据；不自行 merge / close #86。

## 2. 设计：最薄 host（无新 UI 框架）

- 新增私有 dev-only 包 `@future-ui/rc-manual-host`（`packages/rc-manual-host`，不进发布图）。
- 复用资产（零复制）：`@future-ui/shadcn-adapter`（EditDialog / ShadcnButton / ShadcnTextInput）、
  `@future-ui/ark-ui-adapter`（ArkDialog / ArkButton / ArkTextInput）、`@future-ui/react-provider`（冻结契约锚）。
- **浏览器安全面（v0.1 首次失败修复）**：两 adapter 新增 `/browser` subpath barrel（组件 + mapping 表 + 冻结身份常量，
  图内 0 个 node: 导入）；react-provider 新增纯 `component-types.ts`（`./component-types` subpath）承载组件类型常量。
  主 index 与 Node 侧校验器（mapping-store / contracts validate）保持原样、不进浏览器图。
- dev-only 依赖：`vite@7.3.7` + `@vitejs/plugin-react@5.2.0`（精确锁定，仅进 lockfile，不进运行时图）。
- 根脚本：`pnpm dev` → `pnpm --filter @future-ui/rc-manual-host dev`（`vite --host 127.0.0.1`，strictPort，强制 loopback；
  本机无全局 pnpm 时实测可用命令为 `corepack pnpm --filter @future-ui/rc-manual-host dev`，README 已按实测修正）。
- **P1 新增两条可复制 Node 命令**（复用 `@future-ui/ai-dev`，真实输出，无新通用 CLI）：
  - AI View / Validator：`corepack pnpm --filter @future-ui/rc-manual-host ai-view`
    （= `vitest run tests/ai-view-command.test.tsx`；打印真实 definitions/limits + 正例 PASS + 负例 FAIL 的
    ruleId/status/reason/repairHint；实际 stdout 见 `docs/r1-rc/evidence/ai-view-command-stdout.txt`）。
  - Consumer 示例：`corepack pnpm --filter @future-ui/rc-consumer demo`
    （= `vitest run tests/consumer-demo.test.tsx`；四步接入：选 Adapter → 复用 Profile → 读 AI View →
    运行一个 UI 组件；实际 stdout 见 `docs/r1-rc/evidence/rc-consumer-demo-stdout.txt`）。
- 页面：Dialog / Button / TextInput 对照 + 能力矩阵（真实 mapping 数据渲染）+ 独立 UI-only 样本 +
  Project AI View（浏览器安全静态视图；现场有界校验与 MV 视图为 Node-only，页面如实标注 NOT-RUNNABLE）。

## 3. 组件映射诚实结论（页面如实渲染）

| 组件 | shadcn | Ark |
| --- | --- | --- |
| Dialog | supported（EditDialog 参考实例） | supported（语义；token headless unsupported） |
| Button | partial（loading 为组合实现） | partial（**无 Ark Button primitive → native composition**；loading 上游 unsupported，宿主投影 disabled+aria-busy） |
| TextInput | partial（契约 role=textbox 与 number/search/password 隐式角色张力） | partial（同张力 + headless token） |

## 4. 证据分层（2026-10-09 真实 Windows 浏览器实测后更新；四修轮新增项已追加）

- declared：IDENTITY / CAPABILITY（0）/ DRAFT-HIDDEN；两 adapter 冻结身份与来源（页面渲染）。
- rendered：真实 Chrome 渲染证据（`docs/r1-rc/evidence/browser-top-sections.png`、`browser-bottom-sections.png`、
  `browser-fixes-sections.png`；页面 22,944 字符文本，六节全部挂载；能力矩阵 150 行真实 mapping 数据；
  DOM 中真实 dialog 挂载）。四修轮页面说明已更新渲染：Dialog 节「Escape 与遮罩点击有意**始终阻断**」与
  「关闭策略（两变体一致）」、Ark「Escape 与 CloseTrigger 可用」均可见。
- interaction-verified（2026-10-09，真实浏览器 + CDP 自动化）：
  - shadcn EditDialog：打开 → role=dialog + aria-modal=true + 字段渲染 → 取消 关闭 → 日志 `openChange reason=cancel open=false`。
  - Ark Dialog：打开 → 内容区/描述渲染 → 关闭（CloseTrigger）→ 日志 `openChange open=false`（关闭后 content 为
    `data-state=closed` 隐藏常驻，非打开状态）。
  - Button（shadcn + Ark 各验）：type=button 计数、type=submit 表单提交计数、loading 期间 `disabled=true + aria-busy=true`
    （文本切「保存中…」），1.2s 后复位。
  - TextInput（shadcn 受控）：输入「hello-browser」实时回显。
  - **P2-4 标签聚焦（四修轮新增）**：真实 Chrome 点击 Ark「受控：」label（htmlFor=ark-controlled）→
    `document.activeElement` = `input#ark-controlled`（真实 Field.Input）。
  - **P2-3 回归（四修轮新增）**：Dialog 节说明更新后，shadcn 打开/取消、Ark 打开/CloseTrigger 均正常，关闭日志与打开前一致。
  - UI-only 样本：登记「浏览器测试员」→ 条目出现 → 打开详情对话框 → 关闭。
  - 网络隔离：0 外部请求、0 失败请求；干净加载 0 Console error / 0 warning（仅一条 Chromium `verbose` 级 DOM 提示：
    password 演示输入框不在 form 内 —— 非 error/warning，如实记录）。
- not-covered / NOT-TESTED（2026-10-09 自动化会话未覆盖，留给 Owner 人工清单执行；四修轮保持原样）：
  - Dialog：Escape 关闭、遮罩点击关闭、blocking 变体（仅 保存/放弃 可终结）、焦点进入/归还、Tab 不逃逸；
    （本次自动化键盘输入被主机焦点策略拦截，合成键盘事件无法触达 React 根，故如实 NOT-TESTED，非页面缺陷证据）。
    **注意：shadcn EditDialog 两变体一律阻断 Escape/遮罩（R1-DLG-02 保护显式关闭入口）为代码事实与清单共识，
    不因未做键盘实测而改写公共语义；Ark 侧真实 zag 的 Escape 行为仍需人工/独立验证后记录。**
  - Button：`disabled` 按钮点击（页面已实现，未自动化点击）。
  - TextInput：非受控/error/disabled/readOnly 逐一人工确认；Ark Field aria-describedby 人工确认。
  - MV upstream drift 门禁（Node-only，ai-dev 测试覆盖）、模型生成、WebMCP、跨库像素一致（不承诺）。

## 5. 质量记录（首次失败与自修复，按发生顺序追加）

1. **vite 无法解析 vendored `@/registry/new-york-v4/ui/button`**（`vite:import-analysis`）：TS 靠 tsconfig
   `paths` 解析（`../shadcn-adapter/src/upstream/registry/...`），vite 需独立 `resolve.alias`；且第一版 alias 指错
   （`src` 而非 `src/upstream`）→ 修正 `vite.config.ts` 别名与注释。
2. **浏览器图拉入 Node-only 模块崩溃**（`node:fs` externalized）：`contracts/validate.ts` 模块加载期
   `readFileSync` 读 AJV schema；传递路径 = adapter index → mapping-store / react-provider → contracts。
   任何经 adapter **主 index** 的浏览器导入（含纯组件）都会崩。修复（根因、向后兼容、零复制）：
   - react-provider 新增零依赖 `src/component-types.ts`（组件类型常量唯一来源，`./component-types` subpath）；
     `*_contract.ts` 改为 import + re-export（index 公共面不变）。
   - 两 adapter 新增 `src/browser.ts` barrel（`/browser` subpath）：组件 + mapping 表 + 冻结身份/profile 常量；
     不含 mapping-store 校验器（保持 Node-only）。host 全部改走 `/browser`。
   - 后果：浏览器初始图 0 个 Node 模块；AI View 现场有界校验与 MV Project View 因依赖 ai-dev/contracts
     （Node-only）在浏览器侧诚实标注 **NOT-RUNNABLE**，确定性行为由 vitest `validator-demo.test.tsx` 覆盖
     （正例 PASS / 负例 FAIL / 身份断言）。
3. **react-provider 索引 re-export 断裂**（TS2459）：常量改 import 后索引仍 re-export → 改为
   `import + export { X } from './component-types.js'`（本地可用 + 索引兼容），六项目 typecheck 恢复全绿。
4. **shadcn dialog 自动化探测误判**（非产品缺陷）：Radix portal 子树的快照枚举缺失 + dialog 下标错位
   （`[0]` 为 Ark 懒挂载 dialog）→ 改按 `data-state` 遍历探测；dev server 后台任务中途退出导致 CDP 卡死
   （纯自动化环境问题）→ 重启服务后全部交互验证通过。
5. **vitest/jest-dom 类型增强在双 vitest 实例下失效**（`peer#bc84`/`peer#d314`）：新包测试改用纯 vitest
   断言（toBeTruthy/toBeNull，确定性等价），移除 jest-dom 类型耦合；tsconfig 恢复与 ark 一致。
6. **（四修轮）jsdom 无法模拟 label→input 焦点转移**：`fireEvent.click(label)` 只触发控件 click，不转移焦点
   （jsdom 已知限制）。未引入 user-event 新依赖；测试改为验证「关联事实」（htmlFor === 真实 input id +
   input 可聚焦），真实浏览器上 label 点击聚焦以 interaction-verified 记录（见第 4 节）。
7. **（四修轮）示例包首跑失败**：`vite:import-analysis` 无法解析 vendored `@/registry/...`（vitest 从示例包
   cwd 启动，未继承根 alias）→ 示例包增加镜像 `vitest.config.ts`（同一 registry alias）；随后类型检查两处失败：
   TS5097（测试误用 `./setup.ts` 扩展名）与 TS2307（示例 tsconfig 缺 registry `paths`）→ 分别改为 `./setup.js`
   与补 `paths`，typecheck ×6 恢复全绿。
8. **（四修轮）README 启动命令实测修正**：`corepack pnpm dev` 在本机不可用（根 dev 脚本内层 `pnpm` 不在 PATH）
   → README 与本文档改为实测可用命令 `corepack pnpm --filter @future-ui/rc-manual-host dev`（以及两条新命令）。

## 6. 变更清单（四修轮提交时核对）

首轮（7232a49，已合入 #93 分支）：
- `packages/rc-manual-host/**`（新包：host + 样本 + 校验面板 + 测试）
- 根 `package.json`（+`dev` 脚本）、`pnpm-lock.yaml`（dev-only 依赖）
- `README.md`（快速启动）、`MANUAL_CHECKLIST.md`（人工清单）、本文档

四修轮（本提交）：
- `packages/rc-manual-host`：`tests/ai-view-command.test.tsx`（新命令入口）+ package.json `ai-view` 脚本；
  `src/sections/dialog-section.tsx`（关闭策略说明对齐既有行为）、`src/sections/text-input-section.tsx`（Ark 各输入补 id）。
- `packages/ark-ui-adapter`：`src/components/ark-text-input.tsx`（+局部 `id` 透传，不改公共 Contract）、
  `tests/ark-text-input-label.test.tsx`（定向标签关联测试）。
- `examples/rc-consumer/**`（新 Consumer 示例包：src + tests + tsconfig + vitest.config.ts，一条 `demo` 命令）。
- 根：`package.json`（typecheck 链 + 示例包）、`pnpm-workspace.yaml`（`examples/*`）、`vitest.config.ts`（include 示例）、
  `pnpm-lock.yaml`（+31 行新 importer，无新依赖包）。
- `README.md`（启动命令实测修正 + 两条新命令）、`MANUAL_CHECKLIST.md`（Dialog 节校准 + 四修轮附表）、本文档、
  `docs/r1-rc/evidence/ai-view-command-stdout.txt`、`rc-consumer-demo-stdout.txt`、`browser-fixes-sections.png`。
