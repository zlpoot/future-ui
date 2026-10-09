# R2-A2 · #98 同一素材编辑页双主题换肤（Light/Dark）

**状态：** 实现 + 首轮 Review（#99 独立 Review 5470176256）已完成；**P1 修复轮已交付**，
停在 `AWAITING_INDEPENDENT_REVIEW`（Draft PR，等负责人/用户增量复审）
**授权：** #4 Current Grant R2-A2-001（ACTIVE，#6077486895）；#98 交接评论 #6077510419
**执行者：** 豆包（用户指定接替 Windows Codex）
**基线（main）：** `cec1a1aeaf220624a3211b7d5e3ff773625ba7ea`（= PR #97 squash merge）
**分支/worktree：** `feat/r2-a2-98-theming` @ `E:\projects\future-ui-r2a2`
**P1 修复轮 HEAD：** `2f25774`（前一轮 HEAD `e01decedc1fd9305c87cfe93d796446a79cc4e27`）

---

## 0. P1 修复轮（Review 5470176256 → 增量复审）

Review 结论两项 P1（+ 一项不阻塞技术债），本轮在**同一 Draft PR #99** 最小修复：

### P1-1：Dialog 视觉/模态未达验收 → 已修
- **根因**：`main.tsx` 只导入 `styles.css`，vendored shadcn 的 Tailwind 布局工具类
  （`fixed inset-0 z-50`、`top-[50%] left-[50%]`、`grid/p-6/rounded-lg` 等）在仓库内无
  编译 CSS，全部不生效 → Dialog 呈现为页面中间横贯的普通区块、无遮罩、Close 在左下。
- **最小修复**：`styles.css` 新增 P1-1 布局块（仅 example 范围，`[data-slot=…]` 定向）：
  - `dialog-overlay`：fixed inset-0 z-50（可见遮罩）；
  - `dialog-content`：fixed top/left 50% + translate(-50%,-50%) 居中、z-50、宽度受控
    （max-width 100%-2rem / sm 32rem）、grid gap、padding、圆角、outline none；
  - `dialog-header/footer/title/description/close`：header 布局、footer 右对齐
    （sm 行内）、close absolute top/right、去边框、svg 尺寸；
  - `button/input`：基础布局（inline-flex、居中、圆角、高度、宽度、内边距）；
  - 表单（`edit-dialog-fields`）与 pending 容器布局。
- **新证据**：`rc98-material-editor-{light-dialog,dark-dialog}.png` 已替换为真实 Chrome
  同场景截图：浅/深 Dialog 均**居中模态**（视口 1383×1243 下 content 位于 412,390 · 560×464，
  中心 ≈ 视口中心）、全屏遮罩可见、Close 在弹窗右上、表单/按钮布局正常、输入框焦点环可见。

### P1-2：模态期间主题按钮真实可操作性缺证明 → 已修并验证
- **真实缺陷（审查预判成立）**：Radix modal 打开时把 `body` 置为 `pointer-events:none`
  （外部子树不可命中），**仅 z-60 不解除限制**——真实指针点击浮层被 overlay 拦截
  （`elementFromPoint` 实测命中 overlay，浮层不在命中栈）。jsdom `fireEvent.click` 不建模
  该行为，故此前测试无法发现。
- **最小修复**：`.me-theme-float` 显式 `pointer-events: auto`（仅 example 范围，不改公共
  契约、不改 vendored 组件）。修复后 `elementFromPoint(浮层中心)` 实测命中切换按钮。
- **真实交互验证（非强制点击、非 JS dispatch，全部真实输入事件）**：
  | 状态 | 输入路径 | 结果 |
  | --- | --- | --- |
  | Dialog 打开 + 草稿未保存 | 真实指针点击（CDP mouse → `bu.click`）浮层 | dark 生效：页面/dialog/overlay 全部换色；Dialog 不关闭、草稿保持、日志零新增 |
  | 同上（键盘） | 焦点在弹窗内「保存并关闭」，真实按键 `t`（CDP keyDown/keyUp） | 切换 dark→…：主题切换、焦点保持在按钮、无字符插入 |
  | 输入守卫 | 焦点在输入框，真实按键 `t` | 主题**不**切换（避免打断输入） |
  | Tab 陷阱 | 焦点在弹窗内按钮，真实 Tab | 焦点移到弹窗内另一元素（Close），**仍在 Dialog 内**——浮层不可 Tab 到达，属标准模态语义（FocusScope），如实记录 |
  | pending（保存中） | 真实指针点击浮层 | busy/disabled 保持、`reason=save` 恰好一次、列表更新一次、Dialog 正常关闭 |
