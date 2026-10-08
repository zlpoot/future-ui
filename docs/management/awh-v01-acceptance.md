# AWH v0.1 Windows 文档任务验收

本任务为 Future UI #88，关联 agent-workflow-hub #39。只新增管理文档、原有最小 AWH 身份 Manifest 和本地日志 ignore；Future UI #70 的活动产品分支、代码、契约与依赖保持原样。本文是候选操作说明，实际结果以 GitHub PR 与 AWH timeline 为准。

## 静态接入

复用原 Windows Control Plane、future-ui Project、c1c-future-ui-windows Executor、机器 UUID、Client credential、loopback endpoint 和 state。新增的静态 Profile 版本为 future-ui/c1c-acceptance@v01-mvp-docs-v1，候选分支 codex/awh-v01-acceptance；不替换旧 Profile，不要求动态 Onboarding、Mac 接入或新 Dashboard。

从外部安装的 awh Client 使用显式仓库外配置，在独立工作区运行：

    awh --config <external-mvp-client.json> register
    awh --config <external-mvp-client.json> status
    awh --config <external-mvp-client.json> deliver --title <title> --body <utf8-file> --hold-draft
    awh --config <external-mvp-client.json> timeline

固定文档验证为 git diff --check origin/main...HEAD。不运行产品全量测试、模型、API、网站或付费流程。交付保留单仓库 GitHub App 身份、exact-head evidence、pending→confirmed Handoff 和 Run/Event journal。

## 审查与收口

Human/ChatGPT 对候选 exact head 做真实独立 Review。通过后按 Human 授权合并 PR、关闭 #88，再从原交付工作区显式运行：

    awh --config <external-mvp-client.json> sync
    awh --config <external-mvp-client.json> timeline

sync 只读取原生 User APPROVED、固定 PR 的合并 SHA 和 #88 closed 状态；它不 approve、merge 或 close。AWH 记录 REVIEW_STARTED、REVIEW_PASSED，三项外部事实都存在后才记录 RUN_COMPLETED。未发生的事实保持 pending，authority_verified=false；GitHub actor 不证明独立 ChatGPT session 身份。

ACK 丢失先执行 deliver --retry 再 sync，保留原 Event ID/sequence，GitHub writes 不重放。失败 journal/history 不删除，不换 namespace/endpoint/credential 绕过恢复门禁。

## 验收证据

真实验收须关联 Issue #88、App PR exact head、原始文档验证、confirmed Handoff、Windows Executor/machine、CP Run ID 与连续 timeline。Review/merge/close 尚未发生时只能报告已交付候选，不能称端到端 PASS。完整证据汇总到 Hub #39 的 MVP PR。

后续任务操作参见 [AWH v0.2 日常交付指南](awh-repeatable-workflow.md)。
