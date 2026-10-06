# R1-01 最小 UI 语义 / Library Adapter / Project Profile 冻结提案（D15 / D16 / D17）

日期：2026-10-05  
状态：**Accepted for #67（2026-10-06）**。PR #73 exact head `ba6e51465c8cff342b7375eb8fbbc1e5a05d8836` 经独立增量 Re-Review PASS（review `5427970808`）并获负责人明确授权，已 squash merge 到 main @ `2b884ec791c91960bdf2788ab8119756c647f178`。D15 / D16 / D17 自该 main baseline 起生效。#68 可把这些决策作为 DoR 输入，但 #68 本身仍需新的 Current Grant；本接受不授权产品源码、公共 Schema、依赖、模型调用或真实工程写入。

Rev.2 依据 PR #73 的独立 Review（id `5416931433`，**CHANGES REQUIRED**，exact head `6c64d5a`）修订，只闭合该 Review 列出的歧义：D15 映射覆盖面与逐域覆盖状态、D15 版本字段收敛为单一字段、`libraryIdentity` 改为不可变来源优先、D16 增加 alias/ratio 解析不变量、`R1-DLG-08` 增加 blocking operability 不变量。方向、范围与兼容边界未变。

Rev.3 依一次**补充性对抗审阅**（作者侧独立 session，用于找出「按字面仍可违规」的构造；**不代替**负责人 Review）闭合 Rev.2 的残留：D15 覆盖改为**成员级**并要求契约实例锚点与等价性依据、`not-applicable` 限定为成员级；D16 的 `ratio` 补齐 `base` 存在性、维度/单位可比性与失败报错；`R1-DLG-08` 增加**有限步内可达终止状态**、失败兜底、跨实例循环禁止与例外不可豁免；`toolingProvenance` 与 digest 口径落位；并修复 Rev.2 自身引入的措辞不一致。该审阅同时确认两项已闭合：**版本字段收敛**（Rev.1 的 `adapterVersion` 与独立 `contractMajor` 已彻底移除，全仓库无残留表述）与 **`libraryIdentity` 不可变来源优先**（不可变来源优先、CLI version 降为工具链来源）。

Rev.4 依对 Rev.3 的**同一次对抗验证**（上一轮 9 个反例全部 NOW BLOCKED）闭合 Rev.3 自身引入的缺陷：统一 operability 不变量编号口径（检查方式移出编号列表；不可豁免集合固定为 **1–8**，第 9 条是不可豁免条款本身）；`R1-DLG-08` 的例外列改为「无」，与第 9 条一致；token 解析不变量删除重复的 `literal` 条目，补 `dimension` / `unit` 的**声明式封闭集合**与 canonical unit、`unitless` ratio 的合法性条件、以及「未解析出唯一终值」的报错项；`inherited-equivalent` 依据补齐核验判据；「有限步」明确为可枚举的有限动作序列；Rev.3 说明中的**审阅项编号（悬空标签）**改为自含表述；`decision-register` 的 D16 任务归属与 D17 编号口径对齐。

## 目标

为 R1 的最小闭环「已有 UI 库 → 版本化 Library Adapter → 既有 Component Contract + Project Profile → AI 可读结构 → 真实工程复用」提供**前三段**的可审阅约定，并让三类一等消费者（UI/provider、开发 AI、运行期 Capability/Agent）读同一份事实源，而不是各自维护文本。

本轮边界（负责人 2026-10-05 指示）：

- 取消 Model Hub / bilibili docs / MV 制作三工程只读盘点，不作为 R1 前置条件。
- 「两个真实页面试点」改为 **EditDialog 参考场景设计**；首个 Adapter 验证对象固定为 **shadcn/React**。
- 真实工程复用验证推迟；收口后进入 #68。

只读盘点基线（`e8e084b`，main）事实：

