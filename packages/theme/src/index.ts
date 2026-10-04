/**
 * @future-ui/theme — optional first-round theme mechanism (D08 / #20).
 *
 * Public token/parts/variants consumed through public DOM contracts
 * (data-part attributes + --future-ui-* CSS variables). Theme application is
 * purely visual: it never changes structure/behavior semantics or
 * business/capability state; there is no runtime provider hot-replacement in
 * this round.
 */
export { ThemeProvider, useTheme, useVariantTokens } from './provider.js';
export type {
  ThemeContextValue,
  ThemeDefinition,
  ThemePart,
  ThemeParts,
  ThemeTokens,
  ThemeVariant,
  ThemeVariants,
} from './provider.js';
export { themeContract, THEME_COMPONENT_TYPE, validateThemeContract } from './theme-contract.js';
