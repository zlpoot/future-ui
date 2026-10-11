# R3-WIN-03 成员管理后台 · 验证样本

本目录是 Issue #109（R3-WIN-03）的**独立验证样本**，不是 Future UI 核心产品模块。

来源：Coding Agent 在源仓库外全新工程（`create-future-ui-0.1.0-rc.1` + 四个真实 RC 归档生成，
`E:\projects\cfu-accept109\my-admin`）依据工程内机器可读规范（AI-AGENTS.md / ai:view / ai:doctor）
自主首次实现 + 3 次自主修复后的最终 `src/` 快照。

## 内容

- `src/App.tsx`：成员管理页（左侧导航 / 页头 / 统计卡 / 搜索 / 语义表格 / EditDialog 新增编辑）
- `src/members.ts`：本地模拟数据 + 统计口径 + 表单字段派生
- `src/styles.css`：Tailwind v4 + theme.css + @source adapter dist；含 dark Dialog 可读性应用层修复
- `src/fixture.test.tsx`：成员管理页 jsdom fixture（7 用例）
- `src/theme.tsx` / `src/main.tsx`：模板自带宿主主题状态机与入口

## 重建完整可运行工程

1. `main@25dda99a` 构建：`corepack pnpm build:rc` 产出四 RC 归档 + `corepack pnpm --filter create-future-ui pack`
2. 源仓库外：`node <cli>/dist/cli.js my-admin --local-rc-dir <rc-dist>` → `npm install`
3. 用本目录 `src/*` 覆盖生成工程的 `src/*` 即可复现（依赖经 file: vendor 引用解析）

归档 SHA-256 见 `docs/r3-win03/rc109-win03-acceptance.md` 第 7 节。

## 边界

- 本地模拟数据（内存态），不接后端/外部账户；页面组合（侧栏/统计卡/表格）非通用组件 Contract。
- 未修改公共 Contract/Schema/Profile 语义；vendored upstream 冻结源码未被触碰。
