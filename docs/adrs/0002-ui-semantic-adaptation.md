# ADR 0002：现有 UI 库语义适配，而非新组件库或 AI 控制平台

日期：2026-10-05。
状态：产品方向由负责人在对话中明确确认；本文是文档候选，具体技术 API/版本仍需目标 Issue 的最小确认。范围：定位、架构解释与后续计划，不改已接受公共 Schema 或代码。

## 背景

多个真实工程的 UI 各自可用，却反复出现同类弹窗关闭入口、按钮位置、表单和 pending 行为不一致。负责人明确：不是重新做 UI 库，而是适配现有库，使 AI 稳定开发 UI，再转成类似 WebMCP 的 AI 可读结构。

此前“Control Plane v2、通用事务 patch、复杂任务能力增益、大规模模型优效/不劣效验收”的建议没有贴近这一起点；不作为后续默认主线。CAL-001 原结果保持不变。

## 决定

1. 核心 = Library Adapter + 既有 Contract 的统一语义视图 + Project Profile + AI Projection。
2. UI 库实现组件，Adapter 连接语义和真实用法，Profile 承载项目约定；不复制完整组件库，也不强迁业务工程到新 DSL。
3. 输出分为开发期组件目录、受支持实例结构、显式业务工具。描述可读不意味着可以执行；业务工具必须有 Capability/handler/Binding。
4. 先一个实际库和一个编辑弹窗，再第二工程复用，随后第二库的小范围对照。运行期 WebMCP 为可选后续，不是开发期 MCP 的别名。
5. 保留现有包与回归资产，不删除历史实现，不为每个逻辑模块建立新包。
6. 当前验收以共享规范、真实映射、受控机器结构和功能正确为主；不追求证明模型更强。

## 不能推出的结论

统一契约不保证任意 UI 自动适配；适配支持范围需要明确编写和验证。同一 token 名不保证像素相同；共享设计实值与映射仍必要。缺少训练不是 CAL-001 已证明的因果解释。原生参考 provider 与受控 WebMCP backend 不等于第三方库/最新真实浏览器已兼容。

## 迁移

本次重整 README、AGENTS、charter、ARCHITECTURE、development、benchmark strategy；旧版本保留于 Git 历史。既有 Contract/ADR 与 D10 实验文件不回写。后续编排见 #66，具体实现权限仍读 #4。#13/#14 调整未来导航与范围表达，但不自动勾选验收或关闭历史项。

## 外部参考（2026-10-05 查阅）

- [WebMCP](https://webmachinelearning.github.io/webmcp/)：Web 应用提供 JavaScript tools；当前页面标为 Draft Community Group Report、非 W3C Standard。这里只作为可选协议方向，不把它当通用 UI IR。
- [shadcn MCP](https://ui.shadcn.com/docs/mcp)：现有组件/registry 入口可复用，不要求替换其分发体系。
- [Ark UI MCP](https://ark-ui.com/docs/ai/mcp-server)：现有库的机器查询入口可以作为适配来源，但不能仅凭它推断项目实例和业务权限。

外部文档只支持生态边界说明，不证明 future-ui 已适配这些库。
