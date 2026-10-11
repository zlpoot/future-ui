# AI 开发指南（Coding Agent 与开发者共用）

create-future-ui 生成的每个新工程都自带机器可读的 **AI 规范入口**（`AI-AGENTS.md` + `ai/` 命令）。
Coding Agent（如 Codex、豆包）可以主动查询组件目录、Profile、版本与支持边界，
然后按规范编写代码；人类开发者也可以用它快速核对工程状态。

## 1. 命令一览（Node-only，开发期）

| 命令 | 作用 | 输出 |
|---|---|---|
| `npm run ai:view` | 当前工程的 AI 规范视图：组件目录、真实 import 路径与导出名、包/Profile/版本、支持边界、Admin List 页面 recipe | JSON（stdout；`--out ai/artifacts/ai-view.json` 显式落盘） |
| `npm run ai:doctor` | 检查依赖声明 vs 实际安装版本、vendor 归档、browser 入口、Profile 一致性 | JSON；有诊断时退出码非零 |
| `npm run ai:check` | 对 src 中声明的组件使用做只读验证（import 路径、可静态确认的行为约定） | JSON；有诊断时退出码非零 |

所有命令**只读、确定性**：不执行业务操作、不调用模型、不修改文件。

```powershell
npm run ai:view
npm run ai:doctor
npm run ai:check
```

落盘（ai:view 才支持）：

```powershell
npm run ai:view -- --out ai/artifacts/ai-view.json
```

## 2. ai:view 输出的核心事实（真实结构）

- `components`：`future-ui.dialog`（EditDialog，supported）、`future-ui.button`（ShadcnButton，partial）、
  `future-ui.text-input`（ShadcnTextInput，partial），每项含 `importPath: "@future-ui/shadcn-adapter/browser"`、
  `declaredExports`（真实导出名数组）、`exportVerified`、`missingExports`、
  `mapping.domains`（逐条 supported / partial / unsupported）。
- `profile`：`profileId: r1-edit-dialog-reference` + `profileVersion: 1.0.0`（`editDialogProfile`）。
- `packages`：数组，每项 `name/version/declared/installed/browserSafe`——contracts `1.0.0`，
  其余包 `0.1.0-rc.1`，从**已安装 package.json** 派生，不硬编码。
- `pages`：`future-ui.page.admin-list` 组合 recipe（侧栏/页头层级/统计卡/搜索/语义表格/EditDialog 交互约定）。
- `theme`：`cssEntry: "@future-ui/theme/theme.css"`、`cssInstalled`、Light/Dark 说明、Portal 说明。

## 3. 状态边界（不得虚报）

| 状态 | 含义 | 当前实例 |
|---|---|---|
| `supported` | D15 映射无 unsupported 成员 | EditDialog |
| `partial` | 存在 unsupported 契约成员 | Button（`features.loading`）、TextInput（`accessibility.role`） |
| `unsupported` | 冻结契约标记不支持的成员 | 见 ai:view 的 `mapping.domains` 逐条 |
| `not-covered` | 无契约覆盖，不冒称支持 | 通用 Table/Sidebar/Forms Contract（不存在）、WebMCP Runtime、npm 公网安装（未 publish） |

**规则**：未知组件或未知页面不得虚报 supported；静态检查无法确认的运行时行为
（pending 视觉、取消不保存、换肤）必须标注验证限制，不以 ai:check 通过冒充运行时 PASS。

## 4. 推荐给 Coding Agent 的工作流

1. 先读 `AI-AGENTS.md`（生成工程的根目录），再跑 `npm run ai:view`；
2. 组件一律从 `@future-ui/shadcn-adapter/browser` 导入（根入口含 Node-only 校验器，禁止）；
3. 遵守契约行为：Esc/遮罩点击不关闭 Dialog；取消不保存由 Host 决定；保存 pending 由 EditDialog 呈现并防重复；
4. 写完跑 `npm run ai:check` 与 `npm run ai:doctor`，确认无诊断、无 not-covered 虚报；
5. 交互行为（pending/取消/换肤/焦点）以 jsdom fixture 与人工 Chrome 验收为准，不把静态检查当运行时 PASS。

## 5. 常见诊断示例

- `ai:doctor` 报版本不一致：`package.json` 依赖与实际安装的 `@future-ui/*` 版本漂移
  （例如声明 `0.0.0` 而实际 `0.1.0-rc.1`）——重新用 CLI + `--local-rc-dir` 生成或修正依赖。
- `ai:doctor` 报 browser 入口不可用：确认 `@future-ui/shadcn-adapter/browser` 可解析（install 后应自动通过）。
- `ai:check` 报未知组件：`src` 中使用了目录外组件——改用支持的三个组件或标注 not-covered。

## 6. 边界

- `ai:*` 命令是 Node-only 开发工具，**不会进入浏览器构建图**（模板 vite 配置已隔离）。
- `@future-ui/ai-dev` 是私有 Node-only 包，不作为生产 UI Runtime 打包。
- 本 SDK 未发布 npm（`UNPUBLISHED`）；AI 指南面向本地候选分发的真实行为。
