# future-ui · Agent 工作入口

## 当前执行边界：R1-004 · #70 ONLY

负责人已明确授权 **R1-004 implementation**。当前唯一活动实现范围是 [#70 R1-04](https://github.com/zlpoot/future-ui/issues/70)：**MV-Auto-Editor 双真实场景验收 + Ark UI 小范围对照**。[#4 Current Grant](https://github.com/zlpoot/future-ui/issues/4) = `R1-004`，仅覆盖 #70。

当前 future-ui 基线：main `d79cdfb4969b343581368f47d03c24ae3f40a536`。#67 / #68 / #69 已 Done/Closed。

### 冻结目标

- Real project：本地 `E:/projects/MV-Auto-Editor`
- Pilot A：人物 / 场景 / 道具卡片编辑与确认
- Pilot B：分镜 / 关键帧审核、选择/重试、局部返工
- Library B：`@ark-ui/react@5.39.3`
- Ark 首轮范围：Dialog / Button / TextInput
- Worker：Codex primary
- 模型/API：未授权
- #71：未授权

### Mandatory local preflight

在对 MV-Auto-Editor 做任何产品写入前，Codex 必须在 `E:/projects/MV-Auto-Editor` 只读执行并回报：

1. `git rev-parse --show-toplevel`
2. `git branch --show-current`
3. `git rev-parse HEAD`
4. `git status --short`
5. 当前 package manager、关键 scripts、React/UI stack

把 exact root / branch / HEAD / worktree 登记到 #70 后，才允许 Phase A 产品写入。

如果路径不是预期 repo、不是 Git repo、存在无法解释的未提交修改，或需要 reset/clean/discard 才能继续：**立即停止并报告**。禁止覆盖、清理或丢弃用户现有修改。

### R1-004 允许

- Phase A：MV-Auto-Editor Asset Edit / Approval 最小真实接入
- Phase B：Storyboard / Keyframe Review 复用同一版本 Project Profile
- Phase C：future-ui 内 Ark UI 隔离消费者 / 最小 Adapter 对照，仅 Dialog / Button / TextInput
- #70 必需的依赖 / lockfile 变更
- 本地 dev-server / jsdom / browser-like interaction，仅限本地工程
- future-ui 与 MV-Auto-Editor #70 范围内代码、测试、lint/typecheck/build、future-ui GitHub CI
- 创建 #70 PR 与同范围 review fixes
- 记录人工纠正次数、validator 捕获遗漏、人工发现但 not-covered 的遗漏

### R1-004 禁止

- 修改 public contracts Schema / `$id` / `CONTRACT_MAJOR` / core error codes
- 任意 JSX / DOM / source 通用扫描或通用源码编译器
- 从 UI 自动推导业务 Capability / 权限
- 大规模迁移 MV-Auto-Editor UI 框架
- #71 / WebMCP-like runtime implementation
- 模型/API 付费调用或真实模型 smoke
- 外部网站/browser live、外部账号或数据写入
- deploy / publish / npm publish
- merge / close #70；仍是 Human gate

### 阶段门

- Preflight Gate：登记 MV exact root / branch / HEAD / worktree 后才允许 A 写入。
- A Gate：Pilot A 真实页面 + negative cases + evidence 可复核后才进 B。
- B Gate：A/B 共用同一 Profile 且核心语义通过后才进 C。
- C Gate：Ark exact package/provenance + Dialog/Button/TextInput mapping / real render 通过后进入 Independent Review。
- 实现完成后停在 **AWAITING_HUMAN_MERGE**。

## 事实源与协作边界

1. 当前用户授权决定操作范围；不得从历史聊天、旧批准或曾打开过的 gate 推导新权限。
2. GitHub main 的已接受 Contract/ADR、Issue Acceptance 是工程规范；代码、PR exact head、实际检查和原始证据是工程事实。
3. GitHub Issue 正文的 Status 是任务状态载体；未合并文档/代码只是候选，不能称已接受/已实现。
4. Notion 只保存长期方法、解释、提示词与 GitHub 链接，不维护第二套任务/进度。
5. 旧准备文件与 D10 实验记录按其历史范围阅读；下一步导航以本轮 charter / development / #66 为准。

## 产品方向防偏

- 适配现有 UI 库，不重造完整组件库；已有参考组件保留用于兼容与验证，不自动视为第三方库适配。
- 组件固有语义、库映射、项目 Profile 分开。共享视觉必须有实值/映射，不能只统一 token 名称。
- 保留 Component / Capability / Binding 等并列契约；IR 是同源视图，不另起万能 UI DSL。
- Dev AI 目录、Runtime UI 实例结构、Runtime 业务工具分开。可读结构不等于授权，按钮事件不自动变业务工具。
- 首库/首批组件/真实页面按实际需求选择，暂不全量多库多框架扩张。
- 复用现有 catalog/validate/patch/preview/test，不扩通用控制平台；新行为必须服务当前真实 UI 一致性用例。

## JIT 与执行流程

只冻结下一项真正消费的最小契约/依赖；父项不直接进入 Coding。普通流程：目标 Issue → 最小 Contract/Decision → Current Grant → Ready → 小范围实现 → 最小充分检查 → PR Review → 按授权 Merge → main Closeout → Done → 显式 Close。

普通 Review 至少使用不同 execution/session；规定的高风险/阶段项做独立 Verify。Reviewer 一旦改产品代码即成为 Worker，不能把自己的修复当独立 Review。实质 head 变化后旧 Review/merge 授权失效。

角色与 Agent 产品解耦，现有 doubao-work/codex 等绑定和 Engineering Window 规则继续见 [协作工作流](docs/management/autonomous-engineering-workflow.md)；角色切换不扩权。

PR 使用 Refs #N，不用自动关闭掩盖未完成 closeout。不 force-push，不 reset/clean/discard，不覆盖未知修改。合并后若 closeout 失败，不标 Done，建立最小修复项。Merge/Close/付费调用/发布/下一 Issue 授权分别处理。

## 架构与安全底线

UI 与能力系统独立，通过可选 Binding 连接；组件库与 WebMCP 都是可替换方向，不能成为公共契约的强制依赖。UI-only、Agent-only、组合和有界替换四种模式保留。

业务动作由应用提供，人和 Agent 复用同一 action。局部 UI 状态、业务草稿、权威业务状态分开。发现能力、disabled 或 Schema-valid 不等于执行权限；真实身份、权限、幂等与 effect 由业务层落实。

默认拒绝未声明能力，不盲重试 unknown write；取消/超时不等于服务端回滚。Binding 的 Agent 可见字段显式 allowlist，invocation-only 数据不自动可读。开发期源码工具不进生产目录。受信构建内插件的声明不是安全沙箱。

无样式不等于没有可访问性；结构/行为和视觉组合分别验证。跨库/跨框架、SSR/hydration、性能与协议兼容都只声明实际测试范围。

## 检查与报告

普通实现使用最小充分定向检查，权限/unknown write 和阶段收口按 Issue 做独立验证。文档不触发模型效果重跑；不增加无必要 CI 层级。

文档只能证明文档；目录可检索不证明页面一致；Schema-valid 不证明实际交互/业务授权；mock 不证明真实浏览器；确定性工具测试不证明模型收益。

报告包含 exact SHA、Profile/Adapter/upstream 标识（适用时）、命令/环境、结果、失败/未测和限制。CAL-001 未显著不等于等效或不劣，不得追溯修改门槛或因产品重定位删除负结果。
