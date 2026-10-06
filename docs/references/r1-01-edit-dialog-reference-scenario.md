# R1-01 EditDialog 参考场景（普通编辑弹窗 / 显式 blocking 变体）

日期：2026-10-05  
状态：**Accepted for #67（2026-10-06）**。本文件随 PR #73 squash merge @ `2b884ec791c91960bdf2788ab8119756c647f178` 成为 D17 的已接受参考场景，用正反例说明规则 ID（`R1-DLG-01` … `R1-DLG-08`）的实际含义。**仍只证明语义/文档，不代表 Dialog 自动校验或 shadcn 适配已实现**；文中的实例形态是语义示意，结构化实例描述仍 Deferred 到 #69。

## 1. 场景定义

| 场景 | 说明 | 关闭策略 |
| --- | --- | --- |
| **A · 普通编辑弹窗** | 编辑既有实体的若干字段（如名称、描述、分类）。用户可放弃编辑；提交是一次业务动作 | 至少一个显式关闭入口（取消动作）；Esc / 遮罩为附加通道 |
| **B · 显式 blocking 变体** | 存在必须先处理的约束（如未保存的不可逆变更、需要强制确认的状态）。关闭受限，但**必须显式声明原因** | 关闭策略受限且声明；不得靠隐藏关闭入口伪装 |

两个场景共用同一组件定义（`future-ui.dialog`）；差异只体现在 **Project Profile 的约定 + 实例的使用方式**，不靠新增组件或新增 part 表达。

## 2. 既有契约事实（只读盘点 @ `e8e084b`）

| 事实 | 值 |
| --- | --- |
| 组件类型 / 契约版本 | `future-ui.dialog` / `contractVersion: '1.0.0'` |
| props | `open`、`label`、`description` |
| parts | `root`（required，`role=dialog`、`aria-modal=true`）、`title`、`content` — **没有 `actions` part** |
| features | `open`、`escapeClose`、`focusTrap`、`focusRestore`、`accessibleName` 全为 true |
| state | `ownership: 'controlled'`，字段 `open` |
| control | `open`、`close`、`focus` |
| events | `openChange`（`{open}`）；**程序化改 `open` prop 不触发**该事件 |
| lifecycle | `requiresCleanup: true`（四组件中唯一） |
| `variant` / `size` | 组件契约中**不存在** |
| 实例引用 | `componentInstanceId` = 裸字符串，语义为「stable node id」；结构化实例描述 Deferred 到 #69 |
| 实现备注 | `open=false` 时实现返回空 Fragment（不是隐藏节点） |

由此得到本场景的两条硬边界：

1. **操作区不是契约级 part**。「取消」「保存」只能通过 Profile 约定 + 使用规范表达，或将来经 #2 流程显式扩展 `parts`（本轮不做）。
2. **尺寸与变体不是组件契约字段**。`size` 档位与 `variant` 覆盖只能落在 Project Profile 的 `sizes` / `variants` 字段族。

## 3. 实例形态（语义示意，非冻结结构）

> 除既有 `componentInstanceId` 字符串语义外，下列结构**尚未冻结**；机器可校验结构属 #69。此处仅表达语义与边界。

### 场景 A · 普通编辑弹窗

```text
componentInstanceId: "component:edit-dialog"      # 既有 stable node id 语义
componentType:       "future-ui.dialog"
profileRef:          "project-profile@1.x"        # D16：项目约定唯一事实源
adapterRef:          "shadcn-react@TBD"           # D15：库映射来源（版本标识 TBD）
tokens:              { surface, title, danger }   # Profile 内为 literal / alias / ratio；必须能解析到唯一实值，否则 fail-closed 报错
conventions:
  - R1-DLG-01 title 来自 label
  - R1-DLG-02 操作区含"取消"
  - R1-DLG-03 主要动作在末尾，取消在其前
agentVisible:        []                          # 默认最小暴露：草稿字段不可读
capabilityRef:       "entity.update"（显式 Binding 后才存在）
```

### 场景 B · 显式 blocking 变体

```text
componentInstanceId: "component:blocking-dialog"
componentType:       "future-ui.dialog"
profileRef:          "project-profile@1.x"
blocking:
  declared:    true                              # R1-DLG-08：必须显式
  reason:      "存在必须在关闭前处理的未保存变更"    # 与 resolutionPath 必须一致（不变量 8）
  closePolicy: "仅允许通过 resolutionPath 中的动作关闭；Esc 被显式禁用并已声明"
  resolutionPath:                                # 必须可见、可达、可执行，且有限步内可达终止状态（不变量 1、5）
    - "保存并关闭"                                # 主路径
    - "放弃变更并关闭"                            # 备选路径（显式登记，不得隐式存在）
  failureFallback:                               # 不变量 5：路径动作失败时必须有兜底出口
    retryLimit: 2
    then:       "放弃变更并关闭"
  exceptionId: "EX-BLK-001"                      # 仅放宽 R1-DLG-02 的普通关闭入口；不得豁免 operability（不变量 9）
agentVisible:        []                          # R1-DLG-07
```

**反例（不得出现）**：

