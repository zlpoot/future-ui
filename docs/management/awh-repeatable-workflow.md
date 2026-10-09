# Future UI / Windows AWH v0.2 日常交付

这份指南面向既有 Windows Client、同一 CP v2、Project/Profile ref、Executor、机器和专用凭据。每条新 Issue 只更换 Issue 号与受控开发分支；不重复修改固定 Profile，也不重建数据库或 state namespace。

## 一次性升级

安装交付的 Client 0.4.1 tarball；保留原外部配置、credential、machine 文件、endpoint 与 state_directory。模板版本为 `v02-repeatable-v1`，沿用 `future-ui/c1c-acceptance`。仅 `c1c-future-ui-windows` 及其原机器可用。

新模板声明 `issue_prefix`，要求已审查且已获 Human 授权部署的兼容 CP 运行时。Operator 先登记原 Run/Event，保留可恢复的数据库副本，在隔离副本验证旧历史，再用原配置、端点和身份受控切换运行时；原服务回读成功后，仅追加一次不可变模板版本。在原 Client 外部配置中一次性选择该版本，再 register 升级后的 Client 元数据。保留原 Profile、历史记录、已完成 Journal 和安装备份。

```powershell
npm install --prefix '<原外部Client安装目录>' --offline --ignore-scripts --no-audit --no-fund '<Client-0.4.1-tarball>'
& '<原外部Client安装目录>/node_modules/.bin/awh.cmd' --version
& '<原外部Client安装目录>/node_modules/.bin/awh.cmd' --config '<原外部Client配置.json>' register
```

示例全部是占位值。App key、token、实际 CP 配置值或机器私密材料不得进入文档、仓库、PR body、日志或聊天。

## 每条新 Issue

先通过既有 App 授权方式核对并获取最新 `origin/main`。保留活动产品分支与 #70 工作树；从 main 新建独立工作树。Issue 必须是本仓库真实普通 Issue，分支精确为 `codex/awh-task-<Issue号>`。

```powershell
$issue = 90
git -C '<既有FutureUI仓库root>' worktree add -b "codex/awh-task-$issue" '<本次独立工作树>' origin/main
Set-Location '<本次独立工作树>'
```

在新工作树完成受控改动并提交为 clean HEAD。保留既有 `.awh/project.yaml`，不按 Issue 重写 Profile/Manifest，不切活动分支。当前 docs-only 模板只允许 `docs/management/awh-repeatable-workflow.md` 与 `docs/management/awh-v01-acceptance.md`；不能用于产品代码、依赖、测试或契约改动。App 用单仓库只读 token 先验证 Issue、main 基线和允许路径，随后运行固定 `git diff --check origin/main...HEAD`；任何越界失败停止。

```powershell
& '<原外部Client安装目录>/node_modules/.bin/awh.cmd' --config '<原外部Client配置.json>' deliver --issue $issue --title '<本次标题>' --body '<UTF8-PR-body文件>' --hold-draft
& '<原外部Client安装目录>/node_modules/.bin/awh.cmd' --config '<原外部Client配置.json>' status
& '<原外部Client安装目录>/node_modules/.bin/awh.cmd' --config '<原外部Client配置.json>' timeline
```

Run、Journal、Event、evidence 与 confirmed Handoff 绑定 repo、Issue、branch、exact SHA、Profile version、executor/machine 与新 PR。`status` 提供当前任务和前一 Run 的关联；`timeline --run <归档Run-id>` 可回读旧 Run。

## awaiting_review、completed 与恢复

App Draft PR 和 confirmed Handoff 发布后，Run 为 `awaiting_review`。Builder 的本地验证不是独立 Review。ChatGPT 从 GitHub 对 exact head 独立审查，Human 另行授权 merge/Issue close；GitHub User 的原生批准仅是外部事实，不能证明独立 ChatGPT 会话身份，因此 `authority_verified=false` 始终保留。

这些真实事实成立后，从本次原交付工作树显式运行：

```powershell
& '<原外部Client安装目录>/node_modules/.bin/awh.cmd' --config '<原外部Client配置.json>' sync
```

sync 只读核对 App actor、原分支和 exact head、有效 User APPROVED、无有效 changes requested、实际 merge SHA 与同一 Issue closed；stale、dismissed、bot、foreign App 或身份漂移均不能完成。满足全部事实后才 `completed`。下一 Issue 会按原始字节归档旧 Session；旧 completed Journal 原位只读保留，旧 CP Run/Event/cursor 不删除、不重排。

ACK 丢失时仅执行 `deliver --retry`，重发相同 Event ID/sequence，不重新验证，也不重复 GitHub push/PR。初始 RUN_STARTED 的 ACK 丢失且尚无 Journal/provider write 时，可以原参数恢复同一任务。除下述明确恢复情形外，stopped、ambiguous、in-progress、pending 或缺失 Journal 阻断下一任务；不得删除/重命名 Journal、清空 session、换 namespace、重复 push 或新建 PR 绕过。

Client 0.4.1 的 `--recover-from-run <failed-run-id>` 仅适用于 CP 与本地失败记录及原始验证证据一致、确认在 GitHub Push/PR 之前发生的 verification 失败，且远端同分支 ref 与全状态 PR 均不存在、receipt 未消费、pending/outbox 均为空的情况。取得 Human 单次授权后，才可从同一 Issue/分支的新 clean SHA 恢复，并保留原 CP、Profile、Executor/machine、凭据、namespace 和失败 Run/Journal。其他 stopped、ambiguous、in-progress、pending 或缺失记录继续阻断；恢复失败须停止并保留证据，不得重复调用或修改 receipt，详见 [Hub Client 0.4.1 恢复说明](https://github.com/zlpoot/agent-workflow-hub/blob/39c0ba845e15152dd511422ebceea34c171b7924/docs/repeatable.md#client-041-verification-recovery-candidate)。

#90 的真实验收还要回读 #88 completed Run/13 Event 与更早六 Run/24 Event。未发生独立 Review、Human 授权 merge/close 和原工作树 sync 时，不宣告第二个真实 Run completed。
