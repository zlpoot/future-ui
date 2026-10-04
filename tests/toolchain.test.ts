import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const readJson = (path: string): Record<string, unknown> =>
  JSON.parse(readFileSync(join(root, path), 'utf8')) as Record<string, unknown>;

const devDeps = (pkg: Record<string, unknown>): Record<string, unknown> =>
  (pkg.devDependencies as Record<string, unknown>) ?? {};

describe('M0-01 toolchain baseline', () => {
  it('runs on the frozen Node major (24)', () => {
    expect(process.version.startsWith('v24.')).toBe(true);
  });

  it('pins pnpm and private scope in package.json', () => {
    const pkg = readJson('package.json');
    expect(pkg.private).toBe(true);
    expect(pkg.packageManager).toBe('pnpm@11.28.2');
  });

  it('pins Node via .node-version', () => {
    const version = readFileSync(join(root, '.node-version'), 'utf8').trim();
    expect(version).toBe('24.21.0');
  });

  it('freezes exact tool versions in devDependencies', () => {
    const deps = devDeps(readJson('package.json'));
    expect(deps.typescript).toBe('6.0.3');
    expect(deps['@types/node']).toBe('24.19.1');
    expect(deps.eslint).toBe('10.12.0');
    expect(deps['typescript-eslint']).toBe('8.71.0');
    expect(deps.vitest).toBe('5.0.3');
  });

  it('does not declare forbidden core dependencies (React/Ark/WebMCP)', () => {
    const pkg = readJson('package.json');
    const deps = {
      ...((pkg.dependencies as Record<string, unknown>) ?? {}),
      ...devDeps(pkg),
    };
    for (const name of ['react', '@ark-ui/react', '@zag-js/react', 'webmcp']) {
      expect(Object.keys(deps)).not.toContain(name);
    }
  });

  it('defines independent lint/typecheck/test scripts', () => {
    const scripts = readJson('package.json').scripts as Record<string, unknown>;
    expect(typeof scripts.lint).toBe('string');
    expect(typeof scripts.typecheck).toBe('string');
    expect(typeof scripts.test).toBe('string');
    expect(scripts.test).not.toBe(scripts.typecheck);
  });

  it('declares packages/* workspace without precreating packages', () => {
    const workspace = readFileSync(join(root, 'pnpm-workspace.yaml'), 'utf8');
    expect(workspace).toContain("'packages/*'");
  });
});
