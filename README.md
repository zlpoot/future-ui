# future-ui

> **PREPARATION_ONLY · 开发前准备。** 本仓库目前不提供可运行组件、npm 包、Agent 服务或产品测试结果。文档是候选工程基线，具体实现尚未启动。

一套 **AI 优先开发、契约驱动的模块化 Web UI 框架**：提供跨框架、无样式且可访问的组件体系；通过独立、可插拔的能力模块连接 WebMCP 等 Agent 生态；以元数据、校验、局部修改和测试工具链支持 AI 稳定开发界面。

UI 与 Agent 能力系统独立，通过可选 Binding 连接。Ark UI 是首个组件实现候选，不是本项目公共契约；WebMCP 是协议适配方向，不是核心依赖。AI 优先不等于取消人的可访问性。

## 从这里开始

- [Agent 工作入口与授权边界](AGENTS.md)
- [产品章程与范围](docs/vision/charter.md)
- [架构和依赖方向](ARCHITECTURE.md)
- [术语](docs/concepts/glossary.md)
- [组件、能力、Binding 与插件契约草案](docs/contracts/README.md)
- [基础边界 ADR](docs/adrs/0001-foundation-boundaries.md)
- [开发工作流与事实源](docs/management/workflow.md)
- [待决策登记](docs/management/decision-register.md)
- [准备基线 Closeout 与开发依赖图](docs/exec-plans/preparation.md)
- [开发执行计划](docs/exec-plans/development.md)
- [验收与 AI 对照策略](docs/benchmarks/strategy.md)
- [来源与参考边界](docs/references/source-map.md)

## 工程入口

[准备包审阅 #1](https://github.com/zlpoot/future-ui/issues/1) · [契约审阅 #2](https://github.com/zlpoot/future-ui/issues/2) · [技术与验收决策 #3](https://github.com/zlpoot/future-ui/issues/3) · [G0 启动审批 #4](https://github.com/zlpoot/future-ui/issues/4)

[GitHub Issues](https://github.com/zlpoot/future-ui/issues) 是任务事实源；[Notion 协作参考](https://app.notion.com/p/3ee27cd8a5c9813ebe0fca494e245d2d) 只保存方法、解释和提示词，不维护重复进度。

## 状态与当前边界

准备基线已进入 main；当前仍无 package.json、源码、依赖安装、CI 工作流、部署或模型/浏览器调用。#4 Current Grant 为 NONE，因此开发尚未开始。

准备基线、具体契约成熟度和开发授权是三个独立状态：准备基线是否已进入 main 以 #1、PR #15 和 main 当前内容为准；Component / Capability / Binding / Plugin 等具体契约是否冻结以 #2、#3 与对应 ADR 的状态为准；开发授权只以 #4 为准。任一状态变化都不能推断另外两项。

**文档进入 main ≠ 具体契约全部冻结 ≠ 开始开发。** 只有负责人在 G0 明确批准具体任务范围，且对应任务满足 Ready 条件，才允许实现；不自动 merge、关闭任务或进入下一阶段。
