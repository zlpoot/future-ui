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
  return fnv1aHex(
    stableStringify({
      library: upstream.library,
      base: upstream.base,
      sourceCommit: upstream.sourceCommit ?? '',
      runtimePackages: [...upstream.runtimePackages]
        .map((p) => ({ name: p.name, version: p.version }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }),
  );
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
