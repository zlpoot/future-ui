/**
 * Phase D (#69) — shadcn → Project AI View descriptor.
 *
 * This is the DATA-ONLY integration surface: it turns the REAL, frozen
 * shadcn adapter facts (provenance + D15 mapping reports + D16 profile) into
 * the generic ComponentDefinition[] consumed by ai-contract-core. It imports
 * no React and renders nothing; rendered/interaction evidence is collected
 * separately in jsdom (./dialog-evidence.tsx).
 *
 * The dependency direction is one-way: shadcn-adapter never imports
 * ai-contract-core (that would break the UI-only dependency graph). ai-dev
 * (dev-only, outside the production graph) assembles the two.
 */
import {
  buildProjectView,
  type BuildProjectViewResult,
  type ComponentDefinition,
  type MappingLimit,
} from '@future-ui/ai-contract-core';
import {
  adapterIdentity,
  baseIdentity,
  CONTRACT_VERSION,
  editDialogProfile,
  getComponentMapping,
  getComponentMappingReports,
  runtimeDependencies,
  registrySource,
  upstreamCommit,
} from '@future-ui/shadcn-adapter';
import type { MappingDomain } from '@future-ui/shadcn-adapter';

/** Mirrors packages/shadcn-adapter/package.json "version" (private adapter). */
const ADAPTER_PACKAGE_VERSION = '0.0.0';

const CONSUMER_EXPORTS: Record<string, string[]> = {
  'future-ui.dialog': ['EditDialog'],
  'future-ui.button': ['ShadcnButton'],
  'future-ui.text-input': ['ShadcnTextInput'],
};

/** Derive partial/unsupported limits from the REAL D15 member conclusions. */
function limitsFor(componentType: string): MappingLimit[] {
  const mapping = getComponentMapping(componentType);
  if (mapping === undefined) return [];
  const limits: MappingLimit[] = [];
  const domains = Object.keys(mapping.domains) as MappingDomain[];
  for (const domain of domains) {
    for (const conclusion of mapping.domains[domain] ?? []) {
      if (conclusion.status !== 'unsupported') continue;
      limits.push({
        member: `${domain}.${conclusion.member}`,
        status: 'unsupported',
        reason: conclusion.reason ?? 'unsupported by the upstream component',
        impact: conclusion.impact ?? 'behavior difference vs the frozen contract',
      });
    }
  }
  return limits;
}

function exampleFor(componentType: string): { title: string; code: string } {
  if (componentType === 'future-ui.dialog') {
    return {
      title: 'EditDialog (composition reference)',
      code: '<EditDialog open label="Edit" fields={[...]} onSave={save} onOpenChange={setOpen} />',
    };
  }
  if (componentType === 'future-ui.button') {
    return { title: 'Button', code: '<ShadcnButton type="button" onClick={fn}>Save</ShadcnButton>' };
  }
  return { title: 'TextInput', code: '<ShadcnTextInput name="email" type="email" onValueChange={({value})=>...} />' };
}

/** Build the three real shadcn component definitions from frozen facts. */
export function buildShadcnComponentDefinitions(): ComponentDefinition[] {
  const reports = getComponentMappingReports();
  return reports.map((report) => {
    const exports = CONSUMER_EXPORTS[report.componentType] ?? [];
    return {
      componentType: report.componentType,
      contractVersion: CONTRACT_VERSION,
      identity: {
        adapterId: adapterIdentity.adapterId,
        adapterVersion: ADAPTER_PACKAGE_VERSION,
        contractVersion: CONTRACT_VERSION,
        profileId: editDialogProfile.identity.profileId,
        profileVersion: editDialogProfile.identity.profileVersion,
        upstream: {
          library: adapterIdentity.targetLibrary,
          base: `${baseIdentity.package}@${baseIdentity.version}`,
          sourceCommit: upstreamCommit.commit,
          style: registrySource.style,
          runtimePackages: runtimeDependencies.map((d) => ({ name: d.name, version: d.version })),
        },
      },
      actualImport: {
        module: '@future-ui/shadcn-adapter',
        exports,
        example: exampleFor(report.componentType).code,
      },
      mappingStatus: report.status,
      limits: limitsFor(report.componentType),
      examples: [exampleFor(report.componentType)],
    };
  });
}

export interface BuildShadcnProjectViewInput {
  projectName?: string;
  /** Explicit capabilities only; absent by default (no business tools). */
  capabilities?: Parameters<typeof buildProjectView>[0]['capabilities'];
}

/** Assemble the real shadcn Project AI View; validates the descriptor fail-closed. */
export function buildShadcnProjectView(input: BuildShadcnProjectViewInput = {}): BuildProjectViewResult {
  return buildProjectView({
    projectName: input.projectName ?? 'future-ui/r1-reference',
    definitions: buildShadcnComponentDefinitions(),
    capabilities: input.capabilities,
  });
}
