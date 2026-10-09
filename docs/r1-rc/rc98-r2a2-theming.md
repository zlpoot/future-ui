# R2-A2 · #98 同一素材编辑页双主题换肤（Light/Dark）

**状态：** 实现完成 · 停在 `AWAITING_INDEPENDENT_REVIEW`（Draft PR，交 ChatGPT 独立 Review）
**授权：** #4 Current Grant R2-A2-001（ACTIVE，#6077486895）；#98 交接评论 #6077510419
**执行者：** 豆包（用户指定接替 Windows Codex）
**基线（main）：** `cec1a1aeaf220624a3211b7d5e3ff773625ba7ea`（= PR #97 squash merge）
**分支/worktree：** `feat/r2-a2-98-theming` @ `E:\projects\future-ui-r2a2`

---

## 1. 交付摘要

复用已并入 main 的 `examples/material-editor/`（#96/#97 产物），为**同一个** `MaterialEditorPage`
提供两套受控视觉预设：**Light（浅色清爽）** 与 **Dark（深色高对比）**，覆盖页面背景、文本、
按钮、边框、表单、Dialog 与焦点样式。主题是宿主视觉偏好，**不是业务 Action**：

- 不复制页面实现、不复制 `MATERIAL_FIELDS` / `MATERIAL_SAVE_ACTION`；
- 不修改公共 Theme Contract / Component Contract / Schema / D16 Profile；
- 不宣称框架级运行时 Provider 热替换（D08 `hotSwap=false`，本轮只验证受控预设切换）；
- 不启动 #91 Agent Action 薄片、不建设 WebMCP Runtime / 权限平台 / 通用 DSL。

## 2. 核心改动（均在 `examples/material-editor/`）

| 文件 | 改动 |
| --- | --- |
| `src/themes.ts`（新增） | 两套 `ThemeDefinition`（`lightTheme`/`darkTheme`，token 使用公共 D08 命名空间 `--future-ui-*`）+ `applyThemeToRoot()`：把 data-theme 与同一组 token 同步到 `<html>`，让 Portal 内 Dialog 真正随主题换肤（示例端小型作用域方案，不读 provider-private DOM） |
| `src/material-editor.tsx` | 页面包 `<ThemeProvider theme={activeTheme}>`（**真实复用 D08 ThemeProvider 本体**）；新增主题切换浮层（`data-testid="theme-toggle"`，fixed z-60 > Dialog overlay z-50，Dialog 打开时可点击）；`themeName` 为独立 `useState`，不触碰 `editingId/materials/log/草稿` |
| `src/styles.css` | 全量改为 `--future-ui-*` 变量驱动；`:root`=Light 默认值，`html[data-theme='dark']`=深色高对比值；shadcn 语义类/`data-slot` 元素（dialog-content/overlay/title/description/close、button、input、border、text-destructive 等）映射到公开 token，含焦点样式（focus-visible ring/border） |
| `vite.config.ts` / `vitest.config.ts` | 新增 `'@future-ui/theme'` → `packages/theme/src/provider.tsx` 的**相对 source alias**（原因见 §4） |
| `index.html` | 标题更新为 R2-A2 |
| `tests/material-editor.test.tsx` | 新增 4 个换肤定向测试（§3） |
| `package.json` / `pnpm-lock.yaml` | 声明 `@future-ui/theme` workspace 依赖（lockfile +3 行） |

## 3. 两套主题如何复用同一语义与业务状态

- **同一组件实例不重挂载**：换肤只改变 `themeName` → `activeTheme`（useMemo），
  `ThemeProvider` 只更新 data-theme + CSS token，不重建页面/弹窗子树；
- **业务状态独立**：`materials/editingId/log` 与草稿全部位于 EditDialog 内部 state，
  主题切换不触发任何 `onSave/onOpenChange`（无额外事件）；`MATERIAL_FIELDS` 与
  `MATERIAL_SAVE_ACTION` 保持单一数据源，UI 与 Agent 投影同源不变；
