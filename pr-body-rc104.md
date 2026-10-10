## R3-RC-001 · 首个可离仓安装 RC 候选

Refs #104（Owner 已授权实施；#4 当前授权 R3-RC-001 / #104 IMPLEMENTATION_READY，Worker=doubao-work）

### 状态
- **Draft PR，停止于 AWAITING_INDEPENDENT_REVIEW**；Reviewer=ChatGPT（独立 exact-head 只读审查）
- 未自行 Ready / Merge / Close #104 / 创建 Tag / Release / npm publish

### Exact SHA
- **Base**: `0fc68b1cb4457c7458bb5002879158419f25d555`（origin/main，fetch 核对一致）
- **Head**: `c566b88c2b5910c8d136147c75bad3907c39e343`（分支 `feat/r3-rc-001-publishable-packages`）

### 交付内容
把 R2 已验收能力构建为可离仓安装的标准包（React + shadcn/Radix 的 EditDialog/Button/TextInput +
r1-edit-dialog-reference Profile + Light/Dark Theme）：

1. **候选公开包（4 个，private 翻转 + 版本）**
   - `@future-ui/contracts` 1.0.0（exports `.` 与 `./schemas/*`）
   - `@future-ui/react-provider` 0.1.0-rc.1（`.` 与 `./component-types`）
   - `@future-ui/theme` 0.1.0-rc.1（`.`、`./browser`、`./theme.css`）
   - `@future-ui/shadcn-adapter` 0.1.0-rc.1（`.` 与 `./browser`）
2. **统一 JS + .d.ts + CSS/theme 资产**：各包 `tsconfig.build.json`（tsc → dist/）；`theme.css`
   采用与 R2 #98 示例同一 D08 token 数据源 + tailwind v4 语义映射。
3. **依赖闭包**：包间 `@future-ui/*` 依赖 peer 化（宿主显式安装）；交付归档内 `workspace:*` 由
   `scripts/build-rc.mjs` 改写为实际版本；浏览器图不混入 `ai-dev`/`conformance` 等 Node-only 包。
4. **构建产物 SHA-256**（rc-dist/，本地归档不发布 npm）：
   ```
   6b11edea489229e0ffc94059210db73608c17371af35d42f4cf72a052c4dc104  future-ui-contracts-1.0.0.tgz
   1eecb0fa2c2fcb2132c078616605324382ad8c7f26d83e305f76651745071a57  future-ui-react-provider-0.1.0-rc.1.tgz
   90e37092bcbaf7a19413d007adaa74d341e819714ba8fb298814b9efdb10b8da  future-ui-shadcn-adapter-0.1.0-rc.1.tgz
   2b86f43e1a97ee9366cdd8e1e6091077db7878ce64ab375dcc6c244f715a984c  future-ui-theme-0.1.0-rc.1.tgz
   ```
5. **离仓 Consumer 实测（Windows）**：`E:\projects\future-ui-rc-consumer`（无 workspace 链接/源码别名），
   安装本地归档后 `vite --port 5180`，真实 Chrome 验证：
   - 预填 / 取消不保存 / 保存 pending（重复提交被阻止）→ 关闭 → 列表更新：**PASS**
   - Dialog 打开期间换肤 + 输入草稿保留：**PASS**（切换路径为程序化 click）
   - Light/Dark token（--future-ui-bg light #ffffff / dark #0b1220）：**PASS**（截图在
     `docs/r1-rc/evidence/rc104-consumer-{light,dark}.png`）
   - **真实鼠标点击换肤（Dialog 打开期间）：NOT-VERIFIED**（bu 浏览器自动化对顶部按钮的鼠标注入
     不稳定 + EditDialog 为 Radix Modal、外部 inert，物理点击外部按钮被浏览器设计阻止；不以程序化
     click 冒充真实鼠标）
6. **首次失败与修复（真实记录）**：manifest 显式版本依赖 404 → workspace:* + pack 改写；归档传递
   依赖 404 → `@future-ui/*` peer 化；`@/registry` tsconfig 别名无法离仓解析 → dist postprocess
   相对路径归一化（首发 `./ui/button` 错、修正 `../ui/button`）；Consumer 误用 setTheme（受控
   Provider 无 setter）→ 受控模式修正。
7. **跨平台**：Windows PASS；macOS **MAC_NOT_TESTED**（环境不可达，保留同哈希资产与安装命令待
   独立执行者）。
8. **仓库内回归**：vitest 532 passed / 1 failed（唯一失败 = 本地 node v22.23.2 的 Node 版本断言，
   CI node 24 为门禁权威，非本 RC 回归）；typecheck PASS；lint PASS。
9. **R2 兼容性**：零产品代码修改（仅发布形态与构建配置）；公共 Contract/Schema/Profile 语义未变
   （如需改动将报 BLOCKED: CONTRACT_GAP，未触发）。

### 详细证据
见 `docs/r1-rc/rc104-rc-candidate.md`（修改文件清单、exports、安装命令、测试结果、未测范围）。