| 事实 | 值 |
| --- | --- |
| `Project Profile` / `Library Adapter` / `IR` 实现 | **无任何实现或占位**；定义性说明见 `ARCHITECTURE.md:26-30`、`charter.md:37-39`（另见 `charter.md:47` 对 IR 的界定）、`adrs/0002:14`、`development.md:37`（Profile / Adapter 分工） |
| 既有并列契约 | Component / Capability / Binding / Plugin（6 个 schema，`$id` 冻结） |
| `CONTRACT_MAJOR` | `1`；未知 major → `unknown_major_version` 硬拒绝 |
| core 错误码 union | **已冻结 12 个**，新增属破坏性 |
| 组件契约中的 `variant` / `size` | **不存在**（四组件契约零命中；`size` 仅在 `Map.size` 出现） |
| `componentInstanceId` | 已冻结为**裸字符串 + stable node id 语义** |
| `ThemeDefinition` | 无 `version` 字段；`name` 是唯一标识位 |
| catalog / validate / patch / preview / test | 已实现；`preview` 仅支持 `button` \| `select` |

## D15 · Library Adapter 描述（R1 冻结范围）

### 候选与取舍

| 候选 | 方向 | 取舍 |
| --- | --- | --- |
| A. 声明式 Adapter 描述，作为**并列**契约（新 `$id`/新文档），复用既有版本语义 | 新契约类型 + 新 schema（将来） | **冻结采用**。不触碰既有 6 个 `$id`、不动 `CONTRACT_MAJOR`、不加错误码；`additionalProperties:false` 的严格性不受影响 |
| B. 给既有 Component Contract 增加 library/provider 字段 | 改冻结 schema 本体 | 暂不采用。`additionalProperties:false` 下新增顶层字段必须改冻结 schema；且会把「某个库」焊进库无关的公共组件契约 |
| C. 由 framework provider（`react-provider`）承担库适配 | 复用 provider | 暂不采用。provider 解决**框架**适配；Library Adapter 解决**具体 UI 库的组件来源、版本与差异**，二者不是同一层（`ARCHITECTURE.md:32-36`）。注意既有命名易混：`webmcp-adapter` 是 Protocol adapter，`react-provider` 是 framework adapter |

### 冻结规则

1. **身份字段**：Adapter 必须声明稳定 `adapterId`（kebab-case，如 `shadcn-react`）、`targetLibrary`、`libraryIdentity`（不可变来源标识，见下「上游标识」）、可选的 `toolingProvenance`（工具链来源，**非身份**，见下），以及**唯一**的契约版本字段 `contractVersion`（semver）。
   - **版本字段只有一个**：不新增 `adapterVersion`，不新增独立的 `contractMajor` 字段，不引入 `schemaVersion`。
   - `contractVersion` 的 major 必须等于既有 `CONTRACT_MAJOR = 1`；未知 major 沿用既有 `unknown_major_version` **拒绝**，不降级、不猜测。
   - 若 #68 之后确实需要区分「Adapter 映射实现版本」与「契约版本」，必须先走 #2 决策流程单独论证，**不得先加同义或并行版本字段**。
2. **映射覆盖面（成员级）**：Adapter 必须对**被映射组件契约实例**的每个域与其中每个成员给出结论，并记录该组件契约的 `componentType` 与 `contractVersion` 作为锚点（缺失锚点的映射表不可判定，视为无效）。
   - **域清单**：以该组件契约实例为准——Component Contract 的 8 个 required 域（`features`、`props`、`events`、`state`、`parts`、`control`、`accessibility`、`lifecycle`，见 `packages/contracts/schemas/component.schema.json:7`）恒在；另加 Profile 侧视觉层 `token`。
   - **成员级完整性**：每个域必须逐一列出该契约实例中**实际声明的成员**（如 `features` 的每个布尔项、`props` 的每个 prop、`parts` 的每个 part、`control` 的每个方法、`accessibility` 的每个布尔项），并对**每个成员**给出结论。**域级结论不能替代成员级结论。**
   - **覆盖状态**：`mapped`（已映射）/ `inherited-equivalent`（由目标库原生等价语义直接满足，**必须给出可核对的依据**——依据须能定位到上游库的具体组件或机制（外部文档位置或源码位置），核验发生在 #68 的映射评审并由评审者按该定位复核；无依据不得使用）/ `unsupported`（未覆盖）。`not-applicable` **只允许出现在成员级**，且仅当该成员在该契约实例中确实不存在时，并须能对应到契约实例。
   - **禁止域级 `not-applicable`**：8 个 required 域均为 schema 强制存在，**不得标 `not-applicable`**；`token` 是 UI 库适配的必需视觉面，**同样不得标 `not-applicable`**（零视觉映射不得因此获得 `supported`）。
   - **不得与契约矛盾**：任何结论不得与该契约实例的声明相反（例如契约声明 `lifecycle.requiresCleanup = true` 时，不得写成 false 或不清理）。
   - **组件级状态**：`mappingStatus = supported` 只有在**全部成员**都有结论且无 `unsupported` 时才成立；出现任一 `unsupported`、或任何**缺结论**（含域内成员未列全）⇒ 最高 `partial`。缺结论不得被默认为已覆盖。
   - **Dialog 的风险点**：`features` 的 `open` / `escapeClose` / `focusTrap` / `focusRestore` / `accessibleName`，`accessibility` 的 `role` / `keyboard` / `focus` / `semanticRelations`，`control` 的 `open` / `close` / `focus`，`lifecycle.requiresCleanup = true`（见 `packages/react-provider/src/dialog-contract.ts`）。"只映射 props / parts / events / state"、或"域有结论但域内成员没列全"，都属**明确禁止**。
