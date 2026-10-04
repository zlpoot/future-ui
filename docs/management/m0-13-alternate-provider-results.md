# M1-04 — Alternate-provider conformance results (#11)

> Status: **DONE**（依赖在完成时已全部满足：#4 授权、#26 portability 最小挑战已收敛、#8 首批组件/主题达到冻结对照范围、#3 对照范围已冻结）。
> 结论**仅限定于本实测对象**：React provider（`@future-ui/react-provider`）与 framework-agnostic DOM provider（`packages/conformance/src/dom-provider.ts`，原生 HTML 语义、零框架依赖），代表组件 Button / Select / TextInput，jsdom 环境 + renderToString（验收 5）。

## 验收对照

| # | 验收项 | 落实 |
| --- | --- | --- |
| 1 | 同一公共 conformance 在 React/Vue 或两个 provider 中得到一致值、事件、禁用/错误与交互语义 | 两个真实 provider：React + 原生 DOM（非 Ark 别名、零 React 依赖）。`alternate-provider-conformance.test.tsx` 用**同一组 SharedCase 断言**跑两端：role/data-part、disabled 不发事件、click/change 事件载荷（value + appId）完全一致；键盘激活（Enter/Space）两端显式一致（DOM provider 镜像 React host 的键盘处理） |
| 2 | 替换 provider 不改业务动作 | 测试 `replacing the provider does NOT change the business action`：同一业务函数（`qty * 2`）分别绑定 React Button 与 DOM Button，点击后结果一致（6 === 6）。业务动作与 provider 正交 |
| 3 | 共享 feature 范围明确，扩展特性不静默假装支持 | 范围矩阵（下表）：共享 = Button/Select/TextInput 的值·事件·禁用·错误·键盘·SSR；React 扩展 = Dialog（portal/focus trap/focus restore）、theme data-part tokens、TextInput 受控 mode。DOM provider 导出面仅共享三件套，测试断言其不暴露 Dialog/theme 表面 |
| 4 | 可访问性/焦点/生命周期按冻结范围验证 | role 映射一致（button/combobox/textbox）；`data-part="root"`、`aria-label`、`aria-invalid`、`disabled` 两端一致；生命周期：React unmount 后事件不再触发、DOM provider 移除监听后不再触发；SSR/hydration：`renderToString` 与 client render 的契约表面（data-part/disabled/aria/option value）逐 token 一致 |
| 5 | 结果限定于实际组件、framework/provider 与环境，不泛称全部跨框架支持 | 本文档与测试文件标题/注释均限定：React provider + DOM provider、Button/Select/TextInput、jsdom + renderToString。未声称 Vue、Ark、SSR 全场景或全部组件已兼容 |

## 共享 feature 范围矩阵（验收 3）

| 能力 | React provider | DOM provider | 备注 |
| --- | --- | --- | --- |
| 值（defaultValue / value + valueChange） | ✓ | ✓ | 同一载荷 `{ value, appId }` |
| 事件载荷 appId | ✓ | ✓ | 同一 appId 来源语义 |
| 禁用（disabled 不发事件） | ✓ | ✓ | 两端测试断言 |
| 错误态（aria-invalid） | ✓ | ✓ | TextInput.error |
| 键盘激活（Enter/Space） | ✓ | ✓ | DOM provider 镜像显式处理 |
| placeholder | ✓ | ✓ | Select/TextInput |
| 受控 value（单一权威） | ✓ | — | React 扩展特性：DOM provider 为非受控原生语义，**不静默假装支持** |
| Dialog（portal/focus trap/focus restore） | ✓ | — | React 扩展特性，不在共享面 |
| Theme data-part tokens | ✓ | — | React 扩展特性（#20），不在共享面 |
| 生命周期监听清理 | ✓ | ✓ | unmount / AbortSignal dispose |

## 证据

- `packages/conformance/tests/alternate-provider-conformance.test.tsx`（8 项）：两端同断言、禁用语义、键盘激活、业务动作替换、生命周期、SSR/hydration、共享面显式边界。
- `packages/conformance/src/dom-provider.ts`：新增 `createDomTextInput`，`createDomButton` 键盘激活对齐（Enter/Space）。

## 验证

- `pnpm lint` ✓ / `pnpm typecheck` ✓ / `pnpm test`：新增后全量通过（本 PR 新增 8 项）。
- 未执行（#11 禁止）：不重复 #26 最小 checkpoint；不扩大到所有组件/框架；DOM provider 不是 Ark 别名（零框架依赖，只消费公共契约形状 + 原生 HTML 语义）。
