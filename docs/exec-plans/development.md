# future-ui 开发执行计划

> 基线：main 的准备期文档。性质：计划与工作流，不是执行授权。任何实现必须先满足目标 Issue 的 JIT Freeze、#4 Current Grant 和 Definition of Ready。

## 1. 核心执行模型

```text
Target Issue
  ↓
Just-in-time Contract / Decision Freeze
  ↓
G0 Current Grant（具体 Issue + 具体动作）
  ↓
Definition of Ready
  ↓
Ready → Coding → Review → [Verify] → Merge → Closeout → Done → Close
```

不再使用“把 #2/#3 全量冻结完，再统一打开开发”的模式。M0 只冻结 M0 真正消费的规则，M1 在进入对应 Issue 前继续冻结。

## 2. G0 批次

#4 是持续授权账本，不关闭成“G0 PASS”。推荐批次：

- **Batch 0 / 文档**：#1 closeout；#2/#3 按下一个目标 Issue 做 JIT freeze。
- **Batch 1 / 基础**：先 grant #5；完成后 #6。#6 closeout 后，#7 与 **#22 AI Contract Core** 可在 grant 明确时并行，尽早让机器消费者挑战 Contract/Schema。
- **Batch 2 / 代表 UI + 早期反向验证**：#16 → #18；随后 #26 portability checkpoint。#25 preview/test 可在 #22 + 代表 UI 消费者具备后与 #26 前后并行。#9 Capability runtime 也可在 #7 后独立推进。
- **Batch 3 / UI 扩展与纵向闭环**：只有 #26 通过/Contract 问题收敛后，才批量推进 #17/#19 → #20/#21；#8 收敛后与 #9 汇入 #10。
- **Batch 4 / 扩展与评估**：#11（完整跨框架/provider 对照）、#12（WebMCP）按依赖推进；单独预算 grant #23；最后 #14 独立 Verify + 阶段回归。

一次 grant 可以覆盖真正独立且可并行的多个子 Issue，但必须逐项列出，不以父工作包编号代替。

## 2.1 Autonomous Engineering Window

上述 Batch 是 dependency planning，不要求每个 Issue 都人工重新批准。长时间运行时，负责人可以用一个 Engineering Window grant 一次授权一段 work graph；Supervisor 在该图内自主推进，并仅在 escalation 条件出现时暂停。

角色绑定可动态修改。例如仓库默认 Worker=Codex，某个 Window 改为豆包工作，某个 Issue 再覆盖回 Codex，某次 repair attempt 还可以临时切换。权限始终取 Role 与 Grant 的交集。

当前 G0-001 仍只覆盖 #5，用于 bootstrap 这套循环；后续是否创建覆盖 #6/#7/#22 的 Engineering Window，以及是否允许 low-risk auto merge/close，需要 Owner 另行授权。

## 3. M0

### #5 M0-01 工具链
Ready：D01 + D12 + 足够完成 Acceptance 的 G0 动作授权。
交付：最小 TS/workspace、按需包边界、lint/typecheck/test 入口、轻量 CI（若 Acceptance 保留 CI，则 grant 必须允许 CI）。
非目标：一次性创建全部未来包、发布、模型/live。

### #6 M0-02 Schema
Ready：#5 接受；#2 最小契约；D02、D05(Schema subset)、D06(M0) 冻结。
交付：框架无关 Component/Capability/Binding/Plugin Schema、版本规则、正反例、结构化诊断。
要求：单一权威定义生成机器目录；Schema-valid 不代表授权或执行成功。

### #7 M0-03 Plugin Kernel
Ready：#6 接受；D07(M0) 冻结。
交付：app/request scope、manifest、provides/requires、compatibility、init/dispose、冲突/失败清理。
若 DoR 时无法一个 PR 清晰证明，则先拆“注册/兼容”和“生命周期/隔离”子 Issue。

### #22 AI Contract Core（#6 后立即可进入 JIT 流程）
Ready：#6 接受；machine-readable catalog / diagnostics / stable node+version / patch primitive 语义冻结；G0 grant 足够。
交付：catalog → validate/diagnostics → patch primitives。
目的：把 Dev AI 作为 Contract/Schema 的早期一等消费者，尽早发现机器可用性问题。
不依赖 #10，不调用模型。

