# d10-harness · calibration runner + 12 paired task fixtures（#23 / CAL-001 preparation）

**toolchain-isolation pilot**（#23 PROTOCOL AMENDMENT v1 冻结口径）：同一份声明式 `spec.json` 控件配置任务上，
「基线组 = 手工/config 编辑（无 future-ui 工具链）」vs「实验组 = 同一 baseline 工具之上额外挂载 future-ui
契约/目录/校验/patch/preview/test 确定性闭环」。**不得**把结果解释为「React/Ark UI 基线对照」（不在本
calibration 范围）。本 harness 只覆盖 **calibration preparation**（CAL-001，$50 hard cap，`gpt-6.1-sol`）；acceptance 未授权。

## 设计要点（对应负责人 Review 关注面）

### 1. 任务贴真实工具能力，不扩充 treatment
`ui.preview / ui.test` 当前只支持 **button / select**（`packages/ai-dev` frozen set）；`patch` 是 NodeStore `expectedVersion` 乐观并发 patch（声明式 JSON 节点）；`validate` 校验契约实例/文档。因此：
- 12 个任务的可测面**全部落在 button/select 的 preview/test 可测交互**（disabled/loading 激活、select value/default/options/change）；
- `cal-t1-003` 中出现 textinput：**只由统一隐藏 evaluator 判定**，实验组 `ui.test` 不假装支持 TextInput（禁止顺手扩充 treatment）；
- 全部任务为 **config 级（spec.json 声明式数据）**：TypeScript 无法提前截获，diagnostics/validate 的价值可被测到。

### 2. Task capsule 公平性（A/B 隔离）
- 每个 paired task 从同一胶囊生成 **两个 fresh workspace**（baseline / experiment），文件完全一致：README.md（公共任务文本）、spec.json（初始状态）、render.js（canonical 副本）、app.test.js（反馈脚手架）、package.json；
- **workspace 内零 future-ui 痕迹**（无包、无文档、无工具桥）——基线组无法偷读 `packages/*`、`contracts`、`tests` 等实现；
- 实验组工具桥由 **runner 侧注入**（`lib/bridge.run.ts`，真实调用 `@future-ui/ai-contract-core` + `@future-ui/ai-dev`），不进 workspace；
- **A/B 顺序由 seed 派生并真实生效**（seed 偶 → baseline 先跑；奇 → experiment 先跑），预注册口径，逐 run 记录（Review P1 修复）。

### 3. 最终判定 = 组中立 hidden evaluator
- golden 断言在 `golden/cal-*.json`，**不进 workspace**；
- `lib/evaluator.run.ts` 用 harness 自身副本 render.js 渲染最终 spec.json（workspace 内被改动的 render.js 无效），按 golden 断言（structure/state/interaction）；
- 实验组 `ui.test` 只是**开发反馈工具**，不是最终裁判；两组最终 PASS/FAIL 同一判据；
- **#23 冻结协议已同步修订**：最终判定 = 组中立 hidden evaluator（原冻结的 ui.test 判定改为开发反馈工具），且 calibration 定义重新冻结为 **toolchain-isolation pilot**（同一 spec.json 声明式任务：baseline = 手工/config 编辑，experiment = future-ui 工具辅助）——不再解释为「React/Ark UI 基线对照」；
- 反馈脚手架（`app.test.js` / runner 生成的 feedback 测试）两组相同，判定弱于 golden（模型只能靠自己的信号迭代）。

### 4. 预算 fail-closed（预调用判定）
- 中转站**不返回 cost 字段** → 成本 = usage × `config.json pricesPerMToken`；
- **单价为占位值**：中转站 billing rule 未确认，**不声称一定保守**；fail-closed 方向不变（宁停勿超），确认实际单价后更新（`config.json billingNote`）；
- **预调用硬上限（请求级上界）**：每次模型调用**前**按「请求级 prompt 上界 + 本次允许输出」计算：
  - 请求级上界 = **真实序列化 bytes**（role / message framing / JSON 转义 / 顶层包装，与 relay.chat 发送体一致；恒有 tokens ≤ bytes）+ **providerOverheadTokens 显式预留**（provider 侧 chat template / 注入 prompt 的不可见开销；超出预留即 fail-closed 拒绝）；
  - 剩余 $ 预算与剩余 150K token 都装得下才发请求；装不下即 `budget_stop/token_stop`，**不会事后超限**；
