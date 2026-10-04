# M0-02 契约 Schema 决策冻结提案（D02 / D05(M0) / D06(M0)）

日期：2026-10-04  
状态：**Proposed for #6**。本文件冻结 #6（M0-02 Schema）所需的三个决策：Schema 方言与兼容规则（D02）、Component/Binding 公开字段 M0 最小集（D05 Schema subset）、Capability effect 最小语义（D06 M0）。冻结后 #6 才可能通过 DoR 进入 Ready。合并须经负责人接受（Contract gate，merge=human）。

## 目标

为 #6 提供框架无关的 Component / Capability / Binding / Plugin 契约 Schema、版本规则与正反例的可实现基础；让机器可读 AI 开发能力成为首个直接消费者之一（#22 的 catalog/validate/diagnostics/patch primitives）。本文件只冻结 Schema 语义与字段族，不冻结 runtime 执行、浏览器、模型与发布（D06(M1)、D07(M1)、D13 保持 Deferred）。

## D02 · Schema 方言、生成方向、未知字段与兼容规则（M0 冻结）

### 候选与取舍

| 候选 | 方向 | 取舍 |
| --- | --- | --- |
| A. JSON Schema 为单一权威，生成 TS 类型/目录/校验 | Schema → TS + catalog + validators + diagnostics | **冻结采用**。机器消费直接、无运行时依赖；#22 catalog/validate 可直接以 JSON Schema 为事实源；校验只验结构、不 eval，满足“声明数据不携带可执行 JS” |
| B. TS 类型为单一权威，Schema 由 TS 生成 | TS → Schema | 需引入类型反射/代码生成工具链，M0 增加依赖面；暂不采用 |
| C. zod/valibot 运行时校验为权威 | Runtime → 双产 | 与“声明数据不能携带任意可执行 JS、handler 由受信任应用注册”的边界冲突；暂不采用 |

### 冻结规则

1. **单一权威**：JSON Schema Draft 2020-12 是契约的单一权威来源；TypeScript 类型、机器目录（catalog）、校验资料与诊断样本均由 Schema 生成或对齐。不维护第二套平行 schema（对应 #2 公共接受条件）。
2. **生成方向**：Schema → TS 类型 + catalog（按版本绑定的机器目录）+ validators + diagnostics。M0 不要求自动代码生成器存在，但结构必须可生成、可对齐；#22 实现时以 Schema 为输入。
3. **未知字段策略**：默认 **strict reject**（`additionalProperties: false`）。未知字段返回结构化诊断（`unknown_field` + path），不静默忽略。扩展必须通过显式 extension registry（带版本）声明，不允许消费者静默携带未知非关键字段。
4. **版本规则**：契约版本采用 semver。
   - major：破坏性变更（删除/重命名字段、改语义）。消费者遇到未知 major → 拒绝并返回 `unknown_major_version`，不降级、不猜测。
   - minor：向后兼容扩展（新增可选字段、放宽约束）。
   - patch：修正描述/默认值，不改变结构。
   - 校验器/消费者只接受其声明支持的版本范围；未知主版本是硬错误。
5. **诊断结构**：稳定 `code` + `path`（JSON Pointer）+ `expected` + `actual` + `explanation` + `repairHint`（可选）。路径定位到 component/part/constraint 粒度。
6. **不变量**：
   - schema-valid ≠ authorized ≠ executed ≠ completed。可发现性不等于权限。
   - 契约结构合法不授予业务执行/权限或 live 信用。
   - 声明数据不携带任意可执行 JS；handler 由受信任应用注册。
   - 未知结果必须有稳定调用关联与 reconciliation 句柄。

### M0 错误码子集（正反例与诊断共用）

`unknown_major_version`、`unknown_field`、`missing_required`、`type_mismatch`、`constraint_violation`、`invalid_combination`、`conflict`（版本过期/状态冲突）、`unauthorized`、`unavailable`、`capability_conflict`、`unsupported_feature`、`node_not_found`（#22 patch 定位用）。

## D05(M0) · Component/Binding 公开字段最小集

### Component Contract（M0 最小字段）

| 字段族 | 冻结字段与语义 |
| --- | --- |
| identity | `componentType`（稳定字符串标识，如 `dialog`/`select`）+ `contractVersion`（semver）。组件契约分类型定义，禁止万能组件接口抹平差异 |
| features | 支持的公开特性集（枚举/布尔），未实现特性必须显式声明缺失 |
| props | 名称、类型、默认值、约束（required/optional、互斥与组合经 allOf/oneOf 表达） |
| events | 事件名、payload 结构、发生条件与顺序说明；事件名不隐含业务写 |
| state | `ownership`（controlled/uncontrolled）、当前值、`error`/`loading`/`disabled`/`readOnly` 语义 |
| parts / slots | 稳定部件标识（partId）、必需/可选部件、允许嵌套关系 |
| control interface | 程序化公开动作（方法名、参数、订阅句柄）；不暴露私有实现 |
| accessibility obligations | M0 声明结构/行为层义务（名称、键盘、焦点、语义关系）；视觉义务（焦点可见性、对比度）由 provider + theme/consumer style 组合验收，headless 通过不泛称任意样式组合“完全可访问” |
| lifecycle | 实例创建/挂载/卸载与订阅资源回收 |

### Binding Contract（M0 最小字段）

