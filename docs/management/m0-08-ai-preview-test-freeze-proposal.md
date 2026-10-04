# M0-08 AI Preview/Test 冻结提案（#25 · M1-06A2）

状态：**JIT Freeze Proposal（contract 类，需负责人确认接受后实现）**
目标消费者：#25「AI Preview/Test 确定性交互闭环」；Parent #13；#22 的后缀能力。
对齐：D14（ai-contract-core 模式）· D-PORT（conformance dom-provider 第二实现）· D03/D04（#16 Button + #18 Select 为代表组件）。

## 1. 背景与定位

#22（AI Contract Core：catalog/validate/patch）已让开发 AI 能"证明 Schema 合法"。#25 补齐闭环的确定性 preview/test：让开发 AI 能把目标 **fixture 渲染出来**，并调用**契约定义的交互测试**获得结构化结果——而不是只靠模型"看图觉得没问题"。

候选能力：`ui.preview` / `ui.test`。**正式接口以下文 JIT 冻结为准。**

## 2. 冻结范围（正式接口）

新包 **`@future-ui/ai-dev`**（开发期专用，绝不进入生产 runtime 依赖）。两个能力：

### 2.1 `ui.preview` — 受控开发 fixture 渲染

- **input**
  ```ts
  {
    componentId: 'button' | 'select';   // 首批仅契约已冻结的代表组件
    props?: Record<string, unknown>;    // 受控组件 props（仅契约声明字段，非任意 JS）
    host?: 'dom';                        // 第一版仅 DOM host（conformance 第二实现）
  }
  ```
- **语义**：只启动受控开发 fixture/render target；渲染器为 **jsdom + conformance `createDomButton`/`createDomSelect`**，无服务器、无浏览器 live、无网络、无真实网站加载。
- **output**
  ```ts
  {
    renderTarget: {
      rootPath: string;                       // 可定位路径，如 '/button[0]'
      nodes: Array<{ path, part, tag, attrs, text? }>;  // 结构树：节点/part/标签/属性
    };
    diagnostics: Diagnostic[];                // #6 诊断结构（code/path/expected/actual/explanation/repairHint）
    componentId: string;
    host: 'dom';
  }
  ```
- **限制**：不成为生产 runtime 能力；不被网站 Agent 工具目录引用；不接受任意代码/模板字符串/远程 URL。

### 2.2 `ui.test` — 确定性契约交互测试

- **input**
  ```ts
  {
    componentId: 'button' | 'select';
    props?: Record<string, unknown>;
    checks: Array<
      | { type: 'structure'; path: string; expect: { tag?: string; part?: string; attrs?: Record<string, string>; text?: string } }
      | { type: 'interaction'; action: { kind: 'click' | 'change' | 'key'; target?: string; value?: string; key?: string }; expect: { event?: string; state?: Record<string, unknown>; focusPath?: string } }
    >;
    baseline?: { version: string };           // exact baseline 版本（与 #22 NodeStore expectedVersion 同精神）
  }
  ```
- **语义**：调用确定性 structure/interaction checks，返回结构化结果给开发 AI。**不调用真实模型、不做视觉判断、不做浏览器自主 Agent。**
- **output**
  ```ts
  {
    results: Array<{
      checkId: string;                        // 稳定 id（`${componentId}.${type}.${index}`）
      ok: boolean;
      category: 'structure' | 'interaction' | 'business';
      nodePath?: string;                      // 可定位路径
      actual?: unknown;
      expected?: unknown;                     // exact baseline 值
      diagnostics?: Diagnostic[];
    }>;
    summary: { total: number; passed: number; failed: number };
    componentId: string;
    baseline: { version: string };
  }
  ```

### 2.3 证据边界：三类正确性必须可区分

| 类别 | 判定来源 | 代表 check | 备注 |
| --- | --- | --- | --- |
| 结构正确 (structure) | DOM 节点/parts/属性 vs exact baseline | `structure`（tag/part/attrs/text） | 与 #26 C1–C8 同源断言 |
| 交互正确 (interaction) | 事件/焦点/受控状态在 jsdom 内确定性触发 | `interaction`（click→event、change→value、Enter/Space→focus+event） | #18 已证明 jsdom 对原生元素确定性 |
| 业务正确 (business) | **业务层 fixture**（如 #9 CartService），组件 fixture 不冒充 | 仅当请求方显式提供业务层 fixture 句柄 | `category:'business'` 结果必须来自业务层，组件渲染结果不得标为业务正确 |

