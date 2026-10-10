# R2-A3 · #100 素材编辑业务 Action：UI 与 Agent 双入口及权威状态回读

**状态：** 实现完成，停在 `AWAITING_INDEPENDENT_REVIEW`（中文 Draft PR，`Refs #100`）
**授权：** #4 Current Grant R2-A3-001（ACTIVE，2026-10-10）；#100 交接
**执行者：** 豆包（负责人本会话指定接替 Windows Codex Worker；Role Binding 未扩权）
**基线（main）：** `2b1e7f56eac76feefd985a72b9acb4b84ee9052b`（= PR #99 squash merge；开工前已 fetch 核验）
**分支/worktree：** `feat/r2-a3-100-business-action` @ `E:\projects\future-ui-r2a3`
**HEAD（本 PR）：** 见 PR 头（提交时冻结 exact HEAD）

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
  幂等键 → 同键重复提交重放原结果（`idempotentReplay`，不再写第二次）。
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

- 定向 jsdom（`corepack pnpm --filter @future-ui-examples/material-editor demo`）：**23/23 通过**
  （R2-A1 9 + R2-A2 5 + R2-A3 9）：
  - UI 保存 → version+1 → Agent committed read 见新值、`secretNote` 不可见；
  - dev-only Agent invoke → version+1 → 已挂载 UI 列表实时变化（无刷新、无 DOM 点击/回读）；
  - 负例：未注册 handler / 未授权 caller / secretNote 读写 / 未知素材 / 陈旧版本 / 无效输入 /
    pending 冲突均拒绝且 **0 business write**（version 不变、值不变、错误不含敏感值）；
  - 幂等：同键重复提交重放，不再写第二次；
  - UI 过时快照保存 → `stale-version` 拒绝：EditDialog 保持打开 + `role=alert` 显示失败，
    不覆盖 Agent 已提交的权威结果；
  - Agent 提交后主题切换正常；A1 公开字段元数据/顺序与只读投影不变。
- 既有 CI：typecheck ×7 **0 错误**；eslint **0**；全量 vitest **55 files / 523 passed / 4 skipped /
  **1 failed** —— 唯一失败为 `tests/toolchain.test.ts > runs on the frozen Node major (24)`
  （断言 `process.version` 为 v24；本机 sandbox node 为 v22.23.2，仓库 engines 要求 ≥24.21.0，
  **纯环境版本限制，与本次改动无关**；GitHub CI 按 `.node-version` 使用 node 24 覆盖）。
- 真实 Chrome（loopback `127.0.0.1:5178`）：
  - UI 保存 m1：version 0→1，列表更新，日志 `save pending → saved id=m1 version=1 →
    close reason=save`；
  - UI 保存 m2（深色下）：version→2；
  - dev-only Agent 程序化 invoke m3：`{"status":"completed","version":3,"materialId":"m3",
    "writeCount":1}`，已挂载 UI 列表实时呈现 `Agent-产品特写-v2.png`（无刷新/无 DOM 点击）；
  - committed read m3：仅 `displayName`/`description`，无 `secretNote`；
  - 负例（页面上下文）：secretNote 写入 → `field-not-allowed`（0 write）、未知素材 →
    `unknown-material`、陈旧版本 → `stale-version`；version 保持 3；
  - 深色/浅色 Dialog 截图留证；**0 console error/warning、0 外部请求**。
- 证据：`docs/r1-rc/evidence/rc100-{dark-dialog,light-dialog,after-agent-save}.png`
  （同场景浅/深 Dialog + Agent 提交后列表）。

## 6. NOT-TESTED / 已知限制（如实记录）

- 键盘 Escape 关闭仍受既有主机焦点策略拦截（#96 已记录，非本轮范围）；
- 主题切换浮层在 Dialog 打开时真实指针点击被 Radix modal `pointer-events` 策略拦截
  （#98 P1-2 已知行为）；示例端浮层已 `pointer-events:auto`，本轮 smoke 以 UI 按钮
  JS 触发确认主题可切换（同一 UI 入口，非绕过授权）；键盘路径按键 `T` 保持；
- jsdom 不做真实 CSS 计算，视觉证据以 Chrome 截图为准；
- 未做跨浏览器/跨 UI 库矩阵、未重跑模型实验（#100 明确不要求）；
- `secretNote` 负例在浏览器侧仅验证写入拒绝与回读不可见；UI 编辑 secretNote 本身允许
  （业务数据），其值不进入任何 Agent 可见面。

## 7. 停止门

- 中文 Draft PR **Refs #100**，base `2b1e7f5` / head 见 PR；停在 `AWAITING_INDEPENDENT_REVIEW`。
- **不授权**：自 merge / Ready / close / tag / release / npm publish / deploy；
  不启动 #91 下一阶段、不扩大公共契约（#100 授权终止条件见 #4）。
