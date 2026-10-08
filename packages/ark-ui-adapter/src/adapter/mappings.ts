import {
  BUTTON_COMPONENT_TYPE,
  DIALOG_COMPONENT_TYPE,
  TEXT_INPUT_COMPONENT_TYPE,
} from '@future-ui/react-provider';

import {
  CONTRACT_VERSION,
  arkSurfaceFacts,
  dialogPropEvidence,
  fieldPropEvidence,
} from '../ark-provenance.js';
import type { ArkComponentMapping } from './types.js';

const ARK_DIALOG_DOCS = dialogPropEvidence.docs;
const ARK_FIELD_DOCS = fieldPropEvidence.docs;
const ZAG_DIALOG_TYPES = `${dialogPropEvidence.package} ${dialogPropEvidence.source}`;
const NO_BUTTON_NOTE = arkSurfaceFacts.buttonPrimitive.note;
const NATIVE_BUTTON_SEMANTICS =
  'MDN/HTML platform semantics of the native <button> this composition renders: implicit role=button, Enter/Space activation, native focusability (https://developer.mozilla.org/docs/Web/HTML/Element/button)';
const NATIVE_INPUT_SEMANTICS =
  'MDN/HTML platform semantics of the native <input> that Field.Input renders: native text entry, keyboard editing and focusability (https://developer.mozilla.org/docs/Web/HTML/Element/input)';

/**
 * Headless visual-layer conclusion shared by all three components. Ark ships
 * zero CSS, so the D16 visual token layer is honestly UNSUPPORTED here; this
 * is the deliberate contrast with the shadcn (Tailwind) adapter and is the
 * sole reason an otherwise-semantically-supported component reports partial.
 */
const HEADLESS_TOKEN = {
  member: 'visual-layer',
  status: 'unsupported' as const,
  reason:
    '@ark-ui/react@5.39.3 is headless: it emits semantics/ARIA but ships no CSS, theme or design tokens, so no contract visual token can map to an upstream-provided value.',
  impact:
    'All visuals (width/padding/radius/size/variant appearance) are the host application’s responsibility. The adapter is a semantic/behavioral contrast column, not a visual one; jsdom asserts structure/behavior, never pixels.',
  evidence: 'pinned package dist contains JS/.d.ts only, no stylesheet entry; ' + ARK_DIALOG_DOCS,
};

