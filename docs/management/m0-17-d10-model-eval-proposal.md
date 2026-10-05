# D10 — AI 开发对照评估方案与模型预算建议（#23 · M1-06B）

状态：**Proposal（待负责人批准；Rev.3 已按 same-head Re-Review 修改）**。批准前不启动 #23、不调用任何付费/真实模型。
目标消费者：#23「AI 开发对照评估与效果证据（真实模型）」；Parent #13。
对齐：`docs/benchmarks/strategy.md`（V10 验收矩阵、三层正确性、calibration/acceptance 分离）；D10（decision-register，当前「数值 TBD」）；#22/#25/#10（确定性工具链与共享业务动作前提，均已 accepted）。
基线：main @ `aa48862`（2026-10-05）。

## 1. 背景与定位

#23 是 #13（AI-first 开发闭环）下的真实模型评估子项：以**冻结的任务集和预算**对比两组——基线组「React + Ark UI（对应 primitive 存在时）+ native/platform primitives + 官方资料/工具」vs 实验组「同一基础栈 + future-ui 契约/目录/校验/patch/preview/test 确定性闭环」——在代表性前端开发任务上的开发效果。目的不是证明「AI 更强」，而是对 future-ui 工具链的**边际收益做可复现测量**。

前提：实验组可用 `catalog → validate → patch → preview → test`（#22/#25 已合并），共享业务动作族用 #10 的 cart 纵向示例。

## 2. 对照设计（公平性控制）

**基线组定义（Rev.1 修正）**：Ark UI 并不覆盖全部 primitive（如 Button 实际落到平台原生能力），因此基线组 = **React + Ark UI（有对应 primitive 时）+ native/platform primitives + 冻结的官方资料/工具清单**；唯一禁用项是 future-ui 工具链。基线组反映真实可用的标准开发面，不人为缩小。

**基线工具清单（Rev.3 冻结，先于 calibration 写死）**——「该环境可用的官方资料/工具」范围收窄为以下明确项，两组获得**完全相同**的基线工具：
- 官方文档（冻结版本快照）：React 19 官方文档、Ark UI 官方文档/API reference（对应冻结版本）、MDN Web Docs（HTML/ARIA）、TypeScript 官方文档（冻结版本）；
- 本地工具（仓库已冻结工具链）：Node 24.21.0 / pnpm 11.28.4 / TS 6.0.3 / ESLint 10.12.0 / Vitest 5.0.3 的 lint/typecheck/test/build，以及本地调试器/浏览器 devtools；
- **不包含**：future-ui 包与文档、任何额外付费工具/服务。

**工具差异规则（Rev.3）**：实验组 = **同一基线工具清单** + 额外注入 future-ui 工具链（catalog/validate/patch/preview/test）。两组工具集差异**仅** future-ui 一项；禁止以「工具访问差异」解释任何效果差异（否则 calibration 混入工具访问混杂）。

| 维度 | 冻结规则 |
| --- | --- |
| 模型/版本与采样（Rev.3 修正） | 同一 **exact model ID + 同一 effort/thinking 配置 + 同一 max-output/tool policy + provider-default sampling**；`claude-sonnet-5` 不接受非默认 temperature/top_p/top_k，adaptive thinking 默认开启，故不写「同 temperature/采样参数」 |
| 推理预算 | 两组相同的每任务 attempt 上限（默认 5）与 **aggregate token 上限（默认 150K tokens / task-run，覆盖该 run 内全部 attempts，不是每 attempt 150K）** |
| 初始上下文 | 两组相同的任务说明模板；**任务说明不得提示实验组独占工具**（见 T4）；实验组工具清单在实验配置中单独注入 |
| 环境 | 同仓库基线（main @ `aa48862`）、同 Node/pnpm 冻结版本、同浏览器/文档快照；**每个 run 使用 fresh workspace** |
| 任务说明与允许工具 | 逐任务冻结；两组措辞一致，仅工具集不同（实验组 = 基线工具 + future-ui，见上清单） |
| 顺序/泄露 | **配对设计：两组使用同一 task（同 ID/seed）**；随机化 A/B 顺序；同一任务不跨组泄露答案 |
| 数据分离 | **calibration 与 acceptance 使用互不重叠的 task IDs/seeds** |

## 3. 任务集（首批冻结 4 个代表族）

| 族 | 任务样例 | 主要验证通道 | 依赖 |
| --- | --- | --- | --- |
| T1 创建合法表单 | 用 Button/Select/TextInput 搭表单并满足契约与交互语义 | schema 校验 + `ui.test` 结构/交互 | #6/#22/#25 |
| T2 修复无效组合 | 给出含非法 props/结构的代码，修复至契约合法且交互通过 | validate 诊断 + `ui.test` | #6/#22/#25 |
| T3 局部修改不伤及他处 | 修改指定区域（如 Select 状态/TextInput 受控），其他区域行为不变 | conformance 共享断言 + 回归 | #16–#21/#26 |
| T4 发现并修复交互问题 | 任务说明统一为「**定位并修复这个交互 bug**」（行为描述，不含工具提示）；实验组额外拥有 `ui.preview`/`ui.test` | `ui.preview` + `ui.test` | #25 |

