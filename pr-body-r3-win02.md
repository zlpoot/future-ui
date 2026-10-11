# R3-WIN-02 · Future UI AI Project View 与页面规范接入（#108）

## 状态

Draft · 停 **AWAITING_INDEPENDENT_REVIEW**（交 ChatGPT 对 exact HEAD 独立 Review）

- **Base SHA**：`b1d8700a592ef98a0d34b62e52e163317658e8a5`（main，#110 squash merge 后）
- **Head SHA**：见本 PR 远端 HEAD（Push 后回读核对）
- Refs #108；#109 未授权、未实施；未 Ready/Merge/Close/Tag/Release/publish。

## 目标达成

新工程（create-future-ui 生成）具备**真实、机器可读的 Future UI 规范入口**：
`ai:view` / `ai:doctor` / `ai:check` 三个 Node-only 只读命令 + Admin List Page 组合 recipe。
所有事实从**已安装的真实 RC 资产**派生，修复了 `shadcn-descriptor.ts` 的 `0.0.0` 版本
硬编码与根入口导入两个历史问题。

## 架构取舍

1. **权威版本 = 已安装包元数据**：`shadcn-descriptor.ts` 改用
   `import adapterPackageJson from '@future-ui/shadcn-adapter/package.json' with { type: 'json' }`
   （adapter exports 增 `./package.json`）；组件 source.module → `@future-ui/shadcn-adapter/browser`。
2. **新工程 AI 工具 = Node-only、零第三方依赖**：`ai/*.mjs` 用 fs 读 node_modules 元数据 +
   动态 import browser 安全入口读真实导出与 D15 映射；不进任何 Browser bundle。
3. **Admin List = 组合 recipe**：Sidebar/Header/统计卡/筛选/语义表格/EditDialog/Light-Dark
   token 引用；不预置业务页；不把 HTML+Tailwind 包装成通用 Table/Sidebar Contract。
4. **支持边界明确**：supported（EditDialog）/ partial（Button：features.loading；
   TextInput：accessibility.role 等）/ unsupported（D15 逐成员结论）/
   not-covered（未知导出、WebMCP、ai-dev、npm 公网、#109 页面）。

## 改动文件

- `packages/ai-dev/src/project/shadcn-descriptor.ts`：版本派生 + /browser 入口
- `packages/shadcn-adapter/package.json`：exports 增 `./package.json`
- `packages/ai-dev/tsconfig.json`：`resolveJsonModule`
- `packages/ai-dev/tests/project-integration.test.tsx`：新增 browser/版本断言
- `packages/create-future-ui/src/template.ts`：scripts 增 ai:view/doctor/check
- `packages/create-future-ui/templates/react-vite-ts/ai/{project-info,ai-view,ai-doctor,ai-check}.mjs`：新增
- `packages/create-future-ui/templates/react-vite-ts/AI-AGENTS.md`：新增发现入口
- `packages/create-future-ui/templates/react-vite-ts/README.md.tmpl`：增 AI 入口说明
- `packages/create-future-ui/tests/cli.test.ts`：模板断言
- `docs/r3-win02/rc108-win02-acceptance.md` + `docs/r3-win02/evidence/win02-ai-{light,dark}.png`

## 组件目录 / Profile / 版本 / 导入来源（ai:view 实际输出）

| 组件 | 导出 | import | mappingStatus |
|---|---|---|---|
| future-ui.dialog | EditDialog | @future-ui/shadcn-adapter/browser | supported |
| future-ui.button | ShadcnButton | @future-ui/shadcn-adapter/browser | partial（features.loading） |
| future-ui.text-input | ShadcnTextInput | @future-ui/shadcn-adapter/browser | partial（accessibility.role 等） |

- Profile：`r1-edit-dialog-reference@1.0.0`（browser 导出 editDialogProfile.identity）
- 版本：contracts 1.0.0；react-provider/theme/shadcn-adapter 0.1.0-rc.1（全部从已安装 package.json 派生）
- Theme：`@future-ui/theme/theme.css`；Light/Dark `<html data-theme>`；Dialog 走 body Portal

## 最终归档 SHA-256（本轮 build:rc 修复后；CI 环境独立构建值以其日志打印为准）

