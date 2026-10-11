# R3-WIN-02 · Issue #108 · Windows 验收记录

- Base：`b1d8700a592ef98a0d34b62e52e163317658e8a5`（#110 squash merge 后的 main）
- 分支：`feat/r3-win-02-ai-project-view`（独立 worktree `E:\projects\future-ui-win02`）
- 环境：Windows；Node `C:\Program Files\nodejs\node.exe` = v24.21.0；npm CLI = npm 11.19.0；
  repo 内 corepack pnpm 11.28.4；真实 RC 归档来自 `E:\projects\future-ui-r3rc\rc-dist`（四包 SHA 与 #105 冻结清单逐位一致）

## 一、本轮架构取舍

1. **权威版本 = 已安装包元数据**：修复 `packages/ai-dev/src/project/shadcn-descriptor.ts` 历史问题
   ——`ADAPTER_PACKAGE_VERSION` 曾硬编码 `0.0.0`，实际 RC 为 `0.1.0-rc.1`。改为
   `import adapterPackageJson from '@future-ui/shadcn-adapter/package.json' with { type: 'json' }`
   （adapter 的 exports 新增 `./package.json` 子路径）。同一文件把组件 `source.module`
   从根入口 `@future-ui/shadcn-adapter` 改为浏览器安全入口
   `@future-ui/shadcn-adapter/browser`。
2. **新工程 AI 工具 = Node-only、零第三方依赖、事实全部从安装资产派生**：
   `ai/*.mjs`（project-info / ai-view / ai-doctor / ai-check）只用 `node:fs/path/url` +
   动态 `import('@future-ui/shadcn-adapter/browser')` 读真实导出与 D15 映射；包版本
   直接 fs 读 `node_modules/<pkg>/package.json`（不经 exports，无子路径限制）。
   **不进任何 Browser bundle**（Browser 只导入 `@future-ui/shadcn-adapter/browser` 与
   `@future-ui/theme/theme.css`）。
3. **Admin List Page = 组合 recipe，不是通用组件 Contract**：recipe 规定 Sidebar 导航、
   Header 层级、统计卡、搜索筛选、语义表格、EditDialog 交互与 Light/Dark token 引用；
   明确标注"通用 Table/Sidebar/Forms Contract 尚不存在，普通 HTML+Tailwind 不声称正式支持"。
4. **supported / partial / unsupported / not-covered 明确区分**：组件映射从 browser 导出的
   D15 映射逐成员派生（无 unsupported → supported；有 → partial）；未知导出/未覆盖范围
   一律 not-covered，不虚报。

## 二、改动文件

| 文件 | 改动 |
|---|---|
| `packages/ai-dev/src/project/shadcn-descriptor.ts` | 版本从 `@future-ui/shadcn-adapter/package.json` 派生（import attributes）；source.module → `/browser` |
| `packages/shadcn-adapter/package.json` | exports 增 `"./package.json": "./package.json"`（包元数据权威读取通道） |
| `packages/ai-dev/tsconfig.json` | `resolveJsonModule: true`（import attributes 类型解析） |
| `packages/ai-dev/tests/project-integration.test.tsx` | 新增断言：browser 入口 + 版本 ≠ 0.0.0 + 三个导出名 |
| `packages/create-future-ui/src/template.ts` | scripts 增 `ai:view` / `ai:doctor` / `ai:check` |
| `packages/create-future-ui/templates/react-vite-ts/ai/*.mjs` | 新增 4 个 Node-only AI 工具 |
| `packages/create-future-ui/templates/react-vite-ts/AI-AGENTS.md` | 新增 Coding Agent 发现入口 |
| `packages/create-future-ui/templates/react-vite-ts/README.md.tmpl` | 增 AI 规范入口说明 |
| `packages/create-future-ui/tests/cli.test.ts` | 新增模板含 AI 工具/入口/scripts 断言 |
| `docs/r3-win02/rc108-win02-acceptance.md` | 本记录 |
| `docs/r3-win02/evidence/win02-ai-{light,dark}.png` | 离仓工程真实 Chrome 冒烟截图 |

## 三、组件目录 / Profile / 版本 / 导入来源（ai:view 实际输出要点）

- 组件目录（来自 browser 真实导出 + D15 映射）：
  - `future-ui.dialog` → `EditDialog`，mappingStatus **supported**，import `@future-ui/shadcn-adapter/browser`
  - `future-ui.button` → `ShadcnButton`，mappingStatus **partial**（`features.loading` unsupported）
  - `future-ui.text-input` → `ShadcnTextInput`，mappingStatus **partial**（`accessibility.role` 等 unsupported）
- Profile：`r1-edit-dialog-reference@1.0.0`（从 browser 导出的 `editDialogProfile.identity` 读取）
- 版本：`@future-ui/contracts 1.0.0`、`react-provider/theme/shadcn-adapter 0.1.0-rc.1`
  （全部从已安装 package.json 派生，无硬编码）
- 浏览器入口唯一合法：`@future-ui/shadcn-adapter/browser`；根入口含 Node-only validators，禁止导入
- Theme：`@future-ui/theme/theme.css`（dist/theme.css 已安装，`<html data-theme>` Light/Dark）

