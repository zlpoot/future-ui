# 开发工作流与事实源

状态：本文定义统一开发流程，不自行产生授权。动态授权状态只以 #4 Current Grant 为准；AGENTS 仅同步当前可执行边界。

## 1. 事实源

GitHub 是唯一工程事实源：
- AGENTS 与当前用户授权：操作边界；
- 已接受 Contract / ADR：规范；
- Issue `Status:`、Acceptance、依赖：任务事实；
- PR exact head、代码、实际检查与原始证据：实现事实。

Notion 只保存方法、解释、提示词和 GitHub 链接，不维护动态任务状态、验收结果、版本清单或权威 API。

## 2. 角色

- 负责人：方向、G0 grant、费用/凭据/live/外部写、merge、close 与阶段范围。
- ChatGPT：计划、契约/决策整理、Review；需要时执行获准的 GitHub 文档管理。
- 实现 Agent（如 Codex）：只执行 #4 Current Grant 覆盖且已 Ready 的单项 Issue。
- Verifier：仅在 Issue 明确要求的高风险边界或阶段收口执行独立 Verify。

不引入 webskill 的 Supervisor、自动 merge 或全局自动推进。

## 3. Just-in-time Freeze

不设置“#2/#3 全部完成后才能开发”的全量前置门。

每个目标 Issue 在 Ready 前依次检查：
1. 它依赖的最小 Component/Capability/Binding/Plugin 契约是否已由 #2 接受并进入 main。
2. 它依赖的工具链、兼容、支持范围、验收方法是否已由 #3 接受并进入 main/ADR。
3. 未被当前 Issue 消费的未来方案保持 TBD/Deferred。

典型 Ready Gate：
- #5：D01 + D12。
- #6：D02 + D05(Schema 子集) + D06(M0) + #2 的 Schema 最小契约。
- **#22：#6 后即可进入；冻结 machine-readable catalog / diagnostics / stable node+version / patch primitives；不需要 #10 或模型预算。**
- #7：D07(M0)。
- #16/#18：D03/D04 + 对应 D07(M1) 最小支持子集。
- **#26：#16 + #18 后，冻结最小第二 framework/provider 与 conformance 范围；通过/修订后再批量扩展。**
- #17/#19/#20/#21：#26 已通过或其 Contract 问题已收敛，再冻结 D04/D08 与对应支持子集。
- **#25：#22 + 代表 UI 消费者后，冻结 deterministic preview/test 宿主、fixture、结构化结果和生产隔离。**
- #9/#10：D06(M1) 与完整 Capability/Binding 执行语义。
- #11：#26 后的完整 Vue/alternate provider 对照范围。
- #12：D09。
- #23/#14：D10、相应 D11 与模型/预算授权。
- D13 只在公开发布前冻结。

## 4. G0 是持续授权账本

#4 整个 M0/M1 期间保持授权入口，不理解成一次性 PASS。

Current Grant 必须记录：
- Grant ID / 日期；
- baseline commit；
- 具体可执行 Issue 编号；
- code write、dependency install/update、local build/test、CI config/change、CI run 分别是否允许；
- browser/provider live、model/API、external account/data write、deploy/publish 是否允许；
- 预算、凭据、数据边界、停止条件；
- grant 结束/替换条件。

父工作包不自动授权子 Issue。可以一次授权多个真正可并行的子 Issue，但必须逐项列出。

**Grant 不等于 Ready。** 如果 Current Grant 不足以完成目标 Issue 的 Acceptance（例如验收要求 CI 而 grant 禁止 CI），不得把未运行项记 PASS；应扩大 grant 或正式修改 Issue Scope/Acceptance。

## 5. 大工作包必须拆成真正子 Issue

一个实现 Issue 对应一个可独立证明的变化和一个可独立审阅 PR。父 Issue 只做范围/依赖/阶段验收跟踪，不直接 Ready/Coding。

当前：
- #8 是父工作包；实现拆为 #16–#21，并由 #26 在批量扩展前做早期 portability checkpoint。
- #13 是 AI-first 父工作包；#22 Contract Core 提前到 #6 后，#25 补确定性 preview/test，#23 单独做真实模型评估。
- #11 保留为 #26 之后更完整的 Vue/alternate provider 对照。
- #7 若 DoR 评估发现无法用一个清晰 PR 同时证明兼容注册与生命周期清理，则在 Ready 前再拆子 Issue。

## 5.1 长时间 Autonomous Engineering

单 Issue 流程之外，可以由负责人建立一个 Engineering Window。Window 一次定义 work graph、allowed agent pool、role bindings、concurrency、repair、merge/close policy、forbidden actions 与 stop conditions。

