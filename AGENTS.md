# future-ui · Agent 工作入口

## 当前执行边界：R1-RC-001 · #86 ONLY

负责人于 2026-10-08 明确指示「启动下一步」，目标为 [#86：第一版可人工测试交付](https://github.com/zlpoot/future-ui/issues/86)。唯一活动授权：[**#4 Current Grant = R1-RC-001**](https://github.com/zlpoot/future-ui/issues/4)。它不覆盖 #71、#66 其他任务或任何历史 #70 实施。

- 受信起点：`main@259330e51eaf5fd8e7521f7aa196fa68c545d813`，即 [#85](https://github.com/zlpoot/future-ui/pull/85) 已独立复审并获 Owner 授权 squash merge 的基线；[#70](https://github.com/zlpoot/future-ui/issues/70) 已 CLOSED/COMPLETED，历史 NOT-COVERED、首次 CI 失败和审查记录不变。
- **Activation Gate：本 AGENTS-only 授权同步 PR 必须先独立 Review 并获 Owner Merge 授权、进入 main。其合入前只能执行 #86 的 GitHub / Windows read-only preflight 与 Demo/launch 盘点，不得修改产品代码或运行尚未批准的扩权行为。**
- 合入之后，#86 才能在单独实现分支内开展最薄本地 Demo/人工验收入口编码；真实 Windows/browser 结果未产生前仍为 NOT-TESTED。
- Worker：Windows Codex；Reviewer：ChatGPT 在**不同 execution/session** 独立 Review；Human：现场人工验收、Merge/Close/Tag/Release Gate。Owner 的「启动下一步」不是合并/关闭或发布授权。

### #86 产品目标（仅在 Activation Gate 满足后）

1. **本地真正可启动**：先只读检查已有 demo、脚本、测试与 UI 资产；尽量复用 `packages/shadcn-adapter` 与 `packages/ark-ui-adapter`。无可用浏览器入口时仅补最薄 host / run script，不建第二个 UI 框架。
2. **可人工操作对照**：在 Windows、Node >=24.21.0 / pnpm 11.28.4、frozen lockfile 下，用浏览器操作 Dialog（标题、显式 Close、Escape、focus）、Button（type/disabled/loading/pending/submit/reset）及 TextInput（controlled/uncontrolled/ARIA），明示 shadcn 与 Ark 的 supported / partial / unsupported；Ark 视觉 token 仍 unsupported。
3. **AI View/Validator 只读展示**：仅复用已接受的 Project AI View / explicit instance / bounded validator 与 `mv-auto-editor/1.0.0` 同一 Profile；必须能看到身份/版本/import/examples/limits 及 FAIL、NOT-COVERED 负例。不生成 Capability/业务工具；UI-only 示例脱离 Agent/MCP 仍独立运行。
4. **可复核证据**：交付 README 本地启动命令、10–15 分钟手工检查表、真实 Windows 浏览器截图/操作与 exact HEAD、必要的 lint/typecheck/target tests 和现有 CI；声明 declared/rendered/interaction-verified/not-covered，不能把 jsdom、mock、截图或未测事实伪装成完整浏览器验证。

### 允许 / 禁止 / 停点

- 激活之前：只读 preflight，检查 Windows repo root/branch/HEAD/status、现有入口；本 AGENTS-only PR（`Refs #86`）及其独立 Review/合并。
- 激活之后：只限 #86 的 future-ui 内小范围源代码、文档、必要依赖/lockfile、loopback local browser、定向测试、一个实现 Draft PR；对失败/首次质量记录如实保留。
- 始终禁止：修改公共 Contract Schema / `$id` / `CONTRACT_MAJOR` / frozen core diagnostics 或 BOUNDED_RULES；复制第二份 Profile、扫描任意 JSX/DOM/source、构建通用平台；对 MV-Auto-Editor 产品与真实数据写入；#71 WebMCP runtime / AWH Dashboard；模型/API 付费调用、外部浏览器/账号写入、非 loopback 端点、部署/npm publish/tag/release。
- 若 Windows 工作树存在无法解释的改动、必须 reset/clean/discard、需要扩大上述范围或真实验证缺失，立即停在 BLOCKED 并报 Issue；不得 force-push 或覆盖用户改动。
- 产品 Draft PR 须在 exact HEAD 上独立 Review，Owner 单独授权 Merge/Close；第一版人工体验达标也不自动授权发布。

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

R1-RC #86 首步先做 Windows future-ui 代码仓/工作树 read-only preflight 和已有 Demo/launch 资产盘点，记录新旧 AGENTS 授权差异；activation PR 未进入 main 前不得 Coding。进入实现时优先复用现有组件/AI View，不触碰 MV 实际业务数据。普通实现使用最小充分定向检查，权限/unknown write 和阶段收口按 Issue 做独立验证。文档不触发模型效果重跑；不增加无必要 CI 层级。

文档只能证明文档；目录可检索不证明页面一致；Schema-valid 不证明实际交互/业务授权；mock 不证明真实浏览器；确定性工具测试不证明模型收益。

报告包含 exact SHA、Profile/Adapter/upstream 标识（适用时）、命令/环境、结果、失败/未测和限制。CAL-001 未显著不等于等效或不劣，不得追溯修改门槛或因产品重定位删除负结果。
