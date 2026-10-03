# 来源与参考边界

整理日期：2026-10-03。本准备包主要是对当前对话方向的结构化整理，不是新一轮外部研究或兼容性实测。

## 直接输入

- 用户提出四项要求：跨框架无样式可访问组件；可接 WebMCP 等 Agent 生态；AI 优先开发；UI 与 Agent 模块可插拔且解耦。
- 上一轮架构讨论：三个服务对象、两个子系统+Binding、三类契约、业务动作共享、插件生命周期、AI 校验/局部修改、验证矩阵以及与 webskill 的独立关系。
- 用户当前确认：GitHub 是开发事实源，Notion 是规范参考；整理开发前文档和 Issues，不进入开发。
- 用户提供的基础文档指定仓库：zlpoot/future-ui。该仓库在本轮初次读取时为空、私有；没有现有源码被迁移或改写。

## 本轮实际读取的流程参考

- [webskill AGENTS](https://github.com/zlpoot/webskill/blob/3e6ae3928fc0d5426eff6e1f2c912f3f68cb7848/AGENTS.md)：导航、事实源、工作区保护、依赖/验收、授权边界。读取的文件 blob：bdb3b579e6fbb54043dc6edbe2384ab24076eabb。
- [webskill workflow](https://github.com/zlpoot/webskill/blob/3e6ae3928fc0d5426eff6e1f2c912f3f68cb7848/docs/management/workflow.md)：Issue/PR、Ready/Done、Fast Mode 和风险分级。读取的文件 blob：59c3c3354c5e8cba34d06646e6c9c897d13b3a19。
- [WebSkill Notion Operating Mode](https://app.notion.com/p/3ec27cd8a5c981ee99cac91bc13e377e)：人工逐步、轻量检查/Review、用户 merge authority、禁止旧批准扩大权限。

webskill 参考 main 观测值为 3e6ae3928fc0d5426eff6e1f2c912f3f68cb7848。其 M3/M4 自动化规则、测试计数、成熟度和阶段验收不继承到 future-ui。

## 本项目适配，而非原样复制

保留 GitHub 事实源、独立 Review、最小充分检查和用户合并权。新增准备期 G0 限制。暂以 Issue 正文一个 Status 字段管理状态，不建立 Project/状态标签/Notion 看板三套记录。没有复制 full-stage-verification 脚本、Supervisor 或持久审计平台。

## 外部候选阅读材料（本轮未重新核验版本）

- [Ark UI](https://ark-ui.com/)
- [Ark UI AI 开发入口](https://ark-ui.com/docs/ai/mcp-server)
- [Zag 架构介绍](https://zagjs.com/overview/introduction)
- [WebMCP 规范入口](https://webmachinelearning.github.io/webmcp/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)

以上延续讨论中的阅读方向，不证明当前浏览器、依赖版本或本项目支持状态。#3/#12 在作出具体技术决策前应查官方来源并记录日期、版本与限制，不沿用未经核实的“最新”结论。
