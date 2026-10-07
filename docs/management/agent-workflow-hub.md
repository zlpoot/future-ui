# Agent Workflow Hub 接入

future-ui 是 Agent Workflow Hub 的首个外部 Project Profile。本次 docs-only bootstrap 用于验证跨仓库 Project Profile、App Builder、Handoff 与独立 Review 闭环。

| 项目 | 固定值 |
| --- | --- |
| Profile / workflow | `future-ui / bootstrap` |
| Repository | `zlpoot/future-ui` |
| Base | `main` |
| Bootstrap branch | `codex/awh-c06-bootstrap` |
| Builder GitHub identity | `zlpoot-awh-builder[bot]` |
| Independent Review | ChatGPT / `zlpoot` |

future-ui 产品 Worker 仍为豆包工作；本次 bootstrap 不影响 R1-004 / #70 的产品范围、Grant 或验收。Profile 表达仓库及允许的工作流边界，不绑定某个 Agent 或本机路径。

本 Profile 在最终 clean exact head 上按顺序执行：

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test`

App installation 必须为 Selected repositories，且恰好包含 `zlpoot/agent-workflow-hub` 与 `zlpoot/future-ui`；当前 Profile 的 write token 仅授权 `zlpoot/future-ui`。Builder evidence 与 pending → confirmed Handoff 由 App bot 在本次 PR 发布并回读，交接绑定 Hub Issue #6 及 PR 的 exact base/head。

本接入仅允许修改本文件，不授权 Hub 修改 future-ui 产品代码、依赖、public contracts 或 Grant，也不授权后续 webskill / agent-desktop 迁移。Builder verification 不是独立 Review；Ready for ChatGPT Review 不授予 approve、merge 或关闭 Issue 的权限。
