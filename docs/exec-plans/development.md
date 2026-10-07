# future-ui 后续开发计划 · R1 语义适配与跨工程一致性

日期：2026-10-05；状态同步：2026-10-07。R1-02 已 Done/Closed；R1-003 已登记用于 #69，待 activation sync 合入后 #69 可进入 Ready。动态状态仍只在 GitHub Issue 和 #4。

## 1. 目标与范围

让 AI 基于现有 UI 库，在不同工程默认遵守统一 UI 约定，并输出可理解的结构。不新造组件库，不以“比裸 AI 更强”作为第一版验收前置。

最小范围：一个现有 UI 库、Dialog / Button / TextInput、一类编辑/设置弹窗、一份共享 Project Profile。Select 或更多模式只由真实页面需求触发。

## 2. 当前基础与差距

基线 `453567d875e8a144cb5a59179bd28b64b5970f72` 已存在 contracts、plugin-kernel、react-provider、theme、conformance、ai-contract-core、ai-dev、capability-runtime、cart-demo、webmcp-adapter 与校准脚本；不从零开新框架。

优先差距：真实第三方库适配；项目默认规范的同源引用；项目实际组件目录；受支持实例的机器可读结构与有界检查；两个真实工程复用证据。现有 Schema Catalog 不等于已完成上述组件目录。

## 3. 执行顺序

父项 [#66](https://github.com/zlpoot/future-ui/issues/66)。

| 顺序 | Issue | 最小交付 | 进入条件 |
| --- | --- | --- | --- |
| R1-01 | [#67](https://github.com/zlpoot/future-ui/issues/67) · **Done** | 最小 UI 语义、Library Adapter / Project Profile 契约与 EditDialog 参考场景 | 已完成 |
| R1-02 | [#68](https://github.com/zlpoot/future-ui/issues/68) · **Done/Closed** | shadcn/Radix Dialog / Button / TextInput Adapter + Profile + EditDialog reference | final closeout main `dfd65d7` |
| R1-03 | [#69](https://github.com/zlpoot/future-ui/issues/69) · **R1-003 / activation** | Project AI View、显式实例结构、有界规则校验；开发 MCP 仅作后置只读薄适配 | #68 Done + R1-003；AGENTS activation sync 后 Ready |
| R1-04 | [#70](https://github.com/zlpoot/future-ui/issues/70) | 两个真实工程复用；随后第二库的小范围对照 | 前三项及目标工程/验证授权 |
| R1-05 | [#71](https://github.com/zlpoot/future-ui/issues/71) | 显式 Capability/Binding 到协议工具的可选投影 | #69；独立授权，不阻塞前四项 |

原型与契约在同一小任务内最小充分验证，不为每一层新增冻结阶段。不要同时开五条实现线。

## 4. 已完成阶段与下一导航

- R1-01（#67）已完成契约/规则冻结；真实工程盘点已取消为前置条件。
- R1-02（#68）已 Done/Closed；implementation #76 + closeout #77，final main `dfd65d7`。
- 当前活动项是 R1-03（#69）：Project AI View、显式实例结构与有界一致性校验；Current Grant = **R1-003 (#69 only)**。
- 第二 UI 库与两个真实工程复用仍属于 #70，不应提前到 #69 前执行。
- MCP 在 #69 中只允许作为结构化 API 之后的开发期薄投影；不得把 MCP 反过来变成 Project AI View 的核心数据模型。

## 5. 第一版验收场景

两个工程分别新增或修改一个代表编辑弹窗，使用同一 Profile 和明确的适配版本。允许业务字段不同，不允许通用约定无说明地漂移。

| 用例 | 要看到的结果 |
| --- | --- |
| 正常编辑弹窗 | 标题、关闭入口、取消/提交角色和 pending 按同一 Profile 实现 |
| 删除规定的关闭入口 | 校验报告实例/路径、规则与修复提示 |
| 明确 blocking 变体 | 根据规则例外处理，不误报为普通编辑弹窗 |
| 库/源码/Profile 漂移 | 明确版本或支持性诊断，不悄悄使用旧描述 |
| 输出页面结构 | 组件、关系与允许可见状态可读，敏感字段不默认展开 |
| 无业务绑定的按钮 | 不虚构业务工具或授权 |
| 第二库小范围替换 | 核心语义用例相同，部分支持/视觉差异显式报告 |
| 不安装 Agent 接入 | UI 正常运行，不拉入模型/协议强制依赖 |

首次可用先由实际组件和人工浏览器检查证明；AI 使用 smoke 记录实际工具查询、规范遗漏和人工纠正。它不是大规模优效/不劣效实验，任何新增真实调用单独明确范围/token 预算。

## 6. 既有计划与实验的处理

- #22/#25 等已交付资产保留，已接受契约不被本次文档改写暗中改变。
- #13 保留 AI 开发基础/历史证据职责，连接 #66，不自动将新能力标为完成。
- #14 保留四种模式、解耦、生命周期、可访问性与安全的验收职责；产品一致性证据走 #70。未测试项目不因重新命名而 PASS。
- #23 的 CAL-001 原样保存，未显著提升不等于等效或不劣；“没有专项训练”“TextInput 缺反馈导致失败”都不是已证明因果结论。
- 不批准 134 对扩样，不继续 L0-L4/Control Plane v2 主线，不建立新的统计成功门；未来若需要统计实验，另立问题与预注册。
- 原 CAL-001 的 5M token 是该实验范围，不是新阶段剩余额度池。本轮不发生新模型调用，不要求重新确认实际价格。

## 7. 轻量交付纪律

每个实现项在 #4 明确授权后：读取目标 Issue → 最小契约/兼容边界 → 小改动 → 受影响检查 → 一个 PR → Review → 按授权合入。只有权限/unknown write 等高风险或阶段验收需要独立 Verify。不为文档改动重跑全量模型实验，不增加无收益的 CI 层级。

新 Provider/Profile/schema 实现须保留既有消费者回归。源代码变化才触发相应检查；文档重整做链接、范围和状态一致性检查即可。合并和 Close 仍按当前授权，不由父项或旧 grant 自动推导。

## 8. 历史导航

2026-10-03 的 M0/M1 批次记录仍可从 Git 历史与 [preparation.md](preparation.md) 追踪；本计划替代其“下一步从 #5 开始”的过时执行导航，不修改历史验收结果。