1. `blocking: true` 但没有任何声明，靠移除取消按钮或吞掉 Esc 来让用户无法离开——违反 `R1-DLG-02` 与 `R1-DLG-08`，且阻塞原因对人和 Agent 都不可见。
2. **声明齐备但没有结束路径**：`declared: true`、`reason` 已写、`closePolicy: "不可关闭"`，却没有任何可见、可达、可执行的 resolution path。它不算「伪装 blocking」，但仍会把用户**永久困在 modal** 中——违反 `R1-DLG-08` 的 operability 不变量。
3. 业务确实要求不可退出时，只写「不可关闭」而不声明系统侧终止/跳转条件——同样违反 `R1-DLG-08`。
4. **路径存在但永远失败**：resolution path 齐备、按钮可见可达可点，但该动作恒定失败（例如服务端固定 403），且没有失败兜底或重试上限。逐条看像「路径存在且可达」，实际仍是永久困住——违反 operability 不变量 5。
5. **跨实例循环死锁**：blocking 实例 A 的唯一路径动作打开 blocking 实例 B，B 的唯一路径动作又回到 A。两个实例各自「合规」，组合起来没有任何终止路径——违反不变量 6。
6. **路径与 reason 不一致**：`reason` 要求「必须先完成同步」，而 `resolutionPath` 只有「放弃变更并关闭」——路径并不能解除 `reason` 描述的状态；违反不变量 8。

## 4. 正反例（逐规则）

| 规则 ID | 正例 | 反例 |
| --- | --- | --- |
| `R1-DLG-01` | 标题通过 `title` part 提供；读屏可得到弹窗名称 | 只有一个视觉上的 `<h2>` 文本，没有可访问名称来源，靠视觉猜测 |
| `R1-DLG-02` | 操作区有「取消」，Esc 也能关 | 只有 Esc / 点遮罩可关，界面上没有任何显式关闭入口 |
| `R1-DLG-03` | 底部操作区 = `[取消] [保存]`，角色与顺序由 Profile 固定 | 只有「保存」一个按钮，用户没有放弃路径且未登记例外 |
| `R1-DLG-04` | 保存中主要动作进入 pending 并阻止再次触发 | 连点两次发出两次提交（若业务未声明幂等即违规） |
| `R1-DLG-05` | 提交中关闭会给出明确提示；文案不暗示「取消 = 回滚」 | 提交中静默关闭并丢弃；或提示「已取消，改动已撤销」而业务并未回滚 |
| `R1-DLG-06` | 打开后焦点进入弹窗，关闭后回到触发按钮 | 打开后焦点仍在背后的页面；关闭后焦点丢失到 `body` |
| `R1-DLG-07` | 草稿字段默认不在 Agent 可读上下文；只有显式 allowlist 的字段可读 | 把整个表单状态（含敏感草稿）暴露给 Agent 可发现上下文 |
| `R1-DLG-08` | blocking 变体显式声明原因、关闭策略与 exceptionId，**且存在可见、可达、可执行、有限步内可达终止状态的 resolution path**（`closePolicy` 指向它；失败有兜底） | 隐藏 / 禁用所有关闭入口以「实现」blocking 且无声明；**或**声明齐备但无结束路径；**或**路径恒定失败无兜底；**或**两个 blocking 实例互为唯一出口的循环死锁 |

## 5. 与 Capability / Binding 的边界

| 动作 | 归属 | 说明 |
| --- | --- | --- |
| 取消 / 关闭 | UI 事件 | 不产生业务工具；不写业务状态 |
| 保存 | 业务 Capability（示例 `entity.update`） | 必须由应用显式提供并经 Binding 连接；UI 可读结构**不自动**生成工具 |
| 重复提交防护 | UI 层约束（`R1-DLG-04`） | 真实幂等由业务层落实；UI 阻止点击不等于业务幂等 |
| 提交结果 unknown | 业务层 + 对账 | 超时不等于失败，也不等于回滚（对应 D06(M0) 不变量） |

**边界结论**：弹窗的「可读结构」「可执行 UI 操作」「业务 Capability」是三件事。可读不等于可执行；按钮存在不等于已授权。

## 6. 未决与 Deferred

| 项 | 内容 | 触发时机 |
| --- | --- | --- |
| 机器可校验结构 | 上述实例形态的字段、`$id`、校验器 | #69（并需单独的 Schema 授权与 #2 流程） |
| 规则 → 诊断码 | `R1-DLG-0x` severity 到具体诊断码的映射（独立命名空间） | #68 / #69 |
| 操作区 part 化 | 是否把 actions 提升为契约级 part | 需回 #2 契约流程；不在 R1-01 |
| shadcn 侧实际映射与身份取值 | `libraryIdentity` 取值（registry/source URL + commit/content digest，含算法与覆盖范围）、**逐域 + 逐成员**映射表 | #68 |
| blocking 视觉与文案细则 | 具体文案、颜色、图标；resolution path 的动作命名与顺序 | Profile 落地时（R1-02 之后） |
| 系统侧终止条件细则 | operability 不变量 7（不可退出场景的系统终止/跳转条件）的可判定触发形式 | Profile 落地时（R1-02 之后） |
| digest 算法与覆盖范围、patch provenance 承载位置 | 具体算法选择与文件范围口径 | #68（Adapter 结构落地时） |

## 7. 检查方式的可执行化（延后）

本文件列出的「结构检查 / 交互检查 / 投影检查」目前是**人工可核对的描述**。其自动化形态依赖既有 `ui.preview` / `ui.test`（当前仅支持 `button` \| `select`，见 `packages/ai-dev/src/preview.ts`），因此 Dialog 的自动检查属 #68 / #69 范围。**本轮不声称任何规则已被自动验证。**
