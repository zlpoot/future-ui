/**
 * create-future-ui CLI 单元测试（仅测纯函数；真实离仓初始化走 Windows 验收）。
 *
 * R3-WIN-01 Review 增量（PR #110）：
 *  - P1-1：run() 必须先只读预检全部必需资产，再安全写入；缺归档失败后
 *          同名重试必须成功且不留非空残骸。
 *  - P2-2：validateProjectName 拒绝 "."/".."、Windows 保留设备名、以 "."/"_"
 *          开头、以 "."/"_"/"-" 结尾等非 npm 包名输入。
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkTargetUsable,
  CreateError,
  ensureTargetDir,
  renderPackageJson,
  rewriteDepsToVendor,
  writeTemplate,
} from '../src/template.js';
import { parseArgs, run, validateProjectName } from '../src/cli.js';
import { RC_CANDIDATES, VENDOR_REL_DIR } from '../src/constants.js';
import type { VendoredTarball } from '../src/rc-vendor.js';

/**
 * 事务性生成回归（P1-1）：包装 rc-vendor.vendorRcTarballs，可注入"模板已写入后
 * 复制故障"，验证最终目标无残留、同名重试成功。默认透传原实现。
 */
const rvState = vi.hoisted(() => ({ failCopy: false }));

vi.mock('../src/rc-vendor.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/rc-vendor.js')>();
  return {
    ...actual,
    vendorRcTarballs: (projectDir: string, planned: VendoredTarball[]) => {
      if (rvState.failCopy) {
        throw new Error('simulated copy failure after partial template write');
      }
      return actual.vendorRcTarballs(projectDir, planned);
    },
  };
});

/**
 * 提交阶段 fail-safe 回归（P2-2）：包装 node:fs.renameSync，可注入可控的
 * rename 失败（EPERM），验证非零退出、无暂存残骸、原空目录状态保留、
 * 不覆盖未知文件、修复后同名重试成功。默认透传原实现。
 */
const fsState = vi.hoisted(() => ({ failRename: false }));

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    renameSync: (from: string, to: string) => {
      if (fsState.failRename) {
        const err = new Error('simulated rename failure (EPERM)') as NodeJS.ErrnoException;
        err.code = 'EPERM';
        throw err;
      }
      return actual.renameSync(from, to);
    },
  };
});

const TEMPLATE_ROOT = join(__dirname, '..', 'templates', 'react-vite-ts');

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'cfu-test-'));
});

afterEach(() => {
  // 测试临时目录由 OS 清理；不触碰任何用户目录。
});

/** 构造一个合法的候选 tgz（package/package.json 含 name/version），供 planRcVendoring 通过。 */
function makeCandidateTgz(rcDir: string, candidate: (typeof RC_CANDIDATES)[number]): void {
  const stage = join(rcDir, '_stage');
  mkdirSync(join(stage, 'package'), { recursive: true });
  writeFileSync(
    join(stage, 'package', 'package.json'),
    JSON.stringify({ name: candidate.packageName, version: candidate.version }),
    'utf8',
  );
  execFileSync('tar', ['-czf', join(rcDir, candidate.tarballName), '-C', stage, 'package']);
}

/** 构造一个包含全部 4 个候选归档的 rc 目录。 */
function makeRcDir(): string {
  const rcDir = join(tmp, 'rc-dist');
  mkdirSync(rcDir, { recursive: true });
  for (const c of RC_CANDIDATES) {
    makeCandidateTgz(rcDir, c);
  }
  return rcDir;
}

describe('parseArgs', () => {
  it('接受 projectName 与 --local-rc-dir', () => {
    const opts = parseArgs(['my-admin', '--local-rc-dir', 'C:/rc-dist']);
    expect(opts).toEqual({ projectName: 'my-admin', localRcDir: 'C:/rc-dist' });
  });

  it('缺 projectName 抛错', () => {
    expect(() => parseArgs(['--local-rc-dir', 'C:/rc-dist'])).toThrow(CreateError);
  });

  it('非法 projectName 抛错', () => {
    expect(() => parseArgs(['bad name!'])).toThrow(CreateError);
  });

  it('--help 返回 null', () => {
    expect(parseArgs(['--help'])).toBeNull();
  });
});

