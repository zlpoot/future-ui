# future-ui · Agent 工作入口

## 当前授权边界：SCOPED_DEVELOPMENT · CAL-001 · #23 calibration ONLY（preparation + execution）

负责人已于 2026-10-05 通过 #4 建立 Current Grant `CAL-001`：**仅限 #23「AI 开发对照评估与效果证据（真实模型）」的 calibration preparation + calibration execution**——harness / calibration runner、12 个 paired task fixtures、workspace isolation、budget guard、result ledger 的代码编写，本地 test/build，对应 PR，以及 `gpt-6.1-sol` calibration 模型调用（$50 hard cap 内）。

CAL-001 允许：上述 #23 calibration 相关代码修改、本地 build/test、CI 配置修改与 CI 运行、`gpt-6.1-sol` calibration 模型调用（预算内）、对应 PR 创建与合并。明确禁止：acceptance 运行、acceptance 预算、任何其他 Issue 的实现、部署、发布。Merge/Close 权限按负责人逐项确认。

本文件只同步可执行边界；Current Grant 的唯一动态事实源是 [#4](https://github.com/zlpoot/future-ui/issues/4)。若本文件与 #4 冲突，以当前用户授权与 #4 为准。

## 事实源与协作边界

1. 当前用户授权决定操作范围；不得从历史聊天、旧批准或“以前 G0 开过”推导新权限。
2. GitHub main 的 AGENTS、已接受 Contract/ADR、Issue Acceptance 是工程规范；代码、PR exact head、实际检查与原始证据是工程事实。
3. GitHub Issue 正文的 `Status:` 是当前任务状态载体；Notion 不维护第二套动态状态。
4. 未合并分支、Draft PR、Draft Contract 只是候选，不得称为已接受或已实现。
5. Notion 只保存长期方法、解释、提示词与 GitHub 链接。

## 开发准入：Just-in-time Freeze + G0 Grant

future-ui 不要求在 M0 前一次性冻结全部 M1 方案。

- #2 是持续的 Contract Freeze 工作流；只在目标 Issue Ready 前冻结它真正依赖的最小公开契约。
- #3 是持续的 Decision Freeze 工作流；只在目标 Issue Ready 前冻结对应技术、兼容和验收决策。
- #4 是持续开发授权账本，不是一次性全局开关。只有 Current Grant 明确列出的**具体可执行 Issue**与动作才获得授权。
- 父工作包不自动授权子 Issue；大任务必须在 Ready 前拆成真正子 Issue，一个实现 Issue 对应一个可独立审阅 PR。

依赖完成、文档 merge、Review PASS、父 Issue 获批都不会自动将其他 Issue 转为 Ready。CAL-001 也不自动授权 acceptance、其他 Issue 或任何 #23 之外的工作。

## Role / Agent 解耦

工程角色与具体 Agent 产品分离。当前开发 Agent Pool 为 `doubao-work` 与 `codex`；Supervisor / Planner / Worker / Reviewer / Verifier 等角色可以在 Repository default、Engineering Window、Issue、Attempt 四个层级重新绑定。角色切换不能扩大 Current Grant。

普通 Review 至少使用不同 execution/session；高风险 Verify 默认使用不同于 Worker 的 Agent Profile。Reviewer/Verifier 一旦修改代码，该执行身份即视为 Worker，旧 Review/Verify 对新 head 失效。

长时间工程的恢复状态必须落到 GitHub；不得依赖单个 Agent session 记忆。详见 [Autonomous Engineering Workflow](docs/management/autonomous-engineering-workflow.md)。

## 实现工作方式

授权后默认流程：

```text
JIT Contract/Decision Freeze
→ G0 Current Grant
→ Definition of Ready
→ Ready
→ Coding（独立分支）
→ 最小充分检查
→ PR
→ Review
→ Verify（仅规定的高风险/阶段任务）
→ 负责人 exact-head merge 授权
→ Merge
→ main Closeout
→ Done
→ explicit Close
```

- Review 后 PR head 有实质变化，原 Review / merge authorization 失效，必须重新 Review。
- PR 使用 `Refs #N`，不得用自动关闭语句掩盖尚未完成的 closeout。
- Merge、Close、live、费用、发布、下一 Issue 授权互相独立；除非负责人明确把它们一起授权（CAL-001 已明确授权 #23 calibration PR 的创建与合并；其余 Merge/Close 仍按负责人逐项确认）。
- Closeout 只验证已合并内容在 main 上满足该 Issue 的冻结 Acceptance，不借 closeout 扩大实现范围。
- 若 merge 后 closeout 失败，Issue 不得标 Done；回到 Blocked/Coding 并建立新的修复 PR。
- 不 force-push，不 reset/clean/discard，不覆盖未知修改。

## 产品方向防偏

Contract / Schema 有三类**并列的一等消费者**：
1. UI / framework / provider；
2. 开发 AI（catalog / validate / diagnostics / patch / preview / test）；
3. 运行期 Capability / Agent。

不得把开发 AI 变成“UI 与 Agent 全部完成后再补的工具层”。#6 之后即可让确定性 AI Contract Core (#22) 直接消费 Contract/Schema；首批代表组件具备后补 #25 preview/test。Ark/React 批量扩展前必须经过早期 portability checkpoint (#26)，避免公共 Contract 被首个 provider 反向锁死。

## 架构底线

future-ui 是 AI 优先开发、跨框架、无样式且可访问的模块化 Web UI 框架。
UI 与能力系统独立，通过可选 Binding 连接；Ark UI 和 WebMCP 都是可替换适配方向，不得成为公共契约硬依赖。
AI 开发期工具与网站运行期能力分离；业务动作与组件事件分离；人和 Agent 复用同一业务动作。
能力可发现、注解或前端可用状态不等于执行授权。默认拒绝未声明能力，不盲重试 unknown write，不把提示词或插件声明当安全沙箱。

## 证据与报告

文档只能证明文档；Schema-valid 不证明业务授权；Mock 不证明真实浏览器；确定性工具测试不证明模型效果；请求已发送不等于业务完成。

普通实现使用最小充分检查；权限/unknown write 等高风险边界和阶段收口按 Issue 要求独立 Verify。报告必须包含 exact SHA、实际命令/环境、结果、失败、未测和限制。