- **Portal 真实换肤**：Dialog 经 Portal 挂到 `document.body`（不在 ThemeProvider 容器内），
  `applyThemeToRoot` 把同一组 token + data-theme 写到 `<html>`，Portal 元素继承后与页面一致；
- **验证矩阵（jsdom 13/13 + 真实 Chrome）**：
  - Dialog 打开时切换 → 不关闭、草稿保持、输入框焦点保持、可继续编辑；
  - 保存 pending（`保存中…` aria-busy/disabled）时切换 → busy 保持、不重复保存、
    `reason=save` 恰好一次、列表只更新一次；
  - 反复切换 → 日志无任何新增（无额外 onSave/onOpenChange）；
  - 换肤前后 UI 字段顺序/标签与 Agent 投影（字段元数据、Action 引用）不变；
  - `secretNote`/draft 值不因换肤进入投影或日志。

## 4. 真实问题与示例端解决方案（如实保留）

1. **首次失败**：直接 `import { ThemeProvider } from '@future-ui/theme'` 在真实 Chrome 崩溃：
   `Module "node:fs" has been externalized for browser compatibility` —— 包入口
   `index.ts → theme-contract.ts → @future-ui/contracts validate.ts` 顶层依赖 `node:fs`
   （读 schemas JSON），浏览器导入即挂（jsdom/Node 测试不受影响，故首轮测试绿）。
   **方案**：不改包、不新增公共导出，仅示例端把 `@future-ui/theme` 别名指向
   `packages/theme/src/provider.tsx`（其只依赖 react，即 D08 data-theme + token 表面的
   真实实现），实现真正的 ThemeProvider 复用且浏览器安全；`package.json` 仍声明该依赖
   以保留类型解析。
2. **Modal 与主题切换入口冲突**：Radix Dialog overlay 为 fixed inset-0 z-50，会盖住页面
   头部按钮。核实 radix-ui 1.7.0 该版本不对外部子树 inert/aria-hidden（仅 overlay + 焦点
   陷阱），因此主题切换做成 fixed z-60 浮层，Dialog 打开时真实可点击。
3. **NOT-TESTED / 已知限制**：
   - 键盘 Escape 关闭仍受既有主机焦点策略拦截（#96 已记录，非本轮范围）；
   - jsdom 不做真实 CSS 计算，视觉证据以 Chrome 截图为准；
   - 未做跨浏览器/跨 UI 库矩阵（#98 明确不要求）；
   - `packages/theme` 的 `useTheme/useVariantTokens` 本轮未使用（保留扩展位）。

## 5. 验证结果

- 定向 jsdom（`corepack pnpm --filter @future-ui-examples/material-editor demo`）：**13/13 通过**
  （R2-A1 9 例 + R2-A2 4 例）。
- 既有 CI：typecheck ×7 **0 错误**；eslint **0**；全量 vitest **55 files / 514 passed / 4 skipped**。
- 真实 Chrome smoke（loopback `127.0.0.1:5176`，受控一次）：
  浅色初始 → 打开 Dialog + 草稿 + 焦点 → **Dialog 打开时切深色**（DOM：dlgBg `rgb(16,26,44)`、
  border `rgb(42,58,86)`、text `rgb(230,237,247)`、overlay `rgba(0,0,0,.65)`；草稿/焦点保持、
  日志无新增）→ 深色下保存 → pending 中切回浅色（busy 保持、无重复 pending）→ 保存完成
  `reason=save` 一次、列表更新一次、日志仅含 Action 引用（无字段值）；0 console error/warning、
  0 外部请求、0 HTTP 错误。
- 证据：`docs/r1-rc/evidence/rc98-material-editor-{light,light-dialog,dark-dialog,after-save}.png`。

## 6. 停止门

- 中文 Draft PR **Refs #98**，base `cec1a1ae` / head 见 PR；未 merge / close / tag / release / publish。
- 交给 ChatGPT 独立 Review；负责人决定合并。
