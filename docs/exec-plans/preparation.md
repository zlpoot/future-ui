# 准备基线 Closeout 与开发依赖图

日期：2026-10-04。此文件记录准备阶段如何过渡到开发工作流；动态状态仍以 GitHub Issue 正文为准，不是执行授权。

## 已完成的准备基线

- PR #15 已合并到 main，基线 commit：`b47a4b9fdfa002f3bb232a9002e326c2ee080009`。
- 架构、契约草案、decision register、benchmark 策略、Issue/PR 模板已经进入 main。
- #1 已完成独立复审与基线合并，剩流程优化文档 closeout；关闭仍需明确授权。
- #4 仍无开发 grant；当前没有 Ready 实现任务。

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
#5 → #6 → #7
            ├→ #8(parent) → #16 → #17/#18/#19 → #20 → #21
            │                               ↓
            │                              #10
            └→ #9 ─────────────────────────┘
                                            ├→ #11
                                            ├→ #12
                                            └→ #13(parent) → #22 → #23
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
| #8 | M1-01 父工作包 | 不直接执行；跟踪 #16–#21 |
| #16 | React/provider + Button | D03/D04 + 对应 D07(M1) |
| #17 | TextInput | #16 + Component Contract |
| #18 | Select | #16 + D04 Select feature subset |
| #19 | Dialog | #16 + accessibility subset |
| #20 | Theme | #16–#19 + D08 |
| #21 | Conformance/UI-only | #16–#20 + 测量范围 |
| #9 | Capability runtime | D06(M1) + Capability Contract |
| #10 | Binding vertical slice | #8/#9 + Binding Contract |
| #11 | Vue/alternate provider | #8 + 对照范围 |
| #12 | WebMCP adapter | #9/#10 + D09 |
| #13 | M1-06 父工作包 | 不直接执行；跟踪 #22/#23 |
| #22 | Deterministic AI tooling | #6/#10 + tooling contract |
| #23 | Real model evaluation | #22 + D10 + model/budget grant |
| #14 | Stage acceptance | #10–#13 必需交付 + 冻结验收协议 |

## 当前停止点

仅允许继续做准备期文档、JIT 契约/决策和负责人明确授权的管理动作。#4 没有 Current Grant，因此 #5–#23 中不存在可开始的实现任务。