- 护栏：attempt ≤ 5 / run；aggregate tokens ≤ 150K / run（覆盖该 run 全部 attempts）；全局累计 cost ≤ $50（预调用 gating + 事后复核双保险）。

### 5. 协议（两组相同，仅工具集不同）
- 模型只编辑 `spec.json`；交付 = 输出 `## SPEC` 块（完整 JSON）；
- 实验组额外可输出 `## TOOL <json>` 调用工具桥（catalog / validate-spec / patch / preview / test）；
- 基线组的 `## TOOL` 会被**拒绝并记录**（工具不可用），防止基线假装使用 treatment；
- 每轮反馈 = runner 运行同一 vitest feedback 测试 + （实验组）工具结果；
- **resume 与容错**（Review P2）：ledger 已有的 (taskId, group) 自动跳过（`--force` 重跑）；relay 调用失败不退出，记录失败继续尝试，全部失败仍写 ledger（status=error）并跑最终判定；每条 ledger 含 modelId / endpoint / configDigest（API+单价+护栏段指纹）/ subjectSha / harnessSha / usage / cost / eval。

## 目录

```
d10-harness/
├── config.json          # API/单价/上限/预算（fail-closed 定价）
├── tasks/tasks.py       # 12 个任务 + golden 的单一事实源（生成 tasks/cal-*.json + golden/cal-*.json）
├── tasks/cal-*.json     # 任务胶囊（taskId/family/seed/taskText/initialSpec/feedbackBody）
├── golden/cal-*.json    # 隐藏 golden 断言（不进 workspace）
├── lib/render.js        # canonical 参考渲染（starter 与 evaluator 共用）
├── lib/bridge.run.ts    # 实验组工具桥（真实 future-ui 工具，vitest jsdom）
├── lib/evaluator.run.ts # 组中立隐藏判定（vitest jsdom）
├── lib/capsule.py       # 胶囊 → 两个 fresh workspace
├── lib/relay.py         # OpenAI-compatible 调用 + usage 记账 + cost 计算
├── lib/agent_loop.py    # attempt 循环 / ## SPEC / ## TOOL / 反馈 / 护栏
├── lib/ledger.py        # result ledger（JSONL）
├── lib/dry_model.py     # 干跑 fake model + 12 个任务参考修复（可审阅）
├── run_calibration.py   # 入口（--all / --tasks / --groups / --dry）
└── check_harness.py     # 干跑自检（无真实调用）
```

## 使用

```text
# 干跑自检（无模型调用）
python check_harness.py

# 真实 calibration（gpt-6.1-sol，OpenAI-compatible 中转站，.env 配置；$50 fail-closed）
python run_calibration.py --all

# 局部
python run_calibration.py --tasks cal-t1-001,cal-t4-002 --groups both
```

- subject_sha / harness_sha 按当前 checkout 的 HEAD 逐 run 记录（同一仓库；契约语义变更 = 需重新冻结，见 #23 冻结门）。
- result ledger：`runs/ledger.jsonl`（runs/ 已 gitignore）。
- 工具调用 transport：本版使用「输出完整文件 + runner 执行」协议（无 function-calling transport 依赖）；若后续需要模型直接驱动文件/shell，将单独做 tool-call transport 连通性探测（计入 preparation/connectivity probe，不计 24 runs）。

## 已知留待负责人确认

1. **中转站 token 单价**：`config.json pricesPerMToken` 为**占位单价**（$5/$15/$2.5 per M；billing rule 未确认，不声称一定保守）。确认实际单价后更新；fail-closed 方向不变。
2. **任务文本/语义措辞**：12 个任务公共措辞（tasks.py `taskText`）与 golden 断言请重点 Review 泄题/偏置。
3. **runner A/B 隔离**：capsule/workspace/顺序请重点 Review（见 §2）。
4. **#23 冻结协议修订**：最终判定 = hidden evaluator、calibration = toolchain-isolation pilot（已在 #23 正文同步，见 PR Review 记录）。
