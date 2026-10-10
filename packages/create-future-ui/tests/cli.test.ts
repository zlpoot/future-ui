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
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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

describe('validateProjectName (P2-2)', () => {
  it('合法 npm 名通过', () => {
    expect(validateProjectName('my-admin')).toBeNull();
    expect(validateProjectName('app2')).toBeNull();
    expect(validateProjectName('a')).toBeNull();
    expect(validateProjectName('my_app~x')).toBeNull();
  });

  it('拒绝 "." 与 ".."', () => {
    expect(validateProjectName('.')).toMatch(/不能是/);
    expect(validateProjectName('..')).toMatch(/不能是/);
  });

  it('拒绝 Windows 保留设备名（大小写不敏感、含扩展名形态）', () => {
    for (const bad of ['CON', 'con', 'Prn', 'AUX', 'NUL', 'COM1', 'COM9', 'LPT1', 'LPT9', 'CON.txt']) {
      expect(validateProjectName(bad)).toMatch(/设备名/);
    }
    // 合法前缀不受影响
    expect(validateProjectName('console')).toBeNull();
  });

  it('拒绝以 "." 或 "_" 开头、以 "."/"_"/"-" 结尾', () => {
    expect(validateProjectName('.hidden')).toMatch(/开头/);
    expect(validateProjectName('_private')).toMatch(/开头/);
    expect(validateProjectName('name.')).toMatch(/结尾/);
    expect(validateProjectName('name_')).toMatch(/结尾/);
    expect(validateProjectName('name-')).toMatch(/结尾/);
  });

  it('拒绝空格与非 URL 安全字符、超长', () => {
    expect(validateProjectName('bad name')).toMatch(/只能包含/);
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
