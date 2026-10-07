/**
 * R1-03 (#69) Project AI View data model.
 *
 * Three deliberately distinct concepts, all generated against the SAME
 * authoritative contracts/adapter/profile — never a second hand-maintained
 * schema, and never the M0 schema `buildCatalog()` (which catalogs schema
 * types, not the components actually usable in THIS project):
 *
 *  1. ComponentDefinition — a component the project can actually use, with its
 *     real import, frozen identity, mapping status, limits and examples.
 *  2. UIInstance           — an EXPLICITLY registered instance of a component
 *     on a covered page (id/ref/relations/scope/visible-state allowlist).
 *  3. CapabilityReference  — a business capability that appears ONLY when an
 *     explicit Capability/Binding exists. A rendered button is never a tool.
 */
import type { InstanceIdentityRef } from './identity.js';

/** Mapping/coverage status reused verbatim from the D15 mapping vocabulary. */
export type MappingStatus = 'supported' | 'partial' | 'unsupported';

export type ComponentType =
  | 'future-ui.dialog'
  | 'future-ui.button'
  | 'future-ui.text-input'
  | (string & {});

/** Frozen identity triple for an adapter-provided component. */
export interface AdapterComponentIdentity {
  /** adapter id, e.g. 'shadcn-react'. */
  adapterId: string;
  /** adapter package version actually installed in the project. */
  adapterVersion: string;
  /** contract anchor version the mapping was written against. */
  contractVersion: string;
  /** Project Profile id/version the instance resolves tokens against. */
  profileId: string;
  profileVersion: string;
  /** Upstream library identity (e.g. shadcn commit / base / package versions). */
  upstream: {
    library: string;
    base: string;
    sourceCommit?: string;
    style?: string;
    runtimePackages: ReadonlyArray<{ name: string; version: string }>;
    /**
     * Optional multi-artifact provenance (R1-04 #70 Phase B amendment). When
     * the adapted implementation spans several real documents (an
     * inline-source-set), EACH document's exact content hash is pinned here.
     * The identity fingerprint folds in the locator-sorted artifact set, so a
     * content change to ANY pinned artifact is identity drift. Definitions that
     * omit it keep the legacy single-source fingerprint unchanged (back-compat).
     */
    artifacts?: ReadonlyArray<{ locator: string; contentHash: string }>;
  };
}

/**
 * Where a component's REAL implementation lives and how a consumer reaches it.
 *
 * Discriminated union — the two kinds are mutually exclusive and validated
 * fail-closed (see validateComponentSource):
 *  - 'module-import': a real ES module the consumer imports named exports from;
 *  - 'inline-source': an implementation OWNED by an inline, non-module document
 *    (e.g. an inline <script> inside an HTML page). It has no module specifier
 *    and no exports, so it can NEVER be turned into an `import` statement.
 *
 * R1-04 (#70) pilot-discovered spec gap (amendment to the R1-03/#69 frozen
 * model): MV-Auto-Editor's asset editor is implemented by inline functions in
 * web/canvas.html (no `export`, no <script type=module>), so an import-only
 * model could not describe it honestly without a fake module/exports. This
 * union closes ONLY that gap; it deliberately does not add script-tag, global,
 * CDN or bundler-alias source kinds.
 *
 * R1-04 (#70) Phase B amendment — 'inline-source-set': the same REAL component
 * semantics can be implemented by inline, non-module scripts spread across
 * several real documents (the review controls on canvas/shots/keyframes). Each
 * member is pinned individually; the set as a whole is still never importable.
 * provenance for every member locator is pinned separately via
 * upstream.artifacts so any one page drifting is identity drift.
 */
export interface ModuleImportSource {
  kind: 'module-import';
  /** module specifier a consumer actually imports, e.g. '@future-ui/shadcn-adapter'. */
  module: string;
  /** named export(s) the consumer imports from `module`. */
  exports: string[];
  /** short copy-pasteable usage example; deterministic, no network. */
  example: string;
}

export interface InlinePageSource {
  kind: 'inline-source';
  /** real document that owns the implementation, e.g. 'web/canvas.html'. */
  locator: string;
  /** owning scope inside the document, e.g. the inline <script> on a route. */
  owner: string;
  /**
   * Page-local symbols implementing the component. These are INLINE FUNCTIONS
   * in the owning document, NOT module exports; tooling must never emit
   * `import { symbol } from …` for them.
   */
  symbols: string[];
  /** deterministic reference snippet showing the REAL in-page call site (never an import). */
  example: string;
}

/**
 * One REAL inline, non-module implementation location inside an
 * {@link InlineSourceSet}. Same honesty rules as {@link InlinePageSource}
 * members: page-owned symbols only, never module exports.
 */
