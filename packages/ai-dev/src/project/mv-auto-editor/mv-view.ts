import {
  buildProjectView,
  type BuildProjectViewResult,
  type ComponentDefinition,
  type MappingLimit,
} from '@future-ui/ai-contract-core';
import { CONTRACT_VERSION } from '@future-ui/shadcn-adapter';
import { mvAutoEditorProfile } from './mv-profile.js';

/**
 * R1-04 (#70) Phase A — MV-Auto-Editor → Project AI View descriptor.
 *
 * DATA-ONLY integration surface (mirrors ./shadcn-descriptor.ts): turns the
 * REAL, pinned MV-Auto-Editor facts (profile + canvas.html asset editor) into
 * the generic ComponentDefinition[] consumed by ai-contract-core. Imports no
 * React and renders nothing; rendered/interaction evidence is collected
 * separately in jsdom (./mv-evidence.ts) and against the real page
 * (scripts/phase-a-real-evidence.mjs).
 *
 * The identity triple pins:
 *   adapterId:      'shadcn-react'        — the EditDialog semantic source (R1-02)
 *   profileId:      'mv-auto-editor'      — this project's real conventions (D16)
 *   upstreamFingerprint: over the REAL MV canvas implementation below, so a
 *                        change to canvas.html (new blob sha) is identity drift.
 */
export const ADAPTER_PACKAGE_VERSION = '0.0.0';

/** REAL MV upstream identity: the canvas implementation being adapted. */
export const MV_UPSTREAM = {
  library: 'mv-auto-editor-canvas',
  base: 'web/canvas.html',
  // canvas.html blob (git hash-object), pinned 2026-10-07 at MV HEAD
  // d77fc2b77e75cd593733daa8a7e3c31dc2df8a16. A content change → new blob sha
  // → upstreamFingerprint drift → validator fail-closed (identity drift).
  sourceCommit: '52aa42c8ad7dc5217bafb7653dcc0e47ee175131',
  style: 'inline-css',
  runtimePackages: [] as ReadonlyArray<{ name: string; version: string }>,
};

/**
 * R1-04 (#70) Phase B — review controls (button / text-input) are implemented
 * by the SAME inline, non-module style across THREE real documents. The
 * multi-artifact provenance pins each page independently: any of canvas /
 * keyframes / shots changing is upstream identity drift. Only the locators a
 * component REALLY uses are listed (text-input has no member on keyframes.html:
 * that page's only input is a non-text file picker).
 */
const MV_ARTIFACTS_ALL = [
  { locator: 'web/canvas.html', contentHash: '52aa42c8ad7dc5217bafb7653dcc0e47ee175131' },
  { locator: 'web/keyframes.html', contentHash: 'c8522aaca047e9fd8c2b08c3584d35a61ced9bc9' },
  { locator: 'web/shots.html', contentHash: '64f8cd2864d3f7addc17531b24788a352b9d7823' },
] as const;

const MV_ARTIFACTS_TEXT_INPUT = [
  { locator: 'web/canvas.html', contentHash: '52aa42c8ad7dc5217bafb7653dcc0e47ee175131' },
  { locator: 'web/shots.html', contentHash: '64f8cd2864d3f7addc17531b24788a352b9d7823' },
] as const;

export const MV_REVIEW_BUTTON_UPSTREAM = {
  library: 'mv-auto-editor-pages',
  base: 'web/{canvas,keyframes,shots}.html',
  style: 'inline-css',
  runtimePackages: [] as ReadonlyArray<{ name: string; version: string }>,
  artifacts: MV_ARTIFACTS_ALL,
};

export const MV_REVIEW_TEXT_INPUT_UPSTREAM = {
  library: 'mv-auto-editor-pages',
  base: 'web/{canvas,shots}.html',
  style: 'inline-css',
  runtimePackages: [] as ReadonlyArray<{ name: string; version: string }>,
  artifacts: MV_ARTIFACTS_TEXT_INPUT,
};

/**
 * Page-local symbols of the asset editor inside canvas.html. These are INLINE
 * functions in the page's classic <script> (canvas.html has no `export` and no
 * <script type=module>), so they are page-owned symbols — NOT module exports —
 * and are recorded under an inline-source, never as an importable module.
 * (All four are real: characterAssetPanel:85 / assetPanel:97 /
 * assetEditor:106 / simpleAssetEditor:131.)
 */
const ASSET_EDITOR_PAGE_SYMBOLS = ['simpleAssetEditor', 'assetEditor', 'assetPanel', 'characterAssetPanel'];

