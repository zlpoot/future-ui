# future-ui v0.1 · 10–15 分钟人工验收清单（MANUAL CHECKLIST）

> R1-RC-001 (#86) 配套人工清单。执行前请先记录：**exact HEAD**、Node / pnpm 版本、启动命令与端口。
> 证据分层：`declared` / `rendered` / `interaction-verified` / `not-covered`（未实际操作项一律写 **NOT-TESTED**，不得写 interaction-verified）。

## 0 · 环境与启动（~2 min）

- [ ] Node `>=24.21.0`，pnpm `11.28.4`（`packageManager` 字段一致）。
- [ ] `pnpm install --frozen-lockfile` 成功（lockfile 无变动）。
- [ ] `pnpm dev` 启动，仅监听 `http://127.0.0.1:5173`（DevTools/`netstat` 确认无对外监听）。
- [ ] 页面完整加载，无 Console 报错（截图记录）。
- [ ] 记录：HEAD `________` · node `________` · pnpm `________`

## 1 · Dialog（~3 min，shadcn EditDialog 与 Ark Dialog 各一次）

- [ ] 标题/描述可见（role=dialog、aria-modal=true、aria-labelledby/aria-describedby 关联）。
- [ ] 显式关闭入口可点：shadcn 的 X 与「取消」；Ark 的「关闭」（CloseTrigger）。
- [ ] 非 blocking 时 Escape 可关闭、遮罩点击关闭（shadcn blocking 开启后 Escape/遮罩**不**关闭，仅 保存/放弃 可终结）。
- [ ] 打开后焦点进入对话框；关闭后焦点归还触发按钮；Tab 不逃逸（真实浏览器验证；jsdom 不替代）。
- [ ] 保存为 1.2s 异步：pending 期间再次点保存不重复提交（R1-DLG-04）；pending 中点取消出现「停止等待并关闭」确认（R1-DLG-05）。
- [ ] Ark 对话框内容区输入、关闭日志更新。

## 2 · Button（~3 min）

- [ ] `type=button`：点击只计数，无表单副作用。
- [ ] `type=submit`：触发表单 submit 计数；`type=reset`：触发 reset 计数。
- [ ] `disabled`：不触发任何副作用。
- [ ] `loading`：原生 `disabled=true` 且 `aria-busy=true`；submit/reset 均不触发（shadcn 与 Ark 各验一次）。
- [ ] 对照可见：Ark Button 诚实标注 **native composition**（非 Ark primitive），loading 上游 unsupported → 宿主投影。

## 3 · TextInput（~2 min）

- [ ] 受控输入：值实时回显；非受控（defaultValue）可编辑。
- [ ] label / aria-labelledby、description / aria-describedby 关联（shadcn 与 Ark 各验一次）。
- [ ] error → `aria-invalid=true`；disabled 不可编辑；readOnly 可聚焦不可编辑。
- [ ] type=number / search / password 的真实隐式角色可见（number→spinbutton、search→searchbox、password 无角色），
      页面如实标注契约 role=textbox 无法全满足（partial）。

## 4 · 能力矩阵与 AI View（~3 min）

- [ ] 矩阵由真实 mapping 数据渲染（约 150 行）：shadcn 与 Ark 的 supported / partial / unsupported 与 via 可见；
      Ark headless 视觉 token unsupported 已公告；不宣称跨库像素一致。
- [ ] Project AI View 显示真实身份（shadcn adapter `shadcn-react` / profile `r1-edit-dialog-reference`、upstream files
      3 个；Ark adapter `ark-ui-react` / `@ark-ui/react@5.39.3` / `@zag-js@1.45.0`）。
- [ ] 现场有界校验与 MV Project View 如实标注 **NOT-RUNNABLE（Node-only）**——ai-dev validator 依赖 node:fs
      （contracts/validate.ts 模块加载期读 schema），浏览器不可运行；确定性行为（正例 R1-DLG-02 PASS / 负例
      确定性 FAIL）由 vitest `validator-demo.test.tsx`（Node 侧）覆盖。
- [ ] MV upstream drift 门禁标注 **Node-only / 浏览器 NOT-RUNNABLE**（Node 侧由 ai-dev 测试覆盖）。

## 5 · UI-only 样本（~1 min）

- [ ] 独立 UI-only 样本在无 Agent/MCP 下运行：登记条目、打开/关闭详情对话框。
- [ ] DevTools Network/Console：无 MCP / Agent / 外网 / 业务 API 请求。
- [ ] 页面任意元素无 `data-capability / data-agent / data-binding / data-model / data-mcp` 泄漏属性。

## 6 · 证据收口

- [ ] 记录 exact HEAD、node/pnpm 版本、启动命令、真实截图/操作结果；未实际操作项保持 **NOT-TESTED**。
- [ ] 将结果按 declared / rendered / interaction-verified / not-covered 分层回报（或写入验收评论）。

---
**反馈渠道**：#86（本任务）评论或新建 Issue；已知限制见 `docs/r1-rc/rc86-v01-manual-host.md`。

---

## 附 · 2026-10-09 自动化验收记录（真实 Windows Chrome + CDP，供 Owner 复核）

环境：Node v24.21.0 · pnpm v11.28.4（corepack）· worktree `E:\projects\future-ui-r1rc86` · `pnpm dev` → 仅
`127.0.0.1:5173`（netstat 确认）· HEAD 见 PR。截图：`docs/r1-rc/evidence/browser-top-sections.png`、
`browser-bottom-sections.png`。

| 项 | 结果 | 证据 |
| --- | --- | --- |
| 干净加载 | interaction-verified | 22,816 字符文本；0 Console error / 0 warning；0 失败请求 |
| shadcn EditDialog 开/关 | interaction-verified | open→`role=dialog`+aria-modal+字段渲染；取消→closed+日志 `reason=cancel open=false` |
| Ark Dialog 开/关 | interaction-verified | open→标题/描述/内容区渲染；关闭(CloseTrigger)→closed+日志 `open=false` |
| Button 计数/表单副作用 | interaction-verified | click 0→1、submit 0→1（shadcn 与 Ark 各验） |
| Button loading 契约 | interaction-verified | 期间 `disabled=true + aria-busy=true`（文本「保存中…」），1.2s 后复位（两库） |
| TextInput 受控回显 | interaction-verified | 输入 `hello-browser` 实时回显 |
| 能力矩阵 | interaction-verified | 150 行真实 mapping 数据渲染 |
| UI-only 样本 | interaction-verified | 登记→条目→详情对话框开/关 |
| 网络隔离 | interaction-verified | 0 外部请求、0 失败请求；无 data-capability/agent/binding/model/mcp 泄漏 |
| AI View | rendered | 静态身份卡 + 2 个 NOT-RUNNABLE 徽标可见 |
| Escape / 遮罩 / blocking / 焦点 | NOT-TESTED | 自动化键盘被主机焦点策略拦截（合成事件无法触达 React 根）；留人工清单执行 |

以上自动化结果**不替代**人工清单：第 1、3 节的焦点/Escape/ARIA 关联项请按清单逐项人工确认。
