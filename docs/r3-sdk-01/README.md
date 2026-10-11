# Future UI React SDK（0.1.0-rc.1 · 本地候选包）

Future UI 是一个基于 **React 19 + Vite + TypeScript + Tailwind CSS v4 + shadcn/Radix** 的
UI 规范与组件适配框架。本 SDK 是**未发布到 npm 的本地分发候选**，供第三方开发者在
Windows 上独立初始化 React 工程并消费已打包的组件、主题与 AI 开发规范。

> **重要边界**：本包内的 `@future-ui/*` 尚未发布到 npm registry。所有安装必须通过
> 本 SDK 的 `packages/` 本地归档（`file:` / `--local-rc-dir`）完成，**不能**使用
> `npm install @future-ui/shadcn-adapter` 等公网命令（registry 无此包，会 404）。

## 前置环境

| 项 | 要求 |
|---|---|
| OS | Windows（macOS 未实测，标记 `MAC_NOT_TESTED`） |
| Node.js | >= 24.21.0（推荐固定版本运行） |
| 包管理器 | npm 11+（或 pnpm 11.28.4 / corepack） |
| 网络 | 安装阶段需要访问 npm registry 下载公共三方依赖（React、Vite、Tailwind 等）；本 SDK 不包含完整 node_modules |

## 包内容

```
future-ui-react-sdk-0.1.0-rc.1/
├── packages/                          # 五个可独立消费的 npm 归档
│   ├── create-future-ui-0.1.0-rc.1.tgz          # 新工程初始化器（CLI）
│   ├── future-ui-contracts-1.0.0.tgz            # 公共契约（组件身份/Profile）
│   ├── future-ui-react-provider-0.1.0-rc.1.tgz  # React Provider（主题/宿主上下文）
│   ├── future-ui-theme-0.1.0-rc.1.tgz           # 主题 token（theme.css，Light/Dark）
│   └── future-ui-shadcn-adapter-0.1.0-rc.1.tgz  # shadcn/Radix 组件适配器（Browser 入口）
├── docs/
│   ├── 快速开始.md            # 解压 → 初始化 → 安装 → 运行 → 构建 → 测试
│   ├── 组件使用手册.md        # EditDialog / ShadcnButton / ShadcnTextInput API 与示例
│   ├── 主题与样式.md          # theme.css、Tailwind v4 @source、data-theme、Portal、已知陷阱
│   └── AI开发指南.md          # AI-AGENTS.md、ai:view / ai:doctor / ai:check
├── examples/README.md        # 最小示例说明（模板自带可运行 demo）
├── manifest.json              # source HEAD、包版本、各包 SHA-256、测试状态
└── SHA256SUMS.txt             # packages/ 内五个 tgz 的 SHA-256
```

## 快速开始（三行）

```powershell
# 1. 解压 SDK 到任意目录（假设解压后路径为 <SDK_DIR>）
# 2. 用 CLI 归档创建一个全新 React 工程（不依赖 Future UI 源仓库）
npm exec --yes --package="<SDK_DIR>\packages\create-future-ui-0.1.0-rc.1.tgz" -- create-future-ui my-app --local-rc-dir "<SDK_DIR>\packages"

# 3. 安装依赖并启动
cd my-app
npm install
npm install-scripts approve esbuild   # 首次安装时按提示批准 esbuild 安装脚本
npm run dev                           # http://localhost:5173
```

完整步骤见 `docs/快速开始.md`；组件 API 见 `docs/组件使用手册.md`；
主题见 `docs/主题与样式.md`；AI 开发规范入口见 `docs/AI开发指南.md`。

## 版本与校验

- 全部包版本、Source HEAD 与 SHA-256 见 `manifest.json` / `SHA256SUMS.txt`。
- 校验方式（PowerShell）：
  ```powershell
  Get-FileHash "<SDK_DIR>\packages\*.tgz" -Algorithm SHA256
  ```

## 已知限制（真实边界）

- `@future-ui/*` 未发布 npm（`UNPUBLISHED`）；SDK 为本地候选分发，不承诺公网安装。
- macOS 未实测（`MAC_NOT_TESTED`）；仅保证 Windows 消费链路。
- 组件支持边界：EditDialog `supported`；ShadcnButton / ShadcnTextInput `partial`
  （Button `loading`、TextInput `accessibility.role` 等为 unsupported，详见组件手册）。
- 通用 Table / Sidebar / Forms 组件 Contract 不存在，`ai:view` 输出以 `not-covered` 标注。
- 本 SDK 不包含完整 node_modules：消费端仍需网络/缓存获取公共三方依赖。
