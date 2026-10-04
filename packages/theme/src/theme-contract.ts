import { validateComponent, type ComponentContract, type Diagnostic } from '@future-ui/contracts';

export const THEME_COMPONENT_TYPE = 'future-ui.theme';

/**
 * Theme contract (D08 / #20) — the theme mechanism is OPTIONAL and never a
 * provider-private DOM dependency:
 *
 * - tokens: public CSS variable names (--future-ui-*) mapped to values;
 *   focus visibility / error / state cues are declared as tokens so the
 *   visual accessibility obligations (focus ring, contrast, error cues) have
 *   a deterministic public surface.
 * - parts: public partId -> token mapping (consumed via data-part DOM
 *   attributes, never private classes).
 * - variants: variantId -> token overrides; variant resolution only changes
 *   visual tokens — never structure, behavior or business/capability state.
 *
 * Theme switching must not fire component events or mutate business state;
 * there is no runtime provider hot-replacement in this round (#20 禁止).
 */
export const themeContract: ComponentContract = {
  componentType: THEME_COMPONENT_TYPE,
  contractVersion: '1.0.0',
  features: {
    tokens: true,
    parts: true,
    variants: true,
    switchable: true,
    hotSwap: false,
  },
  props: {
    tokens: {
      type: 'object',
      default: {},
      required: false,
      description: 'Public CSS variable tokens: {--future-ui-*: value}. Focus/error/state cues declared here.',
    },
    parts: {
      type: 'object',
      default: {},
      required: false,
      description: 'Public partId -> { tokens?: Record<tokenKey, cssVar> } mappings, consumed via data-part.',
    },
    variants: {
      type: 'object',
      default: {},
      required: false,
      description: 'variantId -> { tokens: Record<tokenKey, value> } overrides; resolution is purely visual.',
    },
    defaultVariant: { type: 'string', default: '', required: false, description: 'Variant applied when components request none.' },
  },
  events: {},
  state: {
    ownership: 'controlled',
    fields: {},
  },
  parts: {
    root: { required: true, description: 'The theme surface; injects data-theme and CSS variable tokens.' },
  },
  control: {},
  accessibility: {
    role: 'none',
    keyboard: false,
    focus: false,
    semanticRelations: false,
    description: 'Theme has no interactive semantics; focus visibility and error cues are token-declared, visual verification is part of combined acceptance.',
  },
  lifecycle: {
    requiresCleanup: false,
  },
};

/** Structural check against the frozen M0-02 Component schema (D14 rule 3). */
export function validateThemeContract(): Diagnostic[] {
  return validateComponent(themeContract).diagnostics;
}
