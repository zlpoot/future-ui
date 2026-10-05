# 架构与模块边界 · 现有 UI 库语义适配

方向确认：2026-10-05。本文描述目标结构与迁移约束；不是“下面所有能力已经实现”的声明，也不冻结新的公开 API。基线源码为 `453567d875e8a144cb5a59179bd28b64b5970f72`，后续任务见 [#66](https://github.com/zlpoot/future-ui/issues/66)。

## 1. 最小心智模型

```text
现有组件库（shadcn / Ark / MUI / 企业库等）
       ↓ 库适配：来源、版本、props/parts/state/events、差异
Component Contract + Project Profile + 已接入实例描述
       ├→ Dev AI View：组件目录、import、示例、规范、诊断
       └→ Runtime UI View：关系、允许可见状态、交互语义

应用注册 Capability + 实际业务 handler
       ↕ 可选 Binding：实例关联、参数映射、状态订阅、清理
协议中立工具描述 → 可选 WebMCP adapter → Runtime Agent
```

图中是逻辑边界，不要求每框一个 npm 包。UI View 不自动等于工具，也不包含授权；可执行业务工具必须有显式能力和真实 handler。

## 2. 四类核心数据

| 数据 | 权威内容 | 不应包含 |
| --- | --- | --- |
| Component Contract | 稳定组件语义、状态/事件/parts、支持特性、基础可访问性义务 | 特定库私有类型、项目业务处理 |
| Library Adapter 描述 | 上游库/版本或源码标识、实际 import、props/parts/events/state/token 映射、示例、支持限制 | 为凑统一接口而伪造支持 |
| Project Profile | 本组工程的 token 实值/映射、变体、界面组合与交互规则、例外 | 再实现一套组件库或后端权限 |
| 受支持实例描述 | instanceId、组件引用、关系、Profile、必要状态与明确能力引用 | 未经允许的表单值、凭据、私有运行时对象 |

后三项是待设计/接入的最小增量，不表示当前 Schema 已具备这些字段。复用现有 Component/Capability/Binding/Plugin 契约体系；“IR”是同源数据视图，不是另起一套全页面编程语言。

## 3. Adapter 与 framework provider 的区别

Library Adapter 解决组件库语义怎么对应，例如某库的 Dialog close part 如何映射到统一的关闭入口。Framework provider 解决 React/Vue/DOM 的渲染、响应式、生命周期与 SSR 等适用问题。两者可在一个初期实现中组合，但公共语义不得反向依赖 JSX、特定库私有状态或 DOM 内部结构。

适配器声明 supported / partial / unsupported。额外特性用命名空间扩展或明确排除，不静默丢弃。上游升级或源码副本变化，需要重新检查适配边界。跨库共享语义不承诺源码原样运行，也不把原生 Select 等同于所有复杂可搜索选择器。

## 4. 稳定性如何落实

以普通编辑弹窗为例：Project Profile 定义需要标题、可见关闭入口、取消/提交角色和 pending 策略；Adapter 把这些映射到真实库的 composition/props/token；AI View 提供相应示例；验证检查真实适配结果。

规则按场景生效，特殊 blocking 流程需要显式模式/例外。样式规则有共享实值；不能只把两个库不同的 md 当成同一视觉标准。

校验边界必须写清：契约数据校验、受支持渲染的结构校验、实际交互验证三者独立。第一版只覆盖显式接入实例，不承诺扫描任意 React/Vue/DOM 即可完整恢复语义。

## 5. 给 AI 的三种输出

### 开发期目录

提供当前项目实际安装的组件、来源/版本、import、props/parts、示例、Profile 规则和结构化诊断。现有 ai-contract-core 的 Schema 类型目录可以复用，但需要扩展为项目组件目录。开发期 MCP 只是这些公开查询/校验能力的薄适配，不新增通用 shell/文件编辑服务。

### 页面实例结构

对已接入组件输出稳定标识、层级/关系、允许可见的状态、交互语义、诊断和明确的能力引用。运行态通过公开受控接口接入，页面卸载后释放订阅；业务草稿默认不全部可见。此结构即使没有 WebMCP 也有意义，但不冒充 WebMCP 标准 UI Schema。

### 可调用业务工具

由 Capability 的描述/输入输出契约、实际 handler 及可选 Binding 投影。组件事件只表达局部 UI 行为；“保存按钮”不自动给出 model.save 的参数、授权或最终 effect。没有显式绑定时只输出可读结构，不虚构工具。

## 6. 依赖与状态规则（保留既有底线）

- contracts 位于底层。UI/provider/主题与 capability runtime 各自独立；Binding 消费双方公开接口，双方不反向依赖 Binding。
- 业务 handler 由应用注入。人和 Agent 调同一 action，不各写一份业务逻辑。
- 局部 UI 状态归组件，业务草稿归应用，权威业务状态归实际业务执行结果；受控状态不产生双向循环或重复动作。
- capability discover/read 不执行业务写。disabled、可发现性、描述和 Schema-valid 均不是执行权限。
- 服务端负责真实身份、权限、业务校验、幂等与结果；timeout/取消/卸载不表示服务端回滚；unknown write 走对账，不盲重试。
- 开发期目录/源码工具不进入生产 Agent 工具目录；不接模型/协议时 UI-only 仍工作。
- Binding 的 visibility、mutability、redaction 明示，invocation-only 数据不自动进入可读上下文。

## 7. 生命周期、可访问性与替换边界

复用 plugin-kernel 的实例作用域、兼容检查、init/dispose、冲突和失败清理。不新增无消费者的万能 hook；只支持受信任构建内插件，权限声明不是恶意代码沙箱。主题切换可按已有能力使用；有状态行为 provider 的运行时热迁移不在近期范围。

无样式不等于无结构、键盘或焦点语义。结构/行为可访问性由契约与真实适配实现验证；视觉焦点、对比度等由 provider + Profile/theme 组合验证。更换组合不能自动继承原验收结论。SSR/hydration、跨框架与性能只声明实际验证的子集。

## 8. 当前资产的处置

| 当前包/内容 | 保留与调整 |
| --- | --- |
| contracts、plugin-kernel | 保留；新增字段按真实消费者做最小兼容演进 |
| react-provider、conformance | 保留参考实现与回归；不继续扩为独立全量 UI 库 |
| theme | 复用主题能力；Project Profile 的映射和政策层另按最小需求定义 |
| ai-contract-core | 优先补项目安装组件目录、Profile 和有界诊断；NodeStore 保持可用，不扩通用事务平台 |
| ai-dev | 复用受控 preview/test，仅按选定适配器与用例补覆盖 |
| capability-runtime、cart-demo、webmcp-adapter | 保留已有能力/Binding/协议边界；可选小范围验证，不抢占 UI 适配主线 |
| d10-harness / stats | 保留历史实验，不把 dry/模型/浏览器证据互换 |

本轮不删除、不改包名、不改产品源码或公共 Schema。R1 新能力尚未实现；不把当前 package 名称当成已适配 shadcn/Ark/MUI 的证明。

## 9. 外部协议参考

[WebMCP 草案](https://webmachinelearning.github.io/webmcp/)在 2026-10-05 查阅时描述 Web 应用向 Agent 暴露 JavaScript 工具，并标明不是 W3C Standard。它不是本项目的通用组件 Schema。已有本地 WebMCPBackend 与最新浏览器接口是否兼容，需要在 R1-05 按固定规范与真实环境验证；mock 不证明浏览器已支持。
