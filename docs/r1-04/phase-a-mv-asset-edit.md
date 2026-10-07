# R1-04 (#70) Phase A — MV-Auto-Editor Asset Edit & Approval（future-ui 落地证据）

- 日期：2026-10-07
- 分支：`future-ui@feat/r1-04-phase-a-mv-asset-edit`（基于 origin/main `4068e90`）；`MV-Auto-Editor@phase-a`（`d77fc2b`，含 v2-image-reference 就绪等待留痕）
- 范围：Phase A 收窄为 future-ui 落地；**不改 MV-Auto-Editor 产品行为、不破坏真实创作数据**
- 验收（A Gate）：证明 future-ui 的 Profile → Adapter → AI View → explicit Instance → bounded Validator 真正落在 MV 资产编辑/确认场景，且不为验收破坏真实数据

## 1. 真实对象（项目 song-20260928043747《耳机分你一半》）

| 资产卡 | 类型 | 当前主版本 | 状态 | lockedVersionId |
| --- | --- | --- | --- | --- |
| 我 | character | v3 | approved | null |
| 你 | character | v4 | approved | null |
| 傍晚沿江步道 | scene | v3 | approved | null |
| 有线耳机 | prop | v3 | approved | null |

- 工作流 currentStage：keyframe review（28 条提示词已备，等待候选审核）
- 已批准剧本：`script-1aadbb78-1`（beat-v3-01..）
- 已知数据债（Phase A 不自动修复）：卡片 scriptVersionId 指向旧剧本 `script-5e51a1ec-4`（Phase B 前先 read-only diagnosis / dry-run mapping）
- 真实页面证据锚点：`web/canvas.html` blob `52aa42c8…` @ MV HEAD `d77fc2b…`（采集时无漂移）

## 2. 接入代码（packages/ai-dev/src/project/mv-auto-editor/）

| 文件 | 职责 |
| --- | --- |
| `mv-profile.ts` | MV 真实 D16 Project Profile（profileId `mv-auto-editor` v1.0.0；token/半径/间距/400px inspector 均来自 canvas.html 真实 CSS；dialogConventions 按真实语义声明：pendingBlocksResubmit=true、pendingCloseIsConfirmedNeverSilent=false、focusEnterAndRestore=false、draftFieldsAgentVisibleByDefault=false、blocking 声明） |
| `mv-view.ts` | 真实 Project AI View：dialog/button/text-input 三个 ComponentDefinition，identity 锚定 adapterId=`shadcn-react` + profileId=`mv-auto-editor` + upstreamFingerprint（canvas blob 钉住），mappingStatus=partial + 真实 limits（accessibility.role / close.visibility / focus.trap / features.loading / features.validation） |
| `mv-instances.ts` | 显式实例注册：4 张真实资产卡各一个 `assets/cards/<cardId>/edit` 实例；visibleState allowlist 仅 `open/selectedVersionId/lockedVersionId/status`；**零 capabilityBindings → 零业务工具** |
| `mv-evidence.ts` | 确定性 jsdom 证据：镜像真实面板 DOM（#inspector/#detail/h2/simpleAssetEditor 控件），观察 close 可见性（桌面 display:none vs 嵌入 block）、pending 交互（重复提交被禁、stop 单发） |
| `mv-project.ts` | 装配层：createMvProjectContext / validateMvProject / sealProjectEvidence（TrustedEvidence 宿主门） |
| `scripts/phase-a-real-evidence.mjs` | 真实页面证据：CDP 驱动 127.0.0.1:3001 真实画布，pointerdown 选中「我」资产节点，采集桌面/嵌入两个变体 + blob 漂移检测 |
| `tests/mv-auto-editor.test.ts` | 12 项确定性测试（正例/负例/not-covered/drift/visible-state/scope cleanup） |
| `tests/mv-real-evidence.test.ts` | 权威验证：env `MV_REAL_EVIDENCE_DIR` 门控，把真实页面证据密封后送 validator，输出 A-Gate 报告 |

## 3. 分层证据（declared → rendered → interaction-verified → not-covered）

