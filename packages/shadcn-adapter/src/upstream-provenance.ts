/**
 * Frozen upstream provenance for the shadcn/React Library Adapter (D15).
 *
 * Immutable-source-first identity (accepted R1-01 §「上游标识」):
 *  - source identity is pinned by upstream repository commit AND per-file
 *    content digests; the CLI version is recorded separately as
 *    `toolingProvenance` and never acts as source identity.
 *  - digest algorithm AND coverage scope are recorded together with the value.
 *
 * Every literal here is verified by `tests/provenance.test.ts`, which
 * re-hashes the vendored files and re-computes the git blob SHA-1.
 */

export const CONTRACT_VERSION = '1.0.0' as const;

export interface UpstreamFileIdentity {
  /** registry item name */
  name: 'dialog' | 'button' | 'input';
  /** live registry URL fetched during Phase A */
  registryUrl: string;
  /** file path inside the upstream repository at the pinned commit */
  sourcePath: string;
  /** vendored path inside this package (byte-identical to registry content) */
  vendoredPath: string;
  /** git blob SHA-1 reported by GitHub contents API at the pinned commit */
  gitBlobSha1: string;
  sizeBytes: number;
  /** content digest, hex */
  sha256: string;
  /**
   * Local modification record (D15 上游标识 rule 4). `null` means the
   * vendored file is byte-identical to the delivered upstream content.
   */
  localPatch: null;
}

export const upstreamCommit = {
  repository: 'https://github.com/shadcn-ui/ui',
  commit: '7ff7dbf8669fa3392c294ee745dc8d8c3cee842c',
  committedAt: '2026-10-06T06:51:57Z',
  repositoryPathPrefix: 'apps/v4/registry/new-york-v4/ui',
} as const;

export const registrySource = {
  baseUrl: 'https://ui.shadcn.com/r',
  style: 'new-york-v4',
  urlPrefix: 'https://ui.shadcn.com/r/styles/new-york-v4',
  fetchedAt: '2026-10-06',
} as const;

export const digestSpec = {
  algorithm: 'sha256',
  encoding: 'utf8',
  /**
   * Coverage scope: the single delivered component source file per item
   * (the registry item `files[].content`). Direct npm dependencies are
   * excluded from this digest — their identity is pinned separately by
   * exact versions in package.json and integrity in pnpm-lock.yaml.
   */
  coverage: 'per-file:registry item files[].content (UTF-8 bytes); direct npm dependencies excluded (pinned via package.json + pnpm-lock.yaml)',
} as const;

export const upstreamFiles: readonly UpstreamFileIdentity[] = [
  {
    name: 'dialog',
    registryUrl: `${registrySource.urlPrefix}/dialog.json`,
    sourcePath: `${upstreamCommit.repositoryPathPrefix}/dialog.tsx`,
    vendoredPath: 'src/upstream/registry/new-york-v4/ui/dialog.tsx',
    gitBlobSha1: 'ccadf4a85bf6398d52314b112600f796fc97db97',
    sizeBytes: 4304,
    sha256: '2ade6074e5fad0a4eb171ead44c43d3301a3c83d186d7236fb1fdbea80ee556b',
    localPatch: null,
  },
  {
    name: 'button',
    registryUrl: `${registrySource.urlPrefix}/button.json`,
    sourcePath: `${upstreamCommit.repositoryPathPrefix}/button.tsx`,
    vendoredPath: 'src/upstream/registry/new-york-v4/ui/button.tsx',
    gitBlobSha1: 'e3345d985d14c33e3cb9d8c45cf973807326c944',
    sizeBytes: 2382,
    sha256: '79dd6f75f8136394442202d6b8b922fb269eaad0a5dba579397c9d5b41f893bb',
    localPatch: null,
  },
  {
    name: 'input',
    registryUrl: `${registrySource.urlPrefix}/input.json`,
    sourcePath: `${upstreamCommit.repositoryPathPrefix}/input.tsx`,
    vendoredPath: 'src/upstream/registry/new-york-v4/ui/input.tsx',
    gitBlobSha1: 'ddb9b315e34245addded54b1848bb32c80c418cc',
    sizeBytes: 952,
    sha256: '0c9457181f6ddc80969bcf854e92c362903a55b6e889fbef3fd85343ecc4af5b',
    localPatch: null,
  },
];

