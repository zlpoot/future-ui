# R2-A3 · #100 素材编辑业务 Action：UI 与 Agent 双入口及权威状态回读

**状态：** 实现 + 独立预审（#100 评论 6092780984）P1 修复轮已完成，停在
`AWAITING_INDEPENDENT_REVIEW`（中文 Draft PR，`Refs #100`）
**授权：** #4 Current Grant R2-A3-001（ACTIVE，2026-10-10）；#100 交接
**执行者：** 豆包（负责人本会话指定接替 Windows Codex Worker；Role Binding 未扩权）
**基线（main）：** `2b1e7f56eac76feefd985a72b9acb4b84ee9052b`（= PR #99 squash merge；开工前已 fetch 核验）
**分支/worktree：** `feat/r2-a3-100-business-action` @ `E:\projects\future-ui-r2a3`
**HEAD（本 PR）：** 见 PR 头（提交时冻结 exact HEAD）

---

## 0. P1 修复轮（预审 6092780984 → 本 PR）

独立预审确认方向正确，给出 **P1×1（幂等键错误重用）+ 浏览器复核缺口×1**，本轮在同一分支最小修复：

### P1-1：幂等键错误重用会误报业务写入成功 → 已修
- **根因**：`opLog` 只以 `idempotencyKey` 命中，不核对原素材、请求字段/值或调用者；同键不同操作
  直接回 `completed` 且使用**本次请求**的 `materialId` 与**当前** `version`；含重放的全部完成结果
  统一 `writeCount:1`。
- **最小修复**（仅 example 范围）：
  - `material-store.ts`：幂等记录绑定 `materialId` + 请求字段/值快照（`sameRequestValues` 判定），
    并记录**历史版本**与**历史结果值**；同键且请求一致 → 重放历史结果与**历史版本**，
    `idempotentReplay=true`；同键但请求不同（不同素材 / 同素材不同值）→
    `idempotency-conflict`、**0 write**；
  - `material-bridge.ts`：幂等键按 **caller 作用域**隔离（`${caller}|${key}`），不同调用者同键互不干扰；
    完成结果区分 `writeCount`：重放为 **0**，真实写入为 **1**（类型 `MaterialInvokeResult.writeCount: 0|1`）；
  - 新增「同键不同素材/值 → idempotency-conflict 且 0 write」「同键完全相同 → 重放、
    本次 writeCount=0、返回历史版本」「同键按 caller 作用域隔离」定向测试。
- **非阻塞提醒（已顺手纳入）**：`openVersionRef` 冻结导致 `stale-version` 后原 Dialog 内再次保存
  持续失败——`handleSave` 失败消息对 `stale-version` 追加「（请关闭并重新打开以读取最新版本）」提示；
  不搭建冲突合并 UI。

### P1-2：弹窗期间真实主题切换与 #98 验收路径一致性 → 已补真实 Chrome 复核
- 预审指出 rc100 文档此前称「JS 触发按钮完成主题切换」，与 #98 已验收的
  `pointer-events:auto` + **真实指针点击**路径（PR #99 review 5470954677）矛盾；本轮未改
  `styles.css` 该规则。
- **真实 Chrome 复核（loopback 127.0.0.1:5175，CDP 鼠标/键盘，非 force、非 JS dispatch）**：
  | 状态 | 输入路径 | 结果 |
  | --- | --- | --- |
  | Dialog 打开 + 草稿未保存 | 真实指针点击浮层（`elementFromPoint` 预检命中「切换到深色」按钮） | `dark` 生效；Dialog 不关闭；草稿保持；事件日志零新增 |
  | 保存 pending（1.2s 异步中） | 真实指针点击浮层 | 主题切换（dark→light）；busy/disabled 保持；`reason=save` 恰好一次（version 1→2）；Dialog 保存完成后正常关闭 |
  | 键盘 T / Tab 陷阱 | —（环境限制，见 §6） | 无法在本环境真实回放，如实记录 NOT-TESTED；组件键盘路径（输入守卫 + 按键 T）代码未改动，jsdom 逻辑层测试通过 |
