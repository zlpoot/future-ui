---
name: Scoped task / 范围明确的任务
about: 先记录范围、依赖和验收；创建不等于执行授权
---

## 状态与授权
Status: Spec
Kind: preparation | implementation backlog
Execution: NOT_AUTHORIZED
Blocked reason: （实现任务默认 G0_NOT_APPROVED，Status 改为 Blocked）
G0 authorization: （链接当前批准；没有则写 NOT_GRANTED）

## 目标与当前事实
写清当前实际行为、期望变化，不将计划包/API 写成已实现。

## 范围 / 非目标
明确本 Issue 修改什么、不修改什么。

## 依赖与契约
列 Issue、已接受文档、基线和可访问证据；大工作包在 Ready 前拆分。

## 验收
- [ ] 可独立证明的行为。
- [ ] 关键失败/拒绝/并发或状态过期边界。
- [ ] 对应文档与消费者一致。

## 检查与证据
指定最小充分检查；关键权限/unknown write 与阶段验收说明独立 Verify 要求。记录 exact head、实际命令、环境、未运行项，不使用不存在的测试命令。

## 禁止与停止点
未获 G0 授权不得写代码、安装依赖、启动 Agent、运行 live/付费任务。PR 使用 Refs；merge/close/发布/下一阶段需要各自授权。
