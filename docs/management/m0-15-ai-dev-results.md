# M1-06A2 — AI Preview/Test deterministic dev host results (#25)

状态：**实现完成（本地全绿 267/267, 31 files）** · 目标消费者：开发 AI（M1-06A1 #22 的后缀能力）· 对齐：D-AIPR（`docs/management/m0-08-ai-preview-test-freeze-proposal.md`，冻结 PR #44 已合并）

## 交付物

新包 **`@future-ui/ai-dev`**（开发期专用，独立 PR）：

| 文件 | 内容 |
| --- | --- |
| `packages/ai-dev/src/preview.ts` | `ui.preview`：受控 fixture 渲染（jsdom + conformance dom-provider；host 白名单 `'dom'`）；渲染前 `validateComponent` + 契约字段/类型校验，非法契约不渲染；返回 `renderTarget`（rootPath + 节点结构树 path/part/tag/attrs/text）+ M0 诊断 |
| `packages/ai-dev/src/test.ts` | `ui.test`：确定性 structure/interaction/business checks 执行器；`checkId`=`${componentId}.${type}.${index}`、`nodePath`/`actual`/`expected`/`diagnostics`/`baseline.version`；business 结果仅来自调用方注入的业务 fixture（`businessSource`），组件渲染不冒充业务 E2E |
| `packages/ai-dev/src/errors.ts` | dev 错误码（结构沿用 #6 Diagnostic）：`preview_unsupported_component/invalid_props/unsupported_host`、`test_unknown_check/structure_mismatch/interaction_mismatch/baseline_missing`、`business_fixture_required`；contracts 包 M0 错误码联合保持冻结 |
| `packages/ai-dev/src/index.ts` | 包导出 |
| `packages/ai-dev/tests/ai-dev.test.ts` | 35 项测试，覆盖验收 6 条 + 依赖图/无模型边界静态断言 |

依赖方向：`ai-dev → { contracts, conformance, react-provider }`（仅取契约实例与 DOM provider 渲染原语；生产包零反向依赖，见验收 5）。

## 验收对照（#25 原文 6 条）

| # | 验收 | 落实与证据 |
| --- | --- | --- |
| 1 | preview 只启动受控开发 fixture/render target，不成为生产 runtime 能力 | `ui.preview` 仅 jsdom + `createDomButton/createDomSelect`；host 白名单 `'dom'`（`preview_unsupported_host` 拒绝 `'react'`）；无服务器/浏览器 live/网络/真实网站；props 仅契约声明字段（`preview_invalid_props` 拒绝 `onClick:'alert(1)'` 等任意输入）。证据：`ai-dev.test.ts`「ui.preview (#25 acceptance 1)」5 项 + 「无网络通道」静态断言 |
| 2 | test 调用确定性 component/conformance/interaction checks，返回结构化结果 | `ui.test` checks 执行器：structure（tag/part/attrs/text vs exact baseline）、interaction（click / change / key：Enter/Space 键盘激活与 disabled 零事件均确定性可断言）；返回 `results[]` + `summary{total,passed,failed}`。证据：structure 3 项 + interaction 6 项测试 |
| 3 | 区分结构/交互/业务正确；组件 fixture 不冒充业务 E2E | `category` 三分类；business 结果必须来自调用方注入的 `BusinessFixture`（`businessSource` 标注来源，缺省 `none`——未做业务断言不默认为业务正确）；未注入 fixture → `business_fixture_required`。证据：business 3 项测试（注入成功 / 未注入失败 / 组件渲染结果 category 永不为 business） |
| 4 | 结果含目标节点/组件、失败原因、可定位路径和 exact baseline | `checkId` / `nodePath` / `actual` / `expected` / `diagnostics`（code/explanation/repairHint）/ `baseline.version`（stale → `test_baseline_missing`，与 #22 NodeStore expectedVersion 同精神，不盲跑）。证据：structure mismatch、node-path 缺失、disabled 零事件、stale baseline 测试均断言完整字段 |
| 5 | 开发期 preview/test 不进入普通 UI-only 生产依赖或网站 Agent 工具目录 | 静态断言：6 个生产包（react-provider/theme/conformance/plugin-kernel/capability-runtime/cart-demo）package.json 无 `@future-ui/ai-dev` 依赖、src 无 `@future-ui/ai-dev` import；ai-dev 不在任何生产包依赖图中（同 #21 依赖图断言方法）。证据：`ai-dev.test.ts`「production isolation」3 项 |
| 6 | 全部验收不调用真实模型；一个独立 PR 完成 | 无 model SDK 依赖/导入（openai/@ai-sdk/ai/langchain 静态断言）；src 无 fetch/WebSocket/XMLHttpRequest/http 通道；本 PR 独立闭环。证据：`ai-dev.test.ts`「no-model boundary」2 项 |

## 证据分级

| 级别 | 内容 | 状态 |
| --- | --- | --- |
| E1 | 确定性 jsdom 单元验证（结构/交互/业务/基线/边界/依赖图，35 项） | **已测** —— 本地 `pnpm lint` + `pnpm typecheck` + `pnpm test` 全绿 **267/267（31 files）** |
| E2 | 真实浏览器 live 渲染 / 视觉判断 | 不适用 —— 本任务非目标（#25 原文禁止浏览器自主 Agent / 视觉模型判断） |
| E3 | 真实模型调用 | 不适用 —— 本任务明确"不调用真实模型"，无模型预算授权（#23 负责真实模型对照评估） |

## 状态归属

- 冻结方案 `m0-08`（D-AIPR）已由 PR #44 合并入 main（用户确认接受）→ 本 PR 为方案落地实现。
- 契约实例单一权威：`buttonContract`/`selectContract` 从 `@future-ui/react-provider` 导入（不复制，D14 rule 1）；渲染原语来自 `@future-ui/conformance` dom-provider（#26 第二实现，0 contract-gap 基线）。
- 未测/边界如实声明：DOM provider 的 Button/Select 不携带 `data-part`（与 React host 的 adapter-diff，属 #26 已接受分类）；jsdom 中 click 不自动移动焦点（`focusPath` 断言反映真实 activeElement 状态，不伪造聚焦）；以上均为确定性可复现语义。