## 四、Windows 真实离仓验收（Node 24.21.0，源仓库外全新目录）

全部命令绝对路径固定执行（不依赖 PATH 里的 sandbox Node22）：

| 步骤 | 命令 | 退出码 |
|---|---|---|
| 安装 CLI 归档（`71DDBBE6…`） | `& node24 npm-cli.js install <cli.tgz> --prefix installer` | 0 |
| 生成新工程 | `node installer\...\dist\cli.js my-r3ai --local-rc-dir E:\projects\future-ui-r3rc\rc-dist` | 0 |
| 安装工程依赖（file:vendor 四归档） | `npm install` + `install-scripts approve esbuild` | 0 |
| **ai:view** | `node ai/ai-view.mjs` → `E:\projects\cfu-accept\win02-main\ai-view.json` | **0** |
| **ai:doctor** | `node ai/ai-doctor.mjs` → `ai-doctor.json`（12/12 pass，status ok） | **0** |
| **ai:check** | `node ai/ai-check.mjs` → `ai-check.json`（无诊断） | **0** |
| typecheck | `node node_modules\typescript\bin\tsc --noEmit` | 0 |
| build | `node node_modules\vite\bin\vite.js build` | 0 |
| fixture 测试 | `node node_modules\vitest\vitest.mjs run` | 0 |

AI 工具 Node-only 未进浏览器：真实 Chrome 打开 `http://127.0.0.1:5173/`，页面浅/深主题切换、
ShadcnButton/TextInput/EditDialog 渲染正常（证据 `win02-ai-light.png` / `win02-ai-dark.png`）。

### 最小负例（副本工程，只读工具不变）

| 负例 | 注入 | 结果 |
|---|---|---|
| 错误 import | src/App.tsx 改用根入口 `@future-ui/shadcn-adapter` | `ai:check` 退出码 **1**，诊断 `import-root-@future-ui/shadcn-adapter`，附修复建议 |
| 错误版本 | package.json 依赖 `file:...shadcn-adapter-0.0.0.tgz` | `ai:doctor` 退出码 **1**，诊断"声明 0.0.0，实际安装 0.1.0-rc.1" |
| 未知组件 | `import { SomeTable } from '@future-ui/shadcn-adapter/browser'` | `ai:check` 退出码 0，但 `import-SomeTable` 标 **not-covered**（不虚报 supported）；已知组件仍 pass |

## 五、首次失败与修复记录（如实保留）

1. **vitest 下 `import.meta.url` 非 file scheme**：fs 相对路径方案失败 → 改用
   `import attributes` + exports 暴露 `./package.json`（标准包元数据读取通道）。
2. **ai:doctor 版本提取误判**：`future-ui-shadcn-adapter-0.1.0-rc.1.tgz` 按 `-` 切分取版本
   得 `shadcn-adapter-0.1.0-rc.1` → 改为按已知包名整体剥离前缀取版本。
3. **ai:doctor 导出检查误报**：`ShadcnButton/ShadcnTextInput` 为 forwardRef 包装
   （React 19 下 typeof 为 object 非 function）→ 检查改为"导出存在（非 undefined）"。
4. **ai:view 映射名拼接错误**：`future-ui.text-input.split('.').pop()` 得 `input` →
   `inputMapping` 不存在 → 改为显式 `MAPPING_EXPORT` 表（dialog/button/textInputMapping），
   text-input 由 not-covered 恢复为 partial。
5. **负例注入产生 UTF-8 BOM**：JSON.parse 报 `Unexpected token '﻿'` → `readJson` 容忍 BOM
   （真实用户工程可能被编辑器写出 BOM）。

## 六、未测试 / 未覆盖范围（如实记录）

- **MAC_NOT_TESTED**：macOS 未访问，未做任何 mac 侧验证（纯 JS 包，无平台差异化构建）。
- npm 公网：Future UI 尚未 publish，`npm create future-ui@latest` 仍是未来形态；本轮仅本地 RC 归档。
- `ai:check` 的运行时行为（pending 禁用、重复提交阻止、Portal 换肤）为静态不可证明项，
  明确标 not-covered，指向 `src/fixture.test.tsx`（jsdom）与人工 Chrome 验收。
- 完整成员管理页（#109）未授权、未实现。
- 通用 Table/Sidebar/Forms Contract 不存在，未声称支持。

## 七、对 #109 的"已具备 / 尚缺"

- **已具备**：Admin List Page 组合 recipe（导航/Header/统计卡/筛选/语义表格/EditDialog/Light-Dark）；
  `ai:view/doctor/check` 只读工具；Browser 安全入口与权威版本派生基线。
- **尚缺**：成员管理业务页本身（#109 授权后才实施）；通用 Table/Sidebar 组件 Contract
  （若 #109 需要正式 Table 语义，需先建立最小 Contract，属新授权范围）。

## 八、CI

仓库 GitHub Actions（install → lint → typecheck → vitest + create-future-ui build/pack smoke）
在最终 HEAD 上运行，结论 success（run ID 见 PR 页）。