**泄题控制（Rev.2 修正）**：T4 任务措辞与基线组一致，只描述 bug 行为；`ui.preview`/`ui.test` 只在实验组的允许工具清单中声明，任务说明里不出现工具名或「用 preview/test」等提示。基线组用其冻结的标准开发工具定位修复。

可选扩展族（批准后追加）：T5 接入共享业务动作（cart，#10）；T6 更换主题（#20）；T7 异步错误处理；T8 可访问性修复。首批不含 T5–T8，避免预算与变量膨胀。

**成功判据（冻结于 acceptance 前）**：实验组不得只以 schema-valid 为成功；适用任务必须通过冻结的确定性 `ui.test` 交互断言。两组同判据。

## 4. 模型与 exact ID（Rev.2 修正：不写「批准时最新」）

| 角色 | 模型（exact ID） | 定价/说明 |
| --- | --- | --- |
| **Primary（CAL-001 与 acceptance 默认）** | `claude-sonnet-5` | 当前 active Sonnet（Anthropic 官方文档）；$2/M input、$10/M output（2026-10 官方定价） |
| 对照参考（扩展档另议） | Gemini 3 系列（exact ID 批准时定） | Google 当前推荐新项目使用 Gemini 3 系列，不再推荐 Gemini 2.5 Pro |
| 对照参考（扩展档另议） | GPT-6 系列（exact ID 批准时定；GPT-6.1 Sol 发布于 2026-09-29） | OpenAI 当前系列 |

**版本冻结规则（Rev.2 新增）**：
- 正式 acceptance 必须固定 **exact provider/model ID**（含版本快照），禁止「批准时最新模型」表述；
- 实验运行期间模型 alias 升级**不切换**，保持冻结 ID，避免对照漂移；
- 同一实验只用**一个模型**跑两组；多模型仅在扩展档并分开展示。

**采样与推理配置（Rev.3 修正）**：两组冻结为「同 exact model ID + 同 effort/thinking 配置 + 同 max-output/tool policy + provider-default sampling」；`claude-sonnet-5` 不接受非默认 temperature/top_p/top_k（adaptive thinking 默认开启），控制参数按 Anthropic 官方文档（models/migrating-to-claude-4）约束写法，不写「同 temperature/采样参数」。

## 5. Calibration 与 Acceptance 分离（硬规则）

1. **Calibration（pilot）**：每族 3 个样本 × 2 组（共约 24 runs，独立 task IDs），仅用于：验证任务说明可执行、测量任务难度与通过率基线、校准 attempt/token 上限与 **p95 cost/run**。
2. calibration 数据**不计入**正式 acceptance；不得用已看过的结果回填门槛。
3. calibration 结束后**冻结**：测量方法、任务集/样本量、阈值（threshold-setting rule）、停止条件、报告格式、**primary endpoint**（写入 #23 冻结协议段落）。
4. **Acceptance**：使用与 calibration **互不重叠**的 task IDs/seeds；每族 8–10 个独立样本 × 2 组（首波共约 64–80 runs），按冻结协议执行；修改关键方法/阈值须重新说明并重启受影响 acceptance。

## 6. 样本量与统计口径

- 首波 acceptance 样本量：4 族 × 8 任务 × 2 组 = **64 runs**（paired，同任务两组各跑一次）；扩展档 4 族 × 10 任务 × 2 组。
- **Primary endpoint（acceptance 前冻结，建议）**：最终交互正确率（确定性 `ui.test` 通过率）作为主终点；首轮通过率、完成率、平均修复轮数、回归率、token/成本/时延、失败类别为次要指标。
- **Threshold-setting rule（Rev.3：预注册算法，写死在 calibration 结果出来之前）**：
  1. **统计量**：primary endpoint 的每任务二元 pass/fail（实验组以冻结 `ui.test` 为准，基线组以同判据的等价检查为准）；aggregate = 4 族合并的 pass rate 差值 Δ = p_exp − p_base。
  2. **判定算法（先写死，后看数据）**：用 Fisher exact / Clopper-Pearson 双侧 95% CI；**acceptance 成功判据 = Δ > 0 且 p_exp 的 95% exact CI 下界 > p_base**（即实验组显著优于基线组，α=0.05）。同时报告 Δ 与 95% CI 作为效果量。
  3. **拒绝重调**：无论结果正负，实验均视为完成；**若 Δ 无显著差异，结论即为「future-ui 未带来显著提升」，实验仍然完成并如实报告**；不得为追求正结果调整阈值、补跑样本或事后修改判定算法（任何修改 = 新授权 + 重启 acceptance）。
  4. **成本阈值**：acceptance 预算 = calibration 实测 p95 cost/run × 计划 runs × 1.2 安全系数（见 §7.2），同样先写死。
