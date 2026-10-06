import {
  BUTTON_COMPONENT_TYPE,
  DIALOG_COMPONENT_TYPE,
  TEXT_INPUT_COMPONENT_TYPE,
} from '@future-ui/react-provider';

import type { ComponentMapping } from './types.js';
import { CONTRACT_VERSION } from '../upstream-provenance.js';

/**
 * D15 member-level mapping tables for shadcn/ui new-york-v4 (Radix).
 *
 * Evidence shorthands:
 *  - `dialog.tsx:<line>` → vendored upstream/registry/new-york-v4/ui/dialog.tsx
 *  - `button.tsx:<line>` / `input.tsx:<line>` likewise
 *  - Radix docs anchor → https://www.radix-ui.com/primitives/docs/components/dialog
 */
const RADIX_DIALOG_DOCS = 'https://www.radix-ui.com/primitives/docs/components/dialog';

export const dialogMapping: ComponentMapping = {
  anchor: { componentType: DIALOG_COMPONENT_TYPE, contractVersion: CONTRACT_VERSION },
  domains: {
    features: [
      {
        member: 'open', status: 'mapped', via: 'radix',
        mapsTo: 'Dialog.Root controlled `open` prop (dialog.tsx:10-14 passes props to DialogPrimitive.Root)',
      },
      {
        member: 'escapeClose', status: 'inherited-equivalent',
        mapsTo: 'Radix Content DismissableLayer Escape handling',
        evidence: `${RADIX_DIALOG_DOCS}#content ("Closes when the Esc key is pressed"); vendored at dialog.tsx:6,61`,
      },
      {
        member: 'focusTrap', status: 'inherited-equivalent',
        mapsTo: 'Radix Content modal FocusScope',
        evidence: `${RADIX_DIALOG_DOCS}#content ("traps focus while open"); vendored Content at dialog.tsx:61`,
      },
      {
        member: 'focusRestore', status: 'inherited-equivalent',
        mapsTo: 'Radix focus return to the trigger on close',
        evidence: `${RADIX_DIALOG_DOCS}#content (focus is returned to the trigger on close); vendored at dialog.tsx:61`,
      },
      {
        member: 'accessibleName', status: 'mapped', via: 'composition',
        mapsTo: 'DialogTitle child → Radix auto aria-labelledby; reference always renders a title from `label`',
        evidence: 'dialog.tsx:121-132 (DialogTitle wraps DialogPrimitive.Title); reference/edit-dialog.tsx',
      },
    ],
    props: [
      {
        member: 'open', status: 'mapped', via: 'radix',
        mapsTo: 'Dialog.Root `open` (controlled)',
        evidence: 'dialog.tsx:10-14',
      },
      {
        member: 'label', status: 'mapped', via: 'composition',
        mapsTo: 'reference renders label text as DialogTitle (accessible name source)',
        note: 'The vendored Root takes no `label` prop; the composition layer owns label→title (no behavior masked).',
        evidence: 'dialog.tsx:121-132; reference/edit-dialog.tsx',
      },
      {
        member: 'description', status: 'mapped', via: 'composition',
        mapsTo: 'reference renders optional DialogDescription → Radix aria-describedby',
        note: 'Upstream has no description prop; composition owns the description part.',
        evidence: 'dialog.tsx:134-145; reference/edit-dialog.tsx',
      },
    ],
    events: [
      {
        member: 'openChange', status: 'mapped', via: 'radix',
        mapsTo: 'Dialog.Root `onOpenChange(open: boolean)`; payload {open} matches the contract',
        note: 'Radix only fires on user dismiss gestures (Esc, Close, overlay); programmatic open prop changes do not fire — matches the contract clause.',
        evidence: 'dialog.tsx:10-14; ' + RADIX_DIALOG_DOCS + '#root',
      },
    ],
    state: [
      {
        member: 'ownership', status: 'mapped', via: 'radix',
        mapsTo: "Radix Dialog is controlled ('controlled' ownership): open + onOpenChange",
        evidence: 'dialog.tsx:10-14; ' + RADIX_DIALOG_DOCS + '#root',
      },
      {
        member: 'open', status: 'mapped', via: 'radix',
        mapsTo: 'state field open ↔ Root `open` prop',
        evidence: 'dialog.tsx:10-14',
      },
    ],
    parts: [
      {
        member: 'root', status: 'mapped', via: 'composition',
        mapsTo: 'DialogContent → Radix Content surface (role=dialog); composition adds aria-modal="true"',
        note: 'Radix enforces modality (FocusScope trap, outside inert) but @radix-ui/react-dialog@1.2.0 does not emit the aria-modal attribute; the reference sets it explicitly to satisfy parts.root (role=dialog, aria-modal=true).',
        evidence: 'dialog.tsx:50-82 (Content role=dialog, no aria-modal); @radix-ui/react-dialog@1.2.0 dist/index.mjs:259-264; reference/edit-dialog.tsx',
      },
      {
        member: 'title', status: 'mapped', via: 'radix',
        mapsTo: 'DialogTitle (Radix Title, aria-labelledby source)',
        evidence: 'dialog.tsx:121-132; ' + RADIX_DIALOG_DOCS + '#title',
      },
      {
        member: 'content', status: 'mapped', via: 'composition',
        mapsTo: 'children region inside Radix Content; description part wired by composition',
        note: 'Vendored shadcn exports no dedicated body part; content is the DialogContent children region.',
        evidence: 'dialog.tsx:50-69',
      },
    ],
    control: [
      {
        member: 'open', status: 'mapped', via: 'radix',
        mapsTo: 'host sets open=true (controlled Root); DialogTrigger also requests open',
        note: 'No imperative open() handle — consistent with the contract note that the host owns the open prop.',
        evidence: 'dialog.tsx:16-20 (DialogTrigger), 10-14 (Root)',
      },
      {
        member: 'close', status: 'mapped', via: 'radix',
        mapsTo: 'onOpenChange(false) and DialogPrimitive.Close (X affordance + footer close)',
        evidence: 'dialog.tsx:28-32,70-78,112-116; ' + RADIX_DIALOG_DOCS + '#close',
      },
      {
        member: 'focus', status: 'inherited-equivalent',
        mapsTo: 'on open Radix moves focus to the first focusable element inside Content',
        note: 'Realized automatically at open; Radix exposes no standalone imperative focus() method.',
        evidence: RADIX_DIALOG_DOCS + '#content ("focus is automatically moved... when it opens")',
      },
    ],
    accessibility: [
      {
        member: 'role', status: 'inherited-equivalent',
        mapsTo: 'Radix Content renders role="dialog"; modality is enforced by FocusScope trap + outside inert',
        note: '@radix-ui/react-dialog@1.2.0 renders role=dialog but no aria-modal attribute; the reference adds aria-modal="true" explicitly (see parts.root).',
        evidence: '@radix-ui/react-dialog@1.2.0 dist/index.mjs:259-264; vendored dialog.tsx:61',
      },
      {
        member: 'keyboard', status: 'inherited-equivalent',
        mapsTo: 'Escape requests close; Tab is trapped/cycled inside Content',
        evidence: RADIX_DIALOG_DOCS + '#content',
      },
      {
        member: 'focus', status: 'inherited-equivalent',
        mapsTo: 'autofocus on open, trap while open, restore on close',
        evidence: RADIX_DIALOG_DOCS + '#content',
      },
      {
        member: 'semanticRelations', status: 'inherited-equivalent',
        mapsTo: 'Radix Title/Description automatically wire aria-labelledby / aria-describedby',
        evidence: RADIX_DIALOG_DOCS + '#title + #description; vendored dialog.tsx:121-145',
      },
    ],
    lifecycle: [
      {
        member: 'requiresCleanup', status: 'inherited-equivalent',
        mapsTo: 'Radix removes portal, dismiss/focus listeners and restores focus on unmount/close',
        note: 'The cleanup obligation is satisfied inside the Radix base; the thin composition adds no persistent listeners.',
        evidence: RADIX_DIALOG_DOCS + '#content; vendored dialog.tsx:22-26 (Portal), 50-82 (Content)',
      },
    ],
    token: [
      {
        member: 'dialog.maxWidth', status: 'mapped', via: 'upstream-prop',
        mapsTo: 'DialogContent className "sm:max-w-lg" = 32rem = 512px',
        evidence: 'dialog.tsx:64', profileTokenKey: 'dialog.width.max',
      },
      {
        member: 'dialog.padding', status: 'mapped', via: 'upstream-prop',
        mapsTo: 'DialogContent "p-6" = 1.5rem = 24px',
        evidence: 'dialog.tsx:64', profileTokenKey: 'dialog.padding',
      },
      {
        member: 'dialog.gap', status: 'mapped', via: 'upstream-prop',
        mapsTo: 'DialogContent "gap-4" = 1rem = 16px',
        evidence: 'dialog.tsx:64', profileTokenKey: 'dialog.gap',
      },
      {
        member: 'dialog.radius', status: 'mapped', via: 'upstream-prop',
        mapsTo: 'DialogContent "rounded-lg" = 0.5rem = 8px',
        evidence: 'dialog.tsx:64', profileTokenKey: 'dialog.radius',
      },
      {
        member: 'dialog.overlayDuration', status: 'mapped', via: 'upstream-prop',
        mapsTo: 'Content "duration-200" = 200ms open/close transition',
        evidence: 'dialog.tsx:64', profileTokenKey: 'dialog.duration',
      },
      {
        member: 'control.height.md', status: 'mapped', via: 'upstream-prop',
        mapsTo: 'buttonVariants size.default "h-9" = 2.25rem = 36px',
        evidence: 'button.tsx:23', profileTokenKey: 'control.height.md',
      },
      {
        member: 'control.radius', status: 'mapped', via: 'upstream-prop',
        mapsTo: 'buttonVariants base classes "rounded-md" = 0.375rem = 6px',
        evidence: 'button.tsx:7', profileTokenKey: 'control.radius',
      },
      {
        member: 'spacing.scale', status: 'mapped', via: 'upstream-prop',
        mapsTo: 'Tailwind v4 spacing scale (1 unit = 0.25rem = 4px) consumed by p-*/gap-*/h-* utilities',
        evidence: 'dialog.tsx:64; button.tsx:23-30',
      },
    ],
  },
  upstreamExtras: [
    'DialogTrigger/DialogPortal/DialogOverlay/DialogHeader/DialogFooter are exported as composition parts beyond the frozen contract parts (root/title/content).',
    'showCloseButton prop on DialogContent/DialogFooter (vendored dialog.tsx:53,96) has no contract member.',
  ],
};

