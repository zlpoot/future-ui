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
| `mv-view.ts` | 真实 Project AI View：dialog/button/text-input 三个 ComponentDefinition，identity 锚定 adapterId=`shadcn-react` + profileId=`mv-auto-editor` + upstreamFingerprint（canvas blob 钉住），**`source.kind='inline-source'`（locator `web/canvas.html` + 真实页内 symbols；非模块、不可 import，MCP `import=null`）**，mappingStatus=partial + 真实 limits（accessibility.role / close.visibility / focus.trap / features.loading / features.validation） |
| `mv-instances.ts` | 显式实例注册：4 张真实资产卡各一个 `assets/cards/<cardId>/edit` 实例；visibleState allowlist 仅 `open/selectedVersionId/lockedVersionId/status`；**零 capabilityBindings → 零业务工具** |
| `mv-evidence.ts` | 确定性 jsdom **rendered** 证据：镜像真实面板 DOM（#inspector/#detail/h2/simpleAssetEditor 控件），观察 close 可见性（桌面 display:none vs 嵌入 block）；pending 下仅 `observeMvAssetControls` 读取控件 disabled/present 的**渲染事实**（generate disabled、stop 单发），不作为 R1-DLG-04/05 的 interaction 证据 |
| `mv-project.ts` | 装配层：createMvProjectContext / validateMvProject / sealProjectEvidence（TrustedEvidence 宿主门）+ `assertEvidenceNotDrifted`（A Gate drift 门禁，**要求传入 Gate 自行实时取得的 current facts**） |
| `mv-upstream.ts` | **Gate 独立事实源**：frozen pinned exact 值（`PINNED_MV_HEAD=d77fc2b…`、`PINNED_MV_CANVAS_BLOB=52aa42c8…`，后者==`MV_UPSTREAM.sourceCommit`）+ `readMvCurrentUpstream()`（用真实 `git -C <MV> rev-parse HEAD` / `hash-object web/canvas.html` 读取**当前** upstream，git 无法解析返回 null→fail-closed）。Gate 不依赖 evidence 文件里的 boolean |
| `scripts/phase-a-real-evidence.mjs` | 真实页面证据：先比对 canvas blob / MV HEAD，**任一 drift（含 git 无法解析）立即 abort、不启动 Chrome、不写/不刷新任何证据**；无 drift 才 CDP 驱动 127.0.0.1:3001 真实画布，pointerdown 选中「我」资产节点，采集桌面/嵌入两个变体 |
| `tests/mv-auto-editor.test.ts` | 确定性测试（正例/负例/not-covered/drift/visible-state/scope cleanup + P2 inline-source 不生成 import + pinned blob 单一来源防分化） |
| `tests/mv-real-evidence.test.ts` | 权威验证：env `MV_REAL_EVIDENCE_DIR` 门控把真实页面证据密封送 validator；正例里 Gate 用 `readMvCurrentUpstream()` **实时读 git** 独立核验。**drift fail-closed 负例常驻运行，不依赖真 server** |

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
| R1-DLG-04 | 仅观察到 pending 时 generate 控件 disabled（rendered fact）；未驱动真实重入守卫 | **not-covered** | rendered（事实保留，但不构成 interaction tier） |
| R1-DLG-05 | 仅观察到 canceling 时 stop 控件 disabled（“停止生成单发”，另一事实）；MV 无 close-callback generation/session 语义 | **not-covered** | rendered（事实保留，但不构成 interaction tier） |
| R1-PRJ-IDENTITY | 4 卡真实 identity | pass ×4 | declared |
| R1-PRJ-CAPABILITY | 无显式 capability → 0 业务工具 | pass ×4 | declared |
| R1-PRJ-DRAFT-HIDDEN | prompt/description 草稿被 allowlist 拦截 | pass ×4 | declared |
| identity drift | adapterId/profileVersion/upstreamFingerprint 任一漂移 | fail（注册即拒） | — |
| upstream drift（采集端 abort + A Gate 独立 freshness 核验，双端 fail-closed） | canvas.html blob 或 MV HEAD 偏离 pinned（含无法解析） | 采集脚本立即 abort、不写/不刷新证据；**Gate 自己实时跑 git 取得当前 HEAD/blob，再与 frozen pin 及 evidence 的 live/pinned 逐一对齐**：stored false/false 但当前已变化（stale evidence）也必 FAIL（关键负例） | — |
| scope cleanup | unregister 后 scope 变 not-covered | pass | — |

