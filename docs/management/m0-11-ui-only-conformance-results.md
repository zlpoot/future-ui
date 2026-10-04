# M1-01F — UI-only conformance & bundle acceptance results (#21)

> Status: **DONE**（依赖在完成时已全部接受：#16–#20 merged、#26 通过）。结论范围仅覆盖实际测试组合（React 19 + jsdom，theme 可选），不扩展到"所有框架/provider 已兼容"（#21 禁止条款）。

## 验收对照

| # | 验收项 | 落实 |
| --- | --- | --- |
| 1 | 同一类组件公共语义通过稳定 conformance 用例表达 | `packages/conformance/tests/shared-component-semantics.test.tsx`：Button/TextInput/Select/Dialog 共享断言——role + `data-part="root"`、事件载荷携带 `appId`、无 capability/protocol/model 痕迹、无主题依赖 |
| 2 | 组件特有语义仍有专用用例，不被万能测试吞掉 | 组件专用测试保留在 `packages/react-provider/tests/{button,select,text-input,dialog}.test.tsx`；共享用例只表达跨组件义务，不重复组件特有细节 |
| 3 | UI-only 构建/依赖图证明不加载 capability runtime、protocol adapter、model SDK | `packages/conformance/tests/ui-only-dependency-graph.test.ts`：静态断言 UI 三包（react-provider/theme/conformance）package.json 依赖与 src/ import 均不含 `@future-ui/capability-runtime` / `@future-ui/ai-contract-core` / `@future-ui/plugin-kernel` / openai / @ai-sdk / ai；且 `@future-ui/*` 依赖仅限 contracts/react-provider |
| 4 | 自动可访问性与冻结的必要人工检查分别记录 | 自动：role/ARIA 属性/键盘语义/事件语义断言（各组件包 + 共享用例，jsdom）。人工：真实像素焦点环、对比度比值（WCAG 2.1 AA 4.5:1 名义）、复杂组合交互——记录于 `docs/management/m0-10-theme-notes.md` 与下节"人工检查清单" |
| 5 | 只对实际测试的 framework/provider/theme 组合下结论 | 结论限定：React 19.3（jsdom 26）；ThemeProvider 可选组合；不做任何跨框架/provider 声称 |
| 6 | 一个独立 PR 可完成 | 本 PR 独立闭环（本文件 + 共享用例 + 依赖图用例） |

## 人工检查清单（冻结范围，非自动化）

- 焦点可见性：真实浏览器中 focus ring 与背景对比 ≥ 3:1（名义 token：`--future-ui-focus-ring`）。
- 错误/状态视觉提示：error 提示不只依赖颜色（同时有 icon/文本/aria-invalid）。
- 组合视觉回归：Button/Select/TextInput/Dialog 在 light/dark theme 下结构一致、事件语义一致。
- 键盘完整链路：真实浏览器 Tab 序与 Dialog 焦点陷阱（本仓库 jsdom 无法证明像素级行为）。

## 结论（仅限以下组合）

- 宿主：React 19.3 + jsdom 26。
- 主题：可选 ThemeProvider（token/parts/variants）。
- 已证明：UI-only 依赖图干净（无 capability/protocol/model）；公共语义 conformance 全绿；组件专用用例 183+ 项保持绿色。

## 验证

- `pnpm lint` ✓ / `pnpm typecheck` ✓ / `pnpm test`：全量通过（用例数见 PR 描述）。
- 依赖图用例为本 PR 新增静态断言，CI 同跑。