3. **不静默丢特性**：任何未映射或行为不同的上游特性必须显式标为 `partial` / `unsupported` 并给出原因与影响；**禁止**把不支持当作支持、禁止静默退回自研组件。（延续 D04「未支持特性显式声明缺失，不静默降级」）
4. **禁止编造标识与依据**：上游版本/源码标识未核验时写 `TBD` 并注明核验时机；`inherited-equivalent` 的等价依据同样必须可核对，未核验时不得填写，也不得用 `inherited-equivalent` 规避成员级结论；不得填写未验证的版本号、commit、registry 条目或等价性依据。
5. **职责分离**：Adapter 只描述**库固有语义与映射**。项目侧规范（关闭入口、操作角色、pending、尺寸档位等）由 Project Profile 承载，不得写死在 Adapter。
6. **声明式数据**：Adapter 是纯数据描述，不携带可执行 JS、不做 eval（与 `docs/contracts/README.md` 公共约定一致）。
7. **版本规则单一来源**：Adapter 的版本语义完全沿用既有 D02 规则（major 破坏性、minor 向后兼容、patch 不改结构；未知 major 拒绝不降级），由身份字段中**唯一**的 `contractVersion` 承载并与 `CONTRACT_MAJOR` 比较。**不引入 `schemaVersion`**，也不引入 `adapterVersion` / 独立 `contractMajor` 等同义或并行字段。上游库版本变化由 `libraryIdentity` 表达，不占用契约版本字段。
8. **首库冻结**：R1 首个 Adapter 的验证对象 = **shadcn/React**。该选择不排除第二库，也不预先承诺全量 MUI / Ark / AntD / Vue 支持。

### 上游标识（不可变来源优先）

shadcn/ui 以**源码分发 + registry/CLI** 为模型：registry 内容会随时间变化，组件复制到工程后还可能被本地修改。因此**组件源码身份不能由 CLI 版本单独证明**。冻结规则：

1. `libraryIdentity` **以不可变来源标识优先**：registry / source URL + **commit 或 content digest**（二者至少有其一；两者都有时以 content digest 为准）。
2. CLI version **只能作为 tooling provenance**：登记在 Adapter 的 `toolingProvenance` 字段（见规则 1 的身份字段列举，**与 `libraryIdentity` 平级、不放在其内部**），形如 `toolingProvenance.cliVersion`。它**不得**用作 `libraryIdentity` 的主键，也不得用来代表组件源码身份。
3. **digest 口径必须与值一起记录**：content digest 必须同时写明**算法**与**覆盖范围**（以交付的组件源文件为单位；是否包含其直接依赖须显式声明）。口径未确定时写 `TBD`，**不得只给一个孤立 digest 值**（无法核对的值等同未核验）。
4. 若组件在复制后被本地修改，必须额外记录 **local content digest 与 patch provenance**（补丁的稳定标识，如来源 PR / diff 摘要；具体承载位置随 #68 的 Adapter 结构一起定），不得让本地改动看起来像上游原样。
5. 同时记录 React 主版本（仓库既有 peer 约束 `react/react-dom ^19.2.0`，见 `packages/react-provider/package.json`）与样式层依赖版本（token 实值与尺寸档位落在样式层）。
6. **具体取值在本文件保持 TBD**（理由：本轮无依赖安装授权、无真实工程可核对）。确认时机：`#68` 获得代码与依赖授权时，或在真实工程可访问后。本文件冻结的是**标识规则**，不是取值。