export const arkDialogMapping: ArkComponentMapping = {
  anchor: { componentType: DIALOG_COMPONENT_TYPE, contractVersion: CONTRACT_VERSION },
  domains: {
    features: [
      { member: 'open', status: 'mapped', via: 'ark-primitive', mapsTo: 'Dialog.Root controlled `open` prop', evidence: ZAG_DIALOG_TYPES },
      { member: 'escapeClose', status: 'mapped', via: 'ark-primitive', mapsTo: dialogPropEvidence.escape + '; dismiss handled by the zag dialog machine', evidence: ZAG_DIALOG_TYPES },
      { member: 'focusTrap', status: 'mapped', via: 'ark-primitive', mapsTo: dialogPropEvidence.trapFocus + ' (FocusTrap via @zag-js/focus-trap)', evidence: ZAG_DIALOG_TYPES },
      { member: 'focusRestore', status: 'mapped', via: 'ark-primitive', mapsTo: dialogPropEvidence.restoreFocus + ' + ' + dialogPropEvidence.finalFocusEl, evidence: ZAG_DIALOG_TYPES },
      { member: 'accessibleName', status: 'mapped', via: 'ark-primitive', mapsTo: 'Dialog.Title → zag auto-generated aria-labelledby; the wrapper always renders the `label` as Title', evidence: ARK_DIALOG_DOCS },
    ],
    props: [
      { member: 'open', status: 'mapped', via: 'ark-primitive', mapsTo: dialogPropEvidence.controlledOpen, evidence: ZAG_DIALOG_TYPES },
      { member: 'label', status: 'mapped', via: 'composition', mapsTo: 'wrapper renders the label string as Dialog.Title (accessible-name source); Ark Root takes no label prop', evidence: ARK_DIALOG_DOCS },
      { member: 'description', status: 'mapped', via: 'composition', mapsTo: 'wrapper renders an optional Dialog.Description → zag aria-describedby', evidence: ARK_DIALOG_DOCS },
    ],
    events: [
      {
        member: 'openChange', status: 'mapped', via: 'ark-primitive',
        mapsTo: dialogPropEvidence.changeEvent + ' — fires only on user dismiss (Esc/CloseTrigger/outside), never on programmatic open prop changes',
        note: 'Matches the contract clause that programmatic open changes do not fire openChange (asserted by render test).',
        evidence: ZAG_DIALOG_TYPES,
      },
    ],
    state: [
      { member: 'ownership', status: 'mapped', via: 'ark-primitive', mapsTo: 'controlled: open + onOpenChange (host owns open)', evidence: ZAG_DIALOG_TYPES },
      { member: 'open', status: 'mapped', via: 'ark-primitive', mapsTo: 'state field open ↔ Root `open`', evidence: ZAG_DIALOG_TYPES },
    ],
    parts: [
      {
        member: 'root', status: 'mapped', via: 'composition',
        mapsTo: 'Dialog.Positioner > Dialog.Content surface; zag Content emits role="dialog" (' + dialogPropEvidence.role + '), and the wrapper guarantees the parts.root contract by ensuring aria-modal="true" on the surface',
        note: 'Modality (focus trap + inert outside) is provided by zag with modal default true; the wrapper does not restyle, only pins the required attribute.',
        evidence: ZAG_DIALOG_TYPES,
      },
      { member: 'title', status: 'mapped', via: 'ark-primitive', mapsTo: 'Dialog.Title (labelledby source)', evidence: ARK_DIALOG_DOCS },
      { member: 'content', status: 'mapped', via: 'composition', mapsTo: 'children region inside Dialog.Content; optional Description part wired by the wrapper', note: 'Ark exposes no dedicated body part beyond Content children.', evidence: ARK_DIALOG_DOCS },
    ],
    control: [
      { member: 'open', status: 'mapped', via: 'ark-primitive', mapsTo: 'host sets open=true on Root; Dialog.Trigger also requests open (upstream extra)', evidence: ZAG_DIALOG_TYPES },
      { member: 'close', status: 'mapped', via: 'ark-primitive', mapsTo: 'onOpenChange(false) on dismiss and Dialog.CloseTrigger', evidence: ZAG_DIALOG_TYPES },
      { member: 'focus', status: 'inherited-equivalent', mapsTo: 'on open zag moves focus per ' + dialogPropEvidence.initialFocusEl + ' (default first focusable); no standalone imperative focus() is exposed', evidence: ZAG_DIALOG_TYPES },
    ],
    accessibility: [
      { member: 'role', status: 'inherited-equivalent', mapsTo: 'zag Content renders role="dialog" (' + dialogPropEvidence.role + ')', evidence: ZAG_DIALOG_TYPES },
      { member: 'keyboard', status: 'inherited-equivalent', mapsTo: 'Escape requests close (closeOnEscape default true); Tab cycles inside trapped Content', evidence: ZAG_DIALOG_TYPES },
      { member: 'focus', status: 'inherited-equivalent', mapsTo: 'autofocus on open, trap while open (trapFocus), restore on close (restoreFocus/finalFocusEl)', evidence: ZAG_DIALOG_TYPES },
      { member: 'semanticRelations', status: 'inherited-equivalent', mapsTo: 'Dialog.Title / Dialog.Description auto-wire aria-labelledby / aria-describedby via generated ids', evidence: ARK_DIALOG_DOCS },
    ],
    lifecycle: [
      { member: 'requiresCleanup', status: 'inherited-equivalent', mapsTo: 'zag presence unmounts the portal and the dismissable/focus-trap listeners and restores focus; the thin wrapper adds no persistent listeners', evidence: ZAG_DIALOG_TYPES },
    ],
    token: [HEADLESS_TOKEN],
  },
  upstreamExtras: [
    'Dialog.Trigger / Backdrop / Positioner and lazyMount/unmountOnExit presence props have no contract part.',
    'role="alertdialog", onPointerDownOutside/onInteractOutside and triggerValue are zag extras with no contract member.',
  ],
};

