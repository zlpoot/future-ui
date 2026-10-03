# 契约草案 · Component / Capability / Binding / Plugin

状态：Draft，供 [#2](https://github.com/zlpoot/future-ui/issues/2) 审阅。以下是语义和字段族，不是冻结的 TypeScript API、JSON Schema 或外部协议版本。精确字段、枚举、默认值、扩展策略和 Schema 方言需要后续决策。当前只有 Markdown，无运行实现。

## 公共约定

稳定身份、显式契约版本、输入输出约束、结构化错误是基本要求。运行时不能静默接受不支持的主版本/特性；是否容许未知非关键扩展字段由版本策略明确规定。未实现能力必须报错，不返回假成功。

机器描述只携带数据和受限引用；业务代码由受信任应用注册。元数据不承载 eval、任意脚本或凭据。契约结构合法不等于业务可执行、已授权或实际完成。

## 1. Component Contract

| 字段族 | 语义 |
| --- | --- |
| identity / version / feature set | 组件类型身份、契约版本、支持的公共/扩展特性 |
| props / defaults / constraints | 输入类型、合法默认行为、互斥/组合约束 |
| events | 事件内容、发生条件、顺序和变更来源；不通过事件名暗含业务写 |
| state / ownership | 受控与非受控模式、当前值、disabled/readOnly/loading/error 语义 |
| parts / slots / composition | 必需/可选部件、允许的嵌套关系、稳定部件标识 |
| control interface | 程序化公开动作与状态订阅，不暴露私有实现 |
| accessibility obligations | 名称、键盘、焦点、语义关系以及主题需补足的视觉条件 |
| lifecycle | 实例创建/挂载/卸载与订阅资源回收 |

组件契约分类型定义，不能用一个万能 API 抹平 Dialog 与 Select。公共约定复用，特有保证保留。

设计例子：Select 的 value-change 只报告新选中值；不会自动添加购物车。Dialog 需要可访问名称、焦点进入/返回与关闭语义，但标题可以通过契约允许的不同公开方式提供。

反例：替代 provider 不支持 searchable 却忽略该要求；受控 value 与内部默认值同时当权威；缺少 Dialog 名称但仅靠视觉文字猜测。均应得到明确诊断或被拒绝。

## 2. Capability Contract

| 字段族 | 语义 |
| --- | --- |
| id / version / description | 稳定业务能力身份、语义版本和用途说明 |
| input / output | 可验证输入输出，输出与真实业务结果对应 |
| availability / preconditions | 当前可用条件及可公开的不可用原因；仅为快照，执行前须重验 |
| effects | 本地状态变化、远端业务写、不可逆后果及边界 |
| authorization / confirmation hooks | 应用接入身份、权限、策略和必要确认的接口；描述不是授权 |
| state concurrency | 预期状态版本、冲突与更新返回的语义 |
| idempotency / retry | 业务层支持的幂等范围与重试条件；不支持时明确 |
| execution / cancellation | 等待、执行、完成、拒绝、失败、未知结果；取消不暗示已回滚 |
| failure modes | 稳定错误类别、可安全重试条件、恢复/结果查询方式 |
| visibility / audit | 向 Agent 暴露的最小状态与脱敏审计边界 |

### 贯穿例子：cart.add（设计数据）

输入意图：productId、quantity，以及业务支持时的 expectedCartVersion 与 idempotencyKey。具体命名/必填性待 #2 冻结。

前置条件：商品可售、数量满足业务限制、当前身份可操作目标购物车。效果：修改购物车，不创建订单或付款。成功输出：受影响条目及业务层返回的新状态版本。

正常路径：在受控示例中将商品 A 的数量 2 加入购物车，业务层完成校验与修改，输出真实结果；UI 通过订阅投影更新。

拒绝路径：quantity 不合法或身份无权操作，返回结构化错误，业务写次数应为零。冲突路径：预期版本过期，明确返回冲突，不静默覆盖。重复路径：业务层在定义范围内识别同一幂等键/同一请求；同键不同参数不能被当成相同成功。

未知路径：服务端可能已完成写入，但客户端超时。调用结果必须标记 unknown，优先查询/对账；不把 timeout 当成确定失败后自动再次添加。

这些是要实现并验证的行为，不表示目前存在业务服务。

## 3. Binding Contract

Binding 关联 componentInstanceId、capabilityId、参数来源/映射、草稿/权威状态投影、订阅与生命周期。精确结构待冻结。

必须说明：用户事件何时触发业务动作；Agent 从何处获得参数；哪些状态是只读投影；执行结果如何影响 loading/error/success；并发或过期视图如何处理；页面卸载如何解除绑定。

仅消费公开接口。组件的焦点不必同步给业务服务，业务权限不能由组件状态决定，敏感草稿不能因为绑定存在就全部公开。一个能力可绑定多个 UI 入口，一个表单可整体绑定一个能力，不要求一组件一工具。

反例：按钮内部直接注册 WebMCP；Agent 路径复制另一套提交逻辑；用 provider 私有字段拼出业务状态；卸载后遗留工具注册；收到 Agent 结果就直接改 DOM。上述均违反边界。

## 4. Plugin Contract

字段族：kind、id、version、provides、requires、contract compatibility、feature support、scope、lifecycle。协议/组件/主题插件分类型定义，不共用不受限的万能 hook。

注册时检查依赖和特性；初始化失败清理已创建资源；dispose 解除注册/订阅。应用实例与 SSR 请求隔离。优先安装时可选与启动时配置，不承诺任意 runtime replacement。

不能表达的协议语义需拒绝/限制/明确扩展；不可信描述不得升级调用权。只加载受信任构建内插件，不把 manifest 权限声明当作代码隔离。

## 5. AI 开发目录与诊断

权威契约生成版本绑定的目录、示例和校验资料。诊断候选字段：code、path、expected、actual、explanation、repairHint；路径要能定位到组件/part/约束。

局部修改以稳定节点 ID 和预期版本为前置条件，只作用于目标区域。预览、修改源码、构建与测试由受信开发宿主提供，生产 runtime 默认没有这些能力。

允许局部声明式 UI 描述，但第一版不强制所有页面 JSON 化。采用描述为事实源的区域，生成代码不能又独立手工维护。候选 catalog.get/ui.validate/ui.patch/ui.preview/ui.test 不是已存在工具。

## 接受条件

#2 需要明确上述字段族如何映射为可校验定义，补齐正反例、错误枚举、所有权与兼容策略，并经 Review/负责人接受。之后才可由获 G0 授权的 #6 实现 Schema。每次破坏性变更需同步契约、正反例、生成目录和消费者。