## D16 · Project Profile（R1 冻结范围）

### 候选与取舍

| 候选 | 方向 | 取舍 |
| --- | --- | --- |
| A. Profile 独立成文：token 实值/映射 + 尺寸档位 + 变体 + 弹窗规范 + 显式例外 | 单一事实源；Adapter 实现映射、AI View 读取 | **冻结采用**。满足 `development.md:37`「不维护三份独立文本」 |
| B. 规范分散写进各 Adapter | 每库一份 | 暂不采用。跨工程复用时会产生 N 份规范副本，正是本项要消除的问题 |
| C. 只统一 token 名称，不落实值 | 名义统一 | 不采用。违反 `AGENTS.md`「共享视觉必须有实值/映射，不能只统一 token 名称」 |

### 冻结字段族

| 字段族 | 语义 |
| --- | --- |
| `identity` | `profileId`、`profileVersion`（semver）、`scope`（适用工程；未核验写 `TBD`） |
| `tokens` | `tokenKey → { kind: literal \| alias \| ratio, ... }`。三种 kind 的字段与解析规则见下「token 解析不变量」；**必须区分实值、引用与比例**，不得只登记名称 |
| `sizes` | 尺寸档位必须以**实值或可解析比例**表达（如控件高度、间距档位），并与库自身命名解耦；使用 `ratio` 时必须声明 `base`（存在的 token）、`factor` 与 `dimension` / `unit`，且与 base 可比或有显式换算 |
| `variants` | `variantId → token 覆盖`；未知 `variantId` 的行为必须显式声明（报错或忽略），不得默认静默降级 |
| `dialogConventions` | 标题、关闭入口、操作角色、pending、重复提交、blocking 变体规则（见 D17） |
| `exceptions` | 显式例外：`exceptionId` + 适用规则 ID + 适用场景 + 理由 + 失效条件 |

### token 解析不变量（冻结）

1. `kind: literal`：带实值 `value`（含单位，或明确的无单位约定）。`dimension` 可省略，省略即表示 **unitless**；无单位 `literal` 只能作为 `dimension: unitless` 的基准。
2. `kind: alias`：必须引用**同一 Profile 内存在**的 `tokenKey`；解析链**有限且无环**——口径统一为「链上出现的不同 `tokenKey` 数 ≤ 16」（该数值是 fail-closed 上限，不是语义保证），且**最终必须落到 `literal`**。
3. `kind: ratio`：必须显式声明 `base`（**引用的 `tokenKey`，且该 token 必须存在**）、无量纲正数 `factor`，以及 `dimension` / `unit`。
   - `base` 必须能解析出**已知且已声明**的 `dimension` / `unit`；ratio 自身的 `dimension` / `unit` **必须与 base 一致**，或在同一 Profile 内给出**显式换算**（不得隐含、不得依赖数值巧合）。
   - **`unitless` 的 ratio 仅在 base 亦为 `unitless` 时合法**；其余 unitless 组合必须报错。
   - **裸比例值（如 `1.25x`）不合法**；`base` 写成「命名基准」而不指向任何已定义 token 时**不合法**。
4. **`dimension` 与 `unit` 必须在 Profile 内声明一次并作为封闭集合使用**：最小可用集合为 `length` / `duration` / `unitless`（按需扩展必须显式登记，不得就地发明）；每个 `dimension` 必须声明一个 **canonical unit**，其它单位必须给出到 canonical 的**显式换算**。
5. **解析失败必须报错**（fail-closed：不得静默回退为空值、原样透传或猜测默认值）。至少覆盖这些条件：目标 token 不存在；`base` 未定义或指向不存在的命名基准；成环；超深（> 16）；缺 `factor` / `dimension` / `unit`；base 与 ratio 的 `dimension` 或 `unit` 不一致且无显式换算；`factor` 非正或带维度；**未能解析出唯一确定的终值**。
6. 任一 `tokenKey` 与任一 `sizes` 档位必须能解析出**唯一确定的终值**；这是跨库映射可提供稳定实值的前提（对应 `AGENTS.md`「共享视觉必须有实值/映射，不能只统一 token 名称」）。