- **键盘可操作性说明**：弹窗内键盘用户无法 Tab 到弹窗外浮层（模态 FocusScope 有意限制），
  示例端提供按键 `T`（焦点不在输入框时）作为弹窗内键盘路径；页面说明文案已同步。

### 不阻塞项（如实标记，未扩大范围）
- `@future-ui/theme` 公共包入口 `node:fs` 技术债仍以示例 source alias 绕过，**不改公共包**；
- 未重跑模型矩阵/跨浏览器；本轮仅跑 typecheck ×7 / eslint / 全量 vitest / 一次真实 Chrome。

### P1 修复轮验证
- 定向 jsdom：**14/14**（新增 1 例键盘路径：按键 T 切换 + 输入守卫）。
- 既有 CI：typecheck ×7 **0**、eslint **0**、全量 vitest **55 files / 515 passed / 4 skipped**。
- 真实 Chrome：上述交互矩阵全通过；证据 4 张已更新/新增（见 §5）。

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
2. **Modal 与主题切换入口冲突（P1-2，审查后确认并修复）**：Radix Dialog overlay 为
   fixed inset-0 z-50；真实 Chrome 实测**仅 z-60 不够**——modal 打开时 `body` 被置为
   `pointer-events:none`，外部浮层不可命中，真实点击被 overlay 拦截。修复：`.me-theme-float`
   显式 `pointer-events:auto`；键盘路径为弹窗内按键 `T`（FocusScope 将 Tab 限制在弹窗内，
   属标准模态语义）。见 §0。
3. **NOT-TESTED / 已知限制**：
   - 键盘 Escape 关闭仍受既有主机焦点策略拦截（#96 已记录，非本轮范围）；
   - 浮层在 Dialog 打开时不可 Tab 到达（Radix FocusScope 模态焦点陷阱，标准行为）；
     弹窗内键盘切换用按键 `T` 代替；
   - jsdom 不做真实 CSS 计算，视觉证据以 Chrome 截图为准；
   - 未做跨浏览器/跨 UI 库矩阵（#98 明确不要求）；
   - `packages/theme` 的 `useTheme/useVariantTokens` 本轮未使用（保留扩展位）。

## 5. 验证结果

- 定向 jsdom（`corepack pnpm --filter @future-ui-examples/material-editor demo`）：**14/14 通过**
  （R2-A1 9 例 + R2-A2 5 例：换肤状态保持、事件次数、键盘 T + 输入守卫）。
- 既有 CI：typecheck ×7 **0 错误**；eslint **0**；全量 vitest **55 files / 515 passed / 4 skipped**。
- 真实 Chrome（loopback `127.0.0.1:5176`）：
  - **P1-1 模态呈现**：浅/深 Dialog 均居中模态 + 全屏遮罩 + Close 右上 + 焦点可见
    （同场景截图 `rc98-material-editor-{light-dialog,dark-dialog}.png`）；
  - **P1-2 真实交互**：Dialog 打开/草稿/pending 三态，真实指针点击与真实按键 `t` 均可
    切换主题；输入守卫、Tab 陷阱符合预期；pending 中切换不重复保存（`reason=save` 一次、
    列表更新一次）；日志仅含 Action 引用；0 console error/warning、0 外部请求。
- 证据：`docs/r1-rc/evidence/rc98-material-editor-{light,light-dialog,dark-dialog,after-save}.png`。

## 6. 停止门

- 中文 Draft PR **Refs #98**，base `cec1a1ae` / head 见 PR（P1 修复轮已 push 同一分支）；
  未 merge / close / tag / release / publish。
- 停在 `AWAITING_INDEPENDENT_REVIEW`：等负责人/用户增量复审；通过后再交 ChatGPT
  正式确认合并。
