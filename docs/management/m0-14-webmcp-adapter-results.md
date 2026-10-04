# M1-05 — WebMCP experimental adapter & real support boundary results (#12)

> Status: **DONE（本地适配器部分）**。依赖：#4 授权、#9 capability-runtime、#10 cart-demo；#3 规范/浏览器支持矩阵。
> 本任务按 #12 检查条款分级记录证据：**E1（mock adapter 测试）已测**；**E2（真实浏览器集成）与 E3（真实模型调用）未测，需另行授权**，明确列入下表，未声称完成。

## 验收对照

| # | 验收项 | 落实 |
| --- | --- | --- |
| 1 | 开发前核验规范版本/官方文档、浏览器环境及启用要求；不能复用过时 API 猜测 | 本实现不内置任何浏览器/WebMCP 客户端调用；adapter 只对接最小 `WebMCPBackend` 边界（listTools/invoke），把"浏览器环境、启用要求、协议版本"完全留给外部后端。**未声称已核验任何浏览器规范版本**（E2 未测项，见下表） |
| 2 | 注册/撤销、输入输出、可用状态、错误与权限边界映射清楚 | `register`（contract→tool：name/description/inputSchema，含 `required`）/`unregister`/`discover`（只读）/`invoke`（authorize→dispatch→映射）；错误保留 `retrySafe` 分类与 `recovery`；权限在 dispatch 前强制（deny 时零写入）。测试逐项断言 |
| 3 | 协议表达不了的保证必须拒绝、约束或明确标注扩展，禁止静默丢失授权语义 | `UnsupportedGuarantee` 策略：`idempotency`/`reconciliation` 默认 `annotate`（tool 带 `extensions: ['idempotency:annotate']`）；`required=true` 时 `reject`（注册失败、不可调用、零写入）。授权 deny 永远在 dispatch 前拦截。测试 `required unsupported guarantees are rejected` 与 `authorization deny … zero writes` 覆盖 |
| 4 | 发现/读取不产生业务写；只有批准后的固定调用路径才能产生声明内 effect | `discover()` 只读：测试断言连续两次 discover 后 mock backend `writes === 0`；仅 `invoke()` 且授权通过后 dispatch |
| 5 | 不支持 WebMCP 时 UI 仍工作；不伪造支持或偷偷换成另一种协议并声称成功 | adapter 是独立包；react-provider / cart-demo 零依赖（测试静态边界断言）。未测项（E2/E3）如实列出，无伪造 |
| 6 | Mock adapter 测试、实际浏览器集成、真实模型调用分别记录证据等级；未测项目明确列出 | 见下表「证据分级」 |
| 7 | 更换/移除 adapter 不影响 UI 和业务动作的独立使用 | adapter 独立包 + 静态边界测试；UI/业务动作不 import adapter |

## 证据分级

| 等级 | 内容 | 状态 |
| --- | --- | --- |
| E1 | Mock backend（内存注册表+writeLog）下 adapter 映射测试：register/unregister/invoke/deny/unknown/fail/discover 只读/reject 策略/边界 | **已测**（`packages/webmcp-adapter/tests/webmcp-adapter.test.ts`，9 项，全绿） |
| E2 | 真实浏览器中 WebMCP 集成（规范版本核验、浏览器启用、真实 backend 连接） | **未测** — 需该任务对应的明确授权（#12 检查条款），已按要求列出 |
| E3 | 真实模型/付费/真实账号调用 | **未测** — 需另行授权，已按要求列出 |

## 边界与禁止

- 不承诺生产稳定或全浏览器支持；不增加通用远程 MCP 服务、跨站执行器或自研完整 Agent 框架（#12 禁止）。
- 调用权限与未知写最终边界采用独立 Verify（#12 检查条款），本适配器不在核心契约内置外部协议。

## 验证

- `pnpm lint` ✓ / `pnpm typecheck` ✓ / `pnpm test`：新增后全量通过（本 PR 新增 9 项）。