describe('validateProjectName (P2-2 · npm new-package 规则)', () => {
  it('合法 npm 新包名通过', () => {
    expect(validateProjectName('my-admin')).toBeNull();
    expect(validateProjectName('app2')).toBeNull();
    expect(validateProjectName('a')).toBeNull();
    expect(validateProjectName('my_app')).toBeNull(); // 中间下划线合法
    expect(validateProjectName('name-')).toBeNull(); // npm 允许末尾连字符
  });

  it('拒绝 "." 与 ".."', () => {
    expect(validateProjectName('.')).toMatch(/不能是/);
    expect(validateProjectName('..')).toMatch(/不能是/);
  });

  it('拒绝 Windows 保留设备名（大小写不敏感、含扩展名形态）', () => {
    for (const bad of ['CON', 'con', 'Prn', 'AUX', 'NUL', 'COM1', 'COM9', 'LPT1', 'LPT9', 'CON.txt']) {
      expect(validateProjectName(bad)).toMatch(/设备名/);
    }
    // 合法前缀不受影响（非设备名、非 Node builtin）
    expect(validateProjectName('concurrent')).toBeNull();
  });

  it('拒绝以 "." 或 "_" 开头、以 "." 结尾（Windows 目录约束）', () => {
    expect(validateProjectName('.hidden')).toMatch(/开头/);
    expect(validateProjectName('_private')).toMatch(/开头/);
    expect(validateProjectName('name.')).toMatch(/结尾/);
  });

  it('拒绝 npm 新包名不认可的大写与特殊字符', () => {
    expect(validateProjectName('MyApp')).toMatch(/大写/);
    expect(validateProjectName('my~app')).toMatch(/只能包含/);
    expect(validateProjectName('my_app~x')).toMatch(/只能包含/);
    expect(validateProjectName("a'b")).toMatch(/只能包含/);
    expect(validateProjectName('a!b')).toMatch(/只能包含/);
  });

  it('拒绝前导连字符（npm 新包名规则 startsWith(-)）', () => {
    expect(validateProjectName('-demo')).toMatch(/开头/);
    expect(validateProjectName('-')).toMatch(/开头/);
  });

  it('拒绝 Node 内置模块名（builtin modules 排除）', () => {
    for (const bad of ['http', 'stream', 'fs', 'path', 'events', 'buffer']) {
      expect(validateProjectName(bad)).toMatch(/内置模块/);
    }
    // 非内置名不受影响
    expect(validateProjectName('httpd')).toBeNull();
    expect(validateProjectName('streams')).toBeNull();
  });

  it('拒绝 npm 保留名 node_modules / favicon.ico', () => {
    expect(validateProjectName('node_modules')).toMatch(/保留名/);
    expect(validateProjectName('favicon.ico')).toMatch(/保留名/);
  });

  it('拒绝空格、非 URL 安全字符、超长', () => {
    expect(validateProjectName('bad name')).toMatch(/空格|只能包含/);
    expect(validateProjectName(' name')).toMatch(/空格/);
    expect(validateProjectName('name ')).toMatch(/空格/);
    expect(validateProjectName('a/b')).toMatch(/只能包含/);
    expect(validateProjectName('a'.repeat(215))).toMatch(/上限/);
  });
});

describe('checkTargetUsable / ensureTargetDir (P1-1 预检拆分)', () => {
  it('不存在目录：只读预检通过且不创建', () => {
    const target = join(tmp, 'fresh');
    checkTargetUsable(target);
    expect(existsSync(target)).toBe(false);
    ensureTargetDir(target);
    expect(existsSync(target)).toBe(true);
  });

  it('非空目录拒绝覆盖（不删除任何用户文件）', () => {
    const target = join(tmp, 'occupied');
    mkdirSync(target);
    writeFileSync(join(target, 'keep.txt'), 'user data');
    expect(() => checkTargetUsable(target)).toThrow(/拒绝覆盖/);
    expect(readFileSync(join(target, 'keep.txt'), 'utf8')).toBe('user data');
    expect(readdirSync(target)).toEqual(['keep.txt']);
  });
});