**"组件 fixture 不冒充业务 E2E"**：`ui.test` 只证明组件在其契约内的结构/交互行为；业务正确性由业务层 fixture 单独判定并在结果中标注来源（`businessSource`），缺省为 `none`（即未做业务断言，不默认为业务正确）。

## 3. 开发宿主与 fixture

- **开发宿主** = jsdom + `packages/conformance/src/dom-provider.ts`（纯 TS，无 React/Ark 依赖；#26 已核验其与 React host 的 0 contract-gap）。
- **fixture** = 确定性组件 props（来自 `buttonContract`/`selectContract` 的 schema 字段）；测试可覆盖 disabled、options、valueChange 等已冻结特性。
- 复用 #6 `validateComponent` / `validateConsumerContract` 做渲染前结构校验（preview/test 都不渲染非法契约）。
- **React host 可选**（第二版扩展点），第一版只冻结 DOM host——与 #26「最小 portability 对照」一致，避免首版扩大工具面。

## 4. 生产隔离

- 新包独立（`packages/ai-dev`），**仅开发期使用**；`react-provider`/`plugin-kernel`/`capability-runtime` 等生产包不得依赖它。
- 不进普通 UI-only 生产依赖图（实现 PR 将包含依赖图断言，同 #21 基线：UI-only bundle 无 dev 工具引用）。
- 不进入网站 Agent 工具目录（无 browser_live/model_api/external_write/deploy/publish）。
- CI 测试即证据：`pnpm test` 中确定性运行，无新增服务。

## 5. 验收映射（#25）

| # | 验收 | 落实方式 |
| --- | --- | --- |
| 1 | preview 只启动受控开发 fixture/render target，不成为生产 runtime 能力 | `ui.preview` 仅 jsdom + dom-provider；host 白名单 `'dom'`；无服务器/浏览器/网络 |
| 2 | test 调用确定性 component/conformance/interaction checks，返回结构化结果 | `ui.test` checks 执行器；results/summary 结构化返回 |
| 3 | 区分结构正确、交互正确与业务正确；组件 fixture 不冒充业务 E2E | `category` 三分类；business 结果必须来自业务层 fixture（`businessSource`） |
| 4 | 结果含目标节点/组件、失败原因、可定位路径和对应 exact baseline | `nodePath`/`actual`/`expected`/`diagnostics`/`baseline.version` |
| 5 | 开发期 preview/test 不进入普通 UI-only 生产依赖或网站 Agent 工具目录 | 独立包 + 依赖图断言 + 工具目录排除（见 §4） |
| 6 | 全部验收不调用真实模型；可由一个独立 PR 完成 | 无模型 SDK 依赖；实现 PR 单包交付 |

## 6. 错误码（沿用 #6 诊断结构，dev 前缀）

| code | 场景 |
| --- | --- |
| `preview_unsupported_component` | componentId 未在冻结组件集内 |
| `preview_invalid_props` | props 违反组件契约（渲染前 validateComponent 拒绝） |
| `preview_unsupported_host` | host 不是 'dom' |
| `test_unknown_check` | checks 含未知 check 类型 |
| `test_structure_mismatch` | 结构断言失败（含期望值 exact baseline） |
| `test_interaction_mismatch` | 交互断言失败（含事件/状态差异） |
| `test_baseline_missing` | baseline.version 缺失或与测试集不匹配 |
| `business_fixture_required` | 请求 business 断言但未提供业务层 fixture |

## 7. 非目标与禁止（#25 原文）

不做浏览器自主 Agent、不做视觉模型判断、不做真实网站/live WebMCP、不做跨站工作流；不调用真实模型；不发布开发服务器；不建立通用任意代码执行协议。

## 8. 决策登记

本提案对应 decision-register **D-AIPR** 行（经本 PR 冻结接受后生效，指向本文件与接受 PR）。
