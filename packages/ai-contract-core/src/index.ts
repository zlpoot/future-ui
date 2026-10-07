/**
 * @future-ui/ai-contract-core — deterministic AI Contract Core (M1-06A1).
 *
 * Machine-readable catalog generated from the authoritative M0-02 schemas,
 * validate/diagnostics directly consuming the M0 error codes, and patch
 * primitives with stable node ids + expectedVersion. Deterministic fixtures
 * only; no model calls (D14).
 */
export { CATALOG_KINDS, buildCatalog, queryCatalog, stableNodeIdFor } from './catalog.js';
export type {
  Catalog,
  CatalogEntry,
  CatalogKind,
  CatalogQuery,
  CatalogQueryResult,
  ConstraintInfo,
} from './catalog.js';
export { validateContract } from './validate.js';
export type { ContractKind } from './validate.js';
export { isPlainData, NodeStore } from './patch.js';
export type { NodeRecord, PatchRequest, PatchResult } from './patch.js';

/* R1-03 (#69) Project AI View, explicit instance registry, bounded validator. */
export * from './project/index.js';