describe('run() 先预检后写入 + 失败后同名重试 (P1-1)', () => {
  it('缺归档时 run 返回 1 且不创建目标目录', () => {
    const cwd = process.cwd();
    process.chdir(tmp);
    try {
      const emptyRc = join(tmp, 'empty-rc');
      mkdirSync(emptyRc);
      const code = run(['my-retry', '--local-rc-dir', emptyRc]);
      expect(code).toBe(1);
      expect(existsSync(join(tmp, 'my-retry'))).toBe(false);
    } finally {
      process.chdir(cwd);
    }
  });

  it('先失败（坏 rc）→ 同名重试（好 rc）→ 成功且工程完整', () => {
    const cwd = process.cwd();
    process.chdir(tmp);
    try {
      // 第一次：坏的 rc 目录（缺归档）→ 失败，不留残骸
      const badRc = join(tmp, 'bad-rc');
      mkdirSync(badRc);
      const first = run(['my-retry', '--local-rc-dir', badRc]);
      expect(first).toBe(1);
      expect(existsSync(join(tmp, 'my-retry'))).toBe(false);

      // 第二次：同名重试，提供合法 rc → 成功
      const goodRc = makeRcDir();
      const second = run(['my-retry', '--local-rc-dir', goodRc]);
      expect(second).toBe(0);
      const proj = join(tmp, 'my-retry');
      expect(existsSync(join(proj, 'package.json'))).toBe(true);
      expect(existsSync(join(proj, 'src', 'App.tsx'))).toBe(true);
      const vendored = readdirSync(join(proj, VENDOR_REL_DIR));
      expect(vendored).toHaveLength(4);
      expect(vendored).toEqual(expect.arrayContaining(RC_CANDIDATES.map((c) => c.tarballName)));
    } finally {
      process.chdir(cwd);
    }
  });

  it('目标目录非空时 run 返回 1 且不触碰现有文件', () => {
    const cwd = process.cwd();
    process.chdir(tmp);
    try {
      mkdirSync(join(tmp, 'occupied-app'));
      writeFileSync(join(tmp, 'occupied-app', 'keep.txt'), 'user data');
      const code = run(['occupied-app', '--local-rc-dir', makeRcDir()]);
      expect(code).toBe(1);
      expect(readFileSync(join(tmp, 'occupied-app', 'keep.txt'), 'utf8')).toBe('user data');
    } finally {
      process.chdir(cwd);
    }
  });

  it('已写部分模板后复制故障 → 原目标无残留 → 同名重试成功（事务性生成）', () => {
    const cwd = process.cwd();
    process.chdir(tmp);
    try {
      // 写入中途（模板已写入、vendor 拷贝时）故障
      rvState.failCopy = true;
      const first = run(['my-txn', '--local-rc-dir', makeRcDir()]);
      expect(first).toBe(1);
      // 最终目标不存在（无半成品残留），父目录无暂存残骸
      expect(existsSync(join(tmp, 'my-txn'))).toBe(false);
      const leftovers = readdirSync(tmp).filter((n) => n.includes('.cfu-staging-'));
      expect(leftovers).toEqual([]);

      // 修复后同名重试成功（不被半成品阻塞）
      rvState.failCopy = false;
      const second = run(['my-txn', '--local-rc-dir', makeRcDir()]);
      expect(second).toBe(0);
      expect(existsSync(join(tmp, 'my-txn', 'package.json'))).toBe(true);
      expect(existsSync(join(tmp, 'my-txn', 'src', 'App.tsx'))).toBe(true);
      expect(readdirSync(join(tmp, 'my-txn', VENDOR_REL_DIR))).toHaveLength(4);
    } finally {
      rvState.failCopy = false;
      process.chdir(cwd);
    }
  });

  it('目标存在且为空目录：可生成成功（仅移除空目录，不触碰文件）', () => {
    const cwd = process.cwd();
    process.chdir(tmp);
    try {
      mkdirSync(join(tmp, 'empty-app'));
      const code = run(['empty-app', '--local-rc-dir', makeRcDir()]);
      expect(code).toBe(0);
      expect(existsSync(join(tmp, 'empty-app', 'package.json'))).toBe(true);
    } finally {
      process.chdir(cwd);
    }
  });

  it('rename 提交失败：非零退出、无暂存残骸、原空目录保留、修复后同名重试成功（P2-2）', () => {
    const cwd = process.cwd();
    process.chdir(tmp);
    try {
      // 场景 A：目标原本不存在，rename 失败 → 保持不存在、无暂存残骸
      fsState.failRename = true;
      const first = run(['my-rename', '--local-rc-dir', makeRcDir()]);
      expect(first).toBe(1);
      expect(existsSync(join(tmp, 'my-rename'))).toBe(false);
      expect(readdirSync(tmp).filter((n) => n.includes('.cfu-staging-'))).toEqual([]);

      // 场景 B：目标原本是空目录，rename 失败 → 空目录状态保留、内容为空、无暂存残骸
      mkdirSync(join(tmp, 'empty-rename'));
      const second = run(['empty-rename', '--local-rc-dir', makeRcDir()]);
      expect(second).toBe(1);
      expect(existsSync(join(tmp, 'empty-rename'))).toBe(true);
      expect(readdirSync(join(tmp, 'empty-rename'))).toEqual([]);
      expect(readdirSync(tmp).filter((n) => n.includes('.cfu-staging-'))).toEqual([]);

      // 不覆盖未知文件：非空目标在预检阶段即被拒绝（已有独立用例），
      // rename 失败路径只触碰我们创建的暂存目录与空目标。

      // 修复后同名重试成功（两场景都不被残骸阻塞）
      fsState.failRename = false;
      const third = run(['my-rename', '--local-rc-dir', makeRcDir()]);
      expect(third).toBe(0);
      expect(existsSync(join(tmp, 'my-rename', 'package.json'))).toBe(true);
      const fourth = run(['empty-rename', '--local-rc-dir', makeRcDir()]);
      expect(fourth).toBe(0);
      expect(existsSync(join(tmp, 'empty-rename', 'package.json'))).toBe(true);
    } finally {
      fsState.failRename = false;
      process.chdir(cwd);
    }
  });
});

