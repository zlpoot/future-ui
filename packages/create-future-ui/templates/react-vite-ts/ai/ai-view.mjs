/**
 * create-future-ui 模板 · `ai:view`（R3-WIN-02 / Issue #108）。
 *
 * 输出当前工程的机器可读 AI 规范视图（JSON）：已声明组件目录、真实 import
 * 路径与导出名、Adapter/package/Contract/Profile 版本、支持/部分/不支持边界、
 * Light/Dark 主题约定与 Admin List Page 组合 recipe。
 *
 * 用法：`node ai/ai-view.mjs`（或 `npm run ai:view` / `pnpm ai:view`）。
 * 输出：JSON 到 stdout；同时落盘 ai/artifacts/ai-view.json 供机器消费。
 * 退出码：0 = 成功（视图已派生）。未安装依赖 / browser 入口不可用 → 非零并附诊断。
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  PROJECT_ROOT,
  BROWSER_MODULE,
  UI_PACKAGES,
  KNOWN_COMPONENTS,
  projectPackageJson,
  installedPackageMeta,
  loadBrowserSurface,
  deriveComponentSupport,
  themeCssInstalled,
} from './project-info.mjs';

/** Admin List Page 组合 recipe（只规定组合规则，不预置业务页面；无通用 Table/Sidebar Contract）。 */
const ADMIN_LIST_PAGE_RECIPE = {
  pageId: 'future-ui.page.admin-list',
  status: 'recipe',
  scope: '首个管理页的必要布局/视觉/交互组合约定（R3-WIN-02 #108）；完整成员管理业务页属于 #109，未授权。',
  layout: {
    shell: '左侧 Sidebar 导航（固定）+ 右侧内容区；Sidebar 为页面组合约定，不是通用 Sidebar 组件 Contract',
    container: 'max-w-7xl mx-auto px-4 py-6',
  },
  header: {
    title: '页面标题用 h1：text-2xl font-semibold text-foreground',
    hierarchy: '区块标题 h2：text-sm font-medium；说明文字：text-xs text-muted-foreground',
    actions: '页面右上角「新增成员」按钮（ShadcnButton type="button"）',
  },
  statCards: {
    grid: 'grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    card: 'rounded-lg border border-border bg-surface p-4（数值 text-2xl font-semibold，标签 text-sm text-muted-foreground）',
  },
  toolbar: {
    search: '搜索框用 ShadcnTextInput（id + aria-label 必填，placeholder 明示）',
    filters: '筛选控件为未来扩展位；当前无 Select 组件 Contract，不得包装 HTML 冒充',
  },
  table: {
    semantics: '语义表格：table > thead(tr>th[scope=col]) + tbody(tr>td)；行操作「编辑」用 ShadcnButton size="sm" variant="outline"',
    caveat: '本表是页面级语义组合，不是受支持的通用 Future UI Table 组件 Contract（尚未存在）',
  },
  dialog: {
    component: 'EditDialog（@future-ui/shadcn-adapter/browser）',
    prefill: '打开时预填行数据；取消不保存（onOpenChange close 时不提交）',
    save: 'onSave 为 async；保存期间 EditDialog 呈现 pending（保存中… + 阻止重复提交），完成后自动关闭并刷新列表',
    duplicateSubmitBlocked: '由 EditDialog 的 pending 中间态保证（真实交互证据见 src/fixture.test.tsx 与人工 Chrome 验收）',
  },
  theme: {
    lightDark: 'Light/Dark 由 @future-ui/theme/theme.css token 单一数据源 + <html data-theme> 切换；Dialog 挂 body Portal，token 写在 <html> 上保证随主题一致换肤',
    tokens: ['bg-background', 'bg-surface', 'text-foreground', 'text-muted-foreground', 'border-border'],
    radii: ['radius.md（控件）', 'radius.lg（Dialog）'],
    spacing: ['space.4（gap）', 'space.6（Dialog padding）', 'control.height.md（控件高度）'],
  },
};

/** browser 导出的 D15 映射名（componentType → 导出键）。 */
const MAPPING_EXPORT = {
  'future-ui.dialog': 'dialogMapping',
  'future-ui.button': 'buttonMapping',
  'future-ui.text-input': 'textInputMapping',
};

