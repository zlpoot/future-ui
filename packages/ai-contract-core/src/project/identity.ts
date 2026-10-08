/**
 * R1-03 (#69) exact component identity.
 *
 * An instance must pin the COMPLETE identity of the component definition it
 * was registered against — not just the adapter/profile ids, but their exact
 * versions and the upstream library revision (commit + exact runtime package
 * versions). Upstream identity is folded into one stable fingerprint so an
 * upstream re-vendoring or a runtime-package bump is detected as drift.
 */
import type { AdapterComponentIdentity } from './types.js';

/** Exact, comparable identity reference carried by an InstanceRegistration. */
export interface InstanceIdentityRef {
  adapterId: string;
  adapterVersion: string;
  profileId: string;
  profileVersion: string;
  /** Stable fingerprint of the upstream library/base/commit/runtime packages. */
  upstreamFingerprint: string;
}

function fnv1aHex(input: string): string {
  // 32-bit FNV-1a — deterministic, dependency-free identity fingerprint.
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    // hash * 16777619 mod 2^32 (Math.imul gives the signed 32-bit product)
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/** Canonical, key-order-independent serialization of plain identity data. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}

/** Upstream revision fingerprint: library/base/source commit/runtime packages. */
export function upstreamIdentityFingerprint(upstream: AdapterComponentIdentity['upstream']): string {
  // Phase B: fold in the optional multi-artifact provenance. Each artifact is
  // pinned as { locator, contentHash } and sorted by locator so array order can
  // never hide a change. The key is added ONLY when artifacts exist: a legacy
  // definition (Phase A / shadcn, no artifacts) serializes exactly the same
  // object as before, so its fingerprint stays byte-identical.
  const artifacts = (upstream.artifacts ?? [])
    .map((a) => ({ locator: a.locator, contentHash: a.contentHash }))
    .sort((a, b) => a.locator.localeCompare(b.locator));
  const payload: Record<string, unknown> = {
    library: upstream.library,
    base: upstream.base,
    sourceCommit: upstream.sourceCommit ?? '',
    runtimePackages: [...upstream.runtimePackages]
      .map((p) => ({ name: p.name, version: p.version }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
  if (artifacts.length > 0) payload['artifacts'] = artifacts;
  return fnv1aHex(stableStringify(payload));
}

/** Build the exact identity ref an instance must match for a definition. */
export function identityRefFor(identity: AdapterComponentIdentity): InstanceIdentityRef {
  return {
    adapterId: identity.adapterId,
    adapterVersion: identity.adapterVersion,
    profileId: identity.profileId,
    profileVersion: identity.profileVersion,
    upstreamFingerprint: upstreamIdentityFingerprint(identity.upstream),
  };
}
