# M1-03 — Cart demo local vertical example results (#10)

> Status: **DONE**（依赖在完成时已全部满足：#4 ENG-001 授权、#8 UI 组件、#9 capability-runtime 已 merged）。
> 购物车业务只存在于示例应用 `packages/cart-demo`，未进入任何通用组件包（验收 7）。

## 验收对照

| # | 验收项 | 落实 |
| --- | --- | --- |
| 1 | Binding 仅使用组件公开接口、应用状态订阅和能力契约，不读取 Ark 私有状态 | `binding.ts`：`createAddToCartBinding` 只消费 Button 公开事件载荷（appId）+ `registry.discover('cart.add')` 的 agent-visible 视图（仅 `visibility.agentAllowlist` 字段）+ 显式传入的应用草稿值；`addToCartBindingContract.projection` 声明 redaction 列表。测试 `binding consumes only public interfaces` 断言 discovery 视图仅含允许字段 |
| 2 | 明确局部 UI 状态、业务草稿、服务端权威状态的归属，避免双 Store 冲突 | `App.tsx` 文档注释 + 实现：局部 UI（选中商品/数量 useState）→ 业务草稿（最近一次成功的 items 快照，非权威）→ 服务端权威（`CartService.items/version` 唯一事实源）。UI 永不直接改业务状态 |
| 3 | 参数映射、状态版本、loading/error/success 投影一致；敏感字段不随组件树全部暴露 | invoke 结果按 status 投影为 loading/success/failed/unknown 四态；`CartService` 版本号随每次成功写递增；discovery 视图只暴露 allowlist 字段，敏感字段（cookie/password/token/secret/credential）在 binding 契约 projection.redaction 声明 |
| 4 | 人与 Agent 的有效/无效请求得到相同业务约束；不以客户端 disabled 代替服务端授权 | UI 路径（按钮）与程序化路径（`programmaticAdd`）走**同一 runtime 同一 cart.add 业务动作**；授权在 runtime hooks（服务端侧）。测试 `human and agent requests get the SAME business constraints`：deny 时两条路径都被拒，且按钮未被 disabled（客户端不禁用代替服务端授权） |
| 5 | 重复、并发、超时、卸载和状态过期覆盖；未知写结果不伪装成功 | 幂等重放（同 key 只加一次）、并发（不同产品并行都成功，per-product 锁）、锁（`transient-lock` retrySafe 提示）、卸载（unmount 后无状态泄漏）、状态过期（`expectedVersion` 冲突 → `stale-version` 拒绝）、未知写（`unknown` + reconciliation 句柄，绝不伪装成功）均有测试 |
| 6 | 移除 Binding/协议模块不破坏 UI-only；业务动作也能从旧页面独立调用 | #21 依赖图证明 UI 包无 capability 依赖；本包测试 `UI-only: removing the binding module`：无 binding 的 App 直接调用 runtime 完成端到端；`programmaticAdd` 独立可调 |
| 7 | 购物车业务只存在于示例应用，不进入通用组件包 | 全部业务代码在 `packages/cart-demo/`；通用包（react-provider/theme/conformance/contracts）零购物车引用 |

## 四层证据（测试内逐层断言）

1. **交互层**：UI 渲染（商品 Select、数量 TextInput、加入按钮）；用户操作触发。
2. **能力调用层**：同一 `cart.add` 通过 capability runtime 统一调用路径执行；binding 参数映射正确。
3. **业务 effect 层**：`CartService.items/version` 真实变化（服务端权威）。
4. **最终界面状态层**：结果区显示 receipt/version/行数 或 failed(code/recovery)/unknown(reconciliation)。

## 状态归属声明（双 Store 防冲突）

- 局部 UI 状态：`productId`、`qty`（组件 useState，仅视图草稿）。
- 业务草稿：成功结果的 items 快照（渲染用，非权威）。
- 服务端权威：`CartService`（items/version/opLog/queryByReceipt）——所有写校验（版本、幂等、锁）在此。

## 验证

- `pnpm lint` ✓ / `pnpm typecheck` ✓ / `pnpm test`：214 passed (28 files)（本 PR 新增 cart-demo 10 项 e2e + 集成）。
- 未执行：支付、真实订单、跨站工作流、后台自主 Agent（#10 禁止条款）；未声称完成真实模型/浏览器协议验证（确定性 fixture 业务层，符合 #10 检查与交付条款）。
