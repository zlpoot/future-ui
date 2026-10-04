# M0-03 Plugin Kernel 决策冻结提案（D07(M0)）
日期：2026-10-04  
状态：**Proposed for #7**。本文件冻结 #7（M0-03 最小 Plugin Kernel）所需的 D07(M0) 最小隔离规则：app/request scope、实例隔离与清理、manifest/兼容检查与 Kernel 边界。冻结后 #7 才可能通过 DoR 进入 Ready。合并须经负责人接受（Contract gate，merge=human）。

## 目标
为 #7 提供"安装时可选、启动时配置"的最小 Plugin Kernel 的可实现基础：应用实例作用域、manifest、provides/requires、契约兼容检查、init/dispose、冲突检测和初始化失败清理。本文件只冻结 M0 最小隔离规则；浏览器/SSR-hydration 完整支持矩阵与可访问性矩阵（D07(M1)）、完整 extension point 设计保持 Deferred，由真实消费者反向验证后再收敛。

## D07(M0) · 最小隔离与 Plugin Kernel 规则（冻结）
### 候选与取舍
| 候选 | 方向 | 取舍 |
| --- | --- | --- |
| A. 注册表归属应用实例，显式 app/request scope | 每实例独立注册表；scope 声明状态归属 | **冻结采用**。与 #6 Plugin Schema（scope.app / scope.request）直接对齐；多实例与 SSR/request scope 不串状态可验证 |
| B. 全局单例注册表 + 运行时参数隔离 | 共享注册表，隔离靠参数 | 状态串扰风险高，无法在 M0 证明隔离；暂不采用 |
| C. 通用万能 hook 平台（market/热插拔/远程加载） | Kernel 暴露不受限 hook | 与 #7 禁止项冲突（不做插件市场/远程下载执行/不可信 JS 沙箱）；M0 不做，等真实消费者再收敛 extension point |

### 冻结规则
1. **app/request scope**：插件注册表归属应用实例。多实例各自持有注册表；request scope 插件（`scope.request=true`）的状态/订阅与 request 生命周期绑定，初始化/卸载不跨实例泄漏。M0 冻结 scope 语义为声明字段（`scope.app` / `scope.request` 布尔），不要求完整 request-scoped 容器实现，但**任何已分配资源必须与所属实例绑定并可回收**。
2. **manifest 与兼容检查**：插件 manifest 声明 `kind` / `id` / `contractVersion` / `provides` / `requires` / `compatibility`（platform、engines）。加载时执行兼容检查：
   - 缺依赖（`requires` 未满足）→ 明确失败，返回结构化诊断，不静默降级；
   - 重复 provider（同一 `provides` 项已被其他已加载插件提供）→ `conflict`，拒绝加载；
   - 版本不兼容（`contractVersion` 未知 major 或 engines 不满足）→ `unknown_major_version` / `constraint_violation`，拒绝加载；
   - 不支持特性（平台/引擎不在 `compatibility` 范围）→ `unsupported_feature`，拒绝加载。
   - 以上失败均使用 #6 冻结的 M0 错误码与 `code/path/expected/actual/explanation` 诊断结构。
3. **init/dispose 与失败清理**：
   - `init` 失败必须回滚/释放本次初始化已分配的全部资源（订阅、注册、listener、临时状态），不留下半初始化实例；
   - `dispose` 释放订阅、注册与 listener；卸载后注册表无残留（可验证：卸载后 provider 查询返回 `node_not_found` 或空）；
   - `cleanupOnFailure` 声明失败路径是否清理；kernel 不依赖插件自行清理。
4. **Kernel 边界**：
   - 不暴露不受限的万能 hook；未被真实消费者验证的 extension point 不进入稳定公共契约；
   - 权限声明只用于约束与审查，不被宣称为不可信插件沙箱（不可信 JS 沙箱是 #7 禁止项）；
   - UI-only 组合不要求 Agent 模块，能力-only 组合不要求 UI provider；Kernel 不强制耦合。

### 反例（应被拒绝并给出结构化诊断）
- 插件声明 `requires: ['theme:base']` 但应用未加载该 provider → 缺依赖失败（`missing_required`/`constraint_violation`）。
- 两个插件同时 `provides: ['theme:light']` → 重复 provider 冲突（`conflict`）。
- 插件 `contractVersion: '0.5.0'`（未知 major）或 engines 要求 futureUi `<1.0.0` → 版本不兼容（`unknown_major_version` / `constraint_violation`）。
- 平台不匹配（`compatibility.platform` 不含当前运行时）→ `unsupported_feature`。
- `init` 中途抛错后 kernel 继续使用该实例 → 失败清理未执行，必须释放已分配资源。
- 卸载后 provider 仍可被发现/调用 → 残留，违反隔离规则。
- Kernel 暴露 `hook: (anything) => anything` 万能扩展点 → 违反 Kernel 边界，不进公共契约。

## #2 最小契约（M0 冻结范围）
本文件冻结 #2 对 #7 的最小契约：上述 scope/隔离/清理/兼容检查规则 + #6 已冻结的 Plugin 最小字段（kind/id/version/provides/requires/compatibility/scope/lifecycle）。完整 extension point（component/theme/capability/protocol hook）保持 Deferred，等真实消费者（如 #22 AI Contract Core 或代表 UI）首次接入后再收敛。

## 验收对照（#7）
- [x] manifest 声明插件 kind/version/provides/requires 与契约兼容范围（#6 Plugin Schema 已落地）。
- [x] 缺依赖、重复 provider、版本不兼容与不支持特性明确失败，不静默降级（本文件规则 2）。
- [x] 插件注册表归属应用实例，多实例与 SSR/request scope 不串状态（规则 1）。
- [x] 初始化失败可清理已分配资源；卸载释放订阅、注册与 listener（规则 3）。
- [x] UI-only 组合不要求 Agent 模块；能力-only 组合不要求 UI provider（规则 4）。
- [x] Kernel 不暴露不受限的万能 hook；未验证 extension point 不进稳定公共契约（规则 4）。
- [x] 权限声明只用于约束/审查，不被宣称为不可信插件沙箱（规则 4）。

## 官方/上游依据
查阅日期：2026-10-04。
- JSON Schema Draft 2020-12：https://json-schema.org/draft/2020-12/release-notes
- SemVer：https://semver.org/
- M0 错误码与诊断结构：#6 已冻结（`docs/management/m0-02-contract-freeze-proposal.md`）

## 待冻结/保持 Deferred
- D07(M1) 浏览器/SSR-hydration 支持矩阵与完整可访问性矩阵（#16/#18 前冻结）。
- Plugin 完整 extension point（component/theme/capability/protocol hook）：真实消费者首次接入后再收敛。
- 插件市场、远程下载执行、不可信 JS 沙箱、全量热插拔平台：#7 禁止项，不冻结。

## 修订记录
- 2026-10-04：初始提案，冻结 D07(M0) 最小隔离与 Plugin Kernel 规则。