### 与既有 theme 契约的边界

D16 的 `tokens` / `variants` 是 **Project 层数据**（`tokenKey → { kind, ... }`），与既有 `future-ui.theme` Component Contract 的 `props.tokens`（CSS 变量名 → 值）、`props.variants`（`variantId → token 覆盖`）、`props.defaultVariant`（见 `packages/theme/src/theme-contract.ts`）**不是同一对象**。二者的分工与 `D08` 一并冻结；**本轮不改 theme 契约**，也不在本轮声称 D16 取代它。

### 不变量

1. Profile 是项目约定的**唯一事实源**：Adapter 实现映射，AI View 读取，不各自维护副本。
2. token 名相同**不保证**像素或尺寸相同；不同库的 `md` 同名不等于同尺寸（对应 `adrs/0002`「不能推出的结论」）。
3. 例外必须可枚举、可定位；不得用「通常如此」隐含例外。
4. **状态值默认最小暴露**：Profile 与实例中的字段默认**不**进入 Agent 可读上下文；可读字段走显式 allowlist（对应 D05 的 Binding 数据投影边界）。
5. Profile 不授予任何业务执行权限；Schema-valid 或可读不等于已授权。

## D17 · EditDialog 最小 UI 语义规则集（R1 冻结）

### 三类对象必须分开（#67 验收项）

| 对象 | 含义 | 本轮状态 |
| --- | --- | --- |
| 组件定义 | 库无关的 `ComponentContract`（`future-ui.dialog` 等） | 已存在并已冻结（D05(M0)，`contractVersion 1.0.0`）；**本轮不改** |
| 页面实例快照 | 某页面中一个具体 Dialog 实例的引用 | 语义已冻结（`componentInstanceId` = stable node id，格式 `` `${kind}:${name}` ``，见 `stableNodeIdFor`）；**结构化实例描述 Deferred 到 #69**，本轮不改该字段类型 |
| 可调用业务工具 | `Capability`（+ 可选 `Binding`） | 独立契约；UI 可读结构**不自动**产生业务工具 |

### 冻结规则表

| 规则 ID | 规则 | 适用范围 | severity | 例外机制 | 检查方式 |
| --- | --- | --- | --- | --- | --- |
| `R1-DLG-01` | 弹窗必须有可访问名称（`title` part 或契约允许的等价公开方式） | 普通编辑弹窗 + blocking 变体 | error | 无 | 结构检查：root 的可访问名称来源存在 |
| `R1-DLG-02` | 必须存在**显式**关闭入口（操作区取消动作或关闭控件）；Esc / 遮罩关闭只能作为**附加**通道 | 普通编辑弹窗 | error | blocking 变体见 `R1-DLG-08` | 结构检查 + 交互检查（键盘路径不得是唯一路径） |
| `R1-DLG-03` | 操作区必须有明确角色：主要动作 + 取消动作，且顺序与位置由 Profile 固定 | 普通编辑弹窗 | warning | 单动作确认弹窗需登记 `exceptionId` | 结构检查 |
| `R1-DLG-04` | 主要动作 pending 期间必须阻止重复提交 | 两变体 | error | 业务声明幂等且明确允许时登记例外 | 交互检查 |
| `R1-DLG-05` | pending / 提交中不得无提示静默关闭并丢弃；**取消不等于回滚** | 两变体 | error | 无 | 交互检查 + 状态与文案检查 |
| `R1-DLG-06` | 打开时焦点进入弹窗，关闭后焦点返回触发点 | 两变体 | error | 无 | 交互检查（对应既有 `focusTrap` / `focusRestore` feature） |
| `R1-DLG-07` | 弹窗内部草稿状态与字段值默认**不**进入 Agent 可读上下文 | 两变体 | error | 显式 allowlist 登记 | 投影检查 |
| `R1-DLG-08` | `blocking` 变体必须**显式声明**（`declared: true` + 阻塞原因 + `closePolicy`），**并且必须存在可见、可达、可执行、且在有限步内可达终止状态的 resolution path**（见下「blocking operability 不变量」）；**不得靠隐藏关闭入口伪装 blocking，也不得让用户无终止路径地被困** | 显式 blocking 变体 | error | **无**——operability 不变量 1–8 不可豁免；`exceptionId` 只能用于放宽 `R1-DLG-02` 的普通关闭入口 | 结构检查 + 声明检查 + 可达性检查 + 终止性检查 |

