import type { Diagnostic } from '@future-ui/contracts';

/**
 * Patch primitives with stable node id + expectedVersion (D14 rules 4-5).
 * Stale patches are rejected with `conflict` and never blindly overwrite the
 * target; patch changes are restricted to controlled declarative ranges —
 * arbitrary JS/eval is not accepted as data.
 */

export interface NodeRecord {
  /** stable node id derived from the catalog, e.g. "component:dialog" */
  nodeId: string;
  /** optimistic-concurrency version; must match expectedVersion on write */
  version: number;
  /** controlled declarative value; plain JSON data only */
  value: Record<string, unknown>;
}

export interface PatchRequest {
  nodeId: string;
  expectedVersion: number;
  /** controlled declarative field updates; must be plain JSON data */
  changes: Record<string, unknown>;
}

export interface PatchResult {
  ok: boolean;
  diagnostics: Diagnostic[];
}

function success(): PatchResult {
  return { ok: true, diagnostics: [] };
}

function failure(diagnostics: Diagnostic[]): PatchResult {
  return { ok: false, diagnostics };
}

function nodeNotFound(nodeId: string): Diagnostic {
  return {
    code: 'node_not_found',
    path: `/patch/${nodeId}`,
    expected: 'a registered stable node',
    actual: nodeId,
    explanation: 'patch target node is not registered in the store',
    repairHint: 'register the node or re-read the catalog for a valid stable node id',
  };
}

function staleConflict(nodeId: string, currentVersion: number, expectedVersion: number): Diagnostic {
  return {
    code: 'conflict',
    path: `/patch/${nodeId}/expectedVersion`,
    expected: currentVersion,
    actual: expectedVersion,
    explanation: 'stale patch rejected: expected version does not match current node version; no blind overwrite (D14 rule 4)',
    repairHint: `re-read the node (current version ${currentVersion}) and retry with expectedVersion=${currentVersion}`,
  };
}

function nonPlainChanges(nodeId: string): Diagnostic {
  return {
    code: 'constraint_violation',
    path: `/patch/${nodeId}/changes`,
    expected: 'plain JSON data (no functions, class instances, undefined, symbols or bigints)',
    actual: 'non-plain value',
    explanation: 'patch changes must be declarative data only; arbitrary JS/eval is not accepted as declarative data (D14 rule 5)',
    repairHint: 'express changes as plain JSON-serializable data',
  };
}

/** D14 rule 5: declarative data only — class instances, functions, undefined, symbols and bigints are rejected. */
export function isPlainData(value: unknown): boolean {
  if (value === null) return true;
  switch (typeof value) {
    case 'string':
    case 'number':
    case 'boolean':
      return true;
    case 'object': {
      if (Array.isArray(value)) return value.every((item) => isPlainData(item));
      const proto = Object.getPrototypeOf(value);
      if (proto !== Object.prototype && proto !== null) return false;
      return Object.values(value).every((item) => isPlainData(item));
    }
    default:
      return false;
  }
}

/**
 * Controlled node store for deterministic patch targets. Nodes carry a version
 * used for optimistic-concurrency checks; reads never mutate the store.
 */
export class NodeStore {
  private readonly nodes = new Map<string, NodeRecord>();

  constructor(initial: NodeRecord[] = []) {
    for (const record of initial) {
      this.register(record);
    }
  }

  register(record: NodeRecord): void {
    this.nodes.set(record.nodeId, { nodeId: record.nodeId, version: record.version, value: { ...record.value } });
  }

  has(nodeId: string): boolean {
    return this.nodes.has(nodeId);
  }

  size(): number {
    return this.nodes.size;
  }

  get(nodeId: string): NodeRecord | undefined {
    const record = this.nodes.get(nodeId);
    return record ? { nodeId: record.nodeId, version: record.version, value: { ...record.value } } : undefined;
  }

  list(): NodeRecord[] {
    return [...this.nodes.values()].map((record) => ({
      nodeId: record.nodeId,
      version: record.version,
      value: { ...record.value },
    }));
  }

  /** Apply a single patch; stale or missing targets are rejected with structured diagnostics and no mutation. */
  apply(patch: PatchRequest): PatchResult {
    const record = this.nodes.get(patch.nodeId);
    if (!record) return failure([nodeNotFound(patch.nodeId)]);
    if (record.version !== patch.expectedVersion) {
      return failure([staleConflict(patch.nodeId, record.version, patch.expectedVersion)]);
    }
    if (!isPlainData(patch.changes)) return failure([nonPlainChanges(patch.nodeId)]);
    record.value = { ...record.value, ...patch.changes };
    record.version += 1;
    return success();
  }

  /** Atomic batch apply: every patch is pre-validated; any failure leaves the store unchanged. */
  applyAll(patches: PatchRequest[]): PatchResult {
    const diagnostics: Diagnostic[] = [];
    for (const patch of patches) {
      const record = this.nodes.get(patch.nodeId);
      if (!record) {
        diagnostics.push(nodeNotFound(patch.nodeId));
        continue;
      }
      if (record.version !== patch.expectedVersion) {
        diagnostics.push(staleConflict(patch.nodeId, record.version, patch.expectedVersion));
        continue;
      }
      if (!isPlainData(patch.changes)) {
        diagnostics.push(nonPlainChanges(patch.nodeId));
      }
    }
    if (diagnostics.length > 0) return failure(diagnostics);
    for (const patch of patches) {
      const record = this.nodes.get(patch.nodeId);
      if (record) {
        record.value = { ...record.value, ...patch.changes };
        record.version += 1;
      }
    }
    return success();
  }
}
