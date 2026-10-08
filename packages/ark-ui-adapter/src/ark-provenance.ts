/**
 * Frozen upstream provenance for the Ark UI React Library Adapter
 * (R1-04 #70 Phase C).
 *
 * Source identity is the PINNED npm artifact: exact package version + tarball
 * sha512 integrity, plus per-entry-point sha256 for the two subpaths this
 * adapter actually imports (`@ark-ui/react/dialog`, `@ark-ui/react/field`).
 * The headless engine (@zag-js/*) is pinned transitively to 1.45.0. Unlike the
 * R1-02 shadcn adapter, Ark ships NO vendored sources and NO styles: it is a
 * headless primitives library, so there is no CSS/tailwind layer to digest.
 *
 * Every literal here is cross-checked by tests/provenance.test.ts, which
 * resolves the installed package.json and the on-disk entry files and
 * re-hashes them (fail-closed if the installed artifact drifts).
 */

export const CONTRACT_VERSION = '1.0.0' as const;

export const arkPackage = {
  name: '@ark-ui/react',
  version: '5.39.3',
  license: 'MIT',
  /** npm dist.integrity of the pinned tarball. */
  npmIntegrity:
    'sha512-8fx0mj1Ht51ElT9rGDSnX+oaBr++9zo//4E0xhXzB299XwHi0vXHXtTYzhpH/m6qb+R3fHz5flsMv1X0+fZvtQ==',
  tarball: 'https://registry.npmjs.org/@ark-ui/react/-/react-5.39.3.tgz',
  tarballSha1: '3dfb59f8fca896bf52af2be1bcc78cd6392c082d',
  tarballBytes: 472236,
  unpackedBytes: 3339249,
  files: 3874,
  /** package subpath export map: dot-star maps to dist/components/<name>/index.js. */
  subpathExport: './* -> ./dist/components/*/index.{js,cjs}',
  peerDependencies: { react: '>=18.0.0', 'react-dom': '>=18.0.0' },
} as const;

/**
 * Headless engine pinned transitively. Ark React is a thin React binding over
 * the framework-agnostic zag-js state machines.
 */
export const engineIdentity = {
  engine: '@zag-js',
  version: '1.45.0',
  license: 'MIT',
  dialogPackage: '@zag-js/dialog',
  docs: 'https://zagjs.com/',
} as const;

/**
 * sha256 (hex) of the on-disk ENTRY files the adapter imports, inside the
 * pinned package. Used by the provenance test to detect a swapped artifact.
 */
export const arkEntryPoints = [
  {
    subpath: '@ark-ui/react/dialog',
    resolved: 'dist/components/dialog/index.js',
    bytes: 1006,
    sha256: '85783ded5741c23f3014ccf82217861f7c390714952e11d59bc3e6cf3ac5d17e',
  },
  {
    subpath: '@ark-ui/react/field',
    resolved: 'dist/components/field/index.js',
    bytes: 1021,
    sha256: 'd43cce2f705221e15194e207a5b97d93f7884f0ef6dce109ba1b8b87b65989cd',
  },
] as const;

/**
 * Verified component-surface facts (read from the 5.39.3 tarball .d.ts files,
 * not inferred from marketing docs):
 *  - Dialog namespace members exist (Root/Content/Positioner/Backdrop/Title/
 *    Description/CloseTrigger/Trigger).
 *  - Field namespace members exist (Root/Input/Label/HelperText/ErrorText/...).
 *  - There is NO Button component directory and NO @zag-js/button dependency;
 *    the only button surface is the polymorphic `ark.button` factory, which
 *    renders a native <button> and is NOT an Ark Button primitive.
 */
export const arkSurfaceFacts = {
  dialogMembers: [
    'Root', 'Backdrop', 'Positioner', 'Content', 'Title', 'Description', 'CloseTrigger', 'Trigger',
  ],
  fieldMembers: ['Root', 'Input', 'Label', 'HelperText', 'ErrorText', 'Textarea', 'Select'],
  buttonPrimitive: {
    exists: false,
    note:
      '@ark-ui/react@5.39.3 ships no Button component (no dist/components/button, no @zag-js/button dep). '
      + 'The polymorphic `ark.button` factory only renders a native <button>; the adapter therefore labels '
      + 'Button a platform/native composition, never an Ark primitive.',
  },
} as const;

/**
 * Dialog prop facts verified against @zag-js/dialog@1.45.0 dist/dialog.types.d.ts
 * (DialogProps), so the mapping does not over-claim.
 */
export const dialogPropEvidence = {
  package: '@zag-js/dialog@1.45.0',
  source: 'dist/dialog.types.d.ts (DialogProps / DialogApi)',
  controlledOpen: 'open?: boolean',
  changeEvent: 'onOpenChange?: (details: { open: boolean }) => void',
  escape: 'closeOnEscape?: boolean (default true)',
  modal: 'modal?: boolean (default true)',
  trapFocus: 'trapFocus?: boolean (default true)',
  restoreFocus: 'restoreFocus?: boolean',
  initialFocusEl: 'initialFocusEl?: () => Element | false',
  finalFocusEl: 'finalFocusEl?: () => Element',
  role: 'role?: "dialog" | "alertdialog" (default "dialog")',
  docs: 'https://ark-ui.com/react/docs/components/dialog',
} as const;

/**
 * Field facts verified against dist/components/field/use-field.d.ts and
 * field-input.js: FieldInput renders `ark.input` merged with getInputProps()
 * (id/aria-invalid/aria-describedby/disabled/readOnly) inside Field.Root.
 */
export const fieldPropEvidence = {
  rootProps: 'dist/components/field/use-field.d.ts (UseFieldProps: required/disabled/invalid/readOnly)',
  inputImpl:
    'dist/components/field/field-input.js: FieldInput = forwardRef -> jsx(ark.input, mergeProps(field.getInputProps(), props))',
  docs: 'https://ark-ui.com/react/docs/components/field',
} as const;

export const styleLayer = {
  engine: 'none (headless)',
  note:
    'Ark UI renders semantics/ARIA and ships zero CSS. The adapter maps behavior/identity but provides no '
    + 'visual token layer; dialog/control visuals are the host application’s responsibility. jsdom tests assert '
    + 'structure/behavior, never pixels.',
} as const;

export interface ArkAdapterIdentity {
  adapterId: 'ark-ui-react';
  targetLibrary: '@ark-ui/react';
  contractVersion: typeof CONTRACT_VERSION;
  libraryIdentity: {
    packageIdentity: typeof arkPackage;
    engine: typeof engineIdentity;
    entryPoints: typeof arkEntryPoints;
    surfaceFacts: typeof arkSurfaceFacts;
    dialog: typeof dialogPropEvidence;
    field: typeof fieldPropEvidence;
    styleLayer: typeof styleLayer;
    reactPeerRange: '^19.2.0 (workspace dev; upstream supports >=18)';
  };
}

export const adapterIdentity: ArkAdapterIdentity = {
  adapterId: 'ark-ui-react',
  targetLibrary: '@ark-ui/react',
  contractVersion: CONTRACT_VERSION,
  libraryIdentity: {
    packageIdentity: arkPackage,
    engine: engineIdentity,
    entryPoints: arkEntryPoints,
    surfaceFacts: arkSurfaceFacts,
    dialog: dialogPropEvidence,
    field: fieldPropEvidence,
    styleLayer,
    reactPeerRange: '^19.2.0 (workspace dev; upstream supports >=18)',
  },
};