function buildView(projectName, packages, browser) {
  const components = KNOWN_COMPONENTS.map((c) => {
    const mapping = browser[MAPPING_EXPORT[c.componentType]];
    const support = mapping ? deriveComponentSupport(mapping) : null;
    const example =
      c.componentType === 'future-ui.dialog'
        ? '<EditDialog\n  open={open}\n  label="Edit member"\n  fields={[{ name: "displayName", label: "Name", type: "text" }]}\n  onSave={async (values) => { await save(values); }}\n  onOpenChange={({ open: next }) => setOpen(next)}\n/>'
        : c.componentType === 'future-ui.button'
          ? '<ShadcnButton type="button" variant="default" onClick={(e) => handle(e)}>Save</ShadcnButton>'
          : '<ShadcnTextInput id="email" name="email" type="email" onValueChange={(e) => setEmail(e.value)} />';
    return {
      componentType: c.componentType,
      importPath: BROWSER_MODULE,
      exports: c.exports,
      example,
      mappingStatus: support?.status ?? 'not-covered',
      mapping: support
        ? {
            derivedFrom: 'D15 冻结映射（browser 导出）',
            domains: support.domains,
          }
        : null,
    };
  });

  const profile = browser.editDialogProfile?.identity ?? null;
  return {
    schema: 'future-ui.project-ai-view@1',
    kind: 'project-ai-view',
    project: {
      name: projectName,
      contractMajor: browser.CONTRACT_VERSION?.split('.')[0] ?? '1',
    },
    generatedFrom: { tool: 'create-future-ui ai:view（R3-WIN-02 #108）', source: '已安装 RC 资产派生' },
    packages: packages.map((p) => ({
      name: p.name,
      version: p.installed ? p.version : null,
      declared: p.declared,
      installed: p.installed,
      browserSafe: p.browserSafe,
      note: p.note ?? undefined,
    })),
    profile: {
      profileId: profile?.profileId ?? null,
      profileVersion: profile?.profileVersion ?? null,
      scope: profile?.scope ?? null,
      identity: 'r1-edit-dialog-reference@1.0.0 的适用边界：R1-02 (#68) in-repo reference（非真实业务项目 Profile）；新工程按同一 Profile 消费 token。',
    },
    components,
    theme: {
      cssEntry: '@future-ui/theme/theme.css',
      cssInstalled: themeCssInstalled(),
      lightDark: '支持：<html data-theme> + CSS 内置 [data-theme="dark"] 规则；Dialog 走 body Portal，token 在 <html> 上，随主题一致换肤',
      integrationLimit: '模板 fixtures 提供 jsdom 交互证据；真实浏览器视觉以人工 Chrome 验收为准',
    },
    pages: { adminList: ADMIN_LIST_PAGE_RECIPE },
    statusBoundary: {
      supported: 'D15 映射无 unsupported 成员的组件（EditDialog）',
      partial: '存在 unsupported 成员（Button：features.loading；TextInput：accessibility.role 等）',
      unsupported: 'D15 冻结结论中标记 unsupported 的契约成员（见各组件 mapping.domains）',
      notCovered: [
        '通用 Table / Sidebar / Forms 组件 Contract：不存在，普通 HTML+Tailwind 组合不声称正式支持',
        'WebMCP Runtime 或业务能力：本工程无能力/无授权，按钮事件不是业务工具',
        '@future-ui/ai-dev（私有 Node-only）：不进浏览器、不随新工程分发',
        'npm 公网安装：Future UI 尚未 publish，当前为本地 RC 归档',
        '完整成员管理业务页：属于 #109，未授权',
      ],
    },
  };
}

async function main() {
  const pkg = projectPackageJson();
  const browser = await loadBrowserSurface();
  const packages = UI_PACKAGES.map((name) => {
    const meta = installedPackageMeta(name);
    const declared = pkg.dependencies?.[name] ?? null;
    const isContracts = name === '@future-ui/contracts';
    return {
      name,
      version: meta?.version ?? null,
      declared,
      installed: meta !== null,
      browserSafe: !isContracts,
      note: isContracts
        ? 'Node-only（schema/validators，含 node:fs 读取）；浏览器不可导入，仅供 Node 工具读取契约元数据'
        : null,
    };
  });
  const view = buildView(pkg.name, packages, browser);
  const text = `${JSON.stringify(view, null, 2)}\n`;
  process.stdout.write(text);
  mkdirSync(join(PROJECT_ROOT, 'ai', 'artifacts'), { recursive: true });
  writeFileSync(join(PROJECT_ROOT, 'ai', 'artifacts', 'ai-view.json'), text, 'utf8');
}

main().catch((err) => {
  process.stderr.write(`ai:view 失败：${err?.message ?? String(err)}\n`);
  process.exit(1);
});
