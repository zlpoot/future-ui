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
- **Batch 1 / M0**：先 grant #5；完成 closeout 后再 grant #6；再 grant #7。
- **Batch 2 / M1 UI + Capability**：#16 先建立 React/provider 基础；之后可按 grant 并行 #17/#18/#19 与 #9；随后 #20/#21 和 #10。
- **Batch 3 / 扩展**：#11、#12、#22 按依赖并行。
- **Batch 4 / 实验与验收**：单独预算 grant #23；最后 #14 独立 Verify + 阶段回归。

一次 grant 可以覆盖真正独立且可并行的多个子 Issue，但必须逐项列出，不以父工作包编号代替。

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

## 4. M1-01：父 #8 → 子 #16–#21

#8 不直接执行。

- #16：React provider 基础 + Button。
- #17：TextInput。
- #18：Select。
- #19：Dialog。
- #20：Theme token/parts/variants 与视觉可访问性。
- #21：Component conformance + UI-only bundle 验收。

#16 后 #17/#18/#19 可在 grant 明确时并行；#20 依赖目标组件稳定；#21 最终收敛工作包证据。每个子 Issue 一个 PR。

## 5. M1 Capability / Binding / Adapter

- #9：独立 Capability runtime + legacy page；进入前冻结 D06(M1)。
- #10：UI/Agent 共用业务动作的本地纵向 Binding；依赖 UI 与 Capability 所需交付。
- #11：Vue + alternate provider 对照；不泛化为“所有框架”。
- #12：WebMCP adapter；D09 在执行前冻结，mock/真实浏览器分别记账。

## 6. M1-06：父 #13 → #22/#23

- #22：确定性 catalog/validate/patch 与权限隔离；**不需要模型预算，不调用模型**。
- #23：真实模型公平对照；只有 D10 冻结且 G0 grant 明确模型/预算后才能开始。

calibration/pilot 与正式 acceptance 分离；失败/未完成样本保留。

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

## 10. 当前状态

准备基线已合并；#16–#23 已建立为真正子 Issue；#4 Current Grant 仍为 NONE。**因此当前无任何实现任务 Ready，开发尚未开始。**