- 分层报告（按族/按组），保留所有尝试与失败样本；结果只在冻结任务集与样本量范围内解释。

## 7. 预算：先 Calibration，后定 Acceptance（Rev.2 修正）

**不再预先批准 $500 档。** 预算分两步：

### 7.1 CAL-001 — Calibration 授权（拟，待负责人批准）
- 模型：`claude-sonnet-5`（exact ID）
- 预算：**$50 hard cap**
- 范围：#23 calibration only（24 runs）
- 禁止：browser / web search 等额外付费工具（仅模型 API + 本地工具链）
- 目标产物：p95 cost/run、任务难度基线、attempt/token 上限校准、threshold-setting 依据

### 7.2 Acceptance 预算（calibration 后冻结）
- 按 CAL-001 实测的 **p95 cost/run** × 计划 acceptance runs（64–80）× 安全系数，在 calibration 报告后向负责人申请并冻结；
- 参考：若 150K tokens 确为每 run aggregate 上限，按 Sonnet 5 定价（$2/M in、$10/M out）纯 token 成本远低于原 `$250–450` 预估，具体数值以实测为准；
- 预算规则：单日封顶（建议 $150，calibration 阶段按 $50 总封顶执行）、重试计入预算、用尽即停；追加需重新授权。

## 8. 停止条件

- 单任务：5 次 attempt 上限或 150K aggregate tokens 上限（先到为准）。
- 全局：预算封顶 / 单日封顶 / 连续 3 任务同失败类别无进展 / 环境不可复现。
- 结果无法在同一 main SHA 上复现 → 停止并升级，不回填。

## 9. 记录与报告

- 每次 run 记录：task ID（paired）、组别、模型 exact ID/版本、attempt 次数、工具调用轨迹、`ui.test` 结果、token/成本/时延、最终判定与失败类别；**记录 task ID/seed 用于校准-验收分离核验**。
- 原始产物（含失败样本）提交至 `docs/management/m0-18-d10-results/`（或批准时约定路径），exact main SHA 可追踪。
- 结论分级：E1 确定性 jsdom / E2 真实浏览器 / E3 真实模型，分开记账，不互相替代。

## 10. 授权边界（本文件不构成授权）

- 本提案**不授予**模型调用、预算或凭据；批准 = 负责人在 #4 Current Grant 明确记录（如 CAL-001）后，才可启动 calibration。
- 未获批准前：不调用付费/真实模型，不用 mock 模型冒充效果实验，不修改 #23 Status 离开 Blocked。
- 批准后第一动作：更新 #23（冻结协议段落：exact model ID、task IDs/seeds、primary endpoint、threshold-setting rule、预算）并执行 calibration。

## 附：修改记录（2026-10-05 Review 回应）

### Rev.1 → Rev.2
1. 基线组定义修正：Ark UI + native/platform primitives + 官方资料，仅禁 future-ui（§2）。
2. T4 泄题控制：任务措辞统一「定位并修复这个交互 bug」，工具仅列实验组清单（§3）。
3. 模型名单更新：Primary = `claude-sonnet-5`（$2/$10 per M）；Gemini 3 / GPT-6 系列仅对照参考；删除「批准时最新模型」（§4）。
4. 预算分两步：CAL-001 = $50 hard cap 先行；acceptance 预算 calibration 后按 p95 冻结；150K 明确为 task-run aggregate cap（§7、§2）。
5. 统计设计补层：非重叠 task IDs/seeds、paired 同任务、fresh workspace、A/B 随机化、primary endpoint + threshold-setting rule 先冻结（§2、§5、§6）。

### Rev.2 → Rev.3（same-head Re-Review 3 项）
1. **基线工具清单冻结**：「该环境可用的官方资料/工具」收窄为明确清单（React/Ark UI/MDN/TS 官方文档冻结快照 + 仓库已冻结工具链）；实验组 = 同一基线工具 + future-ui，差异仅此一项（§2）。
2. **Sonnet 5 控制参数修正**：改为「同 exact model ID + 同 effort/thinking 配置 + 同 max-output/tool policy + provider-default sampling」；不写「同 temperature/采样参数」（Sonnet 5 不接受非默认温度参数，adaptive thinking 默认开启）（§2、§4）。
3. **threshold-setting 算法化**：定义 calibration 统计量 → acceptance 阈值的预注册公式（Fisher exact / Clopper-Pearson 95% CI，Δ > 0 且 p_exp 下界 > p_base 为成功判据）；明确 null result（「future-ui 未提升」）仍是完成实验，禁止为求正结果调阈值（§6）。
