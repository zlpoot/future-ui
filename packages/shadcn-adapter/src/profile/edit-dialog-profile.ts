import type { ProjectProfile } from './types.js';

/**
 * R1 reference Project Profile — the single source of project conventions
 * (D16), intentionally scoped to what the EditDialog reference consumes.
 *
 * Real values are anchored to the vendored new-york-v4 sources:
 *  - control heights: button.tsx size sm h-8 / default h-9 / lg h-10 (lines 25,23,26)
 *  - radii:          button.tsx:7 rounded-md; dialog.tsx:64 rounded-lg
 *  - dialog layout:  dialog.tsx:64 sm:max-w-lg / p-6 / gap-4 / duration-200
 * Tailwind v4: 1 rem = 16 px; spacing unit 1 = 0.25 rem.
 */
export const editDialogProfile: ProjectProfile = {
  identity: {
    profileId: 'r1-edit-dialog-reference',
    profileVersion: '1.0.0',
    scope: 'R1-02 (#68) in-repo reference only; not a real-project profile (TBD)',
  },
  dimensions: {
    length: { canonicalUnit: 'px', unitConversions: { rem: 16 } },
    duration: { canonicalUnit: 'ms', unitConversions: { s: 1000 } },
    unitless: { canonicalUnit: 'unitless' },
  },
  tokens: {
    // --- length base & scale ---
    'length.rem': { kind: 'literal', value: 16, dimension: 'length', unit: 'px' },
    'space.1': { kind: 'ratio', base: 'length.rem', factor: 0.25, dimension: 'length', unit: 'px' },
    'space.4': { kind: 'ratio', base: 'length.rem', factor: 1, dimension: 'length', unit: 'px' },
    'space.6': { kind: 'ratio', base: 'length.rem', factor: 1.5, dimension: 'length', unit: 'px' },

    // --- radii ---
    'radius.md': { kind: 'ratio', base: 'length.rem', factor: 0.375, dimension: 'length', unit: 'px' },
    'radius.lg': { kind: 'ratio', base: 'length.rem', factor: 0.5, dimension: 'length', unit: 'px' },

    // --- control heights (Tailwind h-8 / h-9 / h-10) ---
    'control.height.sm': { kind: 'ratio', base: 'length.rem', factor: 2, dimension: 'length', unit: 'px' },
    'control.height.md': { kind: 'ratio', base: 'length.rem', factor: 2.25, dimension: 'length', unit: 'px' },
    'control.height.lg': { kind: 'ratio', base: 'length.rem', factor: 2.5, dimension: 'length', unit: 'px' },

    // --- dialog layout (max-w-lg / p-6 / gap-4 / rounded-lg / duration-200) ---
    'dialog.width.max': { kind: 'ratio', base: 'length.rem', factor: 32, dimension: 'length', unit: 'px' },
    'dialog.padding': { kind: 'alias', ref: 'space.6' },
    'dialog.gap': { kind: 'alias', ref: 'space.4' },
    'dialog.radius': { kind: 'alias', ref: 'radius.lg' },
    'dialog.duration': { kind: 'literal', value: 200, dimension: 'duration', unit: 'ms' },

    // --- semantic hooks consumed by the reference (visual names → concrete tokens) ---
    'control.radius': { kind: 'alias', ref: 'radius.md' },
    'control.height.default': { kind: 'alias', ref: 'control.height.md' },
    'dialog.controlHeight': { kind: 'alias', ref: 'control.height.md' },
  },
  sizes: {
    controlHeight: [
      { id: 'sm', tokenKey: 'control.height.sm', description: 'shadcn size="sm" (h-8)' },
      { id: 'md', tokenKey: 'control.height.md', description: 'shadcn size="default" (h-9)' },
      { id: 'lg', tokenKey: 'control.height.lg', description: 'shadcn size="lg" (h-10)' },
    ],
    dialogWidth: [
      { id: 'max', tokenKey: 'dialog.width.max', description: 'shadcn sm:max-w-lg' },
    ],
    spacing: [
      { id: '1', tokenKey: 'space.1' },
      { id: '4', tokenKey: 'space.4' },
      { id: '6', tokenKey: 'space.6' },
    ],
  },
  variants: {
    primary: {
      variantId: 'primary',
      description: 'Maps to shadcn buttonVariants variant "default".',
      tokenOverrides: { variant: 'default' },
    },
    cancel: {
      variantId: 'cancel',
      description: 'Maps to shadcn buttonVariants variant "outline".',
      tokenOverrides: { variant: 'outline' },
    },
    danger: {
      variantId: 'danger',
      description: 'Maps to shadcn buttonVariants variant "destructive".',
      tokenOverrides: { variant: 'destructive' },
    },
  },
  unknownVariantPolicy: 'error',
  dialogConventions: {
    accessibleNameFrom: 'label',
    explicitCloseEntries: ['cancel-action', 'x-control'],
    escapeAndOverlayAreAdditionalOnly: true,
    footerOrder: ['cancel', 'primary'],
    primaryVariant: 'primary',
    cancelVariant: 'cancel',
    pendingBlocksResubmit: true,
    pendingCloseIsConfirmedNeverSilent: true,
    focusEnterAndRestore: true,
    draftFieldsAgentVisibleByDefault: false,
    blocking: {
      declared: true,
      reason: '存在必须在关闭前处理的未保存变更',
      closePolicy:
        '仅允许通过 resolutionPath 中的动作关闭；Esc 与遮罩点击被显式禁用（Radix onEscapeKeyDown/onPointerDownOutside preventDefault）。',
      resolutionPath: ['保存并关闭', '放弃变更并关闭'],
      failureFallback: { retryLimit: 2, then: '放弃变更并关闭' },
      exceptionId: 'EX-BLK-001',
    },
  },
  exceptions: [
    {
      exceptionId: 'EX-BLK-001',
      ruleId: 'R1-DLG-02',
      scenario: '显式 blocking 变体：移除普通取消入口与 X 控件，仅保留有限步可达的 resolution paths。',
      rationale: '必须先处理未保存的不可逆变更；operability 不变量 1-8 仍全部满足。',
      expiryCondition: '当变更已保存或经 resolution path 显式放弃后恢复普通关闭。',
    },
  ],
};
