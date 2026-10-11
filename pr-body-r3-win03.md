# R3-WIN-03 · 从空白 React 新工程真实 AI Coding 成员管理页面（#109）

## 摘要

- **Base**：`25dda99a2fa043b856cd323ac690ce04434f891e`（main，fetch 核对一致）
- **HEAD**：见 PR 头部（push 后回读远端为准）
- **产物**：真实 Windows Chrome 验收通过的成员管理页 + 完整 AI 轨迹证据（首次实现/失败原件/3 次修复）
- **停点**：AWAITING_INDEPENDENT_REVIEW（等 ChatGPT 独立 Review，Owner 决定 Ready/Merge）

## 一、AI 规范读取（真实操作轨迹，非补写）

1. 读 `AI-AGENTS.md` → 查询命令、Browser 入口唯一性、Profile 身份、状态边界
2. 执行 `ai:view`（退出码 0）→ 组件目录：EditDialog **supported**、ShadcnButton/ShadcnTextInput **partial**
   （Button loading / TextInput accessibility.role unsupported）、Profile `r1-edit-dialog-reference@1.0.0`、
   版本 contracts 1.0.0 / 其余 0.1.0-rc.1（安装资产派生）、Admin List 页面 recipe
3. 执行 `ai:doctor`（退出码 0）→ 依赖声明 vs 实际版本一致、browser 入口合法
4. 读安装资产 `edit-dialog.d.ts` → `EditDialogField`（type/value/placeholder）、`onSave: async` 契约
5. **首次编写**（业务需求原文照用）：`src/members.ts` + `src/App.tsx`，组件全部走
   `@future-ui/shadcn-adapter/browser`；本地模拟数据；保存 handler 应用层持有

证据：`docs/r3-win03/evidence/ai-view-run1.json`、`ai-doctor-run1.json`

## 二、首次结果与失败原件

| 检查 | 首次结果 | 原件 |
|---|---|---|
| tsc --noEmit | 0 通过 | evidence/run1-tsc.txt |
| npm run build | 0 通过（首次命令引用错误非代码问题，修正后通过） | run1-build.txt（命令错误）/ run1b-build.txt |
| vitest run | **4 failed**（模板 fixture 针对模板 demo 页，与业务页不匹配） | run1-vitest.txt |
| ai:check / ai:doctor | 0 通过 | run1-aicheck.json / run1-aidoctor.json |

首次实现 commit：`18b8ad20df1d1783198ccf29f055912e19f81fc9`

## 三、有限自主修复（3 次，0 人工干预）

1. `fixture.test.tsx` 重写为成员管理页 fixture（7 用例全过）——修复模板 fixture 与业务页不匹配
2. 搜索框 `aria-label` 不被 ShadcnTextInput 契约接受 → 移除、测试按契约 `name`（映射 aria-label）定位
3. Chrome 验收发现 dark 下 EditDialog 黑字深底不可读（vendored 冻结类缺 text-foreground）→
   应用层 `styles.css` 用 `--color-foreground` 补足，不修改 vendored/契约

最终修复 commit：`c6beeae264126c1904a5c91af8775ec2aaf526ec`

## 四、真实 Windows Chrome 验收（loopback 5178，全部真实点击/输入）

- 布局：侧栏 / 页头 / 统计卡 ×4 / 语义表格 → **PASS**
- 搜索“陈”→ 1 行；无匹配 → empty-row；清空恢复 6 行 → **PASS**
- 新增：Dialog 空表单默认值 → 保存 pending（“保存中…”+disabled）→ 自动关闭 → 列表 7 行、统计 7、toast → **PASS**
- 编辑预填：m-01 打开即预填 陈晨/…/admin/active → **PASS**
- 取消不保存：改名后取消，列表不变 → **PASS**
- 保存 pending 防重复：`{"t":"保存中…","dis":true}`（0.28s 抓取）→ **PASS**
- Light/Dark + Dialog Portal：light `#ffffff`/字 `#1a1a1a`，dark `#0b1220`/字 `#e6edf7`（含修复 3）→ **PASS**
- 键盘/焦点：Dialog 打开初始焦点字段、Tab 循环、Esc 关闭 → **PASS**

截图：`docs/r3-win03/evidence/win03-light-dialog.png`、`win03-dark-dialog.png`

## 五、四维统计

| 维度 | 结论 |
|---|---|
| AI 规范读取 | 已证实（真实读取 ai:view/ai:doctor/契约 d.ts，按边界实现） |
| 业务功能 | 已证实（全场景真实 Chrome 操作 PASS） |
| 视觉与交互一致性 | 规范覆盖：Light/Dark token、Dialog Portal、pending；应用级组合：侧栏/统计卡/表格（不虚报通用 Contract） |
| AI 自主性 | 首次生成即 tsc/build/ai:check 通过；3 次自主修复、0 人工干预 |

## 六、边界与未验证

- not-covered：通用 Table/Sidebar/Forms Contract（不存在）、WebMCP 业务能力、npm 公网安装
- NOT-TESTED：macOS（MAC_NOT_TESTED）、完整键盘矩阵、Select/多行输入
- 未修改公共 Contract/Schema/Profile；未触碰 vendored 冻结源码；无付费模型调用；未发布 npm/Tag/Release

## 七、SHA

- Base main：`25dda99a2fa043b856cd323ac690ce04434f891e`
- CLI 归档：`A229D32897E2BC1BF8801811A4F5952BB32E6E753E894186318A7E7A3C2BFD89`
- RC 四包：contracts `C4E21549…` / react-provider `32A02079…` / shadcn-adapter `A474A793…` / theme `D7C1D0FC…`
- 空工程基线 `eedd5729` · 首次实现 `18b8ad20` · 修复 `c352cec`、`c6beeae` · 证据提交见下

## 八、重建方法

`corepack pnpm build:rc` → `pnpm --filter create-future-ui pack` → 源仓库外
`node cli my-admin --local-rc-dir <rc-dist>` → `npm install` → 用 `examples/r3-win03-member-admin/src/*`
覆盖即复现（详见 docs/r3-win03/rc109-win03-acceptance.md 与 examples README）。

---

Refs #109
