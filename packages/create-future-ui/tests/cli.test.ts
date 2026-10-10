/**
 * create-future-ui CLI 单元测试（仅测纯函数；真实离仓初始化走 Windows 验收）。
 */
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  assertTargetUsable,
  CreateError,
  renderPackageJson,
  rewriteDepsToVendor,
  writeTemplate,
} from '../src/template.js';
import { parseArgs } from '../src/cli.js';
import { VENDOR_REL_DIR } from '../src/constants.js';

const TEMPLATE_ROOT = join(__dirname, '..', 'templates', 'react-vite-ts');

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'cfu-test-'));
});

afterEach(() => {
  // 测试临时目录由 OS 清理；不触碰任何用户目录。
});

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

describe('assertTargetUsable', () => {
  it('不存在目录可直接创建', () => {
    const target = join(tmp, 'fresh');
    assertTargetUsable(target);
    expect(existsSync(target)).toBe(true);
  });

  it('非空目录拒绝覆盖', () => {
    const target = join(tmp, 'occupied');
    mkdirSync(target);
    writeFileSync(join(target, 'keep.txt'), 'user data');
    expect(() => assertTargetUsable(target)).toThrow(/拒绝覆盖/);
    expect(readFileSync(join(target, 'keep.txt'), 'utf8')).toBe('user data');
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