/**
 * Runtime layer: the base chosen for the first adapter (confirmed by owner
 * on 2026-10-06). new-york-v4 is built on the Radix primitive umbrella
 * package. Base UI exists as an explicit `-b base` channel (base-nova) and
 * is deliberately NOT used by this adapter; the two channels must not be
 * mixed (see docs/references/r1-02-shadcn-provenance.md).
 */
export const baseIdentity = {
  base: 'radix',
  package: 'radix-ui',
  version: '1.7.0',
  license: 'MIT',
  npmIntegrity:
    'sha512-x+z5TV2v6u0QpAQ4dQfNMcvtIdSQ1Op2oqBEyfDXjNldRZbMTP+hcjr5Iie31bep81Axeioa+70Ww7pZDzTEQQ==',
  docs: 'https://www.radix-ui.com/primitives/docs/components/dialog',
  note: 'radix-ui@1.7.0 is the unified Radix umbrella package (dialog wraps @radix-ui/react-dialog).',
} as const;

export const runtimeDependencies = [
  { name: 'radix-ui', version: '1.7.0', license: 'MIT', role: 'base primitives (Dialog, Slot)' },
  { name: 'cn', version: '0.4.0', license: 'MIT', role: 'className merge utility used verbatim by upstream sources' },
  { name: 'class-variance-authority', version: '0.7.1', license: 'Apache-2.0', role: 'buttonVariants() variant/size definitions' },
  { name: 'lucide-react', version: '1.52.0', license: 'ISC', role: 'XIcon in DialogContent close affordance' },
] as const;

export const styleLayer = {
  engine: 'tailwindcss',
  version: 'v4 (utility classes; token real values are resolved from rem/px by the Project Profile)',
  note: 'Classes are no-ops without a Tailwind build; deterministic jsdom tests assert structure/behavior, not pixels.',
} as const;

/**
 * Tooling provenance ONLY (D15 上游标识 rule 2): never a component source
 * identity key. Empirical default-channel evidence captured in Phase A:
 * `shadcn@4.21.2 view dialog` with no components.json resolves to
 * styles/new-york-v4/dialog.json (Radix).
 */
export const toolingProvenance = {
  cli: {
    name: 'shadcn',
    version: '4.21.2',
    license: 'MIT',
    npmIntegrity:
      'sha512-hVjBCjAqA1frsNoWC1731LHYn+gitC48EuDK8K48pUMjD0RnxoIwx7u4D7akdMNhyUkYjdVm3962vS2pgChAOQ==',
  },
  registrySdk: {
    name: '@shadcn/registry',
    version: '0.1.1',
    npmIntegrity:
      'sha512-2StvkWtNuzWfAArbUL182FqFg1KYX7d/Pa0h+bdUgBOdIGXp2+6JMPi+zvJ4FgoGFxubcxwbKFmfIVeY44dpEw==',
  },
  defaultChannelEvidence:
    'shadcn@4.21.2 "view dialog" with no components.json resolved to styles/new-york-v4/dialog.json (dependencies cn + radix-ui), observed 2026-10-06.',
} as const;

export interface AdapterIdentity {
  adapterId: 'shadcn-react';
  targetLibrary: 'shadcn/ui';
  contractVersion: typeof CONTRACT_VERSION;
  libraryIdentity: {
    base: typeof baseIdentity;
    registry: typeof registrySource;
    source: typeof upstreamCommit;
    digest: typeof digestSpec;
    files: typeof upstreamFiles;
    runtimeDependencies: typeof runtimeDependencies;
    styleLayer: typeof styleLayer;
    reactPeerRange: '^19.2.0';
  };
  toolingProvenance: typeof toolingProvenance;
}

export const adapterIdentity: AdapterIdentity = {
  adapterId: 'shadcn-react',
  targetLibrary: 'shadcn/ui',
  contractVersion: CONTRACT_VERSION,
  libraryIdentity: {
    base: baseIdentity,
    registry: registrySource,
    source: upstreamCommit,
    digest: digestSpec,
    files: upstreamFiles,
    runtimeDependencies,
    styleLayer,
    reactPeerRange: '^19.2.0',
  },
  toolingProvenance,
};
