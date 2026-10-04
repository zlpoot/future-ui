import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8')) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

const forbidden = ['react', 'vue', '@ark-ui/react', '@zag-js/react', 'webmcp', 'openai', 'anthropic'];

describe('@future-ui/contracts package boundary', () => {
  it('does not depend on React/Vue/Ark UI/WebMCP/model SDK', () => {
    const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    for (const name of forbidden) {
      expect(Object.keys(deps)).not.toContain(name);
    }
  });

  it('keeps dependencies minimal (ajv only) with permissive license', () => {
    expect(pkg.dependencies).toEqual({ ajv: '8.17.1' });
  });
});
