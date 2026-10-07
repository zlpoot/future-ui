# R1-02 shadcn/ui 来源核验（Phase A Freeze）

- 任务：Refs #68（D15–D17，首个存量库 adapter）
- 核验日期：2026-10-06
- 结论（已与负责人确认）：首个 `@future-ui/shadcn-adapter` 采用 **shadcn/ui `new-york-v4` style，底层 base = Radix**。Base UI（`-b base` / `base-nova`）通道**不混用**，留待后续单独 adapter。

## 1. 核验对象与不可变来源

| 项 | 值 |
| --- | --- |
| 源仓库 | https://github.com/shadcn-ui/ui |
| 固定 commit | `7ff7dbf8669fa3392c294ee745dc8d8c3cee842c`（main，2026-10-06T06:51:57Z） |
| 仓库内路径 | `apps/v4/registry/new-york-v4/ui/{dialog,button,input}.tsx` |
| Live registry | `https://ui.shadcn.com/r/styles/new-york-v4/{dialog,button,input}.json` |
| 摘要算法 | sha256（UTF-8 字节），与覆盖范围同时记录 |
| 覆盖范围 | 每个 registry item 的单一交付源文件 `files[].content`；直接 npm 依赖不在文件摘要内（由 package.json 精确版本 + pnpm-lock.yaml integrity 单独固定） |

### 逐文件指纹

| 文件 | 字节 | sha256 | git blob SHA-1 |
| --- | ---: | --- | --- |
| dialog.tsx | 4304 | `2ade6074e5fad0a4eb171ead44c43d3301a3c83d186d7236fb1fdbea80ee556b` | `ccadf4a85bf6398d52314b112600f796fc97db97` |
| button.tsx | 2382 | `79dd6f75f8136394442202d6b8b922fb269eaad0a5dba579397c9d5b41f893bb` | `e3345d985d14c33e3cb9d8c45cf973807326c944` |
| input.tsx | 952 | `0c9457181f6ddc80969bcf854e92c362903a55b6e889fbef3fd85343ecc4af5b` | `ddb9b315e34245addded54b1848bb32c80c418cc` |

- Live registry 的 `files[].content` 与上述 commit 仓库文件**逐字节一致**（脚本对比，无 local patch）。
- 仓内 vendored 副本：`packages/shadcn-adapter/src/upstream/registry/new-york-v4/ui/`，由 `tests/provenance.test.ts` 重新计算 sha256 与 git blob SHA-1 双重校验，禁止修改。
- 上游文件的内部互引用使用官方交付形态的 `@/registry/new-york-v4/*` 别名；该别名仅在 adapter 包 tsconfig（Bundler 解析）与 vitest alias 中配置，**不改动 vendored 文件一个字节**。

## 2. Base 核验：为什么是 Radix 而不是 Base UI

CLI 4.21.2 解包静态分析 + 无配置实跑双证据：

1. **静态**：`shadcn@4.21.2`（npm integrity `sha512-hVjBCjAq…`）与其 registry SDK `@shadcn/registry@0.1.1` 中，item 拉取 URL 为 `${REGISTRY_URL}/styles/${style}/${name}.json`；`getBase(undefined) === "base"`（无 style 时的 fallback），但 `getBase("new-york-v4")` 返回 **radix**。
2. **实跑**：在干净 Vite react-ts 工程中，无 `components.json` 执行 `pnpm dlx shadcn@4.21.2 view dialog`，解析结果为 `styles/new-york-v4/dialog.json`，依赖 `cn` + `radix-ui`。

三条 base 通道在同一 commit 均存在（`apps/v4/registry/bases/{radix,base,aria}/ui/`）：

| 通道 | 启用方式 | dialog/button 底层 | input |
| --- | --- | --- | --- |
| **radix（选用）** | 存量工程默认 style `new-york-v4` | 统一包 `radix-ui@1.7.0`（内含 `@radix-ui/react-dialog@1.2.0`、Slot） | 原生 input |
| base（Base UI，未选） | `shadcn init -b base`（新 preset `base-nova`，`create` 新项目默认） | `@base-ui/react@1.8.0` | 原生 input |
| aria | `-b aria` | react-aria 系 | 原生 input |

### 未选 Base UI 的原因

Base UI 是官方"**新工程 create**"默认 base，但对本任务不是薄组合通道：

1. `base-nova` registry 源码依赖 create 模板内部件（如 `icon-placeholder`），并非自包含；
2. 大量使用 `cn-button-*` / `cn-dialog-*` / `cn-font-heading` 等需 `init` 注入的主题占位类；
3. item 的 `dependencies` 字段甚至未声明 `@base-ui/react`，由 init 流程另行处理。