/**
 * Real in-page symbols per review document (classic inline <script>, no
 * exports). keyframes.html exposes renderDetail/refresh/post; shots.html
 * exposes renderDetail/renderList/select.
 */
const KEYFRAMES_PAGE_SYMBOLS = ['renderDetail', 'refresh', 'post'];
const SHOTS_PAGE_SYMBOLS = ['renderDetail', 'renderList', 'select'];

function dialogExample(): { title: string; code: string } {
  // Real call site: canvas.html renderDetail() assetCard branch.
  return {
    title: 'Asset card editor panel (real call site)',
    code: [
      "// canvas.html renderDetail(): when an asset node is selected,",
      "$('#detail').innerHTML = `<h2>${esc(assetCard.name)}</h2>` + simpleAssetEditor(assetCard, n);",
      "// #inspector hosts #detail; #closeInspector is the (desktop-hidden) close control.",
    ].join('\n'),
  };
}

/** Real per-locator members for the review button source set. */
function buttonSourceSet() {
  return [
    {
      locator: 'web/canvas.html',
      owner: 'inline classic <script> on the /canvas route (non-module, page-owned)',
      symbols: ASSET_EDITOR_PAGE_SYMBOLS,
      example: [
        "`<button data-asset-action=\"select\" data-version=\"${esc(v.id)}\">选用</button>`",
        "`<button class=\"primary\" data-asset-action=\"save-card\">保存设定</button>`",
      ].join('\n'),
    },
    {
      locator: 'web/keyframes.html',
      owner: 'inline classic <script> on the /keyframes route (non-module, page-owned)',
      symbols: KEYFRAMES_PAGE_SYMBOLS,
      example: [
        "`<button data-candidate=\"${c.id}\" data-action=\"approve\">通过并选用</button>`",
        "`<button data-candidate=\"${c.id}\" data-action=\"reject\" class=\"warn\">淘汰</button>`",
        "`['failed','canceled'].includes(j.status)?`<button data-job=\"${j.id}\" data-action=\"retry\">重试</button>`:''`",
        "<button id=\"lock\">锁定当前选图</button>",
      ].join('\n'),
    },
    {
      locator: 'web/shots.html',
      owner: 'inline classic <script> on the /shots route (non-module, page-owned)',
      symbols: SHOTS_PAGE_SYMBOLS,
      example: [
        "<button id=\"save\" class=\"primary\">保存镜头计划</button>",
        "<button id=\"reset\">放弃此镜头未保存修改</button>",
      ].join('\n'),
    },
  ];
}

/** Real per-locator members for the review text-input source set. */
function textInputSourceSet() {
  return [
    {
      locator: 'web/canvas.html',
      owner: 'inline classic <script> on the /canvas route (non-module, page-owned)',
      symbols: ASSET_EDITOR_PAGE_SYMBOLS,
      example: [
        "`<input id=\"assetName\" value=\"${esc(card.name)}\">`",
        "`<textarea id=\"assetPrompt\" rows=\"7\">${esc(assetPrompt)}</textarea>`",
      ].join('\n'),
    },
    {
      locator: 'web/shots.html',
      owner: 'inline classic <script> on the /shots route (non-module, page-owned)',
      symbols: SHOTS_PAGE_SYMBOLS,
      example: [
        '<textarea id="intent" placeholder="描写构图、人物动作、情绪与机位">…</textarea>',
        '<input id="anchor" type="number" min="0" step="0.001">',
        '<textarea id="generationPrompt">…</textarea>',
      ].join('\n'),
    },
  ];
}

function exampleFor(componentType: string): { title: string; code: string } {
  if (componentType === 'future-ui.dialog') return dialogExample();
  if (componentType === 'future-ui.button') {
    return {
      title: 'Review action buttons across the real inline pages',
      code: buttonSourceSet().map((m) => `// ${m.locator}\n${m.example}`).join('\n'),
    };
  }
  return {
    title: 'Review form inputs across the real inline pages',
    code: textInputSourceSet().map((m) => `// ${m.locator}\n${m.example}`).join('\n'),
  };
}

