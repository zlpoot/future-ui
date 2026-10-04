# Autonomous Engineering Workflow v0.1

状态：流程设计。GitHub 是持久事实源；本文件不产生或扩大任何 Grant。当前实际授权仍以 #4 Current Grant 为准。

## 1. 目标

future-ui 的工程自动化目标不是“每个 Issue 等负责人点一次继续”，而是：

> 负责人一次定义 Engineering Window 的工作图、权限、风险边界和停止条件；Supervisor 在窗口内持续选择任务、分配 Agent、实现、检查、Review、修复、合并/收口并推进下一任务。只有命中 escalation 条件时才暂停请求人类决策。

所有 Agent 都必须可中断、可替换、可恢复；工程状态不能依赖单个聊天/session 的记忆。

## 2. Role 与 Agent 解耦

**Role 定义职责、权限和独立性；Agent Profile 只是执行该 Role 的可替换后端。**

当前可用开发 Agent Pool：
- `doubao-work`
- `codex`

不把某个产品永久绑定到某个职责。允许同一个 Engineering Window 内重新绑定。

### Role slots

| Role | 主要职责 | 默认写权限 |
| --- | --- | --- |
| Owner / Grant Authority | 定义工作图、权限、预算、升级边界；高风险 merge/close | 人类；不属于可自动替换 Agent |
| Supervisor | 恢复状态、选下一个任务、调度角色、维护 Window 状态、触发 escalation | GitHub 状态/调度；产品代码写入需切换为 Worker 身份 |
| Planner | JIT 读依赖、拆步骤、准备 DoR、提出契约/决策缺口 | 默认读；修改工程产物时视为 Worker |
| Worker | 在独立 branch 实现、修复、安装获准依赖、运行检查/CI | 当前 Issue 授权范围内写 |
| Reviewer | 对 exact head 独立 Review，检查 scope/contract/tests/regression | 默认只读 + Review comments |
| Verifier | 对高风险边界/阶段证据做独立验证 | 默认只读 + Verify evidence |
| Researcher | 需要外部资料时收集依据并交还 Planner/Worker | 默认只读；外部 live/付费能力仍受 Grant |

如果 Reviewer/Verifier 修改代码，它从修改发生时起视为 Worker；之前针对旧 head 的 Review/Verify 失效，必须由新的独立执行身份重新审查。

## 3. Role Binding 可在每个层级覆盖

Role 到 Agent 的映射使用四层优先级：

```text
Attempt override
    ↓
Issue override
    ↓
Engineering Window binding
    ↓
Repository default
```

越上层优先级越高。

因此可以做到：
- 仓库默认 Worker=Codex；
- 某个 Window 改成 Worker=豆包工作；
- 某个 Issue 单独指定 Codex；
- 某次修复 Attempt 因超时临时切换豆包工作。

**Agent 切换不是权限升级。** 新 Agent 继承的是 Role + Grant 的交集，不能因为换 Agent 获得额外 live/model/deploy/merge 权限。

### 建议初始默认（可随时修改）

```yaml
roles:
  supervisor:
    primary: doubao-work
    fallback: codex

  planner:
    primary: doubao-work
    fallback: codex

  worker:
    primary: codex
    fallback: doubao-work

  reviewer:
    strategy: different-from-worker
    preferred: doubao-work
    fallback: codex

  verifier:
    strategy: different-execution-from-worker
    preferred: doubao-work
    fallback: codex
```

这只是初始映射，不是产品约束。实际 adapter 能力必须运行时探测，不根据产品名假设其一定支持某个动作。

## 4. 独立性规则

普通 Review：
- 至少使用与 Worker 不同的 execution/session。
- 优先使用不同 Agent Profile；只有 Agent Pool 不足或 Window 明确允许时才回退到同 Profile 的全新 context。

高风险 Verify：
- 默认要求不同于 Worker 的 Agent Profile。
- 如果无法满足，标记 `independence_degraded` 并触发 escalation；不能静默当作完整独立 Verify。

Supervisor 可以与 Reviewer 使用同一 Agent Profile，但必须是不同 execution context；Supervisor 自己写过该 head 时不能再作为该 head 的独立 Reviewer。

## 5. Engineering Window

Issue-scoped Grant 适合 bootstrap；长时间工程使用 Engineering Window。

Window 最小字段：

```yaml
window:
  id: ENG-001
  state: running
  baseline: <main sha>

  work_graph:
    - "#5"
    - "#6"
    - "#7"
    - "#22"

  allowed_agents:
    - doubao-work
    - codex

  role_bindings: <mapping>

  concurrency:
    coding_issues: 1
    reviews: 1

  repair_policy:
    max_loops_per_head: 3
    allow_worker_switch: true

  merge_policy:
    low_risk: <auto|human>
    contract: human
    security: human
    release: human

  close_policy:
    low_risk: <auto|human>
    milestone: human

  forbidden:
    - browser_live
    - product_model_api
    - external_account_write
    - deploy
    - publish

  stop_conditions:
    - scope_complete
    - grant_expired_or_revoked
    - no_ready_work
    - repair_limit
    - policy_conflict
    - unsafe_or_unknown_state
```

当前 G0-001 仍是 #5-only bootstrap grant，merge/close 仍由 Owner 批准；本设计不会自动把它变成 ENG-001。