> **首次独立 Review（PR #82）后的第二轮修正（证据真实性，不是为好看而补测）**
> - **R1-DLG-05 由误标 interaction-verified 降为 not-covered**：MV 当前架构（内联、非模块的 `web/canvas.html`）不存在冻结 R1-DLG-05 要求的“close-callback generation/session：旧异步任务 settle 后不得再次触发 close callback”语义；`#closeInspector` 的 onclick 只移除 `.open` CSS 类，与生成任务无回调关联。“停止生成单发”（`stopAssetGeneration` 在非 running 时直接返回）是**另一个真实事实**，保留为 rendered fact，但不得冒充 R1-DLG-05。
> - **R1-DLG-04 同标准降为 not-covered**：只断言 generate 按钮 `disabled`（渲染属性）并未驱动真实重入守卫；真实 start handler 触发一次生成需要 live model 调用，无法在 hermetic / 无模型约束下可靠做 interaction 验证，故降级。保留 rendered fact“pending 时 generate 控件 disabled”。
> - **upstream drift 改为双端 fail-closed**：首次实现仅 warning、drift=true 权威测试仍 PASS，与 #70“证据绑定 exact commit/upstream identity”不一致。现采集端任一 drift 立即中止且不落盘，Gate 再独立断言并补 canvas / MV HEAD 两个 drift=true 负例。
> - **P2（pilot-discovered spec gap，非豆包原实现 bug）——ai-contract-core 一次最小契约 amendment**：真实 pilot 证明 R1-03/#69 冻结的 `actualImport`（必须是可 import 的 module + named exports）无法诚实表达 MV 这种“内联、非模块 HTML 页内函数”工程，若硬填 `module:'web/canvas.html'` 只会向 AI 返回一个**实际不可 import 的伪 import**。现把组件来源改为判别联合 `source.kind = 'module-import' | 'inline-source'`：module-import 完全保留现有 shadcn 语义；inline-source 只记录真实 locator/owner/symbols/example，且 fail-closed（禁止携带 module/exports、禁空串/魔法值）。`importableModule()` 是唯一 import 派生口，inline 源返回 `null`；`project.catalog`/`describeComponent` 同时输出 `source` 与 `import`，AI 可明确区分。本轮不扩 script-tag/global/CDN/bundler-alias 类型。已补 core schema/validator 测试与“inline 不得生成 import 建议”负例。

> **第二次独立 Review 后（第三轮）——收掉残余 P1-2：Gate 真正独立、封死 stale evidence**
> - 第二轮虽让 drift=true 不再 PASS，但 Gate 只读 evidence 文件内采集时算好的 boolean；若昨天采集时无漂移、今天 MV 已变化但未重跑 collector，旧文件仍是 false/false，Gate 仍会 PASS——“stale/pre-written evidence can never be accepted”并不成立。
> - 现 `assertEvidenceNotDrifted(combined, current)` 必须接收 Gate **自行实时取得**的 `current = readMvCurrentUpstream()`（真实 `git -C <MV> rev-parse HEAD` + `git hash-object web/canvas.html`，无法解析→null→fail-closed）。Gate 依次要求：①证据有完整 drift 记录；②证据 pinned exact == 代码 frozen pin；③**当前** HEAD/blob == pinned exact（独立 freshness，与文件 boolean 无关）；④current == 证据记录的 live（同次运行绑定，防 replay）；⑤存储 boolean 非 drift。
> - 关键负例已补：**stored evidence clean(false/false) + 当前 canvas blob 已变化 → FAIL**；**stored clean + 当前 MV HEAD 已变化 → FAIL**；另有 current 无法解析、live!=current 的 pre-written 文件、pinned 不一致、boolean=true 等负例；正例在 gated 测试里真跑 git。P1-1 与 P2 本轮不再改动，core 范围未再扩展。

## 4. A Gate 结论

- **A Gate 状态：BLOCKED（保持）。** Profile → Adapter → AI View（含 inline-source 诚实表达）→ explicit Instance → bounded Validator 已真实落在 MV 资产编辑/确认场景；4 张真实卡的 R1-PRJ-IDENTITY / R1-PRJ-CAPABILITY / DRAFT-HIDDEN 与 R1-DLG-02 的真实页 rendered 结论均成立。但 **R1-DLG-04 / R1-DLG-05 为 not-covered**（MV 无冻结的 pending close-callback 语义、真实 start handler 无法在无模型 hermetic 下驱动），不满足 BOUNDED_RULES 的 interaction-verified 门槛，因此 Phase A **不算通过**，不进入 Phase B。
- **未破坏真实创作数据**：未改 lockedVersionId（仍全 null，approved/locked 语义分离）；未改 scriptVersionId/sourceBeatIds（known data debt 原样保留）；未写 MV 工作区（只读 + CDP 只读页面）；测试修复已单独留痕提交 d77fc2b；checkpoint 库有备份 `%TEMP%\wf-checkpoints-before-phaseA.sqlite`。
- **如实暴露的真实缺口**（A Gate 的负例价值）：桌面端资产编辑器无可见关闭入口（R1-DLG-02 fail）；面板非模态（无 role=dialog）；R1-DLG-04/05 在 MV 上 not-covered（“后台继续 + 停止生成单发”是不同事实，不冒充冻结语义）；focus 无陷阱/还原。这些已写入 profile 与 view limits，不假装满足冻结语义。

## 5. 后续（Phase B 等，不在本次验收内）

- TP-13/14 自动审核 + 局部返工（分镜/关键帧审核链路）
- 参考板可选裁片（Deferred）
- scriptVersionId/sourceBeatIds 迁移（先 read-only diagnosis / dry-run）
- p2-assets.test.mjs 就绪等待硬化已在本地完成（该测试文件被 .gitignore 列为私有归档依赖，改动不进入提交；验证 2/2 PASS）
