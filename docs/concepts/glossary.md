# 术语

| 术语 | 本项目含义 |
| --- | --- |
| UI 契约 | 一种组件在属性、事件、状态、组成部分、组合和交互方面的公开承诺 |
| Provider | 实现某类组件契约的交互实现，可复用成熟库，不等于业务服务 |
| Renderer / framework adapter | 把契约和实现连接到具体前端框架的渲染、响应式与生命周期 |
| Headless / 无样式 | 不强制视觉皮肤，但仍有明确语义、交互和可访问性义务 |
| Theme / 视觉插件 | token、外观、变体、密度等可选视觉方案，不决定业务 effect |
| Component action | 局部组件操作，如展开、选择、设置值，不自动成为业务工具 |
| Capability / 业务能力 | 应用显式声明的可验证功能，含输入输出、条件、effect 与错误 |
| Capability runtime | 管理能力及受控调用的框架模块，不是模型推理循环 |
| Binding | 将组件实例、业务草稿、能力及结果投影关联起来的可选连接 |
| Protocol adapter | 向 WebMCP 等外部协议映射能力的插件，不改变核心权限边界 |
| AI development tooling | 面向写代码/修改界面的 AI 的开发期工具，不是网站运行期工具 |
| Contract source of truth | 权威契约定义；机器目录和示例应尽量由其生成，不四份手动同步 |
| Conformance | 用相同语义用例检查不同框架/provider 是否履行公开契约 |
| Effect | 操作实际造成的本地/远端变化及后果，不是能否点击的布尔标签 |
| Unknown result | 请求可能已执行但结果未确定；不同于失败，也不能盲目重试 |
| G0 | 人工开发启动门禁；文档接受不自动授予开发权限 |
| Draft / Proposed | 已记录的候选设计，不等于已接受规范或已实现能力 |
| Not tested / Deferred | 未测 / 明确延期，均不是通过 |

WebMCP 在这里是外部 Web 能力接入方向，不是本项目自带的完整 Agent 编排框架。具体 API 与支持环境须在适配任务前核验。
