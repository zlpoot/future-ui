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
} from './project-info.mjs';

const KNOWN_EXPORT = new Map(KNOWN_COMPONENTS.flatMap((c) => c.exports.map((e) => [e, c.componentType])));

/** 统计某个 JSX 标记上 prop 出现的次数（简单非嵌套静态文本检查，明确标注限制）。 */
function countJsxProp(entry, tag, prop) {
  const text = entry.text;
  const re = new RegExp(`<${tag}[\\s\\S]*?\\/?>`, 'g');
  let count = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    const self = m[0];
    const selfRe = new RegExp(`\\b${prop}=`, 'g');
    while (selfRe.exec(self) !== null) count += 1;
  }
  return count;
}

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

  // 2) EditDialog 行为约定（静态可确认部分）
  const dialogUses = entries.filter((e) => e.text.includes('<EditDialog'));
  if (dialogUses.length > 0) {
    for (const entry of dialogUses) {
      if (countJsxProp(entry, 'EditDialog', 'onOpenChange') > 0) {
        pass('dialog-onOpenChange', `${entry.file}: EditDialog 声明 onOpenChange（关闭约定）`);
      } else {
        fail('dialog-onOpenChange', `${entry.file}: EditDialog 缺少 onOpenChange 回调`, '添加 onOpenChange={({ open: next }) => ...}，取消不保存按关闭约定处理');
      }
      if (countJsxProp(entry, 'EditDialog', 'onSave') > 0) {
        pass('dialog-onSave', `${entry.file}: EditDialog 声明 onSave（保存处理）`);
      } else {
        fail('dialog-onSave', `${entry.file}: EditDialog 缺少 onSave`, '提供 async onSave（pending 由 EditDialog 呈现）');
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
