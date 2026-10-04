# M0-04 AI Contract Core 决策冻结提案（D14 / M1-06A1）

日期：2026-10-04  
状态：**Proposed for #22**。本文件冻结 #22（AI Contract Core，确定性）所需的 machine-readable catalog、validate/diagnostics 消费、stable node+version 与 patch primitive 最小语义。冻结后 #22 才可能通过 DoR 进入 Ready。合并须经负责人接受（Contract gate，merge=human）。

## 目标

把 AI 开发能力前移为 Contract/Schema 的第一等消费者：实现不依赖真实模型的 AI Contract Core（版本化机器目录、结构化 validate/diagnostics、稳定节点与版本前置的局部 patch primitives、开发期权限隔离）。候选方向 `catalog.get` / `ui.validate` / `ui.patch`，正式接口由 #2/#3 JIT 冻结；本文件只冻结 #22 消费 #6 契约所需的最小语义。不依赖 #10，不需要模型预算，不调用模型。

## D14 (M1-06A1) · AI Contract Core 最小语义（冻结）

### 候选与取舍

| 候选 | 方向 | 取舍 |
| --- | --- | --- |
| A. catalog 由 #6 Schema 单一权威生成 | Schema → catalog，机器目录是 #6 权威契约的可计算视图 | **冻结采用**。与 D02 生成方向一致，与 #2 公共接受条件"不维护第二套 schema"对齐；可验证条目与 Schema 一一对应 |
| B. 手工维护 catalog 平行事实源 | 单独写 catalog 定义文件 | 与 #22 验收 1、#6"单一权威定义生成机器目录"冲突；AI tooling 越晚暴露 Schema 缺口越难修，拒绝 |
| C. patch 用任意 JS/eval 表达 | patch payload 是可执行代码 | 与 #22 禁止项（不建立通用任意代码执行协议）冲突；patch 只描述受控声明范围，拒绝 |
| D. patch 无版本前置盲目覆盖 | 按节点 ID 直接写 | stale 写入破坏乐观并发与可对账性；拒绝，采用 expected version 前置 |
| E. validate 复用 #6 诊断体系 | 直接调用 #6 M0 错误码与诊断结构 | **冻结采用**。不新建第二套错误码；AI 消费者与 runtime 消费者共享同一诊断语义 |

### 冻结规则

1. **catalog 单一权威来源与生成方向**：机器目录直接由 #6 已冻结的 Component/Capability/Binding/Plugin/Version Schema 生成，不维护手工平行事实源。生成方向与 D02 一致：Schema → catalog（含 validators 与诊断）。可验证：catalog 条目与对应 Schema 定义一一对应，无手工复制字段。
2. **catalog 查询语义**：catalog 支持按「契约版本 + 安装版本」查询组件/能力/插件定义、必需字段与 parts、约束（required/enum/pattern 等）与示例元数据（description/examples）。查询失败返回 #6 M0 错误码（如 `node_not_found` / `unknown_major_version` / `constraint_violation`）与 `code/path/expected/actual/explanation` 诊断结构，不静默返回空或降级。
3. **validate/diagnostics 消费**：#22 的 validate/diagnostics 直接消费 #6 冻结的校验能力与 M0 错误码（12 个）及诊断结构（`code/path/expected/actual/explanation` + 适用 `repairHint`）。#22 不新建第二套错误码或诊断结构；Schema-valid 不代表授权或执行成功（#6 已冻结语义在此延续）。
4. **stable node ID + expected version**：patch 目标使用稳定节点 ID（由 catalog 权威标识），并携带 `expectedVersion`（乐观并发前置）。stale patch（实际版本 ≠ expectedVersion）明确拒绝并返回结构化诊断（`conflict`），不盲目覆盖。可验证：stale patch 后目标内容未变。
5. **patch 受控范围与表达**：patch 仅描述/修改受控目标范围（受 catalog 与 Schema 约束的声明数据，如 component parts / props 的局部更新），禁止把任意 JS/eval 作为声明数据；patch 不是通用代码执行协议。
6. **开发期权限隔离**：AI 开发能力（catalog/validate/patch）运行在源码修改/构建宿主边界，与生产 runtime 隔离；不发布开发服务器；不调用模型。全部 #22 验收使用确定性 fixture。
7. **Contract 缺口回填**：AI tooling 若暴露 #6 Contract 缺口（字段不可达、约束不可表达、诊断不可用），必须反馈回 #2/#6 审阅并冻结修订组件/能力/Binding 契约；不得为工具方便复制第二套 Schema（与 #2 公共接受条件一致）。