## 4. M1-01：代表实现 → 早期 Portability → 批量扩展

#8 不直接执行。

1. #16：React provider 基础 + Button。
2. #18：Select，作为首个有状态/复合代表。
3. **#26：Early Contract Portability Checkpoint**。使用 Vue adapter 或真正不同 provider，以 Button + Select/等价代表挑战公共 Contract。
4. 只有 #26 通过，或其发现的 Contract 问题已回到 #2 修订并重新接受，才批量推进：
   - #17 TextInput
   - #19 Dialog
   - #20 Theme
   - #21 Component conformance + UI-only bundle

这不是为了提前“完成 Vue”，而是为了防止 Ark/React 在第一批实现中反向塑造公共 Contract。每个子 Issue 一个 PR。

## 5. M1 Capability / Binding / Adapter

- #9：独立 Capability runtime + legacy page；进入前冻结 D06(M1)，可与代表 UI/AI core 并行。
- #10：UI/Agent 共用业务动作的本地纵向 Binding；依赖 #8 父项收敛与 #9。
- #11：#26 后的**完整** Vue / alternate provider 对照；#26 负责早发现，#11 负责更完整证据。
- #12：WebMCP adapter；D09 在执行前冻结，mock/真实浏览器分别记账。

## 6. AI-first 开发闭环：#22 → #25 → #23

#13 是跨阶段父工作包，不要求等 UI/Agent 全部完成再开始。

- **#22 AI Contract Core**：#6 后即可执行，catalog / validate / diagnostics / patch；不调用模型。
- **#25 Preview/Test**：当 #22 与至少一个简单 + 一个有状态代表 UI 消费者可用后，提供受控 fixture/render target 与确定性交互测试，形成：
  `catalog → validate → patch → preview → test`
- **#23 真实模型公平对照**：只有 #22/#25、#10、D10 与模型/预算 grant 全部具备后才能开始。

preview/test 第一版调用确定性测试，而不是让模型通过视觉主观判断正确性。calibration/pilot 与正式 acceptance 分离；失败/未完成样本保留。

## 7. #14 阶段验收

目标是证明：
1. UI-only；
2. Agent-only；
3. UI + Agent shared action；
4. provider/theme/protocol 可替换边界；
5. accessibility / lifecycle / SSR-hydration / performance 的冻结支持范围；
6. unknown write / authorization / data minimization；
7. WebMCP 与 AI 证据等级不混淆。

需要独立 Verify 和同一 exact-head/baseline 的阶段回归。缺失的真实模型或浏览器证据不能自动记 PASS；若负责人决定缩小阶段范围，先修改 #14 Acceptance。

## 8. Review / Verify / Merge / Closeout

- Review PASS 绑定 exact PR head；实质变更后重新 Review。
- Verify 只用于 Issue 指定的高风险/阶段项，也绑定 exact head。
- Merge 需要负责人针对当前 exact head 的明确授权。
- Merge 后 Issue 进入 Closeout，在 main 上执行冻结的最小 post-merge 检查并记录 achieved/failed/not tested/deferred。
- Closeout PASS 后 Status=Done；Close 是独立生命周期动作，需负责人明确授权（可与 merge/closeout 一并授权）。
- Merge/Close 不自动给下一 Issue 新 grant。

## 9. 风险控制

- 父 Issue 不直接执行，避免一个 Status 同时代表多个不同进度。
- Current Grant 必须覆盖 Acceptance 所需动作，避免“CI 没授权但算通过”。
- Contract/Decision 只按当前消费者冻结，避免过度设计。
- UI-only 不允许 capability/protocol/model 依赖泄漏。
- unknown write 走 reconciliation，不盲重试。
- Mock/工具单测/模型/真实浏览器/真实外部写分别记账。
- D13 公开许可/npm/供应链不阻塞仅本地/私有 M0/M1。

## 10. 当前状态读取规则

本计划不维护 Current Grant 的动态副本。执行任何任务前读取 #4 与目标 Issue 的 `Status:`。

当前开发顺序仍从 #5 开始；只有 #4 明确授权且 #5 通过 DoR 进入 Ready 后才能 Coding。后续 #6、#7、#22、M1 子 Issue 都需要各自新的/更新后的 grant，不能继承 #5 的授权。