export const buttonMapping: ComponentMapping = {
  anchor: { componentType: BUTTON_COMPONENT_TYPE, contractVersion: CONTRACT_VERSION },
  domains: {
    features: [
      {
        member: 'disabled', status: 'mapped', via: 'native',
        mapsTo: 'native <button disabled> passed through props; "disabled:pointer-events-none disabled:opacity-50" styles',
        evidence: 'button.tsx:7,40-60',
      },
      {
        member: 'loading', status: 'unsupported',
        reason: 'shadcn Button exposes no loading prop and never sets aria-busy; the vendored component is a native button + cva variants only.',
        impact: 'Pending/duplicate-submit behavior for EditDialog is realized in composition (disabled + aria-busy in the reference); the upstream feature itself does not exist, so Button cannot be "supported".',
        evidence: 'button.tsx:40-61 (no loading/busy handling)',
      },
    ],
    props: [
      {
        member: 'disabled', status: 'mapped', via: 'native',
        mapsTo: 'native button disabled attribute via {...props}',
        evidence: 'button.tsx:58',
      },
      {
        member: 'loading', status: 'unsupported',
        reason: 'no loading prop upstream',
        impact: 'composition supplies aria-busy/disabled while pending',
        evidence: 'button.tsx:40-61',
      },
      {
        member: 'type', status: 'mapped', via: 'composition',
        mapsTo: 'native button type attribute; reference forces type="button" to match the contract default',
        note: 'Raw shadcn renders <button> without type, whose HTML default inside a form is "submit"; the composition layer sets the contract default "button".',
        evidence: 'button.tsx:50-59; reference/edit-dialog.tsx',
      },
    ],
    events: [
      {
        member: 'click', status: 'mapped', via: 'native',
        mapsTo: 'native click / keyboard activation; not fired while disabled (native semantics); loading suppression added in composition',
        evidence: 'button.tsx:50',
      },
    ],
    state: [
      {
        member: 'ownership', status: 'mapped', via: 'native',
        mapsTo: 'uncontrolled native button',
        evidence: 'button.tsx:40-61',
      },
      {
        member: 'disabled', status: 'mapped', via: 'native',
        mapsTo: 'disabled attribute',
        evidence: 'button.tsx:58',
      },
      {
        member: 'loading', status: 'unsupported',
        reason: 'no busy/loading state upstream',
        impact: 'represented in composition during pending only',
        evidence: 'button.tsx:40-61',
      },
    ],
    parts: [
      {
        member: 'root', status: 'mapped', via: 'native',
        mapsTo: 'the rendered <button> (or Radix Slot when asChild)',
        evidence: 'button.tsx:50-59',
      },
    ],
    control: [
      {
        member: 'focus', status: 'mapped', via: 'native',
        mapsTo: 'native HTMLButtonElement.focus()',
        evidence: 'button.tsx:50-59',
      },
    ],
    accessibility: [
      {
        member: 'role', status: 'inherited-equivalent',
        mapsTo: 'native <button> implicit role=button',
        evidence: 'button.tsx:50-59',
      },
      {
        member: 'keyboard', status: 'inherited-equivalent',
        mapsTo: 'native Enter/Space button activation',
        evidence: 'button.tsx:50-59',
      },
      {
        member: 'focus', status: 'inherited-equivalent',
        mapsTo: 'native focusable button',
        evidence: 'button.tsx:50-59',
      },
      {
        member: 'semanticRelations', status: 'inherited-equivalent',
        mapsTo: 'none required: the contract declares semanticRelations=false for Button',
        reason: 'Contract member value is false (no ARIA relation obligation); native button needs no relations.',
        evidence: 'button-contract.ts semanticRelations:false',
      },
    ],
    lifecycle: [
      {
        member: 'requiresCleanup', status: 'inherited-equivalent',
        mapsTo: 'native button; Radix Slot holds no resources requiring adapter cleanup',
        reason: 'Contract declares requiresCleanup=false; a plain native button needs no teardown.',
        evidence: 'button.tsx:40-61',
      },
    ],
    token: [
      {
        member: 'variant.default', status: 'mapped', via: 'upstream-prop',
        mapsTo: 'cva variant "default"',
        evidence: 'button.tsx:11',
      },
      {
        member: 'variant.destructive', status: 'mapped', via: 'upstream-prop',
        mapsTo: 'cva variant "destructive" (danger actions)',
        evidence: 'button.tsx:13',
      },
      {
        member: 'variant.outline', status: 'mapped', via: 'upstream-prop',
        mapsTo: 'cva variant "outline" (cancel/secondary close actions in EditDialog)',
        evidence: 'button.tsx:15',
      },
      {
        member: 'variant.secondary', status: 'mapped', via: 'upstream-prop',
        mapsTo: 'cva variant "secondary"',
        evidence: 'button.tsx:17-18',
      },
      {
        member: 'control.height.sm', status: 'mapped', via: 'upstream-prop',
        mapsTo: 'cva size "sm" h-8 = 2rem = 32px',
        evidence: 'button.tsx:25', profileTokenKey: 'control.height.sm',
      },
      {
        member: 'control.height.md', status: 'mapped', via: 'upstream-prop',
        mapsTo: 'cva size "default" h-9 = 36px',
        evidence: 'button.tsx:23', profileTokenKey: 'control.height.md',
      },
      {
        member: 'control.height.lg', status: 'mapped', via: 'upstream-prop',
        mapsTo: 'cva size "lg" h-10 = 2.5rem = 40px',
        evidence: 'button.tsx:26', profileTokenKey: 'control.height.lg',
      },
      {
        member: 'control.radius', status: 'mapped', via: 'upstream-prop',
        mapsTo: '"rounded-md" = 6px',
        evidence: 'button.tsx:7', profileTokenKey: 'control.radius',
      },
    ],
  },
  upstreamExtras: [
    'cva variants ghost/link and sizes xs/icon/icon-xs/icon-sm/icon-lg (button.tsx:19-30) have no contract member.',
    'asChild + Radix Slot composition (button.tsx:4,44-51) has no contract member.',
  ],
};

