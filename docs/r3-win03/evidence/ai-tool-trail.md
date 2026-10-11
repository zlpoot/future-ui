# AI 工具调用轨迹（首次生成前 · 先读规范后写代码）

本文件记录 Coding Agent 在离仓工程 `E:\projects\cfu-accept109\my-admin` 中、**写第一行业务代码之前**的
真实工具调用顺序。每一步都有原始输出文件（见下表），未补写、未重放。

## 调用顺序（实际执行序列）

| # | 动作 | 产物/输出 | 退出码 | 证据文件 |
|---|---|---|---|---|
| 1 | 读取 `AI-AGENTS.md`（工程内 AI 规范入口） | 查询命令、Browser 入口唯一性、Profile 身份、supported/partial/unsupported/not-covered 边界、Admin List recipe 定位 | — | 模板自带文件（随 create-future-ui 安装） |
| 2 | 执行 `ai:view --out ai/artifacts/ai-view.json` | 结构化组件目录 + Profile + 版本 + 页面 recipe JSON | 0 | `ai-view-run1.json`（同内容文本 `ai-view-run1.txt`） |
| 3 | 执行 `ai:doctor` | 依赖声明 vs 实际版本、browser 入口一致性诊断 | 0 | `ai-doctor-run1.json` |
| 4 | 读工程现有 `src/theme.tsx`、`src/styles.css`、`src/main.tsx`、`package.json` scripts | 复用宿主主题状态机/ThemeFloatToggle、确认 @source adapter dist 扫描、tailwind 配置 | — | 模板文件 |
| 5 | 读安装资产 `node_modules/@future-ui/shadcn-adapter/dist/edit-dialog.d.ts` | `EditDialogField`（name/label/value/placeholder/type）、`onSave: async` 契约 | — | 安装资产（RC 归档内容） |
| 6 | **首次编写** `src/members.ts` + `src/App.tsx` | 本地模拟数据/统计口径/表单字段派生 + 完整成员管理页 | — | `first-impl.diff`、`first-impl-stat.txt` |

## ai:view 实际返回的关键事实（首次，未修改）

- 组件目录：`future-ui.dialog` **supported**；`future-ui.button` **partial**（Button `features.loading` unsupported）；
  `future-ui.text-input` **partial**（TextInput `accessibility.role` unsupported）
- 全部组件 `importPath: @future-ui/shadcn-adapter/browser`，`exportVerified: true`
- Profile：`r1-edit-dialog-reference@1.0.0`；版本：contracts 1.0.0，其余 0.1.0-rc.1
- 页面 recipe `future-ui.page.admin-list`：Sidebar 组合约定 / h1-h2 层级 / 统计卡 grid-cols-4 /
  搜索 ShadcnTextInput（id+name→aria-label）/ 语义表格 / EditDialog 预填·取消·pending 防重复 / Light-Dark token
- statusBoundary 区分 supported / partial / unsupported / not-covered

## 顺序可辨性

上述 #1–#5 全部发生在 #6（首次写代码）之前；首次代码 diff（`first-impl.diff`）以空工程基线
`eedd5729` 为父提交，可独立核对“先读规范、后写代码”。本次实验未用 `examples/material-editor`
或任何既有业务页面成品作为实现来源（离仓工程模板仅含 demo App.tsx）。
