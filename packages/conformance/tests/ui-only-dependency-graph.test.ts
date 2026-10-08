// @vitest-environment node
/**
 * UI-only dependency graph proof (#21 acceptance 3).
 *
 * The UI surface (react-provider, theme, conformance) must never load the
 * capability runtime, protocol adapters, or model SDKs. This is asserted
 * statically two ways:
 * 1. package.json dependency declarations of every UI package.
 * 2. import specifiers actually present under each package's src/.
 *
 * Only actual tested combinations are concluded on (acceptance 5): React 19
 * on jsdom, theme optional.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');

const UI_PACKAGES = [
  'packages/react-provider',
  'packages/theme',
  'packages/conformance',
  'packages/shadcn-adapter',
  'packages/ark-ui-adapter',
];

const FORBIDDEN_DEPENDENCIES = [
  '@future-ui/capability-runtime',
  '@future-ui/ai-contract-core',
  '@future-ui/plugin-kernel',
  'openai',
  '@ai-sdk/react',
  'ai',
];

function collectSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...collectSourceFiles(p));
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

function collectImports(file: string): string[] {
  const src = readFileSync(file, 'utf8');
  const imports: string[] = [];
  const re = /(?:from\s+|import\s*\()\s*['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) imports.push(m[1]);
  return imports;
}

describe('UI-only dependency graph (#21)', () => {
  it.each(UI_PACKAGES)('%s declares no capability/protocol/model dependencies in package.json', (pkgDir) => {
    const manifest = JSON.parse(readFileSync(join(ROOT, pkgDir, 'package.json'), 'utf8'));
    const allDeps = {
      ...(manifest.dependencies ?? {}),
      ...(manifest.devDependencies ?? {}),
      ...(manifest.peerDependencies ?? {}),
    };
    for (const forbidden of FORBIDDEN_DEPENDENCIES) {
      expect(allDeps[forbidden]).toBeUndefined();
    }
  });

  it.each(UI_PACKAGES)('%s source imports never reference capability/protocol/model modules', (pkgDir) => {
    const srcDir = join(ROOT, pkgDir, 'src');
    const files = collectSourceFiles(srcDir);
    expect(files.length).toBeGreaterThan(0);
    const violations: string[] = [];
    for (const file of files) {
      for (const specifier of collectImports(file)) {
        if (FORBIDDEN_DEPENDENCIES.some((f) => specifier === f || specifier.startsWith(f + '/'))) {
          violations.push(`${file.replace(ROOT + '/', '')} -> ${specifier}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('UI packages depend only on workspace UI/contract packages or React/testing infra', () => {
    for (const pkgDir of UI_PACKAGES) {
      const manifest = JSON.parse(readFileSync(join(ROOT, pkgDir, 'package.json'), 'utf8'));
      const allDeps = {
        ...(manifest.dependencies ?? {}),
        ...(manifest.devDependencies ?? {}),
        ...(manifest.peerDependencies ?? {}),
      };
      for (const [name, _range] of Object.entries(allDeps)) {
        if (name.startsWith('@future-ui/')) {
          expect(['@future-ui/contracts', '@future-ui/react-provider']).toContain(name);
        }
      }
    }
  });
});
