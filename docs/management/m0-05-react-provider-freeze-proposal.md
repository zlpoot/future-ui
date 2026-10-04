# M0-05 React Provider 与首批组件决策冻结提案（D03 / D04 / D07(M1) 最小子集）

日期：2026-10-04  
状态：**Proposed for #16/#18**。本文件冻结 #16（M1-01A：React provider 基础与 Button 契约实现）与 #18（M1-01C：Select 契约实现）所需的「首个 provider 与框架（D03）、首批组件与公共特性（D04）、D07(M1) 最小支持子集（DOM 测试环境与最小可访问性验证）」决策。冻结后 #16/#18 才可能通过 DoR 进入 Ready。合并须经负责人接受（Contract gate，merge=human）。

## 目标

建立 future-ui 的首个公开 UI 接入骨架：一个 React framework adapter / provider，并把 Button（#16）与 Select（#18）作为第一批契约消费者。只实现 #8 已冻结范围，不扩展业务能力或 Agent 接入。本冻结同时为 #26（早期 Contract Portability Checkpoint，第二实现对照）预留框架选择空间：provider 决策不得把未来对照锁死在单一框架上。

## D03 (M0) · 首个 provider 与框架（冻结）

### 候选与取舍

| 候选 | 方向 | 取舍 |
| --- | --- | --- |
| A. React + @ark-ui/react（headless, Zag FSM） | React 18/19 + Ark UI 5.x；Ark 是内部依赖，future-ui 提供 adapter 隔离 | **冻结采用**。① Ark 基于 Zag.js 状态机，与 D06 的 capability/effect、invocation/receipt、cancel≠rollback 语义天然对齐；② 同一 API 跨 React/Solid/Vue/Svelte（官方四框架支持），为 #26 用 Vue 或替代 provider 做第二实现对照保留通道；③ headless + WAI-ARIA 内置（45+ 组件），满足 #16 可访问性验收而不绑定样式体系；④ MIT 许可 |
| B. React + 自研 headless（手写 state/accessibility） | 自己实现 button/select 的状态机与 ARIA | 完整可访问性/键盘语义自研成本高且易错；与 D06 FSM 语义对齐无现成基础；仅当 A 的契约泄漏无法隔离时才考虑，暂拒绝 |
| C. React + Radix UI | 另一主流 headless 库 | 无跨框架同 API 通道（#26 对照弱）；许可 MIT 但状态机语义封装在 React 内部，迁移/对照成本高；拒绝 |
| D. 直接暴露 Ark 组件为 public API | future-ui 公共组件 = Ark 组件别名 | 违反 #16 验收 1（不把 Ark 私有类型/DOM 细节变成 public contract）；拒绝 |

### 冻结规则

1. **provider 边界**：future-ui 的 React provider/adapter 是 #2 Component Contract 的消费者；Ark UI 的私有类型、Zag 机器内部状态与 DOM 细节不得泄漏为 future-ui 公共契约。公共层只暴露 future-ui 自身冻结的 component/state/props/events/parts 形态（#6 contracts 已定义）。
2. **版本基线**：`@ark-ui/react ^5.39.2`（2026-09-14 发布，MIT，peer 支持 React 18/19）；`react ^19.2` 与 `react-dom ^19.2`；`@types/react` 相应 `^19`。**实际解析版本在 #16 实现时以 pnpm 解析与 CI frozen-lockfile 为准**，升级需另立决策。
3. **框架选择不锁死对照**：D03 只冻结"首个" provider；#26 的第二实现对照可选用 Vue（`@ark-ui/vue` 同 API）或真正不同于 Ark UI 的最小 provider，由 #3 在 #26 的 JIT 冻结中决定。本文件不宣称跨框架支持已完成。
4. **依赖进 root 而非 UI-only 包**：provider 运行时依赖（React 等）安装在对应 UI 包的 workspace 依赖中；**UI-only 消费者包不得引入 capability/protocol/model SDK**（#16 验收 4）。AI 开发能力（#22/#25 的 catalog/validate/patch/preview/test）保持独立包，不进入普通 UI-only 生产依赖（#25 验收 5 在此延续）。

## D04 (M0) · 首批组件与公共特性（冻结）

### 冻结范围

