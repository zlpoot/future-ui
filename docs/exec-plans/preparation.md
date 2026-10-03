# 开发前准备与后续任务图

日期：2026-10-03。此文件保存阶段范围和依赖设计；任务实时状态以各 GitHub Issue 正文的 Status 字段为准。当前文档不是可执行计划授权。

## 本轮交付边界

仅准备产品章程、架构、契约草案、ADR、开发规则、决策清单、验收策略、模板与 Issues；建立 Notion 方法参考并互链。空仓库首先在 main 初始化 AGENTS，其余候选文档走 `prep/g0-foundations` Draft PR。

不建立源码、package.json、依赖、测试实现、CI workflow、部署、发布、自动 Agent 或真实实验。文档与任务创建完成不等于工程规范已被审阅接受。

## 任务入口与依赖（不是动态进度）

| 编号 | 主题 | 准入依赖 |
| --- | --- | --- |
| [#1](https://github.com/zlpoot/future-ui/issues/1) PREP-00 | 准备包审阅 | 本轮文档可读 |
| [#2](https://github.com/zlpoot/future-ui/issues/2) PREP-01 | 三契约及插件约定冻结 | #1 候选文档；可与 #3 并行 |
| [#3](https://github.com/zlpoot/future-ui/issues/3) PREP-02 | 技术、兼容与验收决策 | #1 候选文档；与 #2 对齐 |
| [#4](https://github.com/zlpoot/future-ui/issues/4) G0 | 人工开发启动审批 | #1 接受及本次范围的 #2/#3 决策 |
| [#5](https://github.com/zlpoot/future-ui/issues/5) M0-01 | 最小工具链与包边界 | #4；M0 工具链已冻结 |
| [#6](https://github.com/zlpoot/future-ui/issues/6) M0-02 | Schema、版本与正反例 | #4、#5、#2 |
| [#7](https://github.com/zlpoot/future-ui/issues/7) M0-03 | 最小 Plugin Kernel、兼容检查与生命周期 | #4、#6 |
| [#8](https://github.com/zlpoot/future-ui/issues/8) M1-01 | React/Ark 组件与主题 | #4、#7、相关 #3 决策 |
| [#9](https://github.com/zlpoot/future-ui/issues/9) M1-02 | 独立能力与旧页面接入 | #4、#7、能力契约 |
| [#10](https://github.com/zlpoot/future-ui/issues/10) M1-03 | Binding 与购物车闭环 | #4、#8、#9 |
| [#11](https://github.com/zlpoot/future-ui/issues/11) M1-04 | Vue 对照与替代 provider | #4、#8、范围冻结 |
| [#12](https://github.com/zlpoot/future-ui/issues/12) M1-05 | WebMCP 实验 adapter | #4、#9、#10、兼容决策 |
| [#13](https://github.com/zlpoot/future-ui/issues/13) M1-06 | AI 开发工具与对照 | #4、#6、#10、评估/预算决策 |
| [#14](https://github.com/zlpoot/future-ui/issues/14) M1-07 | 阶段验收 | #4、#10—#13 与冻结的验收协议 |

所有实现和阶段验收任务的初始创建状态均为 Blocked / NOT_AUTHORIZED。当前没有 Ready 任务，不指派 Codex。此句记录创建时的事实，不替代后续 GitHub 状态。

## 阶段含义

PREP：准备候选规范，审阅、补齐、接受。
G0：明确批准哪几个 Issue 开始，记录基线和动作权限，不默认开放 live/费用/发布。
M0：最小工具链、可校验契约与插件基础，不能声称已具备完整 UI/Agent 产品。
M1：完成最小纵向闭环、独立使用/替换实证、有限协议兼容及 AI 对照。

M0/M1 是计划分组，不表示已经创建 GitHub Milestone/Project 或已验收。较大的工作包 #8/#13 等在 Ready 前进一步拆成可独立审阅子任务；本轮不启动拆分后的实现。

## 准备包交付自查

确认原始四项诉求可追踪；三类契约和模块依赖明确；候选与已确认原则分开；所有实现受 G0 限制；Notion 无动态状态副本；相对路径和任务引用存在。独立 Review 与负责人接受仍由 GitHub 记录，不由作者自查代替。

## 后续启动方式

负责人未来可以批准仅审阅文档、仅合并文档，或明确开始某个实现 Issue；这些意图要分别处理。启动前刷新 main/Issue/依赖/PR，并将当前授权记录在 #4。当前任务停在准备交付，不进入任何实现。