export const textInputMapping: ComponentMapping = {
  anchor: { componentType: TEXT_INPUT_COMPONENT_TYPE, contractVersion: CONTRACT_VERSION },
  domains: {
    features: [
      {
        member: 'disabled', status: 'mapped', via: 'native',
        mapsTo: 'native input disabled via {...props}',
        evidence: 'input.tsx:8-16',
      },
      {
        member: 'readOnly', status: 'mapped', via: 'native',
        mapsTo: 'native input readOnly (focusable, not editable)',
        evidence: 'input.tsx:8-16',
      },
      {
        member: 'error', status: 'mapped', via: 'composition',
        mapsTo: 'composition sets aria-invalid; upstream ships aria-invalid:* visual variants but no error prop',
        evidence: 'input.tsx:11 (aria-invalid utility classes); reference wrapper',
      },
      {
        member: 'name', status: 'mapped', via: 'native',
        mapsTo: 'native input name attribute',
        evidence: 'input.tsx:8-16',
      },
      {
        member: 'description', status: 'mapped', via: 'composition',
        mapsTo: 'composition renders a description element and wires aria-describedby (vendored Input has none)',
        evidence: 'reference/edit-dialog.tsx',
      },
      {
        member: 'controlled', status: 'mapped', via: 'native',
        mapsTo: 'React controlled input (value/onChange); defaultValue supported when uncontrolled',
        note: 'Hybrid ownership is native React input behavior; the wrapper never mutates a provided value.',
        evidence: 'input.tsx:8-16',
      },
    ],
    props: [
      {
        member: 'value', status: 'mapped', via: 'native',
        mapsTo: 'controlled value via {...props}',
        evidence: 'input.tsx:15',
      },
      {
        member: 'defaultValue', status: 'mapped', via: 'native',
        mapsTo: 'native defaultValue for uncontrolled initialization',
        evidence: 'input.tsx:8-16',
      },
      {
        member: 'disabled', status: 'mapped', via: 'native',
        mapsTo: 'disabled attribute',
        evidence: 'input.tsx:15',
      },
      {
        member: 'readOnly', status: 'mapped', via: 'native',
        mapsTo: 'readOnly attribute',
        evidence: 'input.tsx:8-16',
      },
      {
        member: 'error', status: 'mapped', via: 'composition',
        mapsTo: 'aria-invalid attribute on the native input',
        evidence: 'input.tsx:11; reference wrapper',
      },
      {
        member: 'name', status: 'mapped', via: 'native',
        mapsTo: 'name attribute',
        evidence: 'input.tsx:8-16',
      },
      {
        member: 'description', status: 'mapped', via: 'composition',
        mapsTo: 'aria-describedby + description element',
        evidence: 'reference wrapper',
      },
      {
        member: 'placeholder', status: 'mapped', via: 'native',
        mapsTo: 'placeholder attribute',
        evidence: 'input.tsx:8-16',
      },
      {
        member: 'type', status: 'mapped', via: 'native',
        mapsTo: 'native input type; all contracted values text/email/password/number/search/tel/url are valid HTML input types',
        evidence: 'input.tsx:9,11',
      },
    ],
    events: [
      {
        member: 'valueChange', status: 'mapped', via: 'composition',
        mapsTo: 'onChange adapter: event.target.value; suppressed natively when disabled/readOnly; never fired by programmatic value sets',
        evidence: 'input.tsx:8-16; reference wrapper',
      },
    ],
    state: [
      {
        member: 'ownership', status: 'mapped', via: 'native',
        mapsTo: 'hybrid: controlled while value provided, otherwise uncontrolled from defaultValue (native React semantics)',
        evidence: 'input.tsx:8-16',
      },
      {
        member: 'value', status: 'mapped', via: 'native',
        mapsTo: 'input value field',
        evidence: 'input.tsx:8-16',
      },
    ],
    parts: [
      {
        member: 'root', status: 'mapped', via: 'native',
        mapsTo: 'the rendered <input> (InputPrimitive forwards props to a native input)',
        evidence: 'input.tsx:8-18',
      },
      {
        member: 'description', status: 'mapped', via: 'composition',
        mapsTo: 'description element rendered by the wrapper, referenced via aria-describedby',
        evidence: 'reference wrapper',
      },
    ],
    control: [
      {
        member: 'focus', status: 'mapped', via: 'native',
        mapsTo: 'native HTMLInputElement.focus()',
        evidence: 'input.tsx:8-18',
      },
    ],
    accessibility: [
      {
        member: 'role', status: 'inherited-equivalent',
        mapsTo: 'native single-line <input> implicit role=textbox',
        evidence: 'input.tsx:8-18',
      },
      {
        member: 'keyboard', status: 'inherited-equivalent',
        mapsTo: 'native text entry keyboard semantics',
        evidence: 'input.tsx:8-18',
      },
      {
        member: 'focus', status: 'inherited-equivalent',
        mapsTo: 'native focusable input',
        evidence: 'input.tsx:8-18',
      },
      {
        member: 'semanticRelations', status: 'mapped', via: 'composition',
        mapsTo: 'aria-invalid (error), aria-describedby (description); name exposed via aria-label when provided',
        note: 'Native name does not imply aria-label; the composition adds the accessible-name wiring the contract describes.',
        evidence: 'input.tsx:11; reference wrapper',
      },
    ],
    lifecycle: [
      {
        member: 'requiresCleanup', status: 'inherited-equivalent',
        mapsTo: 'native input; no resources requiring adapter cleanup',
        reason: 'Contract declares requiresCleanup=false.',
        evidence: 'input.tsx:4-20',
      },
    ],
    token: [
      {
        member: 'control.height.md', status: 'mapped', via: 'upstream-prop',
        mapsTo: 'Input "h-9" = 36px',
        evidence: 'input.tsx:11', profileTokenKey: 'control.height.md',
      },
      {
        member: 'control.radius', status: 'mapped', via: 'upstream-prop',
        mapsTo: '"rounded-md" = 6px',
        evidence: 'input.tsx:11', profileTokenKey: 'control.radius',
      },
    ],
  },
  upstreamExtras: [
    'file: variant utilities and md:text-sm responsive sizing (input.tsx:11) have no contract member.',
  ],
};

export const componentMappings: readonly ComponentMapping[] = [dialogMapping, buttonMapping, textInputMapping];
