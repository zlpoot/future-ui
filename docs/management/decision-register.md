# 待决策登记 · 准备期初稿

这是设计议题清单，不是任务进度表。动态讨论、状态与接受意见保存在 [#2](https://github.com/zlpoot/future-ui/issues/2)、[#3](https://github.com/zlpoot/future-ui/issues/3)；冻结选择通过 PR 写入契约/ADR。以下没有已安装或已验证的技术版本。

| ID | 问题 | 候选方向 | 解除什么阻塞 |
| --- | --- | --- | --- |
| D01 | 工具链、语言、包管理与测试框架 | **Accepted for #5 (2026-10-04), active on main @ `93ae277`:** Node 24.21.0 LTS + pnpm 11.28.4 + TypeScript 6.0.3 + ESLint 10.12.0/typescript-eslint 8.71.0 + Vitest 5.0.3；详见 `m0-01-toolchain-proposal.md`。pnpm 由 11.28.2 修订为 11.28.4（frozen-lockfile 误报 ERR_PNPM_TARBALL_INTEGRITY，且 estree@8.71.0 integrity 随 registry republish 更新，见 proposal 修订记录） | M0-01 |
| D02 | Schema 方言、生成方向、未知字段与兼容规则 | **Accepted for #6 (2026-10-04), active on main @ `73cd599`:** JSON Schema Draft 2020-12 为单一权威，生成方向 Schema → TS + catalog + validators + diagnostics，未知字段默认 strict reject（显式 extension registry 扩展），契约版本 semver（未知 major 硬错误）；详见 `m0-02-contract-freeze-proposal.md` | M0-02 |
| D03 | 首个 provider 与框架 | **Accepted for #16 (2026-10-04), active on main @ `eae3a58`:** React 19.2+（peer）；Ark UI 方向随 #18 Select 落实（Ark 5.39.2 无 Button primitive，Button 用原生 `<button>` + 自管键盘激活）；Ark 私有类型/DOM 细节不泄漏为 future-ui 公共契约；首个 provider 决策不锁死 #26 第二实现对照；版本/许可已核验，详见 `m0-05-react-provider-freeze-proposal.md`（冻结 PR #37 已接受，实现 PR #38 合并） | M1-01/04 |
| D04 | 首批组件与公共特性 | **Accepted for #16/#18 (2026-10-04), active on main @ `eae3a58`:** 首批 = Button（简单代表，已实现并验收）+ Select（有状态/复合代表，同时服务 #26 对照）；TextInput/Dialog/Theme 不开始；未支持扩展（如 searchable/multi）经 feature capability 声明或明确拒绝，不静默降级；公共特性以 #6 已冻结 Component Contract 为准；详见 `m0-05-react-provider-freeze-proposal.md`（冻结 PR #37 已接受，实现 PR #38 合并） | M1-01/04 |
| D05 | Component/Binding 公开字段、受控状态、数据投影/Agent visibility 及错误码 | **Accepted for #6 (2026-10-04), active on main @ `73cd599`:** Component M0 最小字段族（identity/version/features/props/events/state/parts/control/accessibility/lifecycle）与 Binding M0 最小字段族（componentInstanceId/capabilityId/params/projection/invocation-only/subscription）已冻结于 `m0-02-contract-freeze-proposal.md`；精确 TS 接口随 #6 Schema 实现 | M0-02/M1-03 |
| D06 | 能力 effect、授权 hook、invocation/receipt、幂等、并发及 unknown reconciliation 语义 | **Accepted for #6 (2026-10-04), active on main @ `73cd599`:** D06(M0) 最小字段族与不变量（invocation identity ≠ idempotency key、unknown 必须可对账、schema-valid ≠ authorized ≠ executed、cancel 不暗示 rollback）冻结于 `m0-02-contract-freeze-proposal.md`；D06(M1) runtime 执行、恢复和业务对账策略保持 Deferred。业务层落实实际 effect，runtime 不假保证 | M0-02（最小规则）/M1-02/03（完整执行语义） |
| D07 | 实例隔离、SSR/hydration、浏览器与可访问性支持范围 | **Accepted for #7 (2026-10-04), active on main @ `74873a6`:** D07(M0) 冻结 app/request scope、实例隔离与清理、manifest/兼容检查和 Kernel 边界的最小规则（冻结 PR #32 已接受，实现 PR #33 合并），详见 `m0-03-plugin-kernel-freeze-proposal.md`；M1 再冻结浏览器/SSR-hydration 支持矩阵及结构/行为与视觉可访问性范围。**D07(M1) 最小子集 Accepted for #16 (2026-10-04), active on main @ `eae3a58`：** jsdom 测试环境 + @testing-library/react + 最小可访问性正反例（基于原生元素语义与 Ark WAI-ARIA 内置），SSR/hydration 与多浏览器矩阵仍 Deferred；详见 `m0-05-react-provider-freeze-proposal.md`（冻结 PR #37 已接受，实现 PR #38 合并） | M0-03（最小隔离规则）/M1-01/04/07（完整支持矩阵） |
| D08 | 主题机制与视觉约束 | token/parts/variants；主题可选，不承诺行为热替换 | M1-01 |
| D09 | WebMCP API、浏览器环境和能力降级规则 | 独立实验 adapter；mock/真机分开 | M1-05 |
| D10 | AI 任务集、模型、样本量、预算、比较方法 | 直接 Ark UI 工具资料 vs future-ui，同任务/预算；数值 TBD | M1-06/07 |
| D11 | bundle/初始化/订阅清理等性能指标与阈值 | 先做明确标记且不计入验收的 calibration；随后冻结测量法/阈值，再用独立 acceptance 样本验收 | 对应性能验收 |
| D12 | 私有 workspace/package 命名与依赖许可兼容 | **Accepted for #5 (2026-10-04), active on main @ `93ae277`:** root/private workspace + `@future-ui/*` 内部命名；直接工具依赖为 MIT / Apache-2.0 permissive 组合；公共 npm 命名仍由 D13 决定，详见 `m0-01-toolchain-proposal.md` | M0-01 |
| D13 | 公开许可、npm 发布范围与发布供应链策略 | 是否开源、公开 npm scope/包名、签名/来源证明/发布权限等在真正发布前另行决策 | 发布前；不阻塞仅本地/私有的 M0/M1 |
| D14 | AI Contract Core 的 catalog/validate/diagnostics/patch 最小语义 | **Accepted for #22 (2026-10-04), active on main @ `ac63562c`:** machine-readable catalog 由 #6 Schema 单一权威生成、validate/diagnostics 直接消费 #6 M0 错误码与诊断结构、stable node ID + expected version 且 stale 拒绝、patch 仅受控声明范围（禁任意 JS/eval）、开发宿主与生产 runtime 隔离、Contract 缺口回填 #2/#6；详见 `m0-04-ai-contract-core-freeze-proposal.md`（冻结 PR #34 已接受，实现 PR #35 合并）；D10/模型预算不适用 | M1-06A1（确定性 AI Contract Core） |
| D-PORT | 早期 Contract Portability Checkpoint（#26） | **Accepted for #26 (2026-10-04), active on main @ `6f10537`:** 第二实现 = framework-agnostic 最小 DOM provider（纯 TS + jsdom，非 Vue/非 Ark，直接挑战契约是否只是 React API 包装）；代表组件 Button + Select；conformance C1–C8 双宿主（React/DOM）跑同一组公共语义断言；差异分类 = contract-gap（触发回 #2 修订）/ capability-diff / adapter-diff，实现结果 0 contract-gap（详见 `m0-06-portability-freeze-proposal.md` 与 `m0-06-portability-results.md`，冻结 PR #41 已接受）；Vue 完整对照保留给 #11 | M1-04A |
| D-CAPR | 独立能力运行时的执行与安全语义（#9） | **Accepted for #9 (2026-10-04), active on main @ `a1f3bedf`:** 统一调用路径顺序 = 存在性 → 预取消 → 幂等快查 → 输入校验 → 授权 hook → 不可逆效果强制确认 → availability 重验 → 执行 → 结果分类（全部 gate 在 handler 前，拒绝无副作用）；授权默认 deny（策略注解 ≠ 执行权限）；幂等 scope=request（invocationId）/operation（key + key-conflict 拒绝异参）；同身份 in-flight → pending 不盲重试；unknown 重放保持 unknown（不编造成交），对账走 reconciliation 句柄；cancel 永不暗示 rollback；审计递归脱敏（内置敏感键 ∪ contract.redaction）；无 React/Ark/外部 Agent 协议依赖；cart.add 业务层 fixture 落实版本+幂等+查询边界；详见 `m0-07-capability-runtime-results.md`（实现 PR `Closes #9` 合并） | M1-02 |

## 决策记录最小结构

问题、约束、候选、取舍、官方来源及查阅日期、影响范围、最终选择、接受者/接受位置、契约或代码基线。未验证的兼容性明确写未验证；来源只能支持其实际结论。

## 分阶段冻结

G0 可以只批准已经准备好的 M0 子范围，不要求先证明所有未来假设。D06/D07 采用分阶段冻结：M0 只需要与 Schema/插件隔离直接相关的最小规则，M1 的完整 runtime、浏览器和可访问性矩阵继续保持待决。对应任务仍有未决项时不能 Ready；M1 的 API/浏览器/预算问题不因 M0 获批而自动解决。

D12/D13 同样分层：M0 必须知道内部包如何命名、选中的依赖许可是否可接受；但不需要因此提前决定项目是否开源、公开 npm 名称或正式发布供应链。

运行付费模型或真实环境前必须另有当前授权。准备阶段可以做文档核验，但不擅自安装依赖、写 Spike、运行模型/浏览器或给未测项目填 PASS。