## 6. Supervisor Loop

```text
START / RESUME
   ↓
refresh main + grant + active Window + Issues + PRs + CI
   ↓
reconcile unfinished work
   ↓
active Issue exists?
   ├─ yes → resume exact state
   └─ no  → choose next executable Issue from work_graph
                 ↓
             DoR PASS?
          ┌──────┴──────┐
          │             │
        yes          blocked
          │             │
        bind roles   choose another /
          │          escalate if hard block
          ↓
        Worker
          ↓
   local checks / CI
          ↓
         PR
          ↓
       Reviewer
      ┌───┴────┐
      │        │
    PASS     CHANGES
      │        │
      │     repair loop
      │        ├─ same Worker
      │        └─ switch Worker Agent if policy says
      │
  Verify if required
      ↓
 merge gate by Window policy
      ↓
 main closeout
      ↓
 Done / close by Window policy
      ↓
 select next Issue
      ↺
```

Supervisor 不需要长期保持同一模型 session。每个 tick 都可以从 GitHub 重建状态。

## 7. 持久状态与恢复

GitHub 是恢复源，Agent memory 只是缓存。

每个进行中的任务至少能从以下信息恢复：
- Window ID / Grant；
- Issue Status；
- role bindings + execution IDs；
- branch；
- PR；
- exact head SHA；
- latest check/CI results；
- Review / Verify verdict；
- repair attempt number；
- last completed action；
- next intended action；
- escalation reason（若有）。

Agent/机器重启后：

```text
read grant
→ read Window
→ read main
→ read active Issues/PRs
→ reconcile exact head + CI
→ reacquire Supervisor lease
→ continue next idempotent step
```

不得靠“上一个聊天里我记得做到哪了”恢复。

## 8. Handoff Bundle

切换 Agent 时必须产生结构化 handoff：

```yaml
handoff:
  issue: "#N"
  branch: ...
  head: ...
  role_from: worker
  agent_from: codex
  role_to: worker
  agent_to: doubao-work
  goal: ...
  acceptance_remaining: [...]
  changed_files: [...]
  checks:
    passed: [...]
    failed: [...]
  known_failures: [...]
  open_questions: [...]
  next_action: ...
```

新 Agent 必须先验证 branch/head 是否仍一致，再继续写入。

## 9. 自动切换策略

允许 Supervisor 在不扩大 Grant 的前提下重绑角色。

推荐 v0.1：
- Agent unavailable/timeout → 切 fallback。
- Worker 连续 2 次在同一失败类型无进展 → 下一 repair attempt 切 Worker。
- Reviewer 发现结构性方案错误 → 回 Planner，必要时换 Planner。
- 同一 head Repair 达到 3 次 → escalation。
- Agent 切换后 Review 不继承；按新 exact head 重新 Review。

不建议 v0.1 做多个 Worker 同时修改同一 Issue。

## 10. 自动 merge 与人类门

长时间无人值守的关键是 Merge Policy，而不是取消 branch protection。

### 可自动 merge 的候选条件

只有 Window 显式授权 `merge_policy.low_risk=auto`，且同时：
- Issue 属于 work_graph；
- exact head CI PASS；
- Reviewer PASS；
- 需要的 Verify PASS；
- 无 unresolved threads；
- 没有 escalation；
- PR 没改变公开契约/权限/安全/发布边界；
- protected main 允许当前 merge method。

否则停在 `AWAITING_HUMAN_MERGE`。

### 必须人工 merge

默认包括：
- Contract/ADR 的重大语义改变；
- authorization/security/unknown-write 边界；
- 新 external/live 权限；
- deploy/publish/release；
- Engineering Window scope 扩展；
- Reviewer/Verifier independence degraded。

## 11. Escalation

以下才打断 Owner：
- work_graph 外的新任务；
- 权限/预算/凭据扩大；
- 产品或核心架构二选一且影响长期兼容；
- dependency/license 风险超出已接受策略；
- browser/live/model/external write/deploy/publish；
- 3 次 repair 仍不能收敛；
- CI 持续 flaky 且无法可靠归因；
- Git/GitHub 状态冲突，无法安全重建；
- 独立 Review/Verify 无法满足；
- Supervisor 无法确定下一动作不会扩大权限。

普通实现细节不升级。

## 12. 当前 G0-001 的用途

G0-001 是 autonomous workflow 的 bootstrap：

- 允许只在 #5 内验证 Worker → checks/CI → PR → Review → repair 的闭环；
- 当前 merge/close 仍是 human gate，所以完成 PR 后会停在 `AWAITING_HUMAN_MERGE`；
- #5 结束后不能自动进入 #6，因为 G0-001 work scope 只有 #5；
- 若 bootstrap 成功，后续可由 Owner 建立真正的 Engineering Window（例如覆盖 #6/#7/#22），并选择是否开放 low-risk auto merge/close。

## 13. 开发 Agent 与“模型调用”边界

Window 中的 `model/API paid calls: NO` 指**项目代码、测试或产品运行时主动调用外部模型/API**。使用 Owner 已选择的 `doubao-work` / `codex` 作为开发 Agent 属于工程执行渠道，不因此把项目代码获得模型/API 调用权限。

如果开发 Agent 本身需要额外账户、付费额度或外部数据访问，仍受 Owner 的账户/预算授权约束。
