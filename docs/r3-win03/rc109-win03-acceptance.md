# R3-WIN-03 · #109 真实 AI Coding 验收报告

## 0. 事实源与基线

- 仓库：https://github.com/zlpoot/future-ui
- Issue：https://github.com/zlpoot/future-ui/issues/109 （R3-WIN-03，IMPLEMENTATION_READY / OWNER_AUTHORIZED）
- 授权：#4 Current Grant（R3-WIN-03 激活）；父计划 #106
- Base main：`25dda99a2fa043b856cd323ac690ce04434f891e`（fetch 核对一致，无漂移）
- 开发分支：`feat/r3-win-03-member-admin`（隔离 worktree `E:\projects\future-ui-win03`）
- 环境：Windows · Node v24.21.0（`C:\Program Files\nodejs\node.exe`）· npm 11.19.0 · pnpm 11.28.4（corepack）
- 真实 Chrome：browser-use（loopback `http://127.0.0.1:5178/`），viewport 219x649（窄窗口，不影响 DOM 操作断言）

## 1. Phase A · 空工程创建（无管理页成品）

| 项 | 值 |
|---|---|
| CLI 归档 | `create-future-ui-0.1.0-rc.1.tgz`（main 重新 pack），SHA256 `A229D32897E2BC1BF8801811A4F5952BB32E6E753E894186318A7E7A3C2BFD89` |
| RC 四包 | contracts `C4E21549…`、react-provider `32A02079…`、shadcn-adapter `A474A793…`、theme `D7C1D0FC…`（与 #105/#108 冻结权威值一致） |
| 生成工程 | `E:\projects\cfu-accept109\my-admin`（源仓库外全新目录，`--local-rc-dir` 安装真实归档，无 workspace alias） |
| 初始 commit | `eedd57292cdd5c4c201ae114e965dd0d2c7fca3b`（17 文件；模板 demo 页，**无成员管理页面**；AI-AGENTS.md + ai/ 三命令在模板内） |
| 起点验收 | `npm install` 0；src/App.tsx 仅为 ShadcnButton/TextInput/EditDialog 最小 demo |

## 2. Phase B · AI 自主读取规范与首次生成（真实操作轨迹）

**操作顺序（实际执行序列，非事后补写）**：

1. 读 `AI-AGENTS.md`：查询命令（ai:view/ai:doctor/ai:check）、Browser 入口唯一性、Profile 身份
   `r1-edit-dialog-reference@1.0.0`、Theme 单一数据源、状态边界（supported/partial/unsupported/not-covered）、
   Admin List 页面 recipe 定位说明。
2. 执行 `ai:view --out ai/artifacts/ai-view.json`（退出码 0，证据 `evidence/ai-view-run1.json`）：
   - 组件目录：`future-ui.dialog` **supported**（EditDialog）；`future-ui.button` **partial**（Button：
     `features.loading` unsupported）；`future-ui.text-input` **partial**（TextInput：`accessibility.role`
     unsupported）；全部 `importPath: @future-ui/shadcn-adapter/browser`，exportVerified=true。
   - 版本：contracts 1.0.0，其余 0.1.0-rc.1（从已安装 package.json 派生）。
   - 页面 recipe `future-ui.page.admin-list`：Sidebar 组合约定、h1/h2 层级、统计卡 grid-cols-4、
     搜索 ShadcnTextInput（id+name→aria-label）、语义表格、EditDialog 预填/取消/pending 防重复、
     Light/Dark token 引用。
3. 执行 `ai:doctor`（退出码 0，证据 `evidence/ai-doctor-run1.json`）：依赖声明 vs 实际版本一致、browser 入口合法。
4. 读工程现有结构：`theme.tsx`（useHostTheme/ThemeFloatToggle 复用）、`styles.css`（@source adapter dist）、
   `main.tsx`、`package.json` scripts；读安装资产 `edit-dialog.d.ts` 确认 `EditDialogField`（type/value/placeholder）
   与 `onSave: async` 契约。
5. **首次编写业务页面**（业务需求原文照用，无组件/样式提示）：
   - `src/members.ts`：Member 类型、6 条本地模拟数据、统计口径、表单字段派生
   - `src/App.tsx`：左侧 nav（语义 HTML+Tailwind）、h1 页头+新增按钮、统计卡 grid-cols-4、
     搜索 ShadcnTextInput、语义 table/thead/th[scope=col]/tbody、EditDialog 新增/编辑统一入口；
     保存 handler 应用层持有，`await delay(600)` 模拟保存，取消不写 store