| 字段族 | 冻结字段与语义 |
| --- | --- |
| identity | `componentInstanceId`（稳定节点 ID）+ `capabilityId` |
| params | 参数来源（userEvent / agent / discovery）与字段映射 |
| projection | `source`、`direction`、`agentVisibility`（显式 allowlist）、`mutability`（只读投影）、`redaction`（脱敏） |
| invocation-only | 仅业务调用内部取值的参数可参与 invocation，但不自动进入 discovery/read context |
| subscription / lifecycle | 订阅关系与页面卸载解除绑定 |

反例（应被拒绝并给出结构化诊断）：按钮内部直接注册 WebMCP；Agent 路径复制第二套提交逻辑；用 provider 私有字段拼业务状态；卸载后遗留工具注册；收到 Agent 结果直接改 DOM；组件进入 Binding 自动公开全部状态。

## D06(M0) · Capability effect 最小语义

### 冻结字段族

| 字段族 | 冻结语义 |
| --- | --- |
| id / version / description | 稳定业务能力身份、semver、用途说明 |
| input / output | 可验证输入输出；输出与真实业务结果对应 |
| availability / preconditions | 当前可用条件与可公开不可用原因；仅为快照，执行前须重验 |
| effects | 本地状态变化、远端业务写、不可逆后果及边界 |
| authorization / confirmation hooks | 应用接入身份、权限、策略、确认接口；描述不是授权 |
| concurrency | 预期状态版本（如 `expectedCartVersion`）、冲突返回语义；不静默覆盖 |
| idempotency / retry | 业务层支持的幂等范围与重试条件；不支持时显式声明 |
| invocation / receipt / reconciliation | 调用唯一身份（invocationId）、业务执行/回执标识、unknown 结果的查询/对账句柄；与幂等键和审计链的关系 |
| execution / cancellation | `pending`/`executing`/`completed`/`rejected`/`failed`/`unknown`/`cancelled`；取消不暗示已回滚 |
| failure modes | 稳定错误类别、可安全重试条件、恢复/结果查询方式 |
| visibility / audit | Agent 可见最小状态 allowlist 与脱敏审计边界 |

### 不变量（M0 冻结）

- **invocation identity ≠ idempotency key**。同键不同参数不能被当成相同成功。
- unknown 结果必须携带或可推导查询/对账句柄；timeout 不视为确定失败后自动重放。
- schema-valid ≠ authorized ≠ executed；可发现性不等于权限。
- 声明数据不携带 eval/凭据；handler 由受信任应用注册。
- 取消不暗示回滚；冲突不静默覆盖。

### 贯穿正反例：`cart.add`

正例：输入 `productId`、`quantity`、业务支持时的 `expectedCartVersion` 与 `idempotencyKey`；前置校验（可售/数量/身份）通过后写入业务层，返回受影响条目与新状态版本，输出与真实业务结果对应；UI 通过订阅投影更新。

反例（均应结构化诊断）：quantity 不合法或无权 → `constraint_violation`/`unauthorized`，业务写次数为零；预期版本过期 → `conflict`，不静默覆盖；同键不同参数被当作相同成功 → 拒绝；客户端超时但服务端可能已写入 → 返回 `unknown` 并携带查询句柄，不自动再次添加。

## #2 最小契约（M0 冻结范围）

本文件冻结 #2 对 #6 的最小契约：上述 Component/Capability/Binding 字段族 + Plugin 最小字段（kind/id/version/provides/requires/compatibility/scope/lifecycle，M0 仅冻结 app/request scope、manifest、init/dispose、冲突与失败清理所需的语义）+ 版本/未知字段策略 + 错误诊断边界。Plugin 的完整扩展点（component/theme/capability/protocol hook）由真实消费者首次接入后再收敛，不预先设计万能 hook。

## 验收对照（#6）

- [x] 每类契约具备版本、身份、必要字段和严格校验；Capability Schema 含 D06(M0) 最小 effect/authorization/invocation/receipt/idempotency/unknown reconciliation 语义。
- [x] 无效组合、未知主版本、缺语义字段、能力映射冲突返回结构化诊断（code/path/expected/actual/explanation）。
- [x] 组件特定语义保留（按 componentType 分类型定义），不使用万能组件接口。
- [x] 声明数据不携带可执行 JS；handler 由受信任应用注册。
- [x] 正反例覆盖公开边界（本文件 + 后续 Schema 正反例资料）。
- [x] 核心产物不依赖 React、Vue、Ark UI、WebMCP 或模型 SDK。
- [x] Contract/Schema 单一权威来源（JSON Schema 2020-12），机器目录/校验资料可由其生成。
- [x] 为 #22 的 catalog/validate/diagnostics/patch primitives 提供稳定机器消费边界；缺口回到 #2/#6 修正。
- [x] Schema 仅表示结构合法，不授予业务执行/权限或 live 信用。

## 官方/上游依据

查阅日期：2026-10-04。

- JSON Schema Draft 2020-12 规范：https://json-schema.org/draft/2020-12/release-notes
- JSON Schema 规范站点：https://json-schema.org/
- JSON Pointer RFC 6901：https://www.rfc-editor.org/rfc/rfc6901
- SemVer 规范：https://semver.org/

## 待冻结/保持 Deferred

- D06(M1) runtime 执行、恢复、业务对账完整语义（#9/#10 前冻结）。
- D07(M1) 浏览器/SSR-hydration 支持矩阵与完整可访问性矩阵（#7 只冻结 M0 最小隔离规则）。
- D03/D04 provider 与首批组件（#16/#18 前冻结）。
- D13 公开许可、npm 发布与供应链（发布前）。

## 修订记录

- 2026-10-04：初始提案，冻结 D02/D05(M0)/D06(M0) 与 #2 最小契约范围。
