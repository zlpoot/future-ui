import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { adapterIdentity, digestSpec, upstreamFiles } from '../src/index.js';

const here = fileURLToPath(new URL('.', import.meta.url));
const pkgRoot = `${here}../`;

function sha256Hex(content: string): string {
  return createHash(digestSpec.algorithm).update(content, digestSpec.encoding as BufferEncoding).digest('hex');
}

/** Recompute the git blob SHA-1: sha1("blob " + size + "\0" + bytes). */
function gitBlobSha1(content: string): string {
  const bytes = Buffer.from(content, 'utf8');
  const header = Buffer.from(`blob ${bytes.length}\0`, 'utf8');
  return createHash('sha1').update(Buffer.concat([header, bytes])).digest('hex');
}

describe('D15 upstream provenance freeze', () => {
  it('covers dialog, button and input', () => {
    expect(upstreamFiles.map((f) => f.name)).toEqual(['dialog', 'button', 'input']);
  });

  it('each vendored file matches frozen sha256 AND git blob SHA-1 and is unpatched', () => {
    for (const file of upstreamFiles) {
      const content = readFileSync(`${pkgRoot}${file.vendoredPath}`, 'utf8');

      expect(Buffer.byteLength(content, 'utf8')).toBe(file.sizeBytes);
      expect(sha256Hex(content)).toBe(file.sha256);
      expect(gitBlobSha1(content)).toBe(file.gitBlobSha1);
      expect(file.localPatch).toBeNull();
    }
  });

  it('records the digest algorithm together with its coverage scope', () => {
    expect(digestSpec.algorithm).toBe('sha256');
    expect(digestSpec.coverage).toContain('per-file');
    expect(digestSpec.coverage).toContain('direct npm dependencies excluded');
  });

  it('pins source by immutable commit, not by CLI version', () => {
    const { libraryIdentity, toolingProvenance } = adapterIdentity;
    expect(libraryIdentity.source.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(libraryIdentity.source.repositoryPathPrefix).toContain('new-york-v4');
    // CLI lives under toolingProvenance only.
    expect(toolingProvenance.cli.name).toBe('shadcn');
    expect(libraryIdentity).not.toHaveProperty('cliVersion');
  });

  it('declares the chosen runtime base and pins direct dependencies to exact versions', () => {
    expect(adapterIdentity.libraryIdentity.base.base).toBe('radix');
    expect(adapterIdentity.libraryIdentity.base.package).toBe('radix-ui');
    const pinned = Object.fromEntries(
      adapterIdentity.libraryIdentity.runtimeDependencies.map((d) => [d.name, d.version]),
    );
    expect(pinned).toMatchObject({
      'radix-ui': '1.7.0',
      cn: '0.4.0',
      'class-variance-authority': '0.7.1',
      'lucide-react': '1.52.0',
    });
    for (const dep of adapterIdentity.libraryIdentity.runtimeDependencies) {
      expect(dep.license.length).toBeGreaterThan(0);
    }
  });
});
