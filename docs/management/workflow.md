# 开发工作流与事实源

状态：准备期工作流。main 的 [AGENTS](../../AGENTS.md) 与当前 G0 #4 授权边界优先；本文件进入 main 后成为准备期协作规则，但不会自行改变 G0。后续开发仅在 #4 明确批准范围内执行。

## 事实源边界

GitHub：AGENTS、已接受 ADR/Contract、Issue Acceptance、当前代码、PR exact head、实际 CI/测试/原始证据。规范性承诺与描述性事实分开：代码行为不自动修改契约，Draft 文档不自动代表实现。

Notion：协作方法、提示词、概念解释、讨论和 GitHub 链接。不得保存第二套任务状态、动态验收结果、版本清单或权威 API；讨论影响工程时进入 Issue/ADR。Notion 页面、历史聊天与旧批准不能解锁任务。

## 角色与默认流程

用户负责方向、启动范围、费用/凭据/外部真实写与 merge authority；ChatGPT 负责计划与独立 Review；Codex 在获准后负责单项实现。当前不启动 Codex，不运行 Supervisor。

授权后默认流程：Issue → Ready 核对 → 独立分支实现 → 最小充分检查 → PR → 独立 Review → 用户授权 merge → 对应验收和简短 closeout。

普通实现不默认叠加独立 Verify/full 审计。能力授权、未知写等关键边界的最终验收及阶段收口需要独立 Verify 和阶段回归；范围按 Issue 冻结，不复制 webskill 特定脚本/门禁。

## 状态载体

本轮不建立 GitHub Project 或状态标签体系。每个 Issue 正文中的一个 `Status:` 字段是当前唯一活跃状态载体；Issue open/closed 表示生命周期。Notion 和文档任务图不维护第二份动态状态。

后续若采用 Project，须显式迁移状态并停止维护旧字段；不同时维持 Project、labels 和正文三套状态。

状态：Inbox → Spec → Ready → Coding → Review → Done；Blocked 独立表达规范/依赖/授权/环境阻塞；必要时进入 Verify。准备期文档可以 Spec/Review，但不因此进入产品 Coding。

## Definition of Ready

- 当前 G0 授权明确包含该 Issue 和所需动作。
- 目标、当前/预期行为、范围、依赖、契约、验收、最小测试及禁止项齐全。
- 依赖已接受且有可访问证据，不只检查“已关闭”。
- 阻碍该任务的公开契约、权限和预算未决项已解决。
- 单项可在一个 PR 内审阅；较大的候选工作包先拆分，不能直接交给实现器。

依赖完成不自动授予 Ready，Ready 也不包含自动 merge、live/付费调用或下一阶段授权。

## Definition of Done

必要的代码/契约/例子/文档一致；规定检查真实执行；独立 Review 通过；需要的 Verify 已完成；用户授权合并后基线检查满足 Issue；在有授权的 closeout 中记录结果并关闭。

纯文档只验收文档，不要求不存在的产品 E2E，也不得因文档通过声称产品完成。PR 使用 Refs #N，不使用自动关闭语句掩盖未验收任务。

## 证据和轻量检查

文档：路径、交叉引用、术语、依赖图、授权一致性。
普通代码：lint/typecheck、所改包测试、关键消费者 smoke，具体命令以实际 package.json/Issue 为准。
关键安全与阶段：指定负例、真实 effect 与同一基线阶段回归；模拟/离线/浏览器/模型证据不互相替代。

报告包含 exact SHA、实际命令、环境、结果、未运行项及原因。未测、skip、环境失败不是 PASS；不能事后降验收阈值掩盖失败。

## 变更与保护

方向未决用 Issue/RFC；明确选择写 ADR。常规实现细节授权后由实现者自主决定，公开契约/权限/范围变化才升级决策。不为原型增加无关治理平台。

不 force-push，不 reset/clean/discard，不覆盖未知工作区。读取工作区不等于获得修改授权。merge 授权绑定当前范围和 head，发生实质变化须重新 Review。

## 准备期停止点

本轮交付后停在 Draft PR/准备包 Review。#4 未批准；所有实现/阶段验收任务保持 Blocked。未合并文档不标 Accepted；不关闭 Issue、不启动后台任务、自动执行器或产品验证。
