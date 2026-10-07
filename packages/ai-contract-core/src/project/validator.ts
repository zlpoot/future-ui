/**
 * Phase C (#69) — bounded consistency validator.
 *
 * Concludes only against LAYERED evidence and never turns a declaration into a
 * pass about the rendered/interacting page:
 *
 *   declared  <  rendered  <  interaction-verified
 *
 * Rules are a FROZEN finite set with fixed ruleIds. Each rule declares the
 * minimum tier it needs. Missing higher-tier evidence yields `not-covered`,
 * never a false pass and never an arbitrary failure. Uncovered pages/instances
 * are reported as not-covered. There is no JSX/DOM/source scanning anywhere.
 */
import type { ProjectDiagnostic } from './errors.js';
import { capabilitiesForInstance } from './project-view.js';
import { identityRefFor } from './identity.js';
import type { InstanceRegistry } from './instance-registry.js';
import type { InstanceRegistration, ProjectAIView } from './types.js';

export type EvidenceTier = 'declared' | 'rendered' | 'interaction-verified';

/** Structure facts actually observed in a jsdom render for one instance. */
export interface RenderedEvidence {
  /** observed ARIA role of the root. */
  role?: string;
  ariaModal?: boolean;
  /** locatable paths of EXPLICIT ORDINARY close controls (X / cancel). */
  closeAffordances: string[];
  /**
   * For the blocking variant: locatable paths of the LIMITED resolution
   * controls actually rendered (save / discard). A declared-blocking dialog
   * passes R1-DLG-02 at rendered tier ONLY if ordinary entries are absent and
   * at least one resolution path is observed (no unclosable dialog).
   */
  resolutionAffordances?: string[];
  /** observed root locator, used in R1-DLG-02 diagnostics. */
  rootPath: string;
}

/** Interaction facts actually driven and observed for one instance. */
export interface InteractionEvidence {
  /** a second submit while save is pending was suppressed. */
  pendingDuplicateSubmitBlocked: boolean;
  /** "stop waiting and close" did not emit a second close callback. */
  stopWaitNoSecondClose: boolean;
}

/** Raw evidence shape accepted from the controlled driver (never from MCP callers). */
export interface EvidenceSet {
  rendered?: Record<string, RenderedEvidence>;
  interaction?: Record<string, InteractionEvidence>;
}

const TRUSTED_BRAND: unique symbol = Symbol.for('@future-ui/r1-project/trusted-evidence');

/**
 * Trusted, host-owned evidence. Rendered/interaction facts can elevate a
 * finding's tier ONLY when wrapped by this class via sealEvidence(); a plain
 * JSON object coming through an untrusted channel (e.g. the dev MCP) carries
 * no brand and therefore can never claim rendered/interaction verification.
 */
export class TrustedEvidence {
  readonly [TRUSTED_BRAND] = true as const;
  readonly rendered: Readonly<Record<string, RenderedEvidence>>;
  readonly interaction: Readonly<Record<string, InteractionEvidence>>;

  private constructor(rendered: Record<string, RenderedEvidence>, interaction: Record<string, InteractionEvidence>) {
    this.rendered = rendered;
    this.interaction = interaction;
    Object.freeze(this);
  }

  static is(value: unknown): value is TrustedEvidence {
    return typeof value === 'object' && value !== null && (value as Record<symbol, unknown>)[TRUSTED_BRAND] === true;
  }

  /** Validate raw driver output and seal it; throws only on programmer misuse. */
  static seal(input: EvidenceSet): TrustedEvidence {
    const diagnostics = validateEvidenceShape(input);
    if (diagnostics.length > 0) {
      throw new Error(`refusing to seal malformed evidence: ${diagnostics.map((d) => `${d.code}@${d.path}`).join('; ')}`);
    }
    return new TrustedEvidence(
      deepFreezeRecord(input.rendered ?? {}),
      deepFreezeRecord(input.interaction ?? {}),
    );
  }
}

function deepFreezeRecord<T>(value: T): T {
  if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
    if (!Object.isFrozen(value)) {
      for (const v of Object.values(value as Record<string, unknown>)) deepFreezeRecord(v);
      Object.freeze(value);
    }
  }
  return value;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Runtime shape validation: malformed evidence is rejected, never consumed. */