6. **首次检查**（原件 `evidence/run1-*`）：
   - `tsc --noEmit`：**0 通过**
   - `npm run build`：首次因命令引用错误失败（`$env:NPM_CLI` 未定义，非代码问题）；修正后 **0 通过**（`run1b-build`）
   - `vitest run`：**4 failed**（模板 fixture 针对模板 demo 页 testid，与成员管理页不匹配——真实失败，原件 `run1-vitest.txt`）
   - `ai:check`：**0 通过**（无 not-covered 虚报）
   - `ai:doctor`：**0 通过**
   首次实现 commit：`18b8ad20df1d1783198ccf29f055912e19f81fc9`（首次快照/diff 锁定，之后修复均在后续 commit）

## 3. Phase C · 有限自主修复（3 次，均无人工干预）

| # | 失败现象与来源 | 修复原因 | 修改文件 | 复测结果 |
|---|---|---|---|---|
| 1 | vitest 4 failed：模板 fixture 查找 `button-echo`/`standalone-echo`/`edit-demo-1` 失败 | App.tsx 已替换为成员管理页，fixture 同步改为验证成员管理页真实行为 | `src/fixture.test.tsx`（重写 7 用例） | vitest 7 passed（run2 仅剩 1 失败→修 2 后全过） |
| 2 | 搜索框 `aria-label` 未被 ShadcnTextInput 契约接受（getByLabelText 找不到） | 契约：`name` 映射为 aria-label；移除无效属性、测试按契约 name 定位 | `src/App.tsx`、`src/fixture.test.tsx` | 全绿（run3） |
| 3 | Chrome 验收发现：dark 下 dialog 背景 `#0b1220`（bg-background token）而内部文字/输入继承默认黑（vendored shadcn Dialog/Input 冻结类缺 text-foreground） | 应用层用 theme.css `--color-foreground` 补足，不修改 vendored 冻结源码/契约 | `src/styles.css` | Chrome 实测 dark `#0b1220`+`#e6edf7` 可读；light `#ffffff`+`#1a1a1a` 正常；vitest 7 / tsc / build / ai:check / ai:doctor 全 0 |

最终修复 commit：`c6beeae264126c1904a5c91af8775ec2aaf526ec`

## 4. 真实 Windows Chrome 验收（loopback 5178）

| 场景 | 操作与断言 | 结果 |
|---|---|---|
| 布局 | 侧栏 nav（成员管理/数据看板/系统设置）、h1 页头、统计卡 4 张、语义表格 6 列 | PASS |
| 初始数据 | 6 行成员；统计 总数 6 / 管理员 2 / 活跃 3 / 待邀请 2 | PASS |
| 搜索过滤 | 输入“陈”→ 1 行（陈晨）；输入不存在的值 → empty-row“未找到匹配的成员”；清空恢复 6 行 | PASS |
| 新增成员 | 打开 Dialog（标题“新增成员”，字段空 + role/viewer、status/active 默认）→ 填 孙晓彤/editor/active → 保存：保存按钮“保存中…”+ disabled（pending 中间态）→ 自动关闭 → 列表 7 行、统计总数 7、toast“已新增成员：孙晓彤” | PASS |
| 编辑预填 | 打开 m-01 → Dialog 标题“编辑成员”，姓名/邮箱/角色/状态预填 陈晨/chenchen@example.local/admin/active | PASS |
| 取消不保存 | 改姓名后点取消 → Dialog 关闭、列表仍“陈晨” | PASS |
| 保存 pending + 防重复 | 保存点击后 0.28s 抓取：`{"t":"保存中…","dis":true}`；完成后自动关闭；列表更新“陈晨（已更新）”、toast“已保存成员：陈晨” | PASS |
| Light/Dark | `data-theme` light↔dark 切换；Dialog 打开期间切换主题：light 白底 `#ffffff`+字 `#1a1a1a`，dark 深底 `#0b1220`+字 `#e6edf7`（Portal 随 html token） | PASS（含修复 3） |
| 键盘/焦点 | Dialog 打开初始焦点第一个字段（INPUT inDialog）；Tab 在字段间循环；Esc 关闭 Dialog | PASS |
| 按钮交互 | 新增/编辑/保存/取消/主题切换全部通过 DOM 点击触发（真实 Chrome，非 jsdom） | PASS |

