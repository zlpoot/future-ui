# M0-06 早期 Contract Portability Checkpoint — 结果（#26）

日期：2026-10-04  
状态：**Checkpoint 通过（0 contract-gap）**。冻结提案见 `m0-06-portability-freeze-proposal.md`（PR #41，main @ `6f10537`）。本文件记录实现结果与差异分类。

## 实现

- 新包 `packages/conformance`（`@future-ui/conformance`）：
  - `src/dom-provider.ts` — **第二实现（framework-agnostic 最小 DOM provider）**：纯 TS + 原生 DOM，消费公开 Contract 形状（`ComponentContract` + `validateComponent`），**不 import React/Ark**；事件结构对齐 React host（Button `{originalEvent, appId}`；Select `{value, appId}`）。
  - `src/conformance.ts` — 冻结的 C1–C8 断言清单与差异分类（contract-gap / capability-diff / adapter-diff）与报告工具。
  - `tests/conformance.test.tsx` — **双宿主跑同一组公共语义断言**（React host 8 项 + DOM host 8 项）+ 报告断言 + 消费边界静态检查。

## 结果矩阵

| # | 组件 | 断言 | React host | DOM host | 分类 |
| --- | --- | --- | --- | --- | --- |
| C1 | Button | 渲染出可点击元素 | pass | pass | pass |
| C2 | Button | click 派发 `{originalEvent, appId}` | pass | pass | pass（adapter-diff：React 合成事件 vs DOM 事件） |
| C3 | Button | disabled 不派发 | pass | pass | pass |
| C4 | Button | keyboard Enter/Space 激活语义存在 | pass（React 自管） | pass（原生浏览器托管） | adapter-diff / capability-diff |
| C5 | Select | options 集合渲染为可选值 | pass | pass | pass |
| C6 | Select | 选择 → `{value, appId}`；空 → null | pass | pass | pass |
| C7 | Select | disabled 不派发 valueChange | pass | pass | pass |
| C8 | Select | defaultValue 初始选中 | pass | pass | pass |

## 差异分类结论

- **contract-gap = 0**：#6 冻结的 Component Contract 字段族（identity/version/features/props/events/state/parts/control/accessibility/lifecycle）足以表达 Button/Select 在两个无关宿主上的公共语义——**契约不是首个实现（React）API 的包装**。
- **capability-diff（仅声明项）**：C4/C5 相关的原生键盘激活与原生弹层由浏览器托管（jsdom 不模拟弹层），已在 #18 契约 accessibility 声明中记录，未通过兼容层抹平。
- **adapter-diff（记录项）**：React 合成事件 vs DOM 事件（C2 事件对象结构一致 `{originalEvent, appId}`，仅类型来源不同）；React host 键盘自管 vs 原生浏览器语义（C4）。

## Checkpoint 发现（过程记录）

1. **事件结构对齐**：React Button 契约事件为 `{originalEvent, appId}`（#16 冻结）；conformance 初稿曾假定 `clickId` 字段，实测后**按契约事实对齐 DOM host**——差异按 adapter-diff 处理，无需修订 #2（契约字段族本已表达该语义）。
2. **appId 作用域**：双宿主均验证 appId 随事件传播（React 经 Provider context；DOM host 经构造参数注入），契约不绑定 context 实现。

## Gate effect

- #17/#19/#20/#21 解除 #26 gate，可进入 DoR/Ready（各自仍受 #4 grant 与 D04/D08 子集约束）。
- #11 完整 Vue/alternate provider 对照保持 Deferred（不受本 checkpoint 影响）。

## 验收对照（#26）

- [x] 第二实现只消费公开 Contract，不读取 React/Ark 私有状态或 DOM 结构（`dom-provider.ts` 无 React/Ark import；消费边界静态检查 + 包依赖仅 contracts）。
- [x] Button + Select 运行同一组公共 conformance 语义 C1–C8（双宿主 16 项断言全 pass）。
- [x] 差异按 contract-gap / capability-diff / adapter-diff 分类并记录（结果矩阵；capability-diff 仅声明项）。
- [x] 未发现 Contract 偏向 Ark/React（0 contract-gap，无需回 #2 修订）。
- [x] 不要求完整 Vue 组件集，不宣称跨框架支持已完成（#11 保持 Deferred）。
- [x] 一个独立 PR 可证明 checkpoint 结果（本实现 PR）。