export function validateEvidenceShape(input: unknown): ProjectDiagnostic[] {
  const out: ProjectDiagnostic[] = [];
  if (!isRecord(input)) {
    out.push({ code: 'r1_project_evidence_invalid', path: '/evidence', explanation: 'evidence must be an object { rendered?, interaction? }', actual: typeof input });
    return out;
  }
  if (input['rendered'] !== undefined) {
    if (!isRecord(input['rendered'])) {
      out.push({ code: 'r1_project_evidence_invalid', path: '/evidence/rendered', explanation: 'rendered must be a record keyed by instanceId' });
    } else {
      for (const [id, ev] of Object.entries(input['rendered'] as Record<string, unknown>)) {
        if (!isRecord(ev) || !Array.isArray((ev as { closeAffordances?: unknown }).closeAffordances) ||
            !((ev as { closeAffordances: unknown[] }).closeAffordances).every((p) => typeof p === 'string')) {
          out.push({ code: 'r1_project_evidence_invalid', path: `/evidence/rendered/${id}`,
            explanation: 'rendered evidence needs string[] closeAffordances (+ rootPath)' });
        }
      }
    }
  }
  if (input['interaction'] !== undefined) {
    if (!isRecord(input['interaction'])) {
      out.push({ code: 'r1_project_evidence_invalid', path: '/evidence/interaction', explanation: 'interaction must be a record keyed by instanceId' });
    } else {
      for (const [id, ev] of Object.entries(input['interaction'] as Record<string, unknown>)) {
        const e = isRecord(ev) ? ev : undefined;
        if (e === undefined || typeof e['pendingDuplicateSubmitBlocked'] !== 'boolean' ||
            typeof e['stopWaitNoSecondClose'] !== 'boolean') {
          out.push({ code: 'r1_project_evidence_invalid', path: `/evidence/interaction/${id}`,
            explanation: 'interaction evidence needs boolean pendingDuplicateSubmitBlocked and stopWaitNoSecondClose' });
        }
      }
    }
  }
  return out;
}

export type FindingStatus = 'pass' | 'fail' | 'not-covered';

export interface Finding {
  ruleId: string;
  instanceId: string;
  path?: string;
  status: FindingStatus;
  tier: EvidenceTier;
  reason?: string;
  repairHint?: string;
  actual?: unknown;
  expected?: unknown;
}

/** The frozen bounded rule catalog. Adding a rule happens here, nowhere else. */
export const BOUNDED_RULES = [
  { ruleId: 'R1-PRJ-IDENTITY', minTier: 'declared' as EvidenceTier, appliesTo: 'all' },
  { ruleId: 'R1-PRJ-CAPABILITY', minTier: 'declared' as EvidenceTier, appliesTo: 'all' },
  { ruleId: 'R1-PRJ-DRAFT-HIDDEN', minTier: 'declared' as EvidenceTier, appliesTo: 'all' },
  { ruleId: 'R1-DLG-02', minTier: 'rendered' as EvidenceTier, appliesTo: 'future-ui.dialog' },
  { ruleId: 'R1-DLG-04', minTier: 'interaction-verified' as EvidenceTier, appliesTo: 'future-ui.dialog' },
  { ruleId: 'R1-DLG-05', minTier: 'interaction-verified' as EvidenceTier, appliesTo: 'future-ui.dialog' },
];

const RULE_IDS = new Set(BOUNDED_RULES.map((r) => r.ruleId));

export function isKnownRule(ruleId: string): boolean {
  return RULE_IDS.has(ruleId);
}

function availableTier(instanceId: string, evidence: TrustedEvidence | undefined, required: EvidenceTier): EvidenceTier {
  const hasInteraction = evidence?.interaction[instanceId] !== undefined;
  const hasRendered = evidence?.rendered[instanceId] !== undefined;
  if (required === 'interaction-verified') {
    return hasInteraction ? 'interaction-verified' : hasRendered ? 'rendered' : 'declared';
  }
  if (required === 'rendered') {
    return hasRendered ? 'rendered' : 'declared';
  }
  return 'declared';
}

function finding(
  ruleId: string,
  instanceId: string,
  status: FindingStatus,
  tier: EvidenceTier,
  rest: Partial<Finding> = {},
): Finding {
  return { ruleId, instanceId, status, tier, ...rest };
}

/* ------------------------------- rules ------------------------------- */

