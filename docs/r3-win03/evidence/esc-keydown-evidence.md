# Esc 关闭行为 · 真实 Chrome 实测（订正）

## 背景

本轮独立 Review（pullrequestreview-5482999702）指出：验收报告此前将“真实 Chrome 按 Esc 关闭 Dialog”
判为 PASS，但冻结组件 `packages/shadcn-adapter/src/components/edit-dialog.tsx` L179 明确
`onEscapeKeyDown={(event) => event.preventDefault()}`（契约 R1-DLG-02：Esc/overlay 是附加入口，
不允许成为唯一关闭途径）。**此前的 PASS 判定有误，现订正。**

## 受控重测（真实 Chrome，loopback 5173，Node24 构建的离仓工程）

```text
打开新增 Dialog（data-testid=open-create 点击）→ data-state=open
挂 document keydown 监听（capture，记录 Escape 的 defaultPrevented）
按 Esc（bu.press_key("Escape")）
+0.1s : exists=true, data-state=open, escLog=[{dp:true, target:INPUT, at:1791716139006}]
+0.6s : exists=true, data-state=open, escLog=[{dp:true, ...}]      ← 未关闭
+1.6s : exists=true, data-state=open, escLog=[{dp:true, ...}]      ← 未关闭
```

**结论（订正后）**：真实 Chrome 中按 Esc，keydown 事件被 EditDialog 的 `onEscapeKeyDown`
`preventDefault`（`defaultPrevented=true`），Dialog 在 1.6s 观察窗口内保持 `data-state=open`，
**Esc 不关闭 Dialog** —— 与冻结组件源码/契约一致。

## 合法关闭途径（同会话实测）

- X 关闭按钮（`[data-slot=dialog-close]` / aria-label=关闭）：点击后 dialog closed ✓
- 取消按钮：dialog 关闭且不写入列表（此前验收记录“列表仍陈晨”✓）
- 保存成功：pending 结束后自动关闭 ✓

## 对验收结论的影响

- 原“键盘/焦点：…Esc 关闭”一行 **订正为**：“Esc 不关闭（EditDialog R1-DLG-02 契约，keydown
  defaultPrevented=true 实测证据）；X / 取消 / 保存成功关闭正常；Dialog 打开初始焦点第一字段、Tab 循环 PASS”。
- 键盘范围收敛为：初始焦点、Tab 循环、Esc 保持打开（符合冻结组件契约）、X/取消/保存关闭。
