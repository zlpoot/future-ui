# future-ui

**面向 AI 的现有 UI 库语义与适配层。**

future-ui 不重新实现一套 UI 库。它连接现有 UI 库，把组件、状态、交互和项目设计约定组织成统一、可查询、可校验的机器可读契约，让 AI 在不同工程中稳定沿用同一套 UI 约定；再通过独立、可选的能力投影接入 WebMCP 等生态。

> 方向来源：负责人 2026-10-05 确认。本轮是定位、文档与后续计划整理，不是产品代码开发。新的具体 API、依赖与执行范围仍按目标 Issue 和 [#4](https://github.com/zlpoot/future-ui/issues/4) 确认。

## 要解决的问题

Model Hub、bilibili docs、MV 制作等工程都可以由 AI 做到能用，但弹窗关闭入口、按钮位置、表单间距、pending 状态等经常各不相同。目标不是证明 AI 能完成以前完成不了的复杂任务，而是减少同类 UI 决策的重复发挥与人工纠正。

已有库继续负责组件实现；future-ui 负责适配语义、共享项目规范和 AI 接口。相同语义不自动意味着跨库像素相同，视觉一致需要相同 Profile 中明确的 token 实值、变体与布局映射。

## 最小结构

```text
现有 UI 库 / 项目内已有组件
        ↓ Library Adapter（声明版本、映射与限制）
既有 Component Contract + Project Profile
        ├→ 开发期 AI View：可用组件、import、示例、规范、诊断
        └→ 受支持页面的 UI 实例结构：关系、允许可见状态、交互语义

显式 Capability + 实际业务 handler + 可选 Binding
        └→ 运行期工具投影 → 可选 WebMCP 等适配器
```

可读 UI 结构不是业务执行权限；一个按钮不会自动变成一个业务工具。

## 已有基础与尚未交付

核对基线：`453567d875e8a144cb5a59179bd28b64b5970f72`。下表是源码存在性与用途说明，不是对所有场景的验收承诺。

| 已有资产 | 接下来如何使用 |
| --- | --- |
| `contracts`、`plugin-kernel` | 复用契约、诊断、兼容与生命周期基础 |
| `react-provider`、`conformance`、`theme` | 保留代表组件与测试/主题基础；不继续按自研完整组件库扩张 |
| `ai-contract-core`、`ai-dev` | 复用目录/校验/patch/preview/test；优先补项目真实组件目录，而非新建控制平台 |
| `capability-runtime`、`cart-demo`、`webmcp-adapter` | 保留显式业务能力与可选协议边界，后续小范围接入 |
| CAL-001 harness 与统计脚本 | 保留历史实验，不扩大为当前产品验收前置 |

当前 `buildCatalog()` 主要枚举 component/capability/binding 等契约 Schema 类型，不能称为已交付的第三方 UI 库组件目录。现有 React provider 也不能代替 shadcn/Ark/MUI 的真实适配证据。项目 Profile、真实库适配和项目级 AI View 是 R1 待交付范围。

## 接下来做什么

主线：[R1 父项 #66](https://github.com/zlpoot/future-ui/issues/66)。

1. [#67](https://github.com/zlpoot/future-ui/issues/67)：盘点真实工程，确定最小语义与 Project Profile。
2. [#68](https://github.com/zlpoot/future-ui/issues/68)：适配一个实际 UI 库，聚焦 Dialog / Button / TextInput。
3. [#69](https://github.com/zlpoot/future-ui/issues/69)：输出项目级 AI 目录、实例结构与有界校验。
4. [#70](https://github.com/zlpoot/future-ui/issues/70)：在两个真实工程复用验证，并做第二库的小范围对照。
5. [#71](https://github.com/zlpoot/future-ui/issues/71)：显式能力到 WebMCP-like 输出，独立、可选，不阻塞前四项。

首库候选是 shadcn/React，但必须先核验实际工程技术栈；不为适配层强迁现有项目。暂不做全量库矩阵、万能 UI DSL、复杂事务 patch 平台、134 对 acceptance 或模型专项训练。

## 文档入口

- [Agent 入口与授权边界](AGENTS.md)
- [产品章程](docs/vision/charter.md)
- [架构与边界](ARCHITECTURE.md)
- [方向调整 ADR](docs/adrs/0002-ui-semantic-adaptation.md)
- [后续开发计划](docs/exec-plans/development.md)
- [一致性验收策略](docs/benchmarks/strategy.md)
- [既有契约](docs/contracts/README.md) · [术语](docs/concepts/glossary.md)
- [工作流](docs/management/workflow.md) · [自主工程协作](docs/management/autonomous-engineering-workflow.md)
- [决策登记](docs/management/decision-register.md) · [历史准备基线](docs/exec-plans/preparation.md)
- [来源边界](docs/references/source-map.md)

GitHub 保存契约、任务、PR、代码与证据；[Notion](https://app.notion.com/p/3ee27cd8a5c9813ebe0fca494e245d2d) 只保存解释、方法和提示词，不维护第二套进度。

## CAL-001 的位置

[#23 closeout](https://github.com/zlpoot/future-ui/issues/23#issuecomment-5995143481) 报告 12 对配置任务未观察到显著提升，结果原样保留。未显著不等于证明等效/不劣；未针对该库专项训练也不是已验证的失败原因。本轮不重跑、不改判、不自动关闭历史 Issue，亦不把原 5M token 授权延续给新阶段。