/** REAL member-level limits: what the MV implementation cannot satisfy. */
function limitsFor(componentType: string): MappingLimit[] {
  if (componentType === 'future-ui.dialog') {
    return [
      {
        member: 'accessibility.role',
        status: 'unsupported',
        reason: '资产编辑器是常驻 <aside id="inspector">，无 role="dialog" / aria-modal',
        impact: '与 EditDialog 的模态语义不同；屏幕阅读器不按对话框处理',
      },
      {
        member: 'close.visibility',
        status: 'unsupported',
        reason: '#closeInspector 在桌面端（>900px、非 embedded）CSS display:none',
        impact: 'R1-DLG-02 的桌面端渲染检查将失败（真实缺口，Phase A 不改产品代码）',
      },
      {
        member: 'focus.trap',
        status: 'unsupported',
        reason: '无焦点陷阱与关闭后焦点还原',
        impact: 'focusEnterAndRestore 语义不成立',
      },
    ];
  }
  if (componentType === 'future-ui.button') {
    return [
      {
        member: 'features.loading',
        status: 'unsupported',
        reason: '生成/保存/上传进行中仅使用 disabled + 文本状态，无 aria-busy',
        impact: 'pending 状态的辅助技术可访问性弱于契约；disabled 是渲染事实，不是重入守卫的 interaction 证据',
      },
      {
        member: 'accessibility.action-role',
        status: 'unsupported',
        reason: 'P4/P5 审核动作语义只挂在 data-action/data-candidate/data-job 自定义属性上，无稳定 aria-label/role 契约，整页应用也不是模态',
        impact: '候选通过/淘汰/选用、重试、锁定等动作角色只能按真实 data-* 与文案识别；冻结规则集无 button 级 action/pending 规则，相关语义为 not-covered',
      },
    ];
  }
  return [
    {
      member: 'features.validation',
      status: 'unsupported',
      reason: '字段无内联校验消息；shots 页校验只在保存时由后端抛出',
      impact: '与 EditDialog 字段校验语义不同',
    },
  ];
}

// Identity differs per component because the review control components span
// multiple real artifacts while the dialog lives only on canvas.html. All
// three still resolve against the SAME adapter and the SAME single Profile.
function identityFor(componentType: string): ComponentDefinition['identity'] {
  const common = {
    adapterId: 'shadcn-react',
    adapterVersion: ADAPTER_PACKAGE_VERSION,
    contractVersion: CONTRACT_VERSION,
    profileId: mvAutoEditorProfile.identity.profileId,
    profileVersion: mvAutoEditorProfile.identity.profileVersion,
  } as const;
  if (componentType === 'future-ui.dialog') return { ...common, upstream: MV_UPSTREAM };
  return {
    ...common,
    upstream: componentType === 'future-ui.button' ? MV_REVIEW_BUTTON_UPSTREAM : MV_REVIEW_TEXT_INPUT_UPSTREAM,
  };
}

function sourceFor(componentType: string): ComponentDefinition['source'] {
  if (componentType === 'future-ui.dialog') {
    return {
      kind: 'inline-source',
      locator: 'web/canvas.html',
      owner: 'inline classic <script> on the /canvas route (non-module, page-owned)',
      symbols: ASSET_EDITOR_PAGE_SYMBOLS,
      example: dialogExample().code,
    };
  }
  // Review controls are genuinely multi-document inline implementations; the
  // set is pinned member-by-member via upstream.artifacts and never importable.
  return { kind: 'inline-source-set', sources: componentType === 'future-ui.button' ? buttonSourceSet() : textInputSourceSet() };
}

/** Build the real MV Project AI View (dialog/button/text-input definitions). */
export function buildMvAutoEditorComponentDefinitions(): ComponentDefinition[] {
  return (['future-ui.dialog', 'future-ui.button', 'future-ui.text-input'] as const).map((componentType) => ({
    componentType,
    contractVersion: CONTRACT_VERSION,
    identity: identityFor(componentType),
    source: sourceFor(componentType),
    // All three are real but partial: the panel is not a modal dialog and the
    // review controls do not fully satisfy the EditDialog/button/input members.
    mappingStatus: 'partial',
    limits: limitsFor(componentType),
    examples: [exampleFor(componentType)],
  }));
}

export interface BuildMvProjectViewInput {
  projectName?: string;
  capabilities?: Parameters<typeof buildProjectView>[0]['capabilities'];
}

/** Assemble the MV-Auto-Editor Project AI View; validates fail-closed. */
export function buildMvProjectView(input: BuildMvProjectViewInput = {}): BuildProjectViewResult {
  return buildProjectView({
    projectName: input.projectName ?? 'mv-auto-editor',
    definitions: buildMvAutoEditorComponentDefinitions(),
    capabilities: input.capabilities,
  });
}
