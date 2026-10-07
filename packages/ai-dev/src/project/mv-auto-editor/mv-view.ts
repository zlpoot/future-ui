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

/** Real import surface of the asset editor inside canvas.html. */
const ASSET_EDITOR_EXPORTS = ['simpleAssetEditor', 'assetEditor', 'assetPanel', 'characterAssetPanel'];

function exampleFor(componentType: string): { title: string; code: string } {
  if (componentType === 'future-ui.dialog') {
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
  if (componentType === 'future-ui.button') {
    return {
      title: 'Asset version action buttons (real template)',
      code: [
        "`<button data-asset-action=\"select\" data-version=\"${esc(v.id)}\">选用</button>`",
        "`<button data-asset-action=\"approve\" data-version=\"${esc(v.id)}\">通过</button>`",
        "`<button class=\"primary\" data-asset-action=\"save-card\">保存设定</button>`",
      ].join('\n'),
    };
  }
  return {
    title: 'Asset field inputs (real template)',
    code: [
      "`<input id=\"assetName\" value=\"${esc(card.name)}\">`",
      "`<textarea id=\"assetDescription\">${esc(card.description)}</textarea>`",
      "`<textarea id=\"assetPrompt\" rows=\"7\">${esc(assetPrompt)}</textarea>`",
    ].join('\n'),
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
        reason: '生成/保存进行中仅使用 disabled + 文本状态，无 aria-busy',
        impact: 'pending 状态的辅助技术可访问性弱于契约',
      },
    ];
  }
  return [
    {
      member: 'features.validation',
      status: 'unsupported',
      reason: '字段无内联校验消息',
      impact: '与 EditDialog 字段校验语义不同',
    },
  ];
}

// Identity is uniform across the three definitions (same adapter/profile/upstream).
const identityFor = (): ComponentDefinition['identity'] => ({
  adapterId: 'shadcn-react',
  adapterVersion: ADAPTER_PACKAGE_VERSION,
  contractVersion: CONTRACT_VERSION,
  profileId: mvAutoEditorProfile.identity.profileId,
  profileVersion: mvAutoEditorProfile.identity.profileVersion,
  upstream: MV_UPSTREAM,
});

/** Build the real MV Project AI View (dialog/button/text-input definitions). */
export function buildMvAutoEditorComponentDefinitions(): ComponentDefinition[] {
  return (['future-ui.dialog', 'future-ui.button', 'future-ui.text-input'] as const).map((componentType) => ({
    componentType,
    contractVersion: CONTRACT_VERSION,
    identity: identityFor(),
    actualImport: {
      module: 'web/canvas.html',
      exports: ASSET_EDITOR_EXPORTS,
      example: exampleFor(componentType).code,
    },
    // All three are real but partial: the panel is not a modal dialog and the
    // controls do not fully satisfy the EditDialog/button/input members.
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