- **结论**：#98 P1-2 修复（`pointer-events:auto`）在本轮**未回归**，真实指针点击浮层路径成立；
  证据截图 `rc100-interaction-check-final.png` + 事件日志文本留档；**0 console error/warning**。

---

## 1. 交付摘要

继续复用**同一个** `examples/material-editor/` 页面、`MaterialEditorPage`、`MATERIAL_FIELDS`、
`MATERIAL_SAVE_ACTION.ref='material/edit#save'`、EditDialog/Theme 与 A1 Agent 显式只读实例注册。
把原 `handleSave` 的“只改 React 本地 materials”收敛为**应用提供的唯一业务 handler + 权威内存
素材状态**（本地虚拟素材，非外部服务）：

1. **人类 UI 入口**：原 EditDialog → 修改 → 保存 → 同一业务 handler → 权威 store 更新 → UI 呈现新值；
2. **Agent 程序化入口**：dev-only 受控代码直接调用显式注册的 `material/edit#save`
   （非脚本点击 DOM、非 UI “Agent 按钮”）→ **同一 handler** → 同一权威 store → 已挂载 UI 实时可见变化；
3. **回读**：UI 保存后，Agent 通过应用显式提供的获准 committed-state 只读 API 看到
   `displayName` / `description` 已保存值；Agent 提交后页面直接呈现权威结果。**不把 EditDialog
   draft 当 authoritative state。**

## 2. 核心改动（均在 `examples/material-editor/`，公共契约零改动）

| 文件 | 改动 |
| --- | --- |
| `src/material-store.ts`（新增） | 权威内存 store：`rows` + `version` + `subscribe`（引用不可变，供 `useSyncExternalStore`）；commit 原语（幂等重放 → 未知素材 → 陈旧版本 → 写入），失败 0 write；in-flight 标记供 pending 冲突判定 |
| `src/material-bridge.ts`（新增） | 仅示例级、明确隔离的最小 browser-safe app bridge（preflight 结论见 §4）：显式 `registerHandler`（绑定 `MATERIAL_SAVE_ACTION.ref`）、`createSaveMaterialHandler`（caller 授权 + 非敏感字段 allowlist + 值校验 + 模拟服务端异步 + store.commit）、统一 `invoke`（未注册 / 未授权 / 参数越权 / 业务失败 / 成功）、`committedRead`（仅 `displayName`/`description`，`secretNote` 不可读） |
| `src/dev-agent-entry.ts`（新增） | dev-only 程序化 Agent 受控 API：`invokeSave` / `committedRead`（固定 caller=`dev-agent`）；仅 dev 构建由 `main.tsx` 挂载到 `window.__futureUiR2A3DevAgent` |
| `src/material-editor.tsx` | 导出 `createMaterialEditorApp()`（装配 store + bridge + 唯一 handler）；`MaterialEditorPage` 经 `useSyncExternalStore` 直接订阅权威 store（Agent 提交 → UI 实时呈现）；`handleSave` 改为 `bridge.invoke({caller:'ui', …, expectedVersion: openVersionRef})`（保存基于 **Dialog 打开时的版本快照**做 precondition）；失败抛给 EditDialog → alert 显示、不关闭、可重试；新增 `data-testid="me-version"` 权威版本指示 |
| `src/main.tsx` | 创建 app 注入组件；`import.meta.env.DEV` 下挂载 dev Agent 命名空间 |
| `src/declarations.d.ts` | 补最小 `import.meta.env` 类型（vite/client 最小声明） |
| `index.html` | 标题更新为 R2-A3 |
| `tests/material-editor.test.tsx` | 新增 9 个 R2-A3 定向用例（§5） |
| `docs/r1-rc/rc100-r2a3-business-action.md` + `docs/r1-rc/evidence/rc100-*.png` | 本证据文档 + Chrome 截图 |