真实页面采集（`docs/r1-04/evidence/mv-real-{desktop,embedded}.json`，截图见 `mv-real-{desktop,embedded}.png`）：

- **桌面布局（1440×900）**：选中「我」后 `#closeInspector` 存在但 `getComputedStyle().display = none` → `closeAffordances: []` → **R1-DLG-02 fail（rendered）** —— 这是真实缺口：资产编辑器的显式关闭入口在桌面端被 CSS 隐藏，仅在窄屏/嵌入布局可见。Phase A 不改产品代码，如实记录。
- **嵌入布局（?embedded=1）**：`display = block` → `closeAffordances: ['/inspector/button[#closeInspector]']` → **R1-DLG-02 pass（rendered）**。
- 真实控件（采集到）：上传参考图 / AI 重新生成 / 补充角度 / 已确认（v3 已通过，disabled）/ 选用 ×2；版本行 `v3 · 已通过·当前使用·已确认`、`v2 · 已生成·历史候选`、`v1 · 已生成·历史候选`。
- 面板角色：`role` 为空 → MV 资产编辑器不是模态对话框（limits.accessibility.role 的实锤）。

jsdom 确定性证据（`mv-auto-editor.test.ts`）：

| 规则 | 场景 | 结果 | tier |
| --- | --- | --- | --- |
| R1-DLG-02 | 嵌入 fixture（close 可见） | pass | rendered |
| R1-DLG-02 | 桌面 fixture（close display:none） | fail（真实缺口） | rendered |
| R1-DLG-02 | 移除 close 控件 | fail（ruleId+instanceId+path+reason+repairHint） | rendered |
| R1-DLG-02 | 声明 blocking 但仍渲染普通关闭入口 | fail（wrong blocking） | rendered |
| R1-DLG-02 | blocking 仅声明无渲染证据 | not-covered | declared |
| R1-DLG-04 | pending 下重复提交被禁用 | pass | interaction-verified |
| R1-DLG-05 | stop 单发（canceling 后禁用） | pass | interaction-verified |
| R1-PRJ-IDENTITY | 4 卡真实 identity | pass ×4 | declared |
| R1-PRJ-CAPABILITY | 无显式 capability → 0 业务工具 | pass ×4 | declared |
| R1-PRJ-DRAFT-HIDDEN | prompt/description 草稿被 allowlist 拦截 | pass ×4 | declared |
| identity drift | adapterId/profileVersion/upstreamFingerprint 任一漂移 | fail（注册即拒） | — |
| scope cleanup | unregister 后 scope 变 not-covered | pass | — |

## 4. A Gate 结论

- Profile → Adapter → AI View → Instance → Validator 已真实落在 MV 资产编辑/确认场景：4 张真实卡实例 + 真实页面证据 + jsdom 交互证据全部通过 bounded validator（`coverage: covered`，`diagnostics: []`）。
- **未破坏真实创作数据**：未改 lockedVersionId（仍全 null，approved/locked 语义分离）；未改 scriptVersionId/sourceBeatIds（known data debt 原样保留）；未写 MV 工作区（只读 + CDP 只读页面）；测试修复已单独留痕提交 d77fc2b；checkpoint 库有备份 `%TEMP%\wf-checkpoints-before-phaseA.sqlite`。
- **如实暴露的真实缺口**（A Gate 的负例价值）：桌面端资产编辑器无可见关闭入口（R1-DLG-02 fail）；面板非模态（无 role=dialog）；pending 关闭不确认（R1-DLG-05 语义在 MV 上以“后台继续 + 停止生成”实现）；focus 无陷阱/还原。这些已写入 profile 与 view limits，不假装满足冻结语义。

## 5. 后续（Phase B 等，不在本次验收内）

- TP-13/14 自动审核 + 局部返工（分镜/关键帧审核链路）
- 参考板可选裁片（Deferred）
- scriptVersionId/sourceBeatIds 迁移（先 read-only diagnosis / dry-run）
- p2-assets.test.mjs 就绪等待硬化已在本地完成（该测试文件被 .gitignore 列为私有归档依赖，改动不进入提交；验证 2/2 PASS）