截图：`docs/r3-win03/evidence/win03-light-dialog.png`（light 白 Dialog）、`win03-dark-dialog.png`（dark 深 Dialog）。
说明：viewport 219x649 为浏览器窗口窄宽，DOM 断言不受影响；完整页面视觉以截图 OCR 佐证。

## 5. 四维统计（对照 #109 验收口径）

| 维度 | 结论 | 证据 |
|---|---|---|
| AI 规范读取 | **已证实**：读取 AI-AGENTS.md → ai:view（组件目录/Profile/版本/边界/recipe）→ ai:doctor → 安装资产 d.ts；首次代码按 browser 入口、EditDialog 契约（fields/onSave async）、theme.css token、语义表格/侧栏组合约定实现 | evidence/ai-view-run1.json、ai-doctor-run1.json、操作顺序记录 |
| 业务功能 | **已证实**：搜索过滤/空态/新增/编辑预填/取消不保存/保存 pending 防重复/列表与统计更新，全部真实 Chrome 操作 PASS | 第 4 节表格 |
| 视觉与交互一致性 | **规范覆盖**：Light/Dark token、Dialog Portal、pending 中间态由 EditDialog 契约保证；**应用级组合**：侧栏/统计卡/语义表格为页面级组合（Future UI 无通用 Table/Sidebar/Forms Contract，不虚报） | ai-view statusBoundary.notCovered |
| AI 自主性 | 首次生成即 tsc/build/ai:check 通过；**3 次自主修复、0 次人工干预**（原因均为模板适配与 vendored 冻结类缺 foreground） | Phase C 表格 |

## 6. 边界与未验证范围

- **not-covered**（不冒称 PASS）：通用 Table/Sidebar/Forms 组件 Contract（不存在）、WebMCP Runtime/业务能力、npm 公网安装（未 publish）。
- **NOT-TESTED**：macOS（MAC_NOT_TESTED）；键盘完整矩阵（仅验证 Tab 循环/Esc/初始焦点）；多行文本/Select 等未来组件。
- 浏览器验收使用本地模拟数据（内存态），刷新即复位；未接后端/外部账户。
- 未修改公共 Contract/Schema/Profile 语义；未触碰 vendored upstream 冻结源码与 provenance。
- 无付费模型 API 调用；未发布 npm/Tag/Release；未进行真实业务写入。

## 7. SHA 与代码版本

- Base main：`25dda99a2fa043b856cd323ac690ce04434f891e`
- PR HEAD（待 push 后回读远端确认）：worktree `feat/r3-win-03-member-admin`
- 空工程基线：`eedd5729`；首次实现：`18b8ad20`；修复：`c352cec`、`c6beeae`
- CLI 归档 SHA256：`A229D32897E2BC1BF8801811A4F5952BB32E6E753E894186318A7E7A3C2BFD89`
- RC 四包 SHA256：contracts `C4E21549CD9C6BA53BCD6AD9EDEF4B3A622E0E30EF4A70D02A8FA5255D8AFBEB`、react-provider `32A020793604D6B818EF2F33424E14F30E4ED17891F6976003730006E8E17671`、shadcn-adapter `A474A793F224452EFF071BAC80DD68B4DC52E06E998CE59D4BB6E087410413CF`、theme `D7C1D0FCEA33D3D468A38B12F81880808E187E80A8A662EC7DFE8EF2461F516C`

## 8. 本地重建方法

```text
# 1) 源仓库（main@25dda99a）构建归档
corepack pnpm install --frozen-lockfile
corepack pnpm build:rc                                  # 产出 rc-dist 四包
corepack pnpm --filter create-future-ui pack            # 产出 CLI tgz

# 2) 源仓库外全新目录生成（E:\projects\cfu-accept109\my-admin 即按此生成）
node <cli>/dist/cli.js my-admin --local-rc-dir <rc-dist>
npm install && npm install-scripts approve esbuild

# 3) 页面源码即本 PR examples/r3-win03-member-admin/src/*（无 node_modules/vendor 归档入库，
#    依赖经 package.json file: vendor 引用重建；vendor 归档 SHA 见第 7 节）
```

## 9. 结论

- **PASS-IN-SCOPE**：AI 规范读取已证实；业务功能与交互在真实 Windows Chrome 全链路可操作；
  Light/Dark 与 Dialog Portal 一致性经 1 次应用层修复后 PASS；修复全程 0 人工干预。
- 提交一个中文 Draft PR（Refs #109），停在 **AWAITING_INDEPENDENT_REVIEW**，交 ChatGPT 独立 Review。
