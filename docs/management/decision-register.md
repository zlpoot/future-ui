# 待决策登记 · 准备期初稿

这是设计议题清单，不是任务进度表。动态讨论、状态与接受意见保存在 [#2](https://github.com/zlpoot/future-ui/issues/2)、[#3](https://github.com/zlpoot/future-ui/issues/3)；冻结选择通过 PR 写入契约/ADR。以下没有已安装或已验证的技术版本。

| ID | 问题 | 候选方向 | 解除什么阻塞 |
| --- | --- | --- | --- |
| D01 | 工具链、语言、包管理与测试框架 | **Accepted for #5 (2026-10-04), active on main @ `93ae277`:** Node 24.21.0 LTS + pnpm 11.28.4 + TypeScript 6.0.3 + ESLint 10.12.0/typescript-eslint 8.71.0 + Vitest 5.0.3；详见 `m0-01-toolchain-proposal.md`。pnpm 由 11.28.2 修订为 11.28.4（frozen-lockfile 误报 ERR_PNPM_TARBALL_INTEGRITY，且 estree@8.71.0 integrity 随 registry republish 更新，见 proposal 修订记录） | M0-01 |
| D02 | Schema 方言、生成方向、未知字段与兼容规则 | 单一权威定义生成目录/校验，技术 TBD | M0-02 |
| D03 | 首个 provider 与框架 | Ark UI + React 优先，Vue 小范围对照；版本/许可待核验 | M1-01/04 |
| D04 | 首批组件与公共特性 | Button/TextInput/Select/Dialog 候选；替代 provider 的共同范围待定 | M1-01/04 |
| D05 | Component/Binding 公开字段、受控状态、数据投影/Agent visibility 及错误码 | 见契约字段族；精确接口未冻结 | M0-02/M1-03 |
| D06 | 能力 effect、授权 hook、invocation/receipt、幂等、并发及 unknown reconciliation 语义 | **M0 先冻结可进入 Schema 的最小语义/字段族与不变量**；M1 再冻结 runtime 执行、恢复和业务对账策略。业务层落实实际 effect，runtime 不假保证 | M0-02（最小规则）/M1-02/03（完整执行语义） |
| D07 | 实例隔离、SSR/hydration、浏览器与可访问性支持范围 | **M0 先冻结 app/request scope、实例隔离和清理的最小规则**；M1 再冻结浏览器/SSR-hydration 支持矩阵及结构/行为与视觉可访问性范围 | M0-03（最小隔离规则）/M1-01/04/07（完整支持矩阵） |
| D08 | 主题机制与视觉约束 | token/parts/variants；主题可选，不承诺行为热替换 | M1-01 |
| D09 | WebMCP API、浏览器环境和能力降级规则 | 独立实验 adapter；mock/真机分开 | M1-05 |
| D10 | AI 任务集、模型、样本量、预算、比较方法 | 直接 Ark UI 工具资料 vs future-ui，同任务/预算；数值 TBD | M1-06/07 |
| D11 | bundle/初始化/订阅清理等性能指标与阈值 | 先做明确标记且不计入验收的 calibration；随后冻结测量法/阈值，再用独立 acceptance 样本验收 | 对应性能验收 |
| D12 | 私有 workspace/package 命名与依赖许可兼容 | **Accepted for #5 (2026-10-04), active on main @ `93ae277`:** root/private workspace + `@future-ui/*` 内部命名；直接工具依赖为 MIT / Apache-2.0 permissive 组合；公共 npm 命名仍由 D13 决定，详见 `m0-01-toolchain-proposal.md` | M0-01 |
| D13 | 公开许可、npm 发布范围与发布供应链策略 | 是否开源、公开 npm scope/包名、签名/来源证明/发布权限等在真正发布前另行决策 | 发布前；不阻塞仅本地/私有的 M0/M1 |

## 决策记录最小结构

问题、约束、候选、取舍、官方来源及查阅日期、影响范围、最终选择、接受者/接受位置、契约或代码基线。未验证的兼容性明确写未验证；来源只能支持其实际结论。

## 分阶段冻结

G0 可以只批准已经准备好的 M0 子范围，不要求先证明所有未来假设。D06/D07 采用分阶段冻结：M0 只需要与 Schema/插件隔离直接相关的最小规则，M1 的完整 runtime、浏览器和可访问性矩阵继续保持待决。对应任务仍有未决项时不能 Ready；M1 的 API/浏览器/预算问题不因 M0 获批而自动解决。

D12/D13 同样分层：M0 必须知道内部包如何命名、选中的依赖许可是否可接受；但不需要因此提前决定项目是否开源、公开 npm 名称或正式发布供应链。

运行付费模型或真实环境前必须另有当前授权。准备阶段可以做文档核验，但不擅自安装依赖、写 Spike、运行模型/浏览器或给未测项目填 PASS。
