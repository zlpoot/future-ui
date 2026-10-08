import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  adapterIdentity,
  arkEntryPoints,
  arkPackage,
} from '../src/index.js';

const requireFromHere = createRequire(import.meta.url);
const arkPkgJsonPath = requireFromHere.resolve('@ark-ui/react/package.json');
const arkRoot = dirname(arkPkgJsonPath);
const installedPkg = requireFromHere('@ark-ui/react/package.json') as {
  version: string;
  license: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

function sha256(file: string): string {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

describe('Ark adapter provenance — pinned artifact identity', () => {
  it('installed @ark-ui/react is exactly the pinned 5.39.3 (version + license + peers)', () => {
    expect(installedPkg.version).toBe(arkPackage.version);
    expect(installedPkg.license).toBe(arkPackage.license);
    expect(installedPkg.peerDependencies?.react).toBe(arkPackage.peerDependencies.react);
    expect(adapterIdentity.libraryIdentity.packageIdentity.version).toBe('5.39.3');
  });

  it('on-disk ESM entry files match the recorded sha256 (artifact swap fails closed)', () => {
    for (const entry of arkEntryPoints) {
      const file = join(arkRoot, entry.resolved.replace(/\//g, '\\'));
      expect(existsSync(file), `${entry.subpath} entry missing`).toBe(true);
      expect(sha256(file)).toBe(entry.sha256);
    }
  });

  it('surface fact holds: dialog + field exist, there is NO button component', () => {
    expect(existsSync(join(arkRoot, 'dist', 'components', 'dialog'))).toBe(true);
    expect(existsSync(join(arkRoot, 'dist', 'components', 'field'))).toBe(true);
    expect(existsSync(join(arkRoot, 'dist', 'components', 'button'))).toBe(false);
    // No headless button engine either.
    expect(Object.keys(installedPkg.dependencies ?? {})).not.toContain('@zag-js/button');
  });

  it('the subpaths this adapter imports resolve from the installed package', () => {
    expect(() => requireFromHere.resolve('@ark-ui/react/dialog')).not.toThrow();
    expect(() => requireFromHere.resolve('@ark-ui/react/field')).not.toThrow();
  });

  it('records the package location for traceability (this repo only, not published)', () => {
    expect(arkPkgJsonPath.replace(/\\/g, '/')).toContain('@ark-ui/react/package.json');
    expect(fileURLToPath(new URL('../src/ark-provenance.ts', import.meta.url))).toContain('ark-provenance.ts');
  });
});