export const arkButtonMapping: ArkComponentMapping = {
  anchor: { componentType: BUTTON_COMPONENT_TYPE, contractVersion: CONTRACT_VERSION },
  domains: {
    features: [
      { member: 'disabled', status: 'mapped', via: 'native', mapsTo: 'native <button disabled> forwarded by the composition', evidence: NO_BUTTON_NOTE },
      {
        member: 'loading', status: 'unsupported',
        reason: NO_BUTTON_NOTE + ' Ark exposes no loading/busy concept on any button surface.',
        impact: 'Pending/anti-double-submit is realized by the HOST (disabled + aria-busy); the primitive cannot be called “supported” for loading. The adapter never invents a fake Ark Button to supply it.',
      },
    ],
    props: [
      { member: 'disabled', status: 'mapped', via: 'native', mapsTo: 'native button disabled attribute', evidence: NO_BUTTON_NOTE },
      { member: 'loading', status: 'unsupported', reason: 'no Ark button primitive and no loading prop exist', impact: 'host projects aria-busy/disabled while pending' },
      { member: 'type', status: 'mapped', via: 'composition', mapsTo: 'native button type attribute; wrapper defaults type="button" to match the frozen contract default (raw native defaults to submit inside a form)' },
    ],
    events: [
      { member: 'click', status: 'mapped', via: 'native', mapsTo: 'native pointer/keyboard activation; not fired while disabled (native semantics)' },
    ],
    state: [
      { member: 'ownership', status: 'mapped', via: 'native', mapsTo: 'uncontrolled native button' },
      { member: 'disabled', status: 'mapped', via: 'native', mapsTo: 'disabled attribute' },
      { member: 'loading', status: 'unsupported', reason: 'no busy/loading state on any Ark surface', impact: 'represented by host pending state only' },
    ],
    parts: [
      { member: 'root', status: 'mapped', via: 'native', mapsTo: 'the rendered native <button>; honestly a platform/native composition because no Ark Button primitive exists (not claimed as an Ark export)', evidence: NO_BUTTON_NOTE },
    ],
    control: [
      { member: 'focus', status: 'mapped', via: 'native', mapsTo: 'native HTMLButtonElement.focus()' },
    ],
    accessibility: [
      { member: 'role', status: 'inherited-equivalent', mapsTo: 'native <button> implicit role=button', evidence: NATIVE_BUTTON_SEMANTICS },
      { member: 'keyboard', status: 'inherited-equivalent', mapsTo: 'native Enter/Space activation', evidence: NATIVE_BUTTON_SEMANTICS },
      { member: 'focus', status: 'inherited-equivalent', mapsTo: 'native focusable button', evidence: NATIVE_BUTTON_SEMANTICS },
      { member: 'semanticRelations', status: 'inherited-equivalent', mapsTo: 'none required: the frozen contract declares semanticRelations=false for Button', reason: 'No ARIA relation obligation for a native button.', evidence: NATIVE_BUTTON_SEMANTICS },
    ],
    lifecycle: [
      { member: 'requiresCleanup', status: 'inherited-equivalent', mapsTo: 'native button holds no resources', reason: 'Frozen contract declares requiresCleanup=false.', evidence: NATIVE_BUTTON_SEMANTICS },
    ],
    token: [HEADLESS_TOKEN],
  },
  upstreamExtras: [
    'The polymorphic `ark.button` factory exists but is a generic native-element renderer, not a Button component; it is intentionally not treated as an Ark Button primitive.',
  ],
};