export interface InlineSourceEntry {
  /** real owning document locator, e.g. 'web/keyframes.html'. Unique within the set. */
  locator: string;
  /** owning scope inside the document, e.g. the inline <script> on a route. */
  owner: string;
  /** real page-local symbols at this locator (not module exports). */
  symbols: string[];
  /** real in-page call-site example for THIS locator (never an import). */
  example: string;
}

/**
 * A component whose REAL implementation is spread across SEVERAL inline,
 * non-module documents (Phase B multi-source provenance). Like inline-source
 * it can NEVER be turned into an import: module/exports are forbidden, and
 * {@link importableModule} returns null. The `sources` array is non-empty and
 * its locators are unique; every locator must be pinned in upstream.artifacts.
 */
export interface InlineSourceSet {
  kind: 'inline-source-set';
  /** at least one real member; locators must be unique (validator fail-closed). */
  sources: ReadonlyArray<InlineSourceEntry>;
}

export type ComponentSource = ModuleImportSource | InlinePageSource | InlineSourceSet;

/** A contract member the adapter cannot fully satisfy (the reason for partial). */
export interface MappingLimit {
  /** 'features.loading' | 'accessibility.role' | ... */
  member: string;
  status: MappingStatus;
  reason: string;
  impact: string;
}

export interface ComponentDefinition {
  componentType: ComponentType;
  contractVersion: string;
  identity: AdapterComponentIdentity;
  /**
   * Where the real implementation lives and how the consumer reaches it.
   * A non-module inline source is expressed honestly (no fabricated import).
   */
  source: ComponentSource;
  /** Component-level D15 mapping status. */
  mappingStatus: MappingStatus;
  /** Unsupported/partial member limits; empty for a fully supported component. */
  limits: MappingLimit[];
  /** Deterministic, self-contained correct example(s). */
  examples: ReadonlyArray<{ title: string; code: string }>;
}

/**
 * A business capability reference. Created ONLY from an explicit
 * Capability/Binding — the view never infers one from a rendered control.
 */
export interface CapabilityReference {
  /** stable capability id (from the explicit capability contract). */
  capabilityId: string;
  /** instance the capability is explicitly bound to. */
  boundInstanceId: string;
  /** handler/binding source identifier; never a guessed handler. */
  bindingSource: string;
}

/**
 * The project-level view an AI reads: real components + explicit capabilities.
 * Distinct from the M0 schema Catalog.
 */
export interface ProjectAIView {
  /** identity of the project/library set this view describes. */
  project: { name: string; contractMajor: number };
  generatedFrom: {
    /** marker distinguishing this from buildCatalog(); asserted in tests. */
    kind: 'project-ai-view';
    contractCatalogVersion: string;
  };
  definitions: ComponentDefinition[];
  capabilities: CapabilityReference[];
}

/* ------------------------------------------------------------------ */
/* Phase B — explicit instance registry model                          */
/* ------------------------------------------------------------------ */

export type InstanceRelationKind = 'contains' | 'field-of' | 'trigger-of';

export interface InstanceRelation {
  kind: InstanceRelationKind;
  /** target instanceId */
  target: string;
}

/**
 * Explicit allowlist for state projection. Only keys listed here may leave the
 * runtime; draft form values and sensitive inputs are hidden BY DEFAULT.
 */
export interface VisibleStatePolicy {
  /** state keys allowed to be projected for this instance. */
  allow: readonly string[];
  /** keys marked sensitive (never projected even if accidentally allowed). */
  sensitive: readonly string[];
  /**
   * Draft field values are hidden by default; set true only for explicitly
   * safe, non-sensitive projected state.
   */
  exposeDraft?: boolean;
}

/** Metadata a page declares at registration (never proof of rendered truth). */
export interface InstanceMetadata {
  /** human-readable locator, e.g. 'members/EditMemberDialog'. */
  path: string;
  /** dialog-specific declared variant (blocking removes the ordinary close-entry requirement). */
  blocking?: boolean;
  /** free-form declared hints; these are CLAIMS, not rendered evidence. */
  declared?: Record<string, unknown>;
}

export interface InstanceRegistration {
  /** stable, caller-provided instance id. */
  instanceId: string;
  componentType: ComponentType;
  /** page/route/scope this instance belongs to (coverage unit). */
  scopeId: string;
  /**
   * EXACT identity the instance was registered against: adapter id+version,
   * profile id+version and upstream revision fingerprint. Any difference vs
   * the current component definition is identity drift (fail-closed).
   */
  identityRef: InstanceIdentityRef;
  relations?: InstanceRelation[];
  metadata: InstanceMetadata;
  visibleState: VisibleStatePolicy;
  /** explicit capability bindings on THIS instance; empty = no business tool. */
  capabilityBindings?: ReadonlyArray<{ capabilityId: string; bindingSource: string }>;
}

/** Coverage verdict for a queried scope. */
export type ScopeCoverage = 'covered' | 'not-covered';
