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
  };
}

/** A concrete, real import a consumer uses (no generic docs import). */
export interface ActualImport {
  module: string;
  /** named export(s) the consumer imports from `module`. */
  exports: string[];
  /** short copy-pasteable usage example; deterministic, no network. */
  example: string;
}

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
  /** How this project actually imports and uses the component. */
  actualImport: ActualImport;
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