## 3. 关键设计（最小并发 / 权限 / 状态归属）

- **唯一业务 handler**：UI 与 Agent 都经 `bridge.invoke({caller, actionRef:'material/edit#save', …})`
  到达 `createSaveMaterialHandler` 创建的**同一个 handler**，最终提交到**同一个权威 store**。
- **显式注册 / 授权**：handler 必须 `registerHandler` 后才可调用（未注册 → `unregistered`）；
  caller 仅在 `{ui, dev-agent}`（其他 → `unauthorized-caller`）；Agent 字段 allowlist 由
  `MATERIAL_FIELDS` 派生（过滤 `sensitive`），写入 `secretNote` → `field-not-allowed`，
  错误消息不 echo 字段值（避免间接泄露）；`committedRead` 永不返回 `secretNote`。
- **最小并发**：UI 保存基于 Dialog 打开时版本快照的 `expectedVersion`（precondition reject）；
  handler 层 `in-flight` 锁 → 同素材并发保存拒绝 `pending-conflict`（不盲覆盖）；
  幂等键按 **caller 作用域**绑定并核对**素材 + 字段/值** → 同键同请求重放历史结果
  （`idempotentReplay=true`、本次 `writeCount=0`、返回历史版本）；同键不同请求 →
  `idempotency-conflict`（0 write），杜绝「幂等重放伪造成新操作」。
- **失败显示失败**：拒绝/失败均 0 business write、version 不变；UI 保存失败抛给
  EditDialog（`role=alert` + 保持打开），不默默标成功。
- **保留 A1/A2**：主题切换、Dialog 草稿、pending/disabled/`aria-busy`、`reason=save`、
  FocusScope、实例元数据/Action 引用均不变；旧 `agent-projection.ts`（Node 只读投影）零改动，
  新增 committed 回读/业务 invoke 不偷渡进旧只读投影。

## 4. Preflight 结论：capability-runtime 无法进入浏览器图 → 示例级 bridge

- **验证方法**：Vite dev（5177）沿模块图逐个请求 —— `main.tsx` 200 正常；
  依赖链 `capability-runtime/src/index.ts → registry.ts → @future-ui/contracts（运行时
  validateCapability）→ contracts/src/index.ts → validate.ts` 在 `validate.ts` 出现
  `node:fs` 引用（browser externalized，真实 Chrome 导入即崩，与 #98 同类证据一致）。
- **结论**：`@future-ui/capability-runtime` 不能直接进入浏览器模块图；按 #100 交接选择
  **仅示例级、明确隔离的最小 browser-safe app bridge**（§2），不修改公共契约、不伪造
  browser/runtime 覆盖率；测试图（jsdom/Node）与真实 Chrome 行为一致（§5）。

## 5. 验证结果

- 定向 jsdom（`corepack pnpm --filter @future-ui-examples/material-editor demo`）：**25/25 通过**
  （R2-A1 9 + R2-A2 5 + R2-A3 11）：
  - UI 保存 → version+1 → Agent committed read 见新值、`secretNote` 不可见；
  - dev-only Agent invoke → version+1 → 已挂载 UI 列表实时变化（无刷新、无 DOM 点击/回读）；
  - 负例：未注册 handler / 未授权 caller / secretNote 读写 / 未知素材 / 陈旧版本 / 无效输入 /
    pending 冲突均拒绝且 **0 business write**（version 不变、值不变、错误不含敏感值）；
  - 幂等：同键完全相同重复提交 → 重放（`idempotentReplay=true`、本次 `writeCount=0`、返回历史版本）；
    同键不同请求（不同素材 / 同素材不同值）→ `idempotency-conflict` 且 0 write；
    同键按 caller 作用域隔离（UI 与 dev-only Agent 互不干扰）；
  - UI 过时快照保存 → `stale-version` 拒绝：EditDialog 保持打开 + `role=alert` 显示失败
    （含「请关闭并重新打开以读取最新版本」提示），不覆盖 Agent 已提交的权威结果；
  - Agent 提交后主题切换正常；A1 公开字段元数据/顺序与只读投影不变。