Supervisor 在 Window 内循环：恢复 GitHub 状态 → 选择下一个可执行 Issue → DoR → 分配 Worker → checks/CI → Reviewer → repair/换 Agent → 必要 Verify → merge gate → main closeout → 下一 Issue。

Role 与 Agent 分离；当前可用 Agent Pool 为 `doubao-work` 和 `codex`。允许在不扩大 Grant 的情况下切换角色绑定。详细 schema、handoff、恢复、自动切换与 escalation 见 `docs/management/autonomous-engineering-workflow.md`。

当前 G0-001 仍是 #5-only bootstrap，并未授予 autonomous auto-merge/close 或 #6 权限。

## 6. 状态机

Issue 正文一个 `Status:` 字段为唯一活跃任务状态。推荐值：

```text
Inbox / Spec
      ↓
Blocked ──(JIT freeze + grant + DoR)──→ Ready
      ↓                                  ↓
   原因解除                           Coding
                                         ↓
                                      Review
                                         ↓
                              Verify（条件分支）
                                         ↓
                              等待 exact-head merge
                                         ↓
                                       Merge
                                         ↓
                                      Closeout
                                         ↓
                                        Done
                                         ↓
                                  explicit Close
```

说明：
- `Blocked`：依赖、授权、决策、预算、环境任一不满足。
- `Ready`：Current Grant 足够完成整个 Acceptance，且 DoR 全部满足。
- `Coding`：实现 Agent 已在独立分支开始本 Issue。
- `Review`：PR 和规定检查已提交；等待独立 Review/修复/merge authorization。
- `Verify`：仅高风险边界或阶段验收；普通任务不默认追加。
- `Closeout`：PR 已 merge，在 main 上确认目标行为、文档/证据/消费者一致。
- `Done`：Acceptance 在 main 上满足，但 GitHub Issue 可以仍 open 等待明确 close 授权。
- GitHub closed：生命周期结束；close 不能从 merge 自动推断。

PR head 发生实质变化后，之前对旧 head 的 Review / Verify / merge authorization 无效。

## 7. Definition of Ready

- #4 Current Grant 明确包含目标 Issue，且授权动作足够完成其 Acceptance。
- JIT Contract/Decision 已冻结并进入可访问 GitHub 基线。
- 依赖已接受并有证据，不只看“closed”。
- 范围、非目标、Acceptance、最小检查和禁止项清楚。
- 单项可在一个 PR 内审阅；否则先拆子 Issue。
- live/模型/外部账号/费用需要时已有独立 grant。

## 8. Review → Verify → Merge → Closeout → Done/Close

### Review
检查范围、契约、依赖泄漏、关键负例、消费者影响和实际测试。Review PASS 绑定 exact head。

### Verify
只在 Issue 明确规定时执行，例如权限边界、unknown write、阶段最终验收。Verify 也绑定 exact head；不能用同一作者自查冒充需要的独立 Verify。

### Merge
负责人授权 merge，默认只针对 Review/Verify 过的 exact head。Merge 不自动 close Issue，也不授权下一任务。

### Closeout
在 main 上：
- 确认 merge commit / main exact baseline；
- 执行 Issue 明确要求的最小 post-merge/main 检查；
- 确认文档、证据和消费者没有因 merge 丢失；
- 记录 achieved / failed / not tested / deferred。

Closeout 不新增功能；若发现问题，回到 Blocked/Coding 开修复 PR。

### Done / Close
Closeout PASS 后将 Status 置为 Done。只有负责人明确允许 close（可以和 merge/closeout 授权一起给出）才关闭 GitHub Issue。

## 9. 证据与检查

- 文档：路径、交叉引用、术语、依赖图、授权一致性。
- 普通代码：lint/typecheck、目标包测试、关键消费者 smoke；以实际 package.json/Issue 为准。
- 高风险/阶段：指定负例、实际 effect、同一基线回归和独立 Verify。
- Mock、离线、浏览器 live、模型、真实外部写分别记账，不互相替代。
- calibration/pilot 数据不计入正式 acceptance。

报告必须列 exact SHA、环境/版本、实际命令、结果、原始证据位置、未运行项及原因。未测/skip/环境失败不是 PASS。

## 10. 动态授权与停止点

本文不维护 Current Grant 的动态副本。每次开始任务前必须读取 #4 与目标 Issue。

即使某个 Issue 获得 grant，也必须先满足 JIT Freeze 与 Definition of Ready；未列入 Current Grant 的任务不得进入 Coding。browser/provider live、模型、外部账号写入、部署与发布只有在 #4 明确授权时才能执行。
