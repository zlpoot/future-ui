# R1-01 最小 UI 语义 / Library Adapter / Project Profile 冻结提案（D15 / D16 / D17）

日期：2026-10-05  
状态：**Proposed for #67**。本文件冻结 #67（R1-01）所需的三个决策：Library Adapter 描述范围（D15）、Project Profile 范围（D16）、EditDialog 最小 UI 语义规则集（D17）。本项为 preparation：只冻结 Markdown 语义，不改产品源码、不改公共 Schema、不安装依赖。合并须经负责人接受（Contract gate，merge=human）；#68 的 DoR 依赖本文件的接受结果。

## 目标

为 R1 的最小闭环「已有 UI 库 → 版本化 Library Adapter → 既有 Component Contract + Project Profile → AI 可读结构 → 真实工程复用」提供**前三段**的可审阅约定，并让三类一等消费者（UI/provider、开发 AI、运行期 Capability/Agent）读同一份事实源，而不是各自维护文本。

本轮边界（负责人 2026-10-05 指示）：

- 取消 Model Hub / bilibili docs / MV 制作三工程只读盘点，不作为 R1 前置条件。
- 「两个真实页面试点」改为 **EditDialog 参考场景设计**；首个 Adapter 验证对象固定为 **shadcn/React**。
- 真实工程复用验证推迟；收口后进入 #68。

只读盘点基线（`e8e084b`，main）事实：

| 事实 | 值 |
| --- | --- |
| `Project Profile` / `Library Adapter` / `IR` 实现 | **无任何实现或占位**；仅存在于 `ARCHITECTURE.md:26-30`、`charter.md:37-39`、`adrs/0002:14` 的定义性说明 |
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

1. **身份字段**：Adapter 必须声明稳定 `adapterId`（kebab-case，如 `shadcn-react`）、`targetLibrary`、`libraryIdentity`（版本或源码标识**及其标识方式**）、`adapterVersion`（semver）、`contractMajor`（必须等于 `CONTRACT_MAJOR = 1`，或显式声明不兼容）。
2. **映射粒度**：按 `componentType` 给出 `mappingStatus ∈ {supported, partial, unsupported}`，并逐项映射 `props / parts / events / state / token`。R1 首批限定 `future-ui.dialog`、`future-ui.button`、`future-ui.text-input`；Select 仅在真实场景需要时加入。
3. **不静默丢特性**：任何未映射或行为不同的上游特性必须显式标为 `partial` / `unsupported` 并给出原因与影响；**禁止**把不支持当作支持、禁止静默退回自研组件。（延续 D04「未支持特性显式声明缺失，不静默降级」）
4. **禁止编造标识**：上游版本/源码标识未核验时写 `TBD` 并注明核验时机；不得填写未验证的版本号、commit 或 registry 条目。
5. **职责分离**：Adapter 只描述**库固有语义与映射**。项目侧规范（关闭入口、操作角色、pending、尺寸档位等）由 Project Profile 承载，不得写死在 Adapter。
6. **声明式数据**：Adapter 是纯数据描述，不携带可执行 JS、不做 eval（与 `docs/contracts/README.md` 公共约定一致）。
7. **版本语义复用**：沿用既有 semver 规则（major 破坏性、minor 向后兼容、patch 不改结构；未知 major 拒绝不降级）。**不引入 `schemaVersion`**，避免与 `contractVersion` / `CONTRACT_MAJOR` 形成两套版本概念。
8. **首库冻结**：R1 首个 Adapter 的验证对象 = **shadcn/React**。该选择不排除第二库，也不预先承诺全量 MUI / Ark / AntD / Vue 支持。

### 与上游库的标识方式（规则，非取值）

shadcn/ui 以**源码分发 + registry/CLI** 为模型，因此「冻结版本」不能只写包版本号。标识必须同时记录：

1. `targetLibrary` 与 React 主版本（仓库既有 peer 约束为 `react/react-dom ^19.2.0`，见 `packages/react-provider/package.json`）；
2. 组件来源标识：registry 条目名 + 拉取时的来源 commit 或 CLI 版本；
3. 样式层依赖的版本（如 Tailwind 系列），因为 token 实值与尺寸档位落在这一层。

**具体取值在本文件保持 TBD**（理由：本轮无依赖安装授权、无真实工程可核对）。确认时机：`#68` 获得代码与依赖授权时，或在真实工程可访问后。

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
| `tokens` | `tokenKey → { kind: literal \| alias, value }`。`literal` = 实值；`alias` 指向另一 token。**必须区分实值与别名**，不得只登记名称 |
| `sizes` | 尺寸档位必须以**实值或比例**表达（如控件高度、间距档位），并与库自身命名解耦 |
| `variants` | `variantId → token 覆盖`；未知 `variantId` 的行为必须显式声明（报错或忽略），不得默认静默降级 |
| `dialogConventions` | 标题、关闭入口、操作角色、pending、重复提交、blocking 变体规则（见 D17） |
| `exceptions` | 显式例外：`exceptionId` + 适用规则 ID + 适用场景 + 理由 + 失效条件 |

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
| `R1-DLG-08` | `blocking` 变体必须**显式声明**：给出阻塞原因与关闭策略；**不得靠隐藏关闭入口伪装 blocking** | 显式 blocking 变体 | error | 登记 `exceptionId` + 失效条件 | 结构检查 + 声明检查 |

规则 ID 是稳定标识：新增规则用新 ID；改变既有 ID 的含义属破坏性变更。

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
- 复用 `contractVersion` + `CONTRACT_MAJOR` 语义，不引入 `schemaVersion`。

## 验收对照（#67）

- [x] 取消项与推迟项显式标注（三工程盘点取消；结构化实例描述 Deferred 到 #69）。
- [x] 普通编辑弹窗与显式 blocking 变体的正反例；每条规则有稳定 ID、适用范围、severity、例外机制和检查方式（本文件 D17 + [`docs/references/r1-01-edit-dialog-reference-scenario.md`](../references/r1-01-edit-dialog-reference-scenario.md)）。
- [x] 分清组件定义 / 页面实例快照 / 可调用业务工具，且状态值默认最小暴露（D17 三分类表 + D16 不变量 4）。
- [x] 上游库差异标为 supported / partial / unsupported，不静默丢特性（D15 规则 2–3）。
- [x] 首个库 = shadcn/React；具体版本/源码标识保持 `TBD` 并写明确认时机（D15「标识方式」节 + 本文「待冻结」节）。
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
| shadcn 具体版本/源码标识 | registry 条目、来源 commit、CLI/样式层版本取值 | #68（若届时有依赖授权）或真实工程可访问时 |
| Adapter / Profile 的机器可校验 Schema | JSON Schema 落地与其 `$id` | 需 #2 契约流程 + 单独授权；本轮禁改公共 Schema |
| 第二 UI 库与被测页面 | 第二 Adapter 选型与对照范围 | #70 |
| 三工程盘点与真实复用验证 | Model Hub / bilibili docs / MV 制作 | 相关工程可访问后另立范围 |

## 修订记录

- 2026-10-05：初稿，随 #67 提交（#4 `R1-001` grant；只读基线 `e8e084b`）。