function checkIdentity(inst: InstanceRegistration, view: ProjectAIView): Finding {
  const def = view.definitions.find((d) => d.componentType === inst.componentType);
  if (def === undefined) {
    return finding('R1-PRJ-IDENTITY', inst.instanceId, 'fail', 'declared', {
      path: inst.metadata.path,
      reason: 'no component definition for registered componentType',
      actual: inst.componentType,
      repairHint: 'register an instance of a component present in the Project AI View',
    });
  }
  const expected = identityRefFor(def.identity);
  const actual = inst.identityRef;
  const driftKeys: string[] = [];
  (Object.keys(expected) as Array<keyof typeof expected>).forEach((key) => {
    if (actual?.[key] !== expected[key]) driftKeys.push(key);
  });
  if (driftKeys.length > 0) {
    return finding('R1-PRJ-IDENTITY', inst.instanceId, 'fail', 'declared', {
      path: inst.metadata.path,
      reason: `instance identity drift vs the current definition on: ${driftKeys.join(', ')} (adapter/profile version or upstream revision mismatch)`,
      actual: Object.fromEntries(driftKeys.map((k) => [k, actual?.[k as keyof typeof actual]])),
      expected: Object.fromEntries(driftKeys.map((k) => [k, expected[k as keyof typeof expected]])),
      repairHint: 'rebuild/re-register the instance against the current adapter id+version, profile id+version and upstream fingerprint',
    });
  }
  return finding('R1-PRJ-IDENTITY', inst.instanceId, 'pass', 'declared', { path: inst.metadata.path });
}

function checkCapability(inst: InstanceRegistration, view: ProjectAIView): Finding {
  const bound = capabilitiesForInstance(view, inst.instanceId);
  const declared = inst.capabilityBindings ?? [];

  // A registry-declared binding with no explicit view capability is unbound.
  const viewIds = new Set(bound.map((c) => c.capabilityId));
  for (const b of declared) {
    if (!viewIds.has(b.capabilityId)) {
      return finding('R1-PRJ-CAPABILITY', inst.instanceId, 'fail', 'declared', {
        path: inst.metadata.path,
        reason: 'instance declares a capability binding with no explicit Capability in the view',
        actual: b.capabilityId,
        expected: 'an explicit CapabilityReference bound to this instance',
        repairHint: 'add an explicit Capability/Binding or remove the declaration',
      });
    }
  }
  return finding('R1-PRJ-CAPABILITY', inst.instanceId, 'pass', 'declared', {
    path: inst.metadata.path,
    reason: bound.length === 0 ? 'no explicit capability → zero business tools generated' : undefined,
    actual: { generatedBusinessTools: bound.map((c) => c.capabilityId) },
  });
}

function checkDraftHidden(inst: InstanceRegistration): Finding {
  const exposesDraft = inst.visibleState.exposeDraft === true;
  const conflictingSensitive = inst.visibleState.allow.filter((k) => inst.visibleState.sensitive.includes(k));
  if (conflictingSensitive.length > 0) {
    return finding('R1-PRJ-DRAFT-HIDDEN', inst.instanceId, 'fail', 'declared', {
      path: inst.metadata.path,
      reason: 'sensitive keys are also on the visible-state allowlist',
      actual: conflictingSensitive,
      expected: 'sensitive keys never allowlisted',
      repairHint: 'remove sensitive keys from the allowlist',
    });
  }
  if (exposesDraft) {
    return finding('R1-PRJ-DRAFT-HIDDEN', inst.instanceId, 'fail', 'declared', {
      path: inst.metadata.path,
      reason: 'draft form state is configured to be projected; drafts/sensitive inputs must be hidden by default',
      actual: { exposeDraft: true },
      expected: { exposeDraft: false },
      repairHint: 'set visibleState.exposeDraft=false and project only explicit safe fields',
    });
  }
  return finding('R1-PRJ-DRAFT-HIDDEN', inst.instanceId, 'pass', 'declared', {
    path: inst.metadata.path,
    reason: 'draft/sensitive state is withheld by the explicit allowlist',
  });
}

function isDialog(inst: InstanceRegistration): boolean {
  return inst.componentType === 'future-ui.dialog';
}

function declaresPending(inst: InstanceRegistration): boolean {
  return inst.metadata.declared?.['pending'] === true;
}