规则 ID 是稳定标识：新增规则用新 ID；改变既有 ID 的含义属破坏性变更。

### blocking operability 不变量（冻结）

`R1-DLG-02` 与 `R1-DLG-08` 的关系由此说清：**blocking 是「关闭受条件约束」，不是「可以没有任何结束路径」。**

1. `blocking: true` 时，必须存在**可见、可达、可执行**的 resolution path（解除阻塞或完成流程的显式动作）。
2. `closePolicy` 必须**指出**哪一条动作构成该 resolution path；只写「不可关闭」不满足本规则。
3. 禁止出现**无终止路径的永久 focus trap**（用户既不能完成，也不能退出）。
4. 若业务确实要求不可退出，必须声明**系统侧终止/跳转条件**（如会话失效、外部状态变更、返回上一流程），不得仅声明「不可关闭」。
5. **有限步内必须可达终止状态**：只保证「路径存在且可点」不够——resolution path 必须在**有限步内**到达终止状态（完成或退出）。「有限步」指 Profile 必须写出**可枚举的有限动作序列**（不设数值上界，但序列必须有限且每步可执行）。若路径动作可能失败，必须声明**失败兜底**（`retryLimit` 必须是有限值 + 失败后仍可达的出口）；「动作永远失败」不得成为合规的永久阻塞。
6. **禁止跨实例循环死锁**：resolution path 的动作不得打开另一个 blocking 实例，除非该实例存在**不回到本实例**的终止路径；两个 blocking 实例互为唯一出口属禁止。
7. **系统侧终止条件必须可发生**：第 4 条要求的系统侧终止/跳转条件必须给出**可判定的触发条件**（谁、在什么条件下触发），不得只写「最终会结束」。
8. **`reason` / `closePolicy` / `resolutionPath` 必须互相一致**：路径集合必须真的能解除 `reason` 描述的状态（例：「存在未保存变更」+「放弃变更并关闭」属一致；若 `reason` 是「必须先完成同步」，则「放弃」不构成解除）。
9. **不可豁免**：本 operability 不变量（1–8）**不因 `exceptionId` 而豁免**。例外只能用于放宽 `R1-DLG-02` 的普通关闭入口要求，不得取消「必须存在有限步内可达的终止状态」。
检查方式（对应上列 1–9）：结构检查（resolution path 控件存在）+ 可达性检查（自打开状态可达且不被自身条件互锁）+ **终止性检查**（有限步内可达终止状态、失败有兜底、无跨实例循环）。

### 诊断映射（本轮不实现）

本轮**不新增 core 错误码**（12 个已冻结，`packages/contracts/src/diagnostics.ts`）。规则 severity 到具体诊断码的映射在 #68 / #69 决定，且**必须使用独立命名空间**（既有先例：`packages/ai-dev/src/errors.ts` 的 `preview_*` / `test_*` / `business_*`）。本文件只冻结规则 ID 与语义。

### 与既有 Dialog 契约的关系（重要边界）

既有 `future-ui.dialog` 契约的 `parts` 只有 `root`（required）、`title`、`content`——**没有 `actions` part**。因此：

- 操作区（取消 / 确定）在本轮**不是**组件契约的一部分，只能通过 Project Profile 与使用规范表达；
- 若将来要把操作区提升为契约级 part，属**修改冻结 schema**，须回到 #2 的契约流程，不在 R1-01 范围内。

## 与既有契约的兼容边界

