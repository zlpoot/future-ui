// @vitest-environment node
/**
 * Vendored-source boundary checks (R1-02 #68):
 *  - the immutable shadcn sources may only import from the declared frozen
 *    dependency surface (React, radix-ui, cn, lucide-react) and their own
 *    registry alias; nothing new may sneak in.
 *  - no vendored file may reach into @future-ui/* or Node builtins (the
 *    adapter depends ON vendored, never the reverse).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const VENDORED_DIR = join(__dirname, '..', 'src', 'upstream', 'registry', 'new-york-v4', 'ui');

const ALLOWED_SPECIFIER_PREFIXES = [
  'react',
  'radix-ui',
  'cn',
  'class-variance-authority',
  'lucide-react',
  '@/registry/new-york-v4/',
];

function collectImports(file: string): string[] {
  const src = readFileSync(file, 'utf8');
  const out: string[] = [];
  const re = /(?:from\s+|import\s*\()\s*['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) out.push(m[1]);
  return out;
}

describe('vendored shadcn sources import boundary', () => {
  const files = readdirSync(VENDORED_DIR).filter((f) => f.endsWith('.tsx'));

  it('contains exactly dialog, button and input', () => {
    expect(files.sort()).toEqual(['button.tsx', 'dialog.tsx', 'input.tsx']);
  });

  it.each(files)('%s imports only the frozen dependency surface', (name) => {
    const specifiers = collectImports(join(VENDORED_DIR, name));
    expect(specifiers.length).toBeGreaterThan(0);
    const violations = specifiers.filter(
      (s) =>
        !ALLOWED_SPECIFIER_PREFIXES.some(
          (p) => s === p || s.startsWith(p) || s.startsWith(p.replace(/\/$/, '')),
        ),
    );
    expect(violations).toEqual([]);
  });

  it.each(files)('%s never imports @future-ui/* or Node builtins', (name) => {
    const specifiers = collectImports(join(VENDORED_DIR, name));
    expect(specifiers.some((s) => s.startsWith('@future-ui/'))).toBe(false);
    expect(specifiers.some((s) => /^node:/.test(s))).toBe(false);
  });
});
