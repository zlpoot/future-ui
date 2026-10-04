# M1-02 Capability Runtime — Implementation Results

Issue: #9「独立能力运行时与旧页面接入」
Branch: `feat/m0-07-capability-runtime` · Status: **closed**
Verification baseline: lint ✓ / typecheck ✓ / `161 passed (22 files)`（含本包 30 项）

## 交付物

新包 `@future-ui/capability-runtime`（纯 TypeScript，仅依赖 `@future-ui/contracts`；**无 React / Ark UI / 组件 provider / 外部 Agent 协议依赖**）：

| 文件 | 职责 |
| --- | --- |
| `src/types.ts` | 能力定义（元数据/业务 handler 分离）、调用请求/结果（映射 `execution.states`）、应用可集成 hooks 接口 |
| `src/registry.ts` | 显式注册/发现/撤销；发现视图仅暴露 `visibility.agentAllowlist` 白名单字段；未声明能力默认不可见 |
| `src/execution.ts` | 幂等存储与并发门：`scope=request`（invocationId 去重）/ `scope=operation`（idempotencyKey 去重 + key-conflict 拒绝）/ in-flight 同身份 → pending |
| `src/invoke.ts` | **统一调用路径**：存在性 → 预取消 → 幂等快查 → 输入校验 → 授权 hook → 不可逆效果强制确认 → availability 重验 → 执行 → 结果分类 |
| `src/audit.ts` | 审计日志 + 递归脱敏（内置敏感键 ∪ contract.redaction；cookie/password/token/secret/credential 等永不入日志） |
| `src/index.ts` | 公共导出 |
| `tests/*.test.ts` | 验收覆盖：registry（5）/ invoke 统一路径 + 审计（15）/ cart 业务层（7）/ audit（4），共 31 项（helper 1 个） |

## 验收对照（#9）

| # | 验收 | 落实与证据 |
| --- | --- | --- |
| 1 | 显式注册/发现/撤销；默认不暴露未声明动作；元数据与 handler 分离 | `CapabilityRegistry.register/discover/unregister`；未注册 id → `capability_conflict` 拒绝且 handler 不触发；discover 视图只含 allowlist 字段，永不含 handler（registry.test 3 项） |
| 2 | 统一调用路径执行输入校验、身份/策略检查、必要确认、状态条件检查 | `invoke` 固定管线顺序：全部 gate 在 handler 之前；缺字段/类型错误 → `missing_required`/`type_mismatch`；authorize hook 拒绝 → `unauthorized`；不可逆效果未确认 → 拒绝；`checkState` 不满足 → `unavailable`（invoke.test 对应用例，各验证 handler 0 调用） |
| 3 | cart.add 由业务层落实状态版本与幂等；未知结果不盲重试；失败分类与结果查询边界明确 | `CartService`（fixture 业务层）实现 expectedVersion 冲突 → `stale-version`（retrySafe=false）、idempotencyKey 去重重放、`mode:'unknown'` → `unknown` + `reconciliation: cart.query:<receipt>`，查询走 `queryByReceipt`（cart.test 3 项） |
| 4 | 拒绝请求无实际业务副作用；策略注解不被当作执行权限 | 所有拒绝路径在 handler 调用前返回（effect 计数 0）；默认授权 `deny`——无 authorize hook 时即使 `authorization.description` 声称“允许”也拒绝（invoke.test「policy description is never an execution permission」） |
| 5 | 并发/重复/卸载/取消有明确返回；取消不等于回滚成功 | 同身份 in-flight → `pending`（不盲重试）；重复 key 同参 → 重放、异参 → `key-conflict` 拒绝；`AbortSignal` 取消 → `cancelled` 且 `rollbackApplied:false`（cart.test「cancellation never pretends rollback」+ invoke.test） |
| 6 | Agent 可见状态最小化；审计脱敏，不泄露密钥/cookie/凭据 | 发现视图 = allowlist 白名单；审计条目递归 redact（含嵌套 result），内置敏感键即使未列入 contract.redaction 也强制脱敏（audit.test 4 项） |
| 7 | 不依赖组件 provider、React、Ark UI 或具体外部 Agent 协议 | package.json 仅依赖 `@future-ui/contracts`（workspace:*）；测试为 node 环境（无 jsdom） |

## 执行语义要点（D06(M0) 落实）

- **幂等重放保持原状态**：`unknown`/`failed`/`pending` 的已记录结果被重放时返回对应状态，**绝不编造成 `completed`**（对账句柄不变，调用方继续查询而非盲重试）。
- **idempotencyKeyDistinct**：`scope=operation` 下同 key 异参数 → `conflict` 拒绝（不视为同一次成功）。
- **确认门**：`effects.irreversible` 非空即强制确认；请求可携带 `confirmation` 显式同意，或由 `confirm` hook 批准；默认 `require`（`defaultConfirmation:'allow'` 仅测试 fixture 显式开启）。
- **授权默认 deny**：`defaultAuthorization:'deny'`；能力声明的 `authorization.hooks` 若未配置对应 hook，拒绝并说明缺哪个 hook。

## 边界与不变量

- 运行时不做模型推理循环（issue 目标明确不实现）。
- 不访问真实账号、不创建订单/付款；`cart.add` 为受控本地业务服务 fixture，`effects.remote` 为空。
- 不开放通用任意代码执行：handler 是注册时绑定的受信业务函数，运行时无通用 hook。
- 业务 effect 计数与版本由业务层（`CartService`）持有，运行时不做业务状态假设。

## 证据

- 本地：`pnpm lint` / `pnpm typecheck` / `pnpm test` 全绿（161/161，18 文件 → 22 文件）。
- 远端：本结果文档 + 实现 PR（`Closes #9`）经 CI 后 squash 合并；决策登记 `D-CAPR` 追加于 `decision-register.md`。