function checkCloseEntry(inst: InstanceRegistration, evidence: TrustedEvidence | undefined): Finding {
  const blocking = inst.metadata.blocking === true;
  const tier = availableTier(inst.instanceId, evidence, 'rendered');
  const rendered = evidence?.rendered[inst.instanceId];

  // R1-DLG-02 is a RENDERED-tier rule. A declared blocking exemption cannot
  // produce a pass from metadata alone: with no rendered evidence the rule is
  // not-covered regardless of the blocking declaration.
  if (tier !== 'rendered' || rendered === undefined) {
    return finding('R1-DLG-02', inst.instanceId, 'not-covered', tier, {
      path: inst.metadata.path,
      reason: blocking
        ? 'blocking exemption is only declared; rendered evidence must still show ordinary entries removed AND a limited resolution path present'
        : 'no rendered evidence for the close entry; a declaration cannot prove the control is present',
      repairHint: 'render the instance in jsdom and supply close/resolution affordance evidence',
    });
  }

  if (blocking) {
    // Rendered proof for the blocking variant: no ordinary entry, but at least
    // one limited resolution control is actually reachable (never unclosable).
    const hasOrdinary = rendered.closeAffordances.length > 0;
    const resolution = rendered.resolutionAffordances ?? [];
    if (hasOrdinary) {
      return finding('R1-DLG-02', inst.instanceId, 'fail', 'rendered', {
        path: rendered.rootPath,
        reason: 'declared-blocking dialog still renders an ordinary close entry (X / cancel)',
        actual: { closeAffordances: rendered.closeAffordances },
        expected: { closeAffordances: [] },
        repairHint: 'remove ordinary close entries or drop the blocking declaration',
      });
    }
    if (resolution.length === 0) {
      return finding('R1-DLG-02', inst.instanceId, 'fail', 'rendered', {
        path: rendered.rootPath,
        reason: 'blocking dialog renders neither an ordinary close entry nor any limited resolution path (unclosable)',
        actual: { closeAffordances: [], resolutionAffordances: [] },
        expected: { resolutionAffordances: 'at least one resolution control (save / discard)' },
        repairHint: 'render an explicit resolution control for the blocking variant',
      });
    }
    return finding('R1-DLG-02', inst.instanceId, 'pass', 'rendered', {
      path: rendered.rootPath,
      reason: 'blocking variant verified rendered: ordinary entries removed, limited resolution path present',
      actual: { closeAffordances: [], resolutionAffordances: resolution },
    });
  }

  if (rendered.closeAffordances.length === 0) {
    return finding('R1-DLG-02', inst.instanceId, 'fail', 'rendered', {
      path: rendered.rootPath || inst.metadata.path,
      reason: 'dialog provides no explicit close entry (X / cancel / ESC)',
      actual: { closeAffordances: [] },
      expected: { closeAffordances: 'at least one reachable close control' },
      repairHint: 'render an explicit close control or declare the dialog blocking and provide a resolution path',
    });
  }
  return finding('R1-DLG-02', inst.instanceId, 'pass', 'rendered', {
    path: rendered.rootPath,
    actual: { closeAffordances: rendered.closeAffordances },
  });
}

function checkPendingRules(
  ruleId: 'R1-DLG-04' | 'R1-DLG-05',
  inst: InstanceRegistration,
  evidence: TrustedEvidence | undefined,
): Finding {
  // Only instances that declare pending/save behavior are in scope.
  if (!declaresPending(inst)) {
    return finding(ruleId, inst.instanceId, 'not-covered', 'declared', {
      path: inst.metadata.path,
      reason: 'instance does not declare a pending save path; rule not applicable to this instance',
    });
  }
  const tier = availableTier(inst.instanceId, evidence, 'interaction-verified');
  const ix = evidence?.interaction[inst.instanceId];
  if (tier !== 'interaction-verified' || ix === undefined) {
    return finding(ruleId, inst.instanceId, 'not-covered', tier, {
      path: inst.metadata.path,
      reason: 'pending behavior needs TRUSTED interaction-verified evidence from the controlled driver; rendered/declared evidence cannot prove it',
      repairHint: 'drive the pending flow in jsdom (duplicate submit / stop-wait) via the controlled driver and seal the evidence',
    });
  }
  if (ruleId === 'R1-DLG-04') {
    return ix.pendingDuplicateSubmitBlocked
      ? finding(ruleId, inst.instanceId, 'pass', 'interaction-verified', { path: inst.metadata.path })
      : finding(ruleId, inst.instanceId, 'fail', 'interaction-verified', {
          path: inst.metadata.path,
          reason: 'a second submit was accepted while the save was pending',
          actual: { pendingDuplicateSubmitBlocked: false },
          expected: { pendingDuplicateSubmitBlocked: true },
          repairHint: 'disable/guard the submit control for the life of the in-flight save',
        });
  }
  return ix.stopWaitNoSecondClose
    ? finding(ruleId, inst.instanceId, 'pass', 'interaction-verified', { path: inst.metadata.path })
    : finding(ruleId, inst.instanceId, 'fail', 'interaction-verified', {
        path: inst.metadata.path,
        reason: 'stop-wait + close emitted a second close callback after the operation settled',
        actual: { stopWaitNoSecondClose: false },
        expected: { stopWaitNoSecondClose: true },
        repairHint: 'use a per-session generation guard so a settled save cannot close a later/detached dialog',
      });
}

