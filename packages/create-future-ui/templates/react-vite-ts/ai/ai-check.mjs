/**
 * create-future-ui 模板 · `ai:check`（R3-WIN-02 / Issue #108）。
 *
 * 对工程「声明的组件使用」做最小只读验证：
 *  - 组件 import 是否走浏览器安全入口、导出名是否在目录内；
 *  - 未知组件/未知页面标 not-covered（不虚报 supported）；
 *  - EditDialog 声明的关闭（onOpenChange）/保存（onSave）约定是否出现；
 *  - 保存 pending、重复提交阻止等真实交互证据：静态检查无法证明 → 明确标
 *    not-covered，指向 src/fixture.test.tsx（jsdom）与人工 Chrome 验收，不伪造 PASS。
 *
 * 用法：`node ai/ai-check.mjs`（或 `npm run ai:check` / `pnpm ai:check`）。
 * 退出码：0 = 无诊断；非零 = 至少一项诊断。
 */
import { readFileSync } from 'node:fs';
import {
  BROWSER_MODULE,
  KNOWN_COMPONENTS,
  projectPackageJson,
  collectSourceFiles,
  parseImports,
  findJsxOpeningElements,
  countPropInElement,
  elementHasSpreadProps,
} from './project-info.mjs';

const KNOWN_EXPORT = new Map(KNOWN_COMPONENTS.flatMap((c) => c.exports.map((e) => [e, c.componentType])));

async function main() {
  const pkg = projectPackageJson();
  const checks = [];
  const files = collectSourceFiles();
  const entries = files.map((f) => ({ file: f, text: readFileSync(f, 'utf8') }));
  const imports = files.flatMap(parseImports);
  const fail = (id, detail, fix) => checks.push({ id, verdict: 'diagnose', detail, fix });
  const pass = (id, detail) => checks.push({ id, verdict: 'pass', detail });
  const notCovered = (id, detail, note) => checks.push({ id, verdict: 'not-covered', detail, note });

  // 1) import 分类
  const futureUiImports = imports.filter((i) => i.specifier.startsWith('@future-ui/'));
  if (futureUiImports.length === 0) {
    notCovered('imports', 'src 未发现 @future-ui/* 导入', '模板未使用组件时无导入是合法的，但 Coding Agent 无法验证组件使用');
  }
  for (const imp of futureUiImports) {
    if (imp.specifier === BROWSER_MODULE) {
      for (const name of imp.names) {
        const known = KNOWN_EXPORT.get(name);
        if (known) {
          pass(`import-${name}`, `${imp.file}: ${name} ← ${imp.specifier}（${known}）`);
        } else {
          notCovered(`import-${name}`, `${imp.file}: 未知导出 ${name} ← ${imp.specifier}`, '不在当前组件目录，不得假定为受支持组件');
        }
      }
    } else if (imp.specifier === '@future-ui/shadcn-adapter') {
      fail(
        `import-root-${imp.specifier}`,
        `${imp.file}: 使用了根入口 @future-ui/shadcn-adapter`,
        '浏览器代码必须从 @future-ui/shadcn-adapter/browser 导入（根入口含 Node-only validators）',
      );
    } else if (imp.specifier === '@future-ui/theme/theme.css') {
      pass(`import-${imp.specifier}`, `${imp.file}: CSS token 资源导入（Light/Dark 单一数据源）`);
    } else if (imp.specifier.startsWith('@future-ui/')) {
      notCovered(`import-${imp.specifier}`, `${imp.file}: ${imp.specifier} 导入`, '不在浏览器安全目录内；保持 not-covered，不虚报 supported');
    }
  }

  // 2) EditDialog 行为约定（P2-03：以每个 JSX opening element 为单位解析；
  //    展开属性 {…props} 无法静态判定 → not-covered；多元素各自独立校验）
  const dialogFiles = entries
    .map((e) => ({ file: e.file, elements: findJsxOpeningElements(e.text, 'EditDialog') }))
    .filter((e) => e.elements.length > 0);
  if (dialogFiles.length > 0) {
    for (const { file, elements } of dialogFiles) {
      for (const [idx, el] of elements.entries()) {
        const label = `EditDialog #${idx + 1}`;
        if (elementHasSpreadProps(el)) {
          notCovered(
            `dialog-onOpenChange`,
            `${file}: ${label} 含展开属性 {...props}，onOpenChange 无法静态判定`,
            '展开属性中的回调不在静态验证范围；需在展开处显式声明或由 fixture/浏览器验收证明',
          );
          notCovered(
            `dialog-onSave`,
            `${file}: ${label} 含展开属性 {...props}，onSave 无法静态判定`,
            '展开属性中的回调不在静态验证范围；需在展开处显式声明或由 fixture/浏览器验收证明',
          );
          continue;
        }
        if (countPropInElement(el, 'onOpenChange') > 0) {
          pass(`dialog-onOpenChange`, `${file}: ${label} 声明 onOpenChange（关闭约定）`);
        } else {
          fail(`dialog-onOpenChange`, `${file}: ${label} 缺少 onOpenChange 回调`, '添加 onOpenChange={({ open: next }) => ...}，取消不保存按关闭约定处理');
        }
        if (countPropInElement(el, 'onSave') > 0) {
          pass(`dialog-onSave`, `${file}: ${label} 声明 onSave（保存处理）`);
        } else {
          fail(`dialog-onSave`, `${file}: ${label} 缺少 onSave`, '提供 async onSave（pending 由 EditDialog 呈现）');
        }
      }
    }
    notCovered(
      'dialog-pending-duplicate',
      '保存 pending 与重复提交阻止：静态检查无法证明运行时行为',
      '真实交互证据见 src/fixture.test.tsx（jsdom：pending 按钮禁用、完成关闭）与人工 Chrome 验收；本命令不伪造 PASS',
    );
  } else {
    notCovered('dialog-usage', 'src 未使用 EditDialog', '模板默认页面不含管理页；本 recipe 供 #109 阶段消费');
  }

  // 3) 汇总
  const failed = checks.filter((c) => c.verdict === 'diagnose');
  const nc = checks.filter((c) => c.verdict === 'not-covered');
  const report = {
    schema: 'future-ui.ai-check@1',
    project: pkg.name,
    status: failed.length === 0 ? 'ok' : 'diagnose',
    checks,
    summary: {
      total: checks.length,
      pass: checks.filter((c) => c.verdict === 'pass').length,
      diagnose: failed.length,
      notCovered: nc.length,
    },
    limits: '静态只读检查：import/声明级别；运行时行为以 fixture 测试与真实浏览器验收为准。',
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((err) => {
  process.stderr.write(`ai:check 失败：${err?.message ?? String(err)}\n`);
  process.exit(2);
});