首版直接采用会被迫自带图标实现并补齐整套 `cn-*` 主题层，超出"薄组合 + 三组件"范围。两条通道绝不在同一 adapter 内混用。

## 3. 运行时依赖（精确版本，随 lockfile integrity 固定）

| 包 | 版本 | License | 角色 |
| --- | --- | --- | --- |
| radix-ui | 1.7.0 | MIT | base primitives（Dialog、Slot 伞包） |
| cn | 0.4.0 | MIT | vendored 源原样使用的 className 合并工具 |
| class-variance-authority | 0.7.1 | Apache-2.0 | `buttonVariants()` 变体/尺寸定义 |
| lucide-react | 1.52.0 | ISC | DialogContent 关闭按钮的 XIcon |

React peer 范围：`^19.2.0`。样式层：Tailwind v4 工具类（无 Tailwind 构建时类名不产生像素效果；确定性测试只断言结构与行为，不断言像素）。

## 4. 与冻结 Component Contract 的关键差异（已在 mapping/reference 处理，不藏黑盒）

### 4.1 Dialog `aria-modal`

契约 `parts.root` 要求 `role=dialog, aria-modal=true`。实测 `@radix-ui/react-dialog@1.2.0`：

- Content 仍渲染 `role="dialog"`，并以 FocusScope trapped + 外部 inert 实现模态；
- **但不再输出 `aria-modal` 属性**（见其 `dist/index.mjs` DialogContentImpl 约 259–264 行）。

因此组合层（`EditDialog` 的 `DialogContent`）显式补 `aria-modal="true"`；D15 mapping 中 `parts.root` 标记为 `mapped`（via `composition`），`accessibility.role` 标记为 `inherited-equivalent` 并记录该差异。

### 4.2 TextInput 只能报 `partial`：冻结契约的 `role=textbox` 不覆盖全部允许的 type

冻结的 `future-ui.text-input` 契约一方面把 `accessibility.role` 固定为 `textbox`，另一方面 `props.type` 枚举允许 `text/email/password/number/search/tel/url`。原生 `<input>` 的**隐式 ARIA role 随 type 变化**（MDN《<input>》隐式角色）：

- `text / email / tel / url` → `textbox`；
- `number` → `spinbutton`；
- `search` → `searchbox`；
- `password` → **没有**对应的隐式 ARIA role。

单个透传 type 的原生 input 无法对全部契约 type 满足 `role=textbox`；本 PR 不能修改 frozen contract，故 `accessibility.role` 成员标记为 **`unsupported`（reason + impact）**，TextInput 组件级最高 **`partial`**。其余成员仍真实 mapped：

- 事件：组合层 `valueChange` 发出契约 payload **`{ value }`**（本 adapter 无 appId 概念，只携带契约所属的 `value` 字段；不发裸 string）；
- `name`：vendored Input 只透传原生 `name`，组合层按契约 accessibility 条款补 **`aria-label={name}`**（原生 name 本身不构成 accessible name）。

D15 校验同步加 fail-closed：**已枚举的契约成员不得用 `not-applicable` 逃掉映射**（新增诊断 `r1_adapter_not_applicable_forbidden`，并带负例测试），避免该成员被改标后组件又回到 `supported`。

### 4.3 pending 期间关闭：停止等待而非放弃/回滚（R1-DLG-05）

保存请求进行中用户选择关闭时，UI 文案与行为是**"停止等待并关闭"**，不是"放弃"：

- 不调用 Abort/取消，`onSave` 仍在执行，操作在服务端**仍可能成功提交**，也不会自动回滚（符合"取消/关闭 ≠ 回滚"边界）；
- 组件设置 detached 标志，仅停止等待结果；该请求随后 resolve/reject 都**不再产生第二次 close 通知**、也不再弹出迟到的错误，有成功/失败两条回归测试。

## 6. 工具链证据（仅作 toolingProvenance，不作源码身份）

- CLI：`shadcn@4.21.2`（MIT），见 `upstream-provenance.ts.toolingProvenance`。
- 默认通道实证：无 `components.json` 的 `shadcn@4.21.2 view dialog` 解析到 `styles/new-york-v4/dialog.json`（2026-10-06 观测）。
- 源码身份只由上游 commit + 逐文件 digest 决定；CLI 版本变化不改变已冻结 vendored 文件的身份。