- 不改 6 个 schema 的 `$id`；不改 `CONTRACT_MAJOR`；不新增或重命名 core 错误码。
- **不改 `componentInstanceId` 的字符串类型**。结构化实例引用必须是新字段或新契约（最大兼容性陷阱）。
- 不改既有 `componentType` 值与 props / parts / events / control 名称。
- `additionalProperties: false` 是全局默认：将来任何写入 Schema 的增量都必须显式进入对应 `properties`，并按 D02 rule 3 经显式 extension registry（带版本）声明。本轮不写 Schema。
- 复用 `contractVersion` + `CONTRACT_MAJOR` 语义；Adapter 只保留这一个版本字段，不引入 `schemaVersion` / `adapterVersion` / 独立 `contractMajor`。

## 验收对照（#67）

- [x] 取消项与推迟项显式标注（三工程盘点取消；结构化实例描述 Deferred 到 #69）。
- [x] 普通编辑弹窗与显式 blocking 变体的正反例；每条规则有稳定 ID、适用范围、severity、例外机制和检查方式（本文件 D17 + [`docs/references/r1-01-edit-dialog-reference-scenario.md`](../references/r1-01-edit-dialog-reference-scenario.md)）。
- [x] 分清组件定义 / 页面实例快照 / 可调用业务工具，且状态值默认最小暴露（D17 三分类表 + D16 不变量 4）。
- [x] 上游库差异标为 supported / partial / unsupported；**规则层要求成员级覆盖结论**（每个域 + 域内每个成员；`not-applicable` 仅限成员级，8 个 required 域与 `token` 不得使用），不静默丢特性（D15 规则 2–3）。**逐域/逐成员映射表本体属 #68 产物，本轮不声称已产出。**
- [x] blocking 变体存在**有限步内可达的终止路径**与失败兜底、无跨实例循环、例外不可豁免（D17 `R1-DLG-08` + operability 不变量 1–8，第 9 条为不可豁免条款）；token 的 alias/ratio **解析规则**保证唯一终值或 fail-closed 报错（D16 token 解析不变量 1–6）。
- [x] 首个库 = shadcn/React；其 `libraryIdentity` 的**标识规则**已冻结（不可变来源优先；digest 须带算法与覆盖范围；CLI version 仅 tooling provenance），具体取值保持 `TBD` 并写明确认时机。
- [ ] 待负责人接受（Contract gate）。

## 官方/上游依据（2026-10-05 查阅）

- shadcn/ui 官方文档与 changelog：<https://ui.shadcn.com/docs/changelog/2025-08-cli-3-mcp>。**仅文档级查阅**：本轮未安装 CLI、未拉取 registry、未在任何工程核验，故只用于支持「经 registry/CLI 分发组件源码」这一标识方式结论，不支持任何具体版本结论。
- React 官方文档：<https://react.dev>。仓库既有 peer 约束 `react/react-dom ^19.2.0` 见 `packages/react-provider/package.json`。
- 仓库内基线：`docs/adrs/0002-ui-semantic-adaptation.md`、`ARCHITECTURE.md:26-36`、`docs/exec-plans/development.md:23,31-37`、`docs/management/m0-02-contract-freeze-proposal.md`（D02 / D05(M0) / D06(M0)）、`m0-05-react-provider-freeze-proposal.md`（D03 / D04）、`m0-04-ai-contract-core-freeze-proposal.md`（D14）。
- 只读契约面盘点（2026-10-05，基线 `e8e084b`）：结论已并入本文档与 D17 三分类表；**未运行** `pnpm test` / `pnpm typecheck`。

## 待冻结/保持 Deferred

| 项 | 内容 | 触发时机 |
| --- | --- | --- |
| D08 主题机制本体 | 主题机制的完整设计与热替换（本项只处理 Profile 侧的 token 表示：实值/别名 + 尺寸档位） | D08 整体保持 Deferred；本体不在 R1-01 |
| 结构化实例描述 | 实例字段结构（instanceId / 组件引用 / 关系 / Profile 引用 / 状态） | #69 |
| 规则 → 诊断码映射 | severity 到具体诊断码，需独立命名空间 | #68 / #69 |
| shadcn 的具体 `libraryIdentity` 取值 | registry / source URL + commit / content digest 的实际取值（**标识规则**已在 D15「上游标识」冻结） | #68（若届时有依赖授权）或真实工程可访问时 |
| Adapter / Profile 的机器可校验 Schema | JSON Schema 落地与其 `$id` | 需 #2 契约流程 + 单独授权；本轮禁改公共 Schema |
| 第二 UI 库与被测页面 | 第二 Adapter 选型与对照范围 | #70 |
| 三工程盘点与真实复用验证 | Model Hub / bilibili docs / MV 制作 | 相关工程可访问后另立范围 |

