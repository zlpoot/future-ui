import type { ProjectProfile } from '@future-ui/shadcn-adapter';

/**
 * R1-04 (#70) Phase A — MV-Auto-Editor real Project Profile (D16 type).
 *
 * Single source of the MV-Auto-Editor project's UI conventions for the
 * Asset Edit & Approval scenario (Pilot A). Values are anchored to the REAL
 * source files, not invented defaults:
 *
 *   - E:/projects/MV-Auto-Editor/web/canvas.html (asset editor panel)
 *   - MV git HEAD pinned at: d77fc2b77e75cd593733daa8a7e3c31dc2df8a16 (phase-a)
 *   - canvas.html blob (git hash-object): 52aa42c8ad7dc5217bafb7653dcc0e47ee175131
 *
 * Concrete derivations from canvas.html CSS (lines 10-48):
 *   - no explicit font-size on buttons/inputs → browser default 16px;
 *     normal line-height ≈ 1.4 → control text ≈ 22px
 *   - button padding 8px 11px + 1px border → control height ≈ 34px
 *   - button radius 9px; input radius 8px; .row gap 7px; .field margin-top 13px
 *   - #inspector padding 18px; main grid right column 400px
 *   - #closeInspector (.close) is display:none on desktop (>900px, non-embedded);
 *     it becomes visible only in the narrow-screen and embedded layouts
 */
export const mvAutoEditorProfile: ProjectProfile = {
  identity: {
    profileId: 'mv-auto-editor',
    profileVersion: '1.0.0',
    scope:
      'MV-Auto-Editor real project (E:/projects/MV-Auto-Editor); Phase A (#70) Pilot A: Asset Edit & Approval; pinned MV HEAD d77fc2b77e75cd593733daa8a7e3c31dc2df8a16, canvas.html blob 52aa42c8ad7dc5217bafb7653dcc0e47ee175131',
  },
  dimensions: {
    length: { canonicalUnit: 'px' },
    duration: { canonicalUnit: 'ms' },
    unitless: { canonicalUnit: 'unitless' },
  },
  tokens: {
    // --- base type scale ---
    'length.rem': { kind: 'literal', value: 16, dimension: 'length', unit: 'px' },

    // --- spacing (real CSS values) ---
    'space.row-gap': { kind: 'literal', value: 7, dimension: 'length', unit: 'px' },
    'space.toolbar-gap': { kind: 'literal', value: 8, dimension: 'length', unit: 'px' },
    'space.field-top': { kind: 'literal', value: 13, dimension: 'length', unit: 'px' },
    'space.inspector-pad': { kind: 'literal', value: 18, dimension: 'length', unit: 'px' },

    // --- radii ---
    'radius.control': { kind: 'literal', value: 9, dimension: 'length', unit: 'px' },
    'radius.input': { kind: 'literal', value: 8, dimension: 'length', unit: 'px' },

    // --- control & panel metrics ---
    'border.control': { kind: 'literal', value: 1, dimension: 'length', unit: 'px' },
    'control.height.default': {
      kind: 'literal',
      value: 34,
      dimension: 'length',
      unit: 'px',
    },
    'panel.width.inspector': { kind: 'literal', value: 400, dimension: 'length', unit: 'px' },
  },
  sizes: {
    controlHeight: [
      {
        id: 'md',
        tokenKey: 'control.height.default',
        description: 'canvas.html button: padding 8px 11px, 1px border, 16px font ≈ 34px',
      },
    ],
    dialogWidth: [
      { id: 'inspector', tokenKey: 'panel.width.inspector', description: 'canvas.html main grid right column 400px' },
    ],
    spacing: [
      { id: 'row', tokenKey: 'space.row-gap' },
      { id: 'toolbar', tokenKey: 'space.toolbar-gap' },
      { id: 'field', tokenKey: 'space.field-top' },
      { id: 'inspector', tokenKey: 'space.inspector-pad' },
    ],
  },
  variants: {
    primary: {
      variantId: 'primary',
      description: 'canvas.html button.primary / .active — 保存设定、AI 生成、确认',
      tokenOverrides: { 'color.bg': '#ab78e9', 'color.fg': '#201327', 'border.color': '#ab78e9' },
    },
    cancel: {
      variantId: 'cancel',
      description: 'canvas.html default button — 次要动作与关闭',
      tokenOverrides: { 'color.bg': '#30273d', 'color.fg': '#f1e8fa', 'border.color': '#594967' },
    },
    danger: {
      variantId: 'danger',
      description: 'canvas.html .stop-model — 停止生成',
      tokenOverrides: { 'color.bg': '#493036', 'color.fg': '#ffd4d4', 'border.color': '#ae7171' },
    },
  },
  unknownVariantPolicy: 'error',
  dialogConventions: {
    // The asset editor's accessible name comes from the h2 card-name heading
    // and the label/field text, not from an aria-labelledby modal title.
    accessibleNameFrom: 'label',
    // The panel DOES ship an explicit close control (#closeInspector 关闭),
    // but it is CSS-hidden on desktop (>900px, non-embedded). Rendered checks
    // therefore FAIL on the desktop layout — this is the real, documented gap.
    explicitCloseEntries: ['cancel-action'],
    escapeAndOverlayAreAdditionalOnly: true,
    // MV has no footer; the semantic order maps cancel=#closeInspector(关闭)
    // /取消 and primary=保存设定·AI 生成·确认.
    footerOrder: ['cancel', 'primary'],
    primaryVariant: 'primary',
    cancelVariant: 'cancel',
    // Real: while a generation job runs, generate/stop are disabled and a busy
    // second submit is impossible; `busy` disables every control in #detail.
    pendingBlocksResubmit: true,
    // Real: closing the inspector never confirms; in-flight saves/jobs continue
    // in the background. MV does NOT satisfy the reference "confirmed close".
    pendingCloseIsConfirmedNeverSilent: false,
    // Real: no focus trap and no focus restore on the side panel.
    focusEnterAndRestore: false,
    // Real default: prompt/draft field values are not projected to the AI view.
    draftFieldsAgentVisibleByDefault: false,
    blocking: {
      declared: true,
      reason: '生成/保存进行中（assetOperation / promptSave 在途）',
      closePolicy:
        'MV 不采用“移除普通关闭入口”的 blocking 弹窗；关闭始终可用，任务在后台继续，用户可用“停止生成”中止。',
      resolutionPath: ['停止生成', '等待完成'],
      failureFallback: { retryLimit: 2, then: '停止生成' },
    },
  },
  exceptions: [],
};
