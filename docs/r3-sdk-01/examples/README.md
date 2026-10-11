# 示例说明（examples）

本 SDK 的 `create-future-ui` 模板自带一个**最小可运行 demo**，作为组件使用的第一份示例。
它位于通过 `快速开始.md` 生成的新工程中：

```
<YOUR_APP>/src/
├── App.tsx          # 最小启动入口：ShadcnButton / ShadcnTextInput / EditDialog demo
├── main.tsx         # React 19 挂载入口（StrictMode）
├── theme.tsx        # 宿主主题状态机（useHostTheme / ThemeFloatToggle）
├── styles.css       # Tailwind v4 + theme.css + @source adapter dist
└── fixture.test.tsx # jsdom fixture（组件契约行为：按钮、输入、EditDialog 保存/pending）
```

## demo 内容（App.tsx）

- `ShadcnButton`：default / outline 两个变体，点击后回显状态。
- `ShadcnTextInput`：独立输入，`onValueChange` 回显（取 `event.value`）。
- `EditDialog`：本地列表条目“编辑”按钮打开，字段预填；保存模拟 pending 后更新列表；
  取消不保存；关闭原因经 `onOpenChange(detail)` 回传。
- `ThemeFloatToggle`：右上角 Light/Dark 切换（`<html data-theme>`）。

## 运行

```powershell
cd <YOUR_APP>
npm run dev          # http://localhost:5173
npm run test         # fixture 通过
```

## 说明

- 这是模板示例，**不是完整业务页面**（成员管理等业务页面不在 SDK 内，由后续开发按 AI 指南自行实现）。
- demo 数据仅驻留内存，不落盘、不接后端。
- 完整组件 API 见 `docs/组件使用手册.md`；页面组合约定见 `npm run ai:view` 的 `pages.adminList`。