### 反例（应被拒绝并给出结构化诊断）

- 手工维护 catalog 定义文件，与 #6 Schema 平行 → 违反规则 1（单一事实源）。
- catalog 返回与 Schema 不一致的必需字段/parts → 违反规则 1/2（权威一致性）。
- validate 使用非 #6 错误码或诊断结构 → 违反规则 3（共享诊断语义）。
- patch 不带 `expectedVersion` 直接覆盖目标 → 违反规则 4（版本前置）。
- stale patch 被接受并覆盖新内容 → 违反规则 4（`conflict` 拒绝）。
- patch payload 含任意 JS 表达式/eval → 违反规则 5（受控范围）。
- 开发宿主直接写入生产 runtime / 发布 dev server → 违反规则 6（隔离）。
- AI tooling 因工具方便复制第二套 Schema → 违反规则 7 与 #2 公共接受条件。

## #2 最小契约（M0 冻结范围）

本文件冻结 #2 对 #22 的最小契约：上述 catalog 权威来源、查询语义、validate/diagnostics 消费、stable node+version、patch 受控范围与开发期隔离规则，叠加 #6 已冻结的 Component/Capability/Binding/Plugin Schema、版本规则与 M0 诊断。正式 `catalog.get` / `ui.validate` / `ui.patch` 的 API 形态在 #22 实现时按本文件语义落定；#25 preview/test 开发宿主与 fixture 边界（M1-06A2）、#23 真实模型对照（D10）保持 Deferred。

## 验收对照（#22）

- [x] 机器目录直接由 #6 权威 Contract/Schema 生成，不维护手工平行事实源（规则 1）。
- [x] catalog 能按安装/契约版本查询组件/能力定义、必需字段/parts、约束和示例元数据（规则 2）。
- [x] validate/diagnostics 返回稳定 code/path/reason 与适用的 expected/actual/repair hint（规则 3，#6 已冻结）。
- [x] patch primitives 使用稳定节点 ID + expected version；stale patch 明确拒绝，不盲目覆盖（规则 4）。
- [x] patch 仅描述/修改受控目标范围，不把任意 JS/eval 作为声明数据（规则 5）。
- [x] AI 开发能力暴露的 Contract 缺口反馈回 #2/#6 审阅并冻结，不得复制第二套 Schema（规则 7）。
- [x] 源码修改/构建宿主边界与生产 runtime 隔离（规则 6）。
- [x] 全部验收使用确定性 fixture，不调用模型；一个独立 PR 可完成（规则 6 + 边界）。

## 官方/上游依据

查阅日期：2026-10-04。
- #6 契约 Schema 冻结：#6 已接受（`docs/management/m0-02-contract-freeze-proposal.md`，main @ `73cd599`）。
- M0 错误码（12 个）与诊断结构：`packages/contracts`（main @ `73cd599`）。
- JSON Schema Draft 2020-12：https://json-schema.org/draft/2020-12/release-notes
- SemVer：https://semver.org/

## 待冻结/保持 Deferred

- #25 Preview/Test 的 deterministic 开发宿主、fixture、测试证据与生产隔离边界（M1-06A2）：#22 与代表 UI 消费者具备后冻结。
- #23 真实模型公平对照（D10 + 模型/预算 grant）：预算授权门，不在本文件范围。
- #10 Binding 完整执行语义（D06(M1)）：#22 不依赖，Deferred。

## 修订记录

- 2026-10-04：初始提案，冻结 D14 (M1-06A1) AI Contract Core 最小语义。
