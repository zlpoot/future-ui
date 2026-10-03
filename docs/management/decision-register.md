# 待决策登记 · 准备期初稿

这是设计议题清单，不是任务进度表。动态讨论、状态与接受意见保存在 [#2](https://github.com/zlpoot/future-ui/issues/2)、[#3](https://github.com/zlpoot/future-ui/issues/3)；冻结选择通过 PR 写入契约/ADR。以下没有已安装或已验证的技术版本。

| ID | 问题 | 候选方向 | 解除什么阻塞 |
| --- | --- | --- | --- |
| D01 | 工具链、语言、包管理与测试框架 | TypeScript；最小按需 workspace；具体版本 TBD | M0-01 |
| D02 | Schema 方言、生成方向、未知字段与兼容规则 | 单一权威定义生成目录/校验，技术 TBD | M0-02 |
| D03 | 首个 provider 与框架 | Ark UI + React 优先，Vue 小范围对照；版本/许可待核验 | M1-01/04 |
| D04 | 首批组件与公共特性 | Button/TextInput/Select/Dialog 候选；替代 provider 的共同范围待定 | M1-01/04 |
| D05 | Component/Binding 公开字段、受控状态、数据投影/Agent visibility 及错误码 | 见契约字段族；精确接口未冻结 | M0-02/M1-03 |
| D06 | 能力 effect、授权 hook、invocation/receipt、幂等、并发及 unknown reconciliation 语义 | 业务层落实实际 effect；runtime 只声明可验证调用/回执/对账契约，不假保证；参数与恢复策略待定 | M1-02/03 |
| D07 | 浏览器、SSR/hydration、多实例与可访问性支持范围 | 先明确有限支持矩阵；结构/行为与视觉可访问性分层声明，自动+必要人工检查 | M1-01/04/07 |
| D08 | 主题机制与视觉约束 | token/parts/variants；主题可选，不承诺行为热替换 | M1-01 |
| D09 | WebMCP API、浏览器环境和能力降级规则 | 独立实验 adapter；mock/真机分开 | M1-05 |
| D10 | AI 任务集、模型、样本量、预算、比较方法 | 直接 Ark UI 工具资料 vs future-ui，同任务/预算；数值 TBD | M1-06/07 |
| D11 | bundle/初始化/订阅清理等性能指标与阈值 | 先做明确标记且不计入验收的 calibration；随后冻结测量法/阈值，再用独立 acceptance 样本验收 | 对应性能验收 |
| D12 | license、npm scope、包发布与供应链策略 | 当前私有准备，不默认选择开源许可/发布范围 | 发布前；不必阻塞全部 M0 |

## 决策记录最小结构

问题、约束、候选、取舍、官方来源及查阅日期、影响范围、最终选择、接受者/接受位置、契约或代码基线。未验证的兼容性明确写未验证；来源只能支持其实际结论。

## 分阶段冻结

G0 可以只批准已经准备好的 M0 子范围，不要求先证明所有未来假设。对应任务仍有未决项时不能 Ready；M1 的 API/浏览器/预算问题不因 M0 获批而自动解决。

运行付费模型或真实环境前必须另有当前授权。准备阶段可以做文档核验，但不擅自安装依赖、写 Spike、运行模型/浏览器或给未测项目填 PASS。