/* ------------------------------ driver ------------------------------- */

export interface ValidateProjectOptions {
  /** restrict to a single rule (must be in the frozen set). */
  ruleId?: string;
  /** restrict to one scope. */
  scopeId?: string;
}

export interface ValidationReport {
  findings: Finding[];
  /** per-scope coverage (covered | not-covered) for scopes in the registry. */
  coverage: Array<{ scopeId: string; coverage: 'covered' | 'not-covered'; instanceIds: string[] }>;
  /** diagnostics for validator misuse (e.g. unknown rule), not page findings. */
  diagnostics: ProjectDiagnostic[];
}

/**
 * Run the bounded rules over explicitly registered instances using layered
 * evidence. Pure: the same inputs always produce the same report.
 *
 * `evidence` MUST be a {@link TrustedEvidence} produced by the controlled
 * render/interaction driver (via {@link TrustedEvidence.seal}); passing
 * `undefined` runs the declared tier only. Plain caller-supplied JSON is not
 * assignable here and can never elevate a finding to rendered/interaction
 * tiers.
 */
export function validateProject(
  view: ProjectAIView,
  registry: InstanceRegistry,
  evidence: TrustedEvidence | undefined,
  options: ValidateProjectOptions = {},
): ValidationReport {
  const diagnostics: ProjectDiagnostic[] = [];
  if (options.ruleId !== undefined && !isKnownRule(options.ruleId)) {
    diagnostics.push({
      code: 'r1_project_rule_unknown',
      path: '/options/ruleId',
      explanation: 'ruleId is not in the frozen bounded rule set',
      expected: [...RULE_IDS],
      actual: options.ruleId,
      repairHint: 'use one of the frozen rule ids',
    });
    return { findings: [], coverage: [], diagnostics };
  }

  const instances = registry.query(options.scopeId === undefined ? {} : { scopeId: options.scopeId });
  const findings: Finding[] = [];

  const want = (id: string): boolean => options.ruleId === undefined || options.ruleId === id;

  for (const inst of instances) {
    if (want('R1-PRJ-IDENTITY')) findings.push(checkIdentity(inst, view));
    if (want('R1-PRJ-CAPABILITY')) findings.push(checkCapability(inst, view));
    if (want('R1-PRJ-DRAFT-HIDDEN')) findings.push(checkDraftHidden(inst));
    if (isDialog(inst)) {
      if (want('R1-DLG-02')) findings.push(checkCloseEntry(inst, evidence));
      if (want('R1-DLG-04')) findings.push(checkCloseEntryProxy(inst, evidence, 'R1-DLG-04'));
      if (want('R1-DLG-05')) findings.push(checkCloseEntryProxy(inst, evidence, 'R1-DLG-05'));
    }
  }

  // Coverage: one row per distinct scope present (or the requested scope).
  const scopeIds = new Set<string>();
  for (const i of registry.query()) scopeIds.add(i.scopeId);
  if (options.scopeId !== undefined) scopeIds.add(options.scopeId);
  const coverage = [...scopeIds].map((scopeId) => ({ scopeId, ...registry.coverage(scopeId) }));

  return { findings, coverage, diagnostics };
}

// thin proxy so the two pending rules share one typed implementation
function checkCloseEntryProxy(
  inst: InstanceRegistration,
  evidence: TrustedEvidence | undefined,
  ruleId: 'R1-DLG-04' | 'R1-DLG-05',
): Finding {
  return checkPendingRules(ruleId, inst, evidence);
}

/** Coverage lookup for a possibly-unknown scope (never guesses; not-covered). */
export function getScopeCoverage(registry: InstanceRegistry, scopeId: string) {
  return registry.coverage(scopeId);
}