- 既有 CI：typecheck ×7 **0 错误**；eslint **0**；全量 vitest **55 files / 523 passed / 4 skipped /
  **1 failed** —— 唯一失败为 `tests/toolchain.test.ts > runs on the frozen Node major (24)`
  （断言 `process.version` 为 v24；本机 sandbox node 为 v22.23.2，仓库 engines 要求 ≥24.21.0，
  **纯环境版本限制，与本次改动无关**；GitHub CI 按 `.node-version` 使用 node 24 覆盖，
  Draft PR 将挂 CI 复核）。
- 真实 Chrome 复核（loopback `127.0.0.1:5175`）：
  - **UI 保存** m1：version 0→1，列表更新，事件日志 `save pending → saved id=m1 version=1 →
    close reason=save`；
  - **dev-only Agent 程序化 invoke** m3：`{"status":"completed","version":3,"materialId":"m3",
    "writeCount":1}`，已挂载 UI 列表实时呈现 `Agent-产品特写-v2.png`（无刷新/无 DOM 点击）；
    committed read m3：仅 `displayName`/`description`，无 `secretNote`；
  - **负例**（页面上下文）：secretNote 写入 → `field-not-allowed`（0 write）、未知素材 →
    `unknown-material`、陈旧版本 → `stale-version`；version 保持 3；
  - **P1-2 真实指针复核**（§0）：Dialog 草稿态与 save-pending 态下真实 CDP 鼠标点击浮层，
    主题切换成功、Dialog/草稿/busy 语义保持、保存恰好一次；0 console error/warning；
  - 深/浅 Dialog 截图留证。
- 证据：`docs/r1-rc/evidence/rc100-{dark-dialog,light-dialog,after-agent-save,interaction-check-final}.png`
  （浅/深 Dialog + Agent 提交后列表 + P1-2 复核后最终状态）。

## 6. NOT-TESTED / 已知限制（如实记录）

- 键盘 Escape 关闭仍受既有主机焦点策略拦截（#96 已记录，非本轮范围）；
- **弹窗内真实 keydown T / Tab 焦点陷阱未能在本环境真实回放**：本会话浏览器驱动
  `press_key` 对功能键（Tab）与字母键均以字符插入输入框（值中可见 `\t`/`t` 追加），
  无法产生浏览器原生焦点移动；CDP `Input.dispatchKeyEvent` 亦不可用（session 不可达）。
  已如实记录。组件键盘路径代码（输入守卫 + 按键 T 监听 + `styles.css` `pointer-events:auto`）
  **本轮未改动**，#98 已验收真实 Tab 陷阱与按键 T（PR #99 review 5470954677）；jsdom
  R2-A2 键盘 T + 输入守卫逻辑层测试通过。**真实指针点击浮层路径本轮已复核通过**（见 §0）；
- jsdom 不做真实 CSS 计算，视觉证据以 Chrome 截图为准；
- 未做跨浏览器/跨 UI 库矩阵、未重跑模型实验（#100 明确不要求）；
- `secretNote` 负例在浏览器侧仅验证写入拒绝与回读不可见；UI 编辑 secretNote 本身允许
  （业务数据），其值不进入任何 Agent 可见面。

## 7. 停止门

- 中文 Draft PR **Refs #100**（本修复轮创建，含修复前/后 exact HEAD、定向测试、真实 Chrome
  核对记录与 Node 24 CI 结论），base `2b1e7f5` / head 见 PR；停在 `AWAITING_INDEPENDENT_REVIEW`。
- 执行者身份：豆包由负责人本会话明确指定（接替 #4 交接中默认的 Windows Codex），
  Role Binding 未扩权；相关授权指向本会话指令。
- **不授权**：自 merge / Ready / close / tag / release / npm publish / deploy；
  不启动 #91 下一阶段、不扩大公共契约（#100 授权终止条件见 #4）。