1. **首批组件 = Button（#16）+ Select（#18）**：Button 为简单代表，Select 为有状态/复合代表（同时服务 #26 的"简单 + 有状态"两个对照样本）。TextInput/Dialog/Theme 不开始（#16/#18 禁止项）。
2. **公共特性以 #2 Component Contract（D05/D06，已在 #6 冻结并实现于 `packages/contracts`）为准**：组件通过 capability/features 声明支持范围；未支持的扩展（如 Select 的 searchable/multi、组合框级行为）**明确拒绝或通过 feature capability 声明，不静默降级**（#18 验收 2）。
3. **受控状态语义**：受控状态、事件与 parts 遵循冻结的 Component/Binding M0 字段族；provider 私有 collection/state 不泄漏为公共 API（#18 验收 3）。
4. **正反例要求**：disabled/loading/focus/keyboard/accessible name 等适用语义必须有正反例测试（#16 验收 3）。

## D07 (M1) 最小支持子集（#16/#18 所需，冻结）

### 冻结范围（最小）

1. **DOM 测试环境**：Vitest 5.0.3（已冻结）加 `jsdom` DOM 环境 + `@testing-library/react` + `@testing-library/jest-dom`；仅用于 UI 包测试。**不引入** browser-mode / Playwright / Chromium 真浏览器（#4 forbidden: browser live NO；#16 检查仅限冻结的最小类型/交互/语义）。
2. **JSX 转换**：使用 Vitest 默认 esbuild TSX 转换；**不引入** `@vitejs/plugin-react`（无 fast-refresh 需求，测试场景 esbuild 足够；若 pnpm 解析强制 Vite peer 版本冲突，在实现 PR 中按事实记录并回本决策审阅）。
3. **SSR/hydration**：Deferred，不在 M0 验证范围（保持 D07 行原语义）。
4. **可访问性**：基于 Ark WAI-ARIA 内置行为 + future-ui 契约正反例（可访问名称、键盘路径、焦点管理、disabled/loading 状态语义）；**不承诺完整 AX 矩阵**（M1 完整矩阵仍 Deferred）。
5. **浏览器矩阵**：M0 仅 jsdom 单环境；多浏览器/真实设备矩阵保持 Deferred。

## #2/#3 最小契约（M0 冻结范围）

本文件冻结 #2/#3 对 #16/#18 的最小契约：D03 provider 边界（规则 1-4）、D04 首批组件与特性声明（范围 1-4）、D07(M1) 最小子集（范围 1-5），叠加 #6 已冻结并实现的 Component/Capability/Binding Contract 与 M0 诊断。`provider` / `Button` / `Select` 的正式公共 API 形态在 #16/#18 实现时按本文件语义落定；#26 portability 对照范围、#17/#19/#20/#21 的 D04/D08 与完整可访问性/测量子集、#9/#10 的 D06(M1) runtime 语义、#11 较完整 Vue 对照保持 Deferred。

## 验收对照（#16）

- [x] React/provider 基础不把 Ark UI 私有类型或 DOM 细节变成 future-ui 公共契约（D03 规则 1）。
- [x] Button 的 props/events/state/parts 与公开 control interface 满足已冻结 Component Contract（D04 范围 2，contracts 包）。
- [x] disabled/loading/focus/keyboard/accessible name 等适用语义有正反例（D04 范围 4 + D07(M1) 范围 4）。
- [x] UI-only 消费者不引入 capability/protocol/model SDK（D03 规则 4）。
- [x] 本 Issue 可由一个独立 PR 完成并审阅。

## 官方/上游依据

查阅日期：2026-10-04。

- `@ark-ui/react` 5.39.2，MIT：https://www.npmjs.com/package/@ark-ui/react （last publish 2026-09-14；weekly downloads ~1,000,933）。
- Ark UI About（headless、Zag.js 底座、React/Solid/Vue/Svelte、MIT）：https://ark-ui.com/docs/overview/about 。
- Ark UI React changelog（5.39.2 ← 2026-09-11）：https://ark-ui.com/docs/overview/changelog.mdx?framework=react 。
- Vitest 5（vite peer ≥6.4、Node ≥22.12；jsdom/happy-dom 需独立安装）：https://cn.vitest.dev/guide/index.html 、https://main.vitest.dev/blog/vitest-5.html 。
- React 19.2 / `@types/react` ^19（peer 生态样本）：pnpm-lock 生态样本 2026-09（react ^19 → 19.2.8）。

未验证项明确标注：@ark-ui/react 5.39.2 与 React 19.2 在本项目 lockfile 下的实际 peer 解析、jsdom 版本与 Vitest 5.0.3 的兼容细节，将在 #16 实现 PR 的 frozen-lockfile + CI 中验证；如有版本冲突回本决策审阅。
