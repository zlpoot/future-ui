/**
 * Dev-only browser-side live validator helpers (R1-RC-001 #86).
 *
 * These run INSIDE the manual acceptance page: the REAL shadcn EditDialog is
 * mounted with ai-dev's deterministic `mountEditDialog` helper, rendered
 * evidence is collected from the LIVE DOM with the SAME
 * `collectRenderedEvidence` used by the Node test suite, sealed into
 * TrustedEvidence and fed to the frozen bounded validator. No model, no MCP,
 * no network. Never imported by the UI-only sample.
 *
 * The helpers are async: after mounting, they wait a macrotask so React's
 * commit (and Radix's portal) is observable before evidence is collected —
 * required both in a real browser and under jsdom.
 */
import {
  buildMvProjectView,
  buildShadcnProjectView,
  capabilitiesForInstance,
  collectRenderedEvidence,
  createEditDialogProjectContext,
  mountEditDialog,
  registerEditDialogInstance,
  sealProjectEvidence,
  validateEditDialogProject,
} from '@future-ui/ai-dev';

export interface LiveRenderedEvidence {
  role?: string;
  ariaModal?: boolean;
  closeAffordances?: string[];
  resolutionAffordances?: string[];
  rootPath?: string;
}

export interface ValidatorFindingView {
  ruleId: string;
  status: string;
  tier: string;
  instanceId: string;
  path: string;
  reason: string;
  repairHint: string;
}

export interface ValidatorDemoResult {
  demo: 'positive' | 'negative';
  evidence: LiveRenderedEvidence;
  findings: ValidatorFindingView[];
  toolCount: number;
}

function toFindingViews(
  report: {
    findings: Array<{
      ruleId: string;
      status?: string;
      tier?: string;
      instanceId?: string;
      path?: string;
      reason?: string;
      repairHint?: string;
    }>;
  },
): ValidatorFindingView[] {
  return report.findings.map((f) => ({
    ruleId: f.ruleId,
    status: f.status ?? '',
    tier: f.tier ?? '',
    instanceId: f.instanceId ?? '',
    path: f.path ?? '',
    reason: f.reason ?? '',
    repairHint: f.repairHint ?? '',
  }));
}

async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/** Positive: real EditDialog → live rendered evidence → bounded validator. */
export async function runPositiveValidator(): Promise<ValidatorDemoResult> {
  const ctx = createEditDialogProjectContext();
  registerEditDialogInstance(ctx);
  const handle = mountEditDialog({ blocking: false });
  try {
    await settle();
    const evidence = collectRenderedEvidence(document.body);
    const sealed = sealProjectEvidence({ rendered: { 'members/edit-dialog': evidence } });
    const report = validateEditDialogProject(ctx, sealed);
    return {
      demo: 'positive',
      evidence,
      findings: toFindingViews(report),
      toolCount: capabilitiesForInstance(ctx.view, 'members/edit-dialog').length,
    };
  } finally {
    handle.unmount();
  }
}

/** Negative: dialog with NO reachable close entry → R1-DLG-02 must FAIL. */
export async function runNegativeValidator(): Promise<ValidatorDemoResult> {
  const ctx = createEditDialogProjectContext();
  registerEditDialogInstance(ctx);
  const broken = document.createElement('div');
  const dlg = document.createElement('div');
  dlg.setAttribute('role', 'dialog');
  dlg.setAttribute('aria-modal', 'true');
  broken.appendChild(dlg);
  document.body.appendChild(broken);
  try {
    await settle();
    const evidence = collectRenderedEvidence(broken);
    const sealed = sealProjectEvidence({ rendered: { 'members/edit-dialog': evidence } });
    const report = validateEditDialogProject(ctx, sealed);
    return {
      demo: 'negative',
      evidence,
      findings: toFindingViews(report),
      toolCount: capabilitiesForInstance(ctx.view, 'members/edit-dialog').length,
    };
  } finally {
    broken.remove();
  }
}

export interface AiViewSummary {
  shadcn: {
    projectName: string;
    adapterId: string;
    profileId: string;
    components: Array<{ componentType: string; mappingStatus: string; limits: Array<{ member: string; status: string; reason: string }> }>;
  };
  mv: {
    projectName: string;
    adapterId: string;
    profileId: string;
    upstreamArtifacts: Array<{ locator: string; contentHash: string }>;
    components: Array<{ componentType: string; mappingStatus: string; limits: Array<{ member: string; status: string; reason: string }> }>;
  };
}

function summarizeView(view: {
  project: { name: string };
  definitions: Array<{
    componentType: string;
    mappingStatus: string;
    identity: { adapterId: string; profileId: string; upstream?: { artifacts?: ReadonlyArray<{ locator: string; contentHash: string }> } };
    limits: Array<{ member: string; status: string; reason: string }>;
  }>;
}): {
  projectName: string;
  adapterId: string;
  profileId: string;
  upstreamArtifacts: Array<{ locator: string; contentHash: string }>;
  components: Array<{ componentType: string; mappingStatus: string; limits: Array<{ member: string; status: string; reason: string }> }>;
} {
  const first = view.definitions[0];
  const artifacts: Array<{ locator: string; contentHash: string }> = [];
  const seenLocators = new Set<string>();
  for (const d of view.definitions) {
    for (const a of d.identity.upstream?.artifacts ?? []) {
      if (!seenLocators.has(a.locator)) {
        seenLocators.add(a.locator);
        artifacts.push(a);
      }
    }
  }
  return {
    projectName: view.project.name,
    adapterId: first?.identity.adapterId ?? 'unknown',
    profileId: first?.identity.profileId ?? 'unknown',
    upstreamArtifacts: artifacts,
    components: view.definitions.map((d) => ({
      componentType: d.componentType,
      mappingStatus: d.mappingStatus,
      limits: d.limits,
    })),
  };
}

/** Read-only Project AI View summaries (shadcn EditDialog + MV-Auto-Editor). */
export function readAiViewSummaries(): AiViewSummary {
  const shadcnBuilt = buildShadcnProjectView();
  const mvBuilt = buildMvProjectView();
  if (shadcnBuilt.view === null) {
    throw new Error(`shadcn project view failed to build: ${shadcnBuilt.diagnostics.map((d) => d.code).join(', ')}`);
  }
  if (mvBuilt.view === null) {
    throw new Error(`mv project view failed to build: ${mvBuilt.diagnostics.map((d) => d.code).join(', ')}`);
  }
  return {
    shadcn: summarizeView(shadcnBuilt.view),
    mv: summarizeView(mvBuilt.view),
  };
}