export const arkTextInputMapping: ArkComponentMapping = {
  anchor: { componentType: TEXT_INPUT_COMPONENT_TYPE, contractVersion: CONTRACT_VERSION },
  domains: {
    features: [
      { member: 'disabled', status: 'mapped', via: 'ark-primitive', mapsTo: 'Field.Root `disabled` propagates to Field.Input via getInputProps()', evidence: fieldPropEvidence.rootProps + '; ' + fieldPropEvidence.inputImpl },
      { member: 'readOnly', status: 'mapped', via: 'ark-primitive', mapsTo: 'Field.Root `readOnly` + native input readOnly (focusable, not editable)', evidence: fieldPropEvidence.rootProps },
      { member: 'error', status: 'mapped', via: 'ark-primitive', mapsTo: 'Field.Root `invalid` → Field.Input aria-invalid; wrapper maps contract `error` → `invalid`', evidence: fieldPropEvidence.inputImpl },
      { member: 'name', status: 'mapped', via: 'composition', mapsTo: 'native input name plus wrapper-emitted aria-label from name (contract clause: name maps to aria-label when provided)', evidence: fieldPropEvidence.inputImpl },
      { member: 'description', status: 'mapped', via: 'ark-primitive', mapsTo: 'Field.HelperText is auto-wired by Field into the input aria-describedby (ids.helperText via getInputProps)', evidence: fieldPropEvidence.rootProps },
      { member: 'controlled', status: 'mapped', via: 'native', mapsTo: 'React controlled value/onChange on Field.Input; defaultValue when uncontrolled; wrapper never mutates a provided value' },
    ],
    props: [
      { member: 'value', status: 'mapped', via: 'native', mapsTo: 'controlled value on the native input that Field.Input renders' },
      { member: 'defaultValue', status: 'mapped', via: 'native', mapsTo: 'native defaultValue for uncontrolled initialization' },
      { member: 'disabled', status: 'mapped', via: 'ark-primitive', mapsTo: 'Field.Root disabled → getInputProps().disabled' },
      { member: 'readOnly', status: 'mapped', via: 'native', mapsTo: 'readOnly attribute (Field context + input)' },
      { member: 'error', status: 'mapped', via: 'composition', mapsTo: 'wrapper maps error→invalid; Field.Input emits aria-invalid' },
      { member: 'name', status: 'mapped', via: 'composition', mapsTo: 'name attribute + wrapper aria-label' },
      { member: 'description', status: 'mapped', via: 'composition', mapsTo: 'Field.HelperText child rendered from `description`, auto aria-describedby by Field' },
      { member: 'placeholder', status: 'mapped', via: 'native', mapsTo: 'placeholder attribute on Field.Input' },
      {
        member: 'type', status: 'mapped', via: 'native',
        mapsTo: 'native input type; all seven contracted values are valid HTML types',
        note: 'All type VALUES work, but they do not share one implicit ARIA role — see accessibility.role (unsupported).',
      },
    ],
    events: [
      { member: 'valueChange', status: 'mapped', via: 'composition', mapsTo: 'wrapper onChange emits the contract payload { value: event.target.value }; suppressed while disabled/readOnly; never fired by programmatic value sets', note: 'This adapter has no appId concept; payload carries only the contract-owned `value`.' },
    ],
    state: [
      { member: 'ownership', status: 'mapped', via: 'native', mapsTo: 'hybrid: controlled while value provided, otherwise uncontrolled from defaultValue (native React semantics)' },
      { member: 'value', status: 'mapped', via: 'native', mapsTo: 'input value field' },
    ],
    parts: [
      { member: 'root', status: 'mapped', via: 'ark-primitive', mapsTo: 'Field.Input renders a real native input (' + fieldPropEvidence.inputImpl + ')' },
      { member: 'description', status: 'mapped', via: 'composition', mapsTo: 'Field.HelperText element referenced by Field auto aria-describedby' },
    ],
    control: [
      { member: 'focus', status: 'mapped', via: 'native', mapsTo: 'native HTMLInputElement.focus()' },
    ],
    accessibility: [
      {
        member: 'role', status: 'unsupported',
        reason:
          'The frozen contract declares accessibility.role="textbox" for the whole TextInput while props.type allows text/email/password/number/search/tel/url. The native input Field.Input renders has type-dependent implicit roles (number=spinbutton, search=searchbox, password has no corresponding ARIA role); one input cannot satisfy role=textbox for every contracted type, and the frozen contract cannot be changed in Phase C.',
        impact:
          'TextInput is partial: text/email/tel/url meet role=textbox; number/search/password do not. This is the SAME frozen-contract tension the shadcn column independently records — it is a contract-shape observation, not an Ark defect. A per-type role policy would require a future contract version (out of scope).',
        evidence: 'MDN <input> implicit roles; ' + fieldPropEvidence.inputImpl + ' (renders one ark.input with forwarded type); ' + ARK_FIELD_DOCS,
      },
      { member: 'keyboard', status: 'inherited-equivalent', mapsTo: 'native text-entry keyboard semantics for the requested type', evidence: NATIVE_INPUT_SEMANTICS },
      { member: 'focus', status: 'inherited-equivalent', mapsTo: 'native focusable input', evidence: NATIVE_INPUT_SEMANTICS },
      { member: 'semanticRelations', status: 'mapped', via: 'ark-primitive', mapsTo: 'Field auto aria-describedby (helper/error) + control id; wrapper adds aria-label from name and Field invalid supplies aria-invalid', evidence: fieldPropEvidence.rootProps },
    ],
    lifecycle: [
      { member: 'requiresCleanup', status: 'inherited-equivalent', mapsTo: 'native input; Field context holds no resource requiring adapter teardown', reason: 'Frozen contract declares requiresCleanup=false.', evidence: NATIVE_INPUT_SEMANTICS },
    ],
    token: [HEADLESS_TOKEN],
  },
  upstreamExtras: [
    'Field.Root `required` + Field.RequiredIndicator, Field.ErrorText (invalid) and Field.Textarea/Field.Select are Ark field members with no contract member.',
    'Field uses stable generated ids (ids.{control,label,helperText,errorText}); id generation is an upstream extra.',
  ],
};

export const arkComponentMappings: readonly ArkComponentMapping[] = [
  arkDialogMapping,
  arkButtonMapping,
  arkTextInputMapping,
];