```
C4E21549CD9C6BA53BCD6AD9EDEF4B3A622E0E30EF4A70D02A8FA5255D8AFBEB  future-ui-contracts-1.0.0.tgz
32A020793604D6B818EF2F33424E14F30E4ED17891F6976003730006E8E17671  future-ui-react-provider-0.1.0-rc.1.tgz
A474A793F224452EFF071BAC80DD68B4DC52E06E998CE59D4BB6E087410413CF  future-ui-shadcn-adapter-0.1.0-rc.1.tgz
D7C1D0FCEA33D3D468A38B12F81880808E187E80A8A662EC7DFE8EF2461F516C  future-ui-theme-0.1.0-rc.1.tgz
```

CLI 归档 `create-future-ui-0.1.0-rc.1.tgz`（含 BOM 修复与模板 AI 工具）：
`71DDBBE68AD72E20D4034EE2742E802E67DF320B789C18C56CE71CA5B5BD8561`

## Windows 离仓验收（Node 24.21.0 · npm 11.19.0 · 源仓库外全新目录，基于最终归档重做）

| 步骤 | 命令 | 退出码 |
|---|---|---|
| 安装 CLI | npm install <cli.tgz> --prefix installer | 0 |
| 生成 | dist/cli.js my-r3ai --local-rc-dir <rc-dist> | 0 |
| 安装工程 | npm install + install-scripts approve esbuild | 0 |
| **ai:view** | node ai/ai-view.mjs | **0** |
| **ai:doctor** | node ai/ai-doctor.mjs（12/12 pass） | **0** |
| **ai:check** | node ai/ai-check.mjs | **0** |
| tsc / vite build / vitest | — | 0 / 0 / 0 |

真实输出文件：`E:\projects\cfu-accept\win02-main\{ai-view,ai-doctor,ai-check}.json`
Chrome 冒烟：`http://127.0.0.1:5173/` 浅/深主题、三组件渲染正常（Node-only 未进浏览器）。

### 负例（最小只读验证）

| 负例 | 注入 | 结果 |
|---|---|---|
| 错误 import | src 使用根入口 @future-ui/shadcn-adapter | ai:check 退出码 **1**，诊断 + 修复建议 |
| 错误版本 | 依赖 file:...shadcn-adapter-0.0.0.tgz | ai:doctor 退出码 **1**，声明 0.0.0 vs 实际 0.1.0-rc.1 |
| 未知组件 | import { SomeTable } from browser 入口 | ai:check **not-covered**（不虚报 supported） |

## 失败修复记录（如实保留）

1. vitest 下 import.meta.url 非 file scheme → import attributes + exports ./package.json
2. doctor 版本提取误把包名连字符当版本分隔 → 按已知包名整体剥离
3. forwardRef 组件 typeof 为 object → 导出检查改为"导出存在"
4. ai:view 映射名 `text-input`.pop() 得 input → 显式 MAPPING_EXPORT 表
5. 负例注入 BOM → readJson 容忍 UTF-8 BOM
6. **CI run 38107487914 failure（check:rc）**：build-rc.mjs 的 toDistExportSpec 把裸
   `"./package.json"` 误改写成 `{types:.d.ts, default:.js}` → build-rc 原样保留该元数据子路径；
   check-rc 对 `package/package.json` 特殊子路径按"归档内存在"判定。修复后本地
   `pnpm build:rc` + `pnpm check:rc` 双 PASS，四包 SHA 见上（CI 独立构建值以其日志为准）。

## 未测 / 未覆盖

- **MAC_NOT_TESTED**（macOS 未访问；纯 JS 包无平台差异）
- npm 公网安装（未 publish；`npm create future-ui@latest` 仍为未来形态）
- ai:check 的运行时行为（pending/重复提交/Portal 换肤）静态不可证明 → not-covered，指向 fixture + 人工 Chrome
- #109 成员管理页未授权未实现；通用 Table/Sidebar/Forms Contract 不存在

## 对 #109 的"已具备 / 尚缺"

- 已具备：Admin List Page recipe（导航/Header/统计卡/筛选/语义表格/EditDialog/Light-Dark）；ai 只读工具；权威版本/入口基线
- 尚缺：#109 授权后实施业务页本身；如需正式 Table 语义需先建最小 Contract（新授权）

## CI

最终 HEAD 上 GitHub Actions success（run ID 见下方 checks）。证据与完整记录：
[docs/r3-win02/rc108-win02-acceptance.md](docs/r3-win02/rc108-win02-acceptance.md)
