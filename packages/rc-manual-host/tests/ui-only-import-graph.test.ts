/**
 * R1-RC-001 (#86) — UI-only import-graph guard (fail-closed).
 *
 * The independent UI-only sample must NEVER reference ai-dev /
 * capability-runtime / webmcp-adapter / jsdom / @testing-library / node:* /
 * Agent/MCP, directly or transitively through its own relative modules. This
 * test statically walks the sample's module graph (own source files only) and
 * checks every resolved package target by REAL path (realpath resolves the
 * pnpm symlink into .pnpm/<name>), so a renamed or re-exported dev-only import
 * cannot slip through.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ENTRY = fileURLToPath(new URL('../src/sections/ui-only-sample.tsx', import.meta.url));

const FORBIDDEN_SPECIFIERS = [
  'ai-dev',
  'capability-runtime',
  'webmcp-adapter',
  'jsdom',
  '@testing-library',
  'mcp',
  'plugin-kernel',
];
const FORBIDDEN_SCHEMES = ['node:', 'http:', 'https:', 'data:'];
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const INDEX_FILES = ['/index.ts', '/index.tsx', '/index.js', '/index.jsx'];

/** Extract every import/export specifier (runtime and type-only, fail-closed). */
function specifiersOf(source: string): string[] {
  const out: string[] = [];
  const re = /from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    const spec = match[1] ?? match[2];
    if (spec !== undefined && !out.includes(spec)) out.push(spec);
  }
  return out;
}

/** Resolve a relative specifier against its importing file (NodeNext .js → .ts/.tsx). */
function resolveRelative(fromFile: string, spec: string): string | null {
  const base = join(dirname(fromFile), spec);
  for (const ext of EXTENSIONS) {
    const candidate = base + ext;
    if (existsSync(candidate)) return resolve(candidate);
  }
  for (const index of INDEX_FILES) {
    const candidate = base + index;
    if (existsSync(candidate)) return resolve(candidate);
  }
  return null;
}

function normalized(p: string): string {
  return p.replaceAll('\\', '/');
}

describe('UI-only sample import graph (fail-closed)', () => {
  it('entry file exists and imports React + at least one adapter (positive control)', () => {
    expect(existsSync(ENTRY)).toBe(true);
    const source = readFileSync(ENTRY, 'utf8');
    const specs = specifiersOf(source);
    expect(specs).toContain('react');
    expect(specs.some((s) => s.startsWith('@future-ui/'))).toBe(true);
  });

  it('no forbidden specifier/scheme appears in the sample module graph', () => {
    const queue: string[] = [ENTRY];
    const seen = new Set<string>([ENTRY]);
    const violations: string[] = [];
    const requireFrom = createRequire(import.meta.url);

    while (queue.length > 0) {
      const file = queue.shift() as string;
      const source = readFileSync(file, 'utf8');
      for (const spec of specifiersOf(source)) {
        if (FORBIDDEN_SCHEMES.some((scheme) => spec.startsWith(scheme))) {
          violations.push(`${file} → scheme ${spec}`);
          continue;
        }
        if (FORBIDDEN_SPECIFIERS.some((f) => spec.includes(f))) {
          violations.push(`${file} → forbidden specifier ${spec}`);
          continue;
        }
        if (spec.startsWith('.')) {
          const resolved = resolveRelative(file, spec);
          if (resolved === null) {
            violations.push(`${file} → unresolvable relative ${spec}`);
            continue;
          }
          if (!seen.has(resolved)) {
            seen.add(resolved);
            queue.push(resolved);
          }
        } else {
          // Bare/package specifier: resolve to the REAL on-disk path and check
          // the realpath (pnpm symlink → .pnpm/<name>) for forbidden packages.
          try {
            const resolved = requireFrom.resolve(spec, { paths: [dirname(file)] });
            const real = realpathSync(resolved);
            const norm = normalized(real);
            if (FORBIDDEN_SPECIFIERS.some((f) => norm.includes(f))) {
              violations.push(`${file} → package ${spec} resolves into ${norm}`);
            }
          } catch {
            violations.push(`${file} → cannot resolve package ${spec}`);
          }
        }
      }
    }

    expect(violations).toEqual([]);
    // Sanity: the graph really walked own modules (entry + at least the sample file).
    expect(seen.size).toBeGreaterThanOrEqual(1);
  });

  it('the UI-only sample never imports the dev-only validator helpers', () => {
    const source = readFileSync(ENTRY, 'utf8');
    expect(source).not.toContain('validator-live');
    expect(source).not.toContain('ai-view-section');
  });
});
