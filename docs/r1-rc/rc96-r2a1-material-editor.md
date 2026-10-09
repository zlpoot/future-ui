# R2-A1 (#96) · 素材编辑同源声明 → UI 与 Agent 只读投影

Refs #96（#91 第一薄片）。实现范围：`examples/material-editor/` + 必要小型测试与文档。
**未改动任何公共 Contract/Schema**；未触碰 #91 换肤、Agent invoke/WebMCP runtime、真实业务数据。

## 同源设计（无第二套字段表）

唯一字段表 `examples/material-editor/src/material-declaration.ts`（`MATERIAL_FIELDS`）同时驱动：

1. **React UI**（`material-editor.tsx`，浏览器图）：虚拟列表 + 复用 `@future-ui/shadcn-adapter/browser` 的
   `EditDialog` / `r1-edit-dialog-reference` Profile；字段键/标签/顺序/初始值来自声明本身。
2. **dev-only Agent 只读投影**（`agent-projection.ts`，Node 图，浏览器入口不导入）：
   - 复用 `createEditDialogProjectContext`（ai-dev）= 真实 shadcn Project AI View + `InstanceRegistry`；
   - 显式注册 dialog 实例 + 每个非敏感字段的 text-input 实例（`field-of` 关系，scope=`material/edit`）；
   - 字段元数据（name/label/order/actionRef）走实例 `visibleState.allow` 显式 allowlist；
   - 敏感字段 `secretNote` **不注册** → 不出现在 `project.listInstances`/describeInstance/投影中；
   - draft 值（value）不在 allowlist → `projectVisibleState` 一律 withheld；
   - 无 capabilityBindings 且 view.capabilities 为空 → 业务工具数 0；未注册 scope → `not-covered`。

## 验证

- 定向 jsdom（`demo` 脚本）：7/7 通过 —— 交互闭环（预填→修改→保存中防重复提交→保存并关闭 reason=save→列表更新）、
  取消不修改、同源性（改声明 label 双端变化、顺序/Action ref 一致）、注册表/工具安全面（listInstances 无
  secretNote、describeInstance covered + 0 工具、未注册 scope not-covered、catalog 0 capabilities）、
  负例（draft value withheld、secretNote 不可描述）。
- 既有 CI：typecheck ×7 全 0、eslint 0、全量 vitest **55 files / 508 passed / 4 skipped**（基线 54/501/4 + 本薄片 7）。
- 真实 Chrome smoke（loopback 127.0.0.1:5175，受控一次）：列表渲染 → 编辑弹窗（aria-modal、3 字段预填含
  secretNote 仅 UI 可见）→ 修改名称 → 保存 `保存中…`（disabled+aria-busy）→ 重复点击忽略 → 关闭
  `reason=save` → 列表更新；0 console error/warning、0 外部请求。证据：
  `docs/r1-rc/evidence/rc96-material-editor-{initial,dialog,after-save}.png`、`rc96-material-editor-demo-stdout.txt`。

## 首次失败与修正（如实保留）

1. `pnpm install --frozen-lockfile` 失败：lockfile 未含新示例包 importer → 非冻结安装仅 +43 行（无版本变动）。
2. 同源性断言首跑失败：误把“UI 字段 == 投影字段”写成全等；投影本应是允许公开的子集（敏感字段被过滤）
   → 修正断言为“投影 ⊆ UI 且键/标签/顺序一致”。
3. 保存关闭断言超时：真实异步保存 1.2s 超出 waitFor 默认 1s → 放宽 timeout。
4. jest-dom matcher 触发 TS2339：仓库约定避免 jest-dom（见 rc-manual-host ui-only-sample）→ 改用纯 vitest 断言，
   去掉该依赖；另补 `*.css` 声明（TS2882）。

## NOT IMPLEMENTED（超出薄片，未做）

- 换肤/主题更换（#91 第二片）、真实 Agent Action invoke、WebMCP runtime（#91 第三片）；
- 通用 JSON DSL / 通用组件框架、跨库/多框架矩阵、外部业务/账号写入、付费模型/API；
- 生产化入口（本示例为 dev-only，`agent-projection.ts` 不进入浏览器依赖图）。

**停点：AWAITING_INDEPENDENT_REVIEW**（不自行 merge/close/tag/release）。
