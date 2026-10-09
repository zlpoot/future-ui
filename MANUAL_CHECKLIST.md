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
- [ ] **shadcn EditDialog（两变体一致）**：Escape 与遮罩点击**始终被阻断**（R1-DLG-02：显式关闭入口优先，Esc/遮罩永不作为唯一关闭通道）。
      非 blocking 经 X / 取消 / 保存并关闭 关闭；blocking 无 X，仅 保存并关闭 / 放弃变更并关闭。
- [ ] **Ark Dialog（真实 zag 机器，与 shadcn 不同源）**：Escape 与 CloseTrigger 可用（zag 默认语义，非 blocking）；遮罩点击行为单独实测后再记录；blocking 为 shadcn 参考实例独有，Ark 侧无此变体。
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
- [ ] **P1 · AI 开发命令（真实输出）**：执行 `corepack pnpm --filter @future-ui/rc-manual-host ai-view`，
      输出真实组件 definitions/limits、正例 `R1-DLG-02 PASS`、负例 `R1-DLG-02 FAIL` 的
      `ruleId/status/reason/repairHint`（完整 stdout 见 `docs/r1-rc/evidence/ai-view-command-stdout.txt`）。
- [ ] **P1 · Consumer 示例（一条命令）**：执行 `corepack pnpm --filter @future-ui/rc-consumer demo`，
      展示选 Adapter / 复用 Profile / 读 AI View / 运行一个 UI 组件（stdout 见
      `docs/r1-rc/evidence/rc-consumer-demo-stdout.txt`）。
- [ ] 现场有界校验与 MV Project View 如实标注 **NOT-RUNNABLE（Node-only）**——ai-dev validator 依赖 node:fs
      （contracts/validate.ts 模块加载期读 schema），浏览器不可运行；确定性行为由上述 `ai-view` 命令（真实输出）
      覆盖（正例 PASS / 负例 FAIL）。
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

---

## 附二 · 2026-10-09 四项最小修复轮记录（P1×2 / P2×2，PR #93 评论 6073860420）

环境同上（Node v24.21.0 · pnpm v11.28.4 · worktree `E:\projects\future-ui-r1rc86`）。新命令真实 stdout 已入库：
`docs/r1-rc/evidence/ai-view-command-stdout.txt`、`docs/r1-rc/evidence/rc-consumer-demo-stdout.txt`；截图
`docs/r1-rc/evidence/browser-fixes-sections.png`。自动化基线（本提交 HEAD 实测）：frozen-lockfile install exit 0；
typecheck ×6 全 0；eslint exit 0；`vitest run` 54 files / **501 passed / 4 skipped**（首轮基线 497 passed + 新增 4）。

| 修复 | 结果 | 证据 |
| --- | --- | --- |
| P1 · AI View/Validator 命令 | passed + 真实 stdout 入库 | `ai-view` 命令：shadcn/mv definitions+limits、正例 R1-DLG-02 PASS（tier=rendered）、负例 R1-DLG-02 FAIL（reason/repairHint）、toolCount=0 |
| P1 · Consumer 示例 | passed + 真实 stdout 入库 | `rc-consumer` demo：Adapter/browser + profileId=r1-edit-dialog-reference + AI View + EditDialog 渲染证据（role=dialog/aria-modal/cancel+save） |
| P2 · Dialog 清单/页面说明 | 校准完成 | EditDialog 两变体一律阻断 Escape/遮罩（代码事实）；清单第 1 节与页面说明已对齐；Ark 真实 zag 分别说明 |
| P2 · Ark 标签关联 | interaction-verified | 真实 Chrome 点击 Ark「受控：」label → activeElement=`input#ark-controlled`；jsdom 定向测试 2/2（id 渲染 + htmlFor 关联/可聚焦） |
| 受影响浏览器回归 | interaction-verified | 更新后页面加载无 error；shadcn 打开→取消（reason=cancel open=false）、Ark 打开→CloseTrigger（open=false） |
| 旧 NOT-TESTED 项 | 保持 | Escape 键/遮罩/blocking/焦点/Tab 等仍 NOT-TESTED（见第 1 节清单与主附表） |

以上结果**不替代**人工清单与独立 Review；Draft PR #93 停在 AWAITING_INDEPENDENT_REVIEW。
