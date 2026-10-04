# 准备基线 Closeout 与开发依赖图

日期：2026-10-04。此文件记录准备阶段如何过渡到开发工作流；动态状态仍以 GitHub Issue 正文为准，不是执行授权。

## 已完成的准备基线

- PR #15 已合并到 main，基线 commit：`b47a4b9fdfa002f3bb232a9002e326c2ee080009`。
- 架构、契约草案、decision register、benchmark 策略、Issue/PR 模板已经进入 main。
- #1 已完成独立复审与基线合并，剩流程优化文档 closeout；关闭仍需明确授权。
- 动态开发授权不在本文件维护；以 #4 Current Grant 与目标 Issue 状态为准。

## PREP 不再是“全量冻结所有未来方案”

#2/#3 继续保持 open，作为整个 M0/M1 的 JIT Contract / Decision 工作流。某个实现 Issue Ready 前，只冻结它真正需要的范围。

```text
准备基线（main）
      ↓
目标 Issue
      ↓
#2/#3 JIT freeze
      ↓
#4 Current Grant
      ↓
DoR → Ready → 实现流程
```

## 主要依赖链（不是工期 critical path）

```text
#5 → #6 ───────────────→ #22 AI Contract Core
      │                         │
      └→ #7 ─→ #16 → #18 ─────┼→ #26 portability checkpoint
             │                 │          │
             │                 └→ #25 preview/test
             │                            │
             └→ #9                        ├→ #17/#19 → #20 → #21 → #8(parent complete)
                                          │                         │
                                          └─────────────────────────┤
                                                                    ├→ #10
                                                                    │   ├→ #12
                                                                    │   └→ #13(parent) → #23
                                                                    └→ #11 full comparison
                                                                            ↓
                                                                           #14
```

实际并行取决于依赖、Current Grant 和可用执行资源；没有任务时长数据前不称为“关键路径”。

## 任务入口

| Issue | 角色 | Ready 前关键冻结 |
| --- | --- | --- |
| #2 | Contract workstream | 按目标 Issue 增量冻结 |
| #3 | Decision workstream | 按目标 Issue 增量冻结 |
| #4 | Rolling authorization ledger | 每批授权具体 Issue + 动作 |
| #5 | M0 工具链 | D01 + D12 |
| #6 | M0 Schema | D02 + D05(Schema) + D06(M0) + #2 最小契约 |
| #7 | M0 Plugin Kernel | D07(M0) |
| #22 | AI Contract Core | **#6 后即可**；catalog/validate/diagnostics/patch 语义；无模型预算 |
| #8 | M1-01 父工作包 | 不直接执行；跟踪 #16–#21，并要求 #26 早期 portability |
| #16 | React/provider + Button | D03/D04 + 对应 D07(M1) |
| #18 | Select（有状态代表） | #16 + D04 Select feature subset |
| #26 | Early portability checkpoint | #16/#18 + 最小第二 framework/provider 对照范围 |
| #17 | TextInput | #16 + **#26 通过/问题收敛** |
| #19 | Dialog | #16 + **#26 通过/问题收敛** |
| #20 | Theme | #17/#19 + #26 + D08 |
| #21 | Conformance/UI-only | #16–#20 + #26 + 测量范围 |
| #25 | AI preview/test | #22 + 代表 UI 消费者；确定性 fixture，不调用模型 |
| #9 | Capability runtime | D06(M1) + Capability Contract |
| #10 | Binding vertical slice | #8/#9 + Binding Contract |
| #11 | Full Vue/alternate provider | #26 + #8 + 完整对照范围 |
| #12 | WebMCP adapter | #9/#10 + D09 |
| #13 | AI-first 父工作包 | 跟踪 #22/#25/#23；不直接执行 |
| #23 | Real model evaluation | #22/#25 + #10 + D10 + model/budget grant |
| #14 | Stage acceptance | #10–#13 必需交付 + 冻结验收协议 |

## 当前停止点

本文件不维护动态授权状态。准备阶段完成后的任何实现都必须读取 #4 Current Grant，并逐项通过 JIT Freeze 与 Definition of Ready；未授权 Issue 不得开始。