describe('renderPackageJson / rewriteDepsToVendor', () => {
  it('默认保留 @future-ui/* 版本引用（registry 形态）', () => {
    const m = renderPackageJson('my-admin');
    expect(m.name).toBe('my-admin');
    expect(m.dependencies['@future-ui/shadcn-adapter']).toBe('0.1.0-rc.1');
    expect(m.dependencies['@future-ui/contracts']).toBe('1.0.0');
  });

  it('pilot 模式改写为 file:vendor/future-ui/<tgz>', () => {
    const m = renderPackageJson('my-admin');
    const byName = new Map<string, string>([
      ['@future-ui/contracts', `${VENDOR_REL_DIR}/future-ui-contracts-1.0.0.tgz`],
      ['@future-ui/react-provider', `${VENDOR_REL_DIR}/future-ui-react-provider-0.1.0-rc.1.tgz`],
      ['@future-ui/theme', `${VENDOR_REL_DIR}/future-ui-theme-0.1.0-rc.1.tgz`],
      ['@future-ui/shadcn-adapter', `${VENDOR_REL_DIR}/future-ui-shadcn-adapter-0.1.0-rc.1.tgz`],
    ]);
    rewriteDepsToVendor(m, (pkg) => byName.get(pkg) ?? pkg);
    expect(m.dependencies['@future-ui/shadcn-adapter']).toBe(`file:${VENDOR_REL_DIR}/future-ui-shadcn-adapter-0.1.0-rc.1.tgz`);
    expect(m.dependencies['@future-ui/theme']).toBe(`file:${VENDOR_REL_DIR}/future-ui-theme-0.1.0-rc.1.tgz`);
  });
});

describe('writeTemplate', () => {
  it('渲染占位并产出非 .tmpl 文件', () => {
    const target = join(tmp, 'proj');
    mkdirSync(target);
    writeTemplate(target, TEMPLATE_ROOT, 'my-admin');
    expect(existsSync(join(target, 'src', 'App.tsx'))).toBe(true);
    expect(existsSync(join(target, 'src', 'main.tsx'))).toBe(true);
    expect(existsSync(join(target, 'src', 'theme.tsx'))).toBe(true);
    expect(existsSync(join(target, 'index.html'))).toBe(true);
    const html = readFileSync(join(target, 'index.html'), 'utf8');
    expect(html).toContain('<title>my-admin</title>');
    const readme = readFileSync(join(target, 'README.md'), 'utf8');
    expect(readme).toContain('my-admin');
    expect(readme).toContain('本地候选');
  });
});
