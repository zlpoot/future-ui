import { createContext, useContext, useMemo, type CSSProperties, type ReactNode } from 'react';
import type { JSX } from 'react';

/**
 * Public theme surface (#20). Token keys are declared as CSS variables
 * (--future-ui-*); parts are consumed via public data-part attributes on
 * components; variants resolve to token overrides. Theme application is
 * purely visual — it never changes structure, behavior or business state.
 */

export interface ThemeTokens {
  [cssVar: string]: string;
}

export interface ThemePart {
  /** tokenKey -> cssVar mapping (e.g. { background: '--future-ui-bg' }). */
  tokens?: Record<string, string>;
}

export interface ThemeParts {
  [partId: string]: ThemePart;
}

export interface ThemeVariant {
  /** tokenKey -> value overrides (e.g. { color: 'red' }). */
  tokens: Record<string, string>;
}

export interface ThemeVariants {
  [variantId: string]: ThemeVariant;
}

export interface ThemeDefinition {
  name: string;
  tokens: ThemeTokens;
  parts?: ThemeParts;
  variants?: ThemeVariants;
  defaultVariant?: string;
}

export interface ThemeContextValue {
  /** Current theme definition (the single visual source). */
  theme: ThemeDefinition;
  /** CSS variables to apply on the theme surface (merged base + variant). */
  styleVars: CSSProperties;
  /** Resolve a variant id to merged token overrides; '' or unknown -> {} (no-op). */
  resolveVariant: (variantId?: string) => ThemeTokens;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function styleVarsFor(theme: ThemeDefinition): CSSProperties {
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(theme.tokens)) {
    vars[key] = value;
  }
  return vars as CSSProperties;
}

/**
 * ThemeProvider — optional visual surface. Injects data-theme and CSS
 * variable tokens onto its container; exposes resolveVariant for components.
 * Switching themes only changes visual tokens: no component event fires, no
 * business/capability state changes, no provider-private DOM is read.
 */
export function ThemeProvider({
  theme,
  children,
}: {
  theme: ThemeDefinition;
  children: ReactNode;
}): JSX.Element {
  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      styleVars: styleVarsFor(theme),
      resolveVariant: (variantId?: string): ThemeTokens => {
        if (!variantId) return {};
        const variant = theme.variants?.[variantId];
        return variant?.tokens ?? {};
      },
    }),
    [theme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <div
        data-theme={theme.name}
        style={value.styleVars}
        className="future-ui-theme-surface"
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

/** Reads the enclosing theme context; returns a null-safe fallback. */
export function useTheme(): ThemeContextValue | null {
  return useContext(ThemeContext);
}

/**
 * Resolve the merged CSS variables for a variant, for a component part.
 * Pure visual tokens only; never mutates state or fires events.
 */
export function useVariantTokens(variantId?: string): ThemeTokens {
  const ctx = useTheme();
  return useMemo(() => ctx?.resolveVariant(variantId) ?? {}, [ctx, variantId]);
}
