# M0-06 早期 Contract Portability Checkpoint 冻结提案（#26 决策）

日期：2026-10-04  
状态：**Proposed for #26**。本文件冻结 #26（M1-04A：早期 Contract Portability Checkpoint）所需的「第二实现框架/provider、代表组件、conformance 范围与差异分类法」。合并须经负责人接受（architecture checkpoint gate，merge=human）。

## 背景

#16（Button，原生 `<button>`）与 #18（Select，原生 `<select>`）已完成：React adapter 消费 `packages/contracts`（#6，D02/D05/D06(M0)）定义的 Component Contract，公共 API 只暴露 future-ui 自身冻结的 component/state/props/events/parts 形态。**两组件实现均未使用 Ark UI 组件本体**（Ark 仅在选型层；Button 因 Ark 无基础元素子路径用原生，Select 因 Ark 选择路径在 jsdom 不派发用原生）。

#26 的实质问题：**Component Contract 是否只是首个实现（React）API 的包装？** 用最小第二实现挑战它，并在批量组件扩展（#17/#19/#20/#21）前收敛。

## 决策 D-PORT-01 · 第二实现框架/provider（冻结）

### 候选与取舍

| 候选 | 方向 | 取舍 |
| --- | --- | --- |
| A. Vue adapter（`@ark-ui/vue`） | 同 Ark API 的第二框架 | ① #18 实测 Ark 选择路径在 jsdom 不派发，Vue 版同样依赖 Ark，对照价值被环境问题污染；② 需引入 vue/vue-tsc/eslint-vue 全套依赖与配置，工作量远超 checkpoint 需要；③ #26 原文明确「不要求完整 Vue 移植」；④ 完整 Vue/alternate provider 对照保留给 #11。**拒绝（本 checkpoint）** |
| B. **Framework-agnostic 最小 DOM provider**（纯 TS + jsdom，无 React/Ark 依赖） | 直接挑战契约独立性 | ① **非 React、非 Ark 宿主**——若 Contract 只是 React API 包装，B 会直接暴露 contract-gap；② 零新依赖（复用 jsdom/vitest 已冻结环境）；③ 两个代表组件（Button/Select）正好覆盖「简单 + 有状态」样本；④ 不宣称跨框架支持（#26 禁止项）。**冻结采用** |
| C. 其他 headless 库（Radix 等） | 第二 UI 库宿主 | 引入新依赖与适配成本，对照收益与 B 重叠且带库绑定；拒绝 |

### 冻结规则

1. **第二实现只消费 future-ui 公开 Contract**（`@future-ui/contracts` 的 `ComponentContract` + `validateComponent`，以及 Button/Select 的 contract 实例），**不读取 React/Ark 私有状态、不依赖 DOM 结构细节之外的实现假设**（#26 验收 1）。
2. **同组公共 conformance 语义**：Button 与 Select 的公共语义断言在同一 conformance suite 中分别跑 React 宿主与 DOM 宿主（#26 验收 2）。
3. **差异分类法**：每项断言按双宿主结果归类为（#26 验收 3）：
   - `contract-gap`：契约缺少表达该语义的字段/事件 → **触发 #2 修订流程**（回 Contracts 修订 → 重新 Review/接受 → checkpoint 复核后 gate 解除）；
   - `capability-diff`：宿主能力差异（如原生弹层 vs 浏览器托管、jsdom 不模拟弹层）——**如实记录，不通过兼容层抹平**；
   - `adapter-diff`：实现方式差异但公共语义等价（如 React 合成事件 vs DOM 事件）——**记录但不算缺口**。
4. **范围限制**：只做两个代表组件的最小 conformance，不扩展为框架适配矩阵、不做运行时 provider 热替换（#26 禁止项），不宣称「跨框架支持已完成」（#26 验收 5）。

## 决策 D-PORT-02 · 代表组件与 conformance 范围（冻结）

- **代表组件**：Button（简单）+ Select（有状态/复合）——与 #16/#18 实现样本一致，覆盖 D04 已冻结的首批组件。
- **conformance 范围（公共语义断言，双宿主同一组）**：

| # | 组件 | 断言 | 预期分类 |
| --- | --- | --- | --- |
| C1 | Button | 渲染出可点击元素（native button / DOM host button） | pass（adapter-diff 记录） |
| C2 | Button | click 派发 onClick({clickId, appId}) | pass |
| C3 | Button | disabled 下不派发 onClick | pass |
| C4 | Button | keyboard Enter/Space 激活语义存在（React 自管；DOM host 原生） | pass（adapter-diff 记录） |
| C5 | Select | options 集合渲染为可选值 | pass |
| C6 | Select | 选择 → valueChange({value, appId})；空值 → null | pass |
| C7 | Select | disabled 下不派发 valueChange | pass |
| C8 | Select | defaultValue 初始选中 | pass |

- **预期结果**：C1–C8 全部 pass；`contract-gap = 0`（#6 contracts 字段族已足够表达两组件公共语义）；`capability-diff` 仅涉及原生弹层/键盘的浏览器托管语义（已在 #18 契约 accessibility 声明）；`adapter-diff` 记录 React 合成事件 vs DOM 事件。**若出现任何 contract-gap → 冻结规则 3 触发 #2 修订**。

## Gate effect（冻结）

- **通过**（0 contract-gap）：#17/#19/#20/#21 解除 #26 gate，可进入 DoR/Ready（各自仍受 #4 grant 与 D04/D08 子集约束）。
- **发现 contract-gap**：回到 #2 修订 Component Contract → 重新 Review/接受 → 复核 checkpoint → 再解除 gate（#26 原文 Gate effect；#17/#19/#20/#21 在此期间不得 Ready）。
- **#11 完整 Vue/alternate provider 对照**：保持 Deferred，不受本 checkpoint 影响。

## 官方/上游依据

- #26 正文（goal/acceptance/gate/禁止）：issue 26。
- #3 Ready Gate 对 #26 的要求：「最小 portability 对照的框架/provider、代表组件与 conformance 范围；不需要完整 Vue 支持矩阵。」
- #16/#18 实现证据：PR #38/#40（main）；`packages/react-provider`（Button 原生 / Select 原生）。

## 验收对照（#26）

- [ ] 第二实现只消费公开 Contract，不读取 React/Ark 私有状态或 DOM 结构（冻结规则 1，实现 PR 验证）。
- [ ] Button + Select 运行同一组公共 conformance 语义 C1–C8（D-PORT-02）。
- [ ] 差异按 contract-gap / capability-diff / adapter-diff 分类并记录，不通过兼容层抹平（冻结规则 3）。
- [ ] 若发现 contract-gap → 回 #2 修订后继续（冻结规则 3；预期 0）。
- [ ] 不要求完整 Vue 组件集，不宣称跨框架支持已完成（冻结规则 4）。
- [ ] 一个独立 PR 可证明 checkpoint 结果（实现 PR）。