## 修订记录

- 2026-10-05：初稿，随 #67 提交（#4 `R1-001` grant；只读基线 `e8e084b`）。
- 2026-10-05（Rev.2）：依 PR #73 独立 Review `5416931433`（CHANGES REQUIRED @ `6c64d5a`）闭合 4 处歧义——① D15 规则 2 补全公共语义域（features / props / events / state / parts / control / accessibility / lifecycle / token）并定义逐域覆盖状态与 `supported` 成立条件；② D15 身份字段收敛为单一 `contractVersion`，删除 `adapterVersion` / 独立 `contractMajor` 字段表述；③ 「上游标识」改为不可变来源优先（commit / content digest），CLI version 降为 tooling provenance，并要求记录本地改动 digest；④ D16 新增「token 解析不变量」（alias 无环且终值 literal、ratio 必须带 base/dimension、解析失败必须报错）；⑤ `R1-DLG-08` 新增 blocking operability 不变量（必须有可见可达可执行的 resolution path，禁止无终止路径的永久 focus trap）。**范围与兼容边界未变。**
- 2026-10-05（Rev.3）：依一次补充性对抗审阅（作者侧独立 session，不代替负责人 Review）闭合 Rev.2 残留——① D15 覆盖改为**成员级**（域级结论不可替代成员级；须记录契约实例 `componentType` + `contractVersion` 锚点；`inherited-equivalent` 须给可核对依据；不得与契约声明矛盾）；② `not-applicable` 限定为成员级，8 个 required 域与 `token` 不得使用（堵住「零视觉映射仍得 supported」）；③ 删除未定义的 `required/relevant` / `关键域` 措辞；④ D16 `ratio` 补 `factor`、`base` 必须存在且维度/单位可比或有显式换算、报错条件枚举补全（含 base 悬空、维度不一致、factor 非正）；alias 深度口径统一为「链上不同 token 数 ≤ 16」；⑤ `R1-DLG-08` 补「有限步内可达终止状态」「失败兜底」「禁止跨实例循环死锁」「系统侧终止条件可发生」「reason/closePolicy/resolutionPath 一致」「例外不可豁免」；⑥ `toolingProvenance` 落位为与 `libraryIdentity` 平级的身份字段，digest 须带算法与覆盖范围；⑦ 增补「与既有 theme 契约的边界」；⑧ 修正 Rev.2 自身引入的措辞不一致与验收对照的过度声明。**范围与兼容边界未变。**
- 2026-10-05（Rev.4）：依同一次对抗验证（Rev.3 下 9 个旧反例全部 NOW BLOCKED）闭合 **Rev.3 自身引入**的缺陷——① operability 不变量编号口径统一：检查方式移出编号列表，**不可豁免集合固定为 1–8**，第 9 条是不可豁免条款本身（消除此前同一文件内不可豁免集合口径并存的问题）；② `R1-DLG-08` 的例外机制列改为「**无**」，与该第 9 条一致（原「登记 exceptionId + 失效条件」在 R1-DLG-08 名下没有可放宽对象）；③ token 解析不变量删除重复的 `literal` 条目（原第 1、3 条重复），并补 `dimension`/`unit` 的**声明式封闭集合 + canonical unit + 显式换算**、`unitless` ratio 的合法性条件（仅当 base 亦为 unitless）、以及 fail-closed 枚举中的「未解析出唯一终值」；④ `inherited-equivalent` 依据补核验判据（须可定位到上游组件/机制，由 #68 映射评审复核）；⑤ 「有限步」明确为**可枚举的有限动作序列**、`retryLimit` 必须有限；⑥ Rev.3 说明中的审阅项编号悬空标签改为自含表述；⑦ `decision-register` 的 D16 任务归属补齐 R1-02、D17 编号口径对齐。**范围与兼容边界未变。**
