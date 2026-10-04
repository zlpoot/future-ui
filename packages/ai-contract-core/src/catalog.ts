import { CONTRACT_MAJOR, schemas } from '@future-ui/contracts';
import type { Diagnostic } from '@future-ui/contracts';

/**
 * Machine-readable catalog generated from the authoritative M0-02 contract
 * schemas (D14 rule 1: single source of truth; no parallel hand-maintained
 * source). Entries are a computable view of packages/contracts/schemas, so a
 * change to a schema is reflected in the catalog without manual duplication.
 */

export const CATALOG_KINDS = ['component', 'capability', 'binding', 'plugin', 'diagnostics', 'version'] as const;

export type CatalogKind = (typeof CATALOG_KINDS)[number];

export interface ConstraintInfo {
  kind: 'type' | 'enum' | 'pattern' | 'minLength' | 'ref';
  value: unknown;
}

export interface CatalogEntry {
  kind: CatalogKind;
  /** authoritative schema id (https://future-ui.dev/contracts/<name>.schema.json) */
  $id: string;
  title: string;
  description: string;
  /** required top-level fields, copied from the authoritative schema */
  requiredFields: string[];
  /** property name -> constraints derived from the authoritative schema */
  constraints: Record<string, ConstraintInfo[]>;
  /** component entries carry stable partId maps authored in instances; schema constrains the map shape */
  hasParts: boolean;
  /** property name -> description metadata from the authoritative schema */
  metadata: Record<string, string>;
}

export interface Catalog {
  /** contract major that this catalog can query (matches contracts CONTRACT_MAJOR) */
  contractMajor: number;
  entries: CatalogEntry[];
}

function extractConstraints(prop: Record<string, unknown>): ConstraintInfo[] {
  const out: ConstraintInfo[] = [];
  const type = prop['type'];
  if (type !== undefined) out.push({ kind: 'type', value: type });
  const enumValue = prop['enum'];
  if (enumValue !== undefined) out.push({ kind: 'enum', value: enumValue });
  const pattern = prop['pattern'];
  if (pattern !== undefined) out.push({ kind: 'pattern', value: pattern });
  const minLength = prop['minLength'];
  if (minLength !== undefined) out.push({ kind: 'minLength', value: minLength });
  const ref = prop['$ref'];
  if (ref !== undefined) out.push({ kind: 'ref', value: ref });
  return out;
}

function buildEntry(kind: CatalogKind, schema: Record<string, unknown>): CatalogEntry {
  const properties = (schema['properties'] ?? {}) as Record<string, Record<string, unknown>>;
  const constraints: Record<string, ConstraintInfo[]> = {};
  const metadata: Record<string, string> = {};
  for (const [name, prop] of Object.entries(properties)) {
    const extracted = extractConstraints(prop);
    if (extracted.length > 0) constraints[name] = extracted;
    const description = prop['description'];
    if (typeof description === 'string') metadata[name] = description;
  }
  return {
    kind,
    $id: String(schema['$id'] ?? ''),
    title: String(schema['title'] ?? ''),
    description: String(schema['description'] ?? ''),
    requiredFields: Array.isArray(schema['required']) ? (schema['required'] as string[]) : [],
    constraints,
    hasParts: kind === 'component',
    metadata,
  };
}

/** Build the machine catalog from the authoritative schemas (D14 rule 1). */
export function buildCatalog(): Catalog {
  const entries = CATALOG_KINDS.map((kind) => buildEntry(kind, schemas[kind]));
  return { contractMajor: CONTRACT_MAJOR, entries };
}

export interface CatalogQuery {
  kind?: CatalogKind;
  /** contract version to query against; major must equal catalog.contractMajor */
  contractVersion?: string;
}

export interface CatalogQueryResult {
  entries: CatalogEntry[];
  diagnostics: Diagnostic[];
}

function majorOf(version: unknown): number | undefined {
  if (typeof version !== 'string') return undefined;
  const match = /^(\d+)/.exec(version);
  return match ? Number(match[1]) : undefined;
}

/**
 * Query the catalog by kind and/or contract version (D14 rule 2). Failures are
 * reported with the frozen M0 error codes and diagnostic structure; the query
 * never silently degrades to an empty result.
 */
export function queryCatalog(catalog: Catalog, query: CatalogQuery = {}): CatalogQueryResult {
  const diagnostics: Diagnostic[] = [];
  const version = query.contractVersion;
  if (version !== undefined) {
    const major = majorOf(version);
    if (major === undefined) {
      diagnostics.push({
        code: 'constraint_violation',
        path: '/query/contractVersion',
        expected: 'semver string, e.g. "1.0.0"',
        actual: version,
        explanation: 'contractVersion must be a valid semver string',
        repairHint: 'provide contractVersion as a semver string',
      });
    } else if (major !== catalog.contractMajor) {
      diagnostics.push({
        code: 'unknown_major_version',
        path: '/query/contractVersion',
        expected: `${catalog.contractMajor}.x.x`,
        actual: version,
        explanation: 'unknown major version: catalog queries reject unknown majors instead of guessing or downgrading (D02/D14)',
        repairHint: `query with contract version ${catalog.contractMajor}.x.x or register a new major explicitly`,
      });
    }
  }
  let entries = catalog.entries;
  if (query.kind !== undefined) {
    entries = entries.filter((entry) => entry.kind === query.kind);
    if (entries.length === 0) {
      diagnostics.push({
        code: 'node_not_found',
        path: `/catalog/${query.kind}`,
        expected: 'a registered catalog kind',
        actual: query.kind,
        explanation: 'catalog has no entry for the requested kind',
        repairHint: 'query one of the registered catalog kinds',
      });
    }
  }
  return { entries, diagnostics };
}

/** Stable node id for patch targets, derived from the authoritative catalog (D14 rule 4). */
export function stableNodeIdFor(kind: CatalogKind, name: string): string {
  return `${kind}:${name}`;
}
