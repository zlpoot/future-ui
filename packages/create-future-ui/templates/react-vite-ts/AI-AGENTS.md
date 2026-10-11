# Future UI · AI 规范入口（Coding Agent 发现指南）

本文件面向 Coding Agent（Codex / 豆包等）。本工程由 `create-future-ui` 生成，
所有规范事实从**已安装的真实 RC 资产**派生，机器可读。

## 查询命令（Node-only，开发期，不进浏览器）

| 命令 | 作用 | 输出 |
|---|---|---|
| `pnpm ai:view` / `npm run ai:view` | 当前工程的 AI 规范视图：组件目录、import 路径、导出名、包/Profile/版本、支持边界、Admin List 页面 recipe | JSON（默认仅 stdout；`--out ai/artifacts/ai-view.json` 显式落盘） |
| `pnpm ai:doctor` / `npm run ai:doctor` | 检查依赖声明 vs 实际安装版本、vendor 归档、browser 入口、Profile、浏览器导入路径 | JSON；有诊断退出码非零 |
| `pnpm ai:check` / `npm run ai:check` | 对 src 声明的组件使用做只读验证（import/行为约定静态可确认部分） | JSON；有诊断退出码非零 |

所有命令都是只读、确定性的：不执行业务操作、不调用模型、不修改文件。
`ai:view` 默认仅 stdout，显式 `--out <path>` 才落盘（该路径已 gitignore，属生成产物）；
doctor/check 用 shell 重定向 stdout 即可留档。

## 权威事实

- **Browser 入口（唯一合法）**：`@future-ui/shadcn-adapter/browser`
  - 导出：`EditDialog`、`ShadcnButton`、`ShadcnTextInput`（真实导出，由 `ai:doctor` 校验）
  - 禁止：从 `@future-ui/shadcn-adapter` 根入口导入（含 Node-only validators，会拖 `node:fs` 进浏览器图）
- **Project Profile**：`r1-edit-dialog-reference@1.0.0`（`editDialogProfile`，从 browser 导出读取；适用边界见 `ai:view`）
- **Theme**：`@future-ui/theme/theme.css`（Light/Dark token 单一数据源；`<html data-theme>` 切换；Dialog 走 body Portal，token 在 `<html>` 上）
- **版本**：由 `ai:view` / `ai:doctor` 从已安装 `package.json` 读取，不在本文件硬编码（防止 0.0.0 vs 0.1.0-rc.1 式漂移）

## 状态边界（不得虚报）

- `supported`：D15 映射无 unsupported 成员（EditDialog）
- `partial`：存在 unsupported 成员（Button：`features.loading`；TextInput：`accessibility.role` 等）
- `unsupported`：D15 冻结结论标记的契约成员（逐条见 `ai:view` 的 `components[].mapping.domains`）
- `not-covered`：通用 Table/Sidebar/Forms 组件 Contract（不存在）、WebMCP Runtime/业务能力（无）、
  `@future-ui/ai-dev`（私有 Node-only）、npm 公网安装（未 publish）、完整成员管理页（#109 未授权）

## 页面规范

Admin List Page 是**组合 recipe**（`ai:view` → `pages.adminList`）：Sidebar 导航、
页面 Header 层级、统计卡片、搜索/筛选、语义表格、EditDialog（预填/取消不保存/
保存 pending/阻止重复提交）、Light/Dark token 引用。它不是通用 Table/Sidebar
组件 Contract，不预置完整业务页面（属于 #109）。

## 使用建议（给 Coding Agent）

1. 先跑 `ai:view` 读取目录与边界，再动手；
2. 组件一律从 `@future-ui/shadcn-adapter/browser` 导入；
3. 修改后跑 `ai:check` 与 `ai:doctor` 确认无诊断、无 not-covered 虚报；
4. 交互行为（pending/取消/换肤）以 `src/fixture.test.tsx`（jsdom）与人工 Chrome 验收为准，
   不要把静态检查通过当成运行时行为 PASS。
