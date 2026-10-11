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
import adapterPackageJson from '@future-ui/shadcn-adapter/package.json' with { type: 'json' };

/**
 * R3-WIN-02 (#108): derive the REAL adapter package version from the package
 * metadata (`./package.json` subpath exposed by the adapter's exports) instead
 * of a hand-maintained constant. The historical `0.0.0` hardcode drifted from
 * the actual RC (`0.1.0-rc.1`). Reading the package.json keeps the descriptor
 * in lockstep with the adapter version — no second constant to drift.
 */
const ADAPTER_PACKAGE_VERSION = adapterPackageJson.version;

/**
 * Browser-safe import surface (R3-WIN-02 #108): the package index re-exports
 * Node-only mapping validators (transitive `node:fs`), so consumers must import
 * `@future-ui/shadcn-adapter/browser`. The descriptor now records the REAL
 * browser entry and its named exports, not the root entry.
 */
const BROWSER_MODULE = '@future-ui/shadcn-adapter/browser';

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
    // onOpenChange receives EditDialogOpenChangeDetail { open, reason }, NOT a
    // boolean — so a React boolean setter cannot be passed directly.
    return {
      title: 'EditDialog (composition reference)',
      code: [
        'const [open, setOpen] = useState(false);',
        '',
        '<EditDialog',
        '  open={open}',
        '  label="Edit member"',
        '  description="Update the member display name"',
        '  fields={[{ name: "displayName", label: "Name", type: "text", defaultValue: "Ada" }]}',
        '  onSave={async (values) => { await saveMember(values); }}',
        '  onOpenChange={({ open: next }) => setOpen(next)}',
        '/>',
      ].join('\n'),
    };
  }
  if (componentType === 'future-ui.button') {
    return {
      title: 'Button',
      code: '<ShadcnButton type="button" variant="default" onClick={(event) => handleClick(event)}>Save</ShadcnButton>',
    };
  }
  return {
    title: 'TextInput',
    code: '<ShadcnTextInput name="email" type="email" defaultValue="ada@example.com" onValueChange={(event) => setEmail(event.value)} />',
  };
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
      source: {
        kind: 'module-import',
        module: BROWSER_MODULE,
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
