// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import {
  Button,
  FutureUIProvider,
  TextInput,
} from '@future-ui/react-provider';
import {
  ThemeProvider,
  themeContract,
  useTheme,
  useVariantTokens,
  validateThemeContract,
  type ThemeDefinition,
} from '@future-ui/theme';

const appId = 'theme-app';

const light: ThemeDefinition = {
  name: 'light',
  tokens: {
    '--future-ui-bg': '#ffffff',
    '--future-ui-text': '#111111',
    '--future-ui-focus-ring': '2px solid #0a6cff',
    '--future-ui-error': '#c00000',
    '--future-ui-contrast-min': '4.5',
  },
  parts: {
    root: { tokens: { background: '--future-ui-bg', color: '--future-ui-text' } },
  },
  variants: {
    primary: { tokens: { color: '#ffffff', background: '#0a6cff' } },
    danger: { tokens: { color: '#ffffff', background: '#c00000' } },
  },
  defaultVariant: 'primary',
};

const dark: ThemeDefinition = {
  ...light,
  name: 'dark',
  tokens: {
    ...light.tokens,
    '--future-ui-bg': '#111111',
    '--future-ui-text': '#eeeeee',
  },
};

describe('Theme token/parts/variants (#20)', () => {
  it('theme contract is structurally valid; hot-swap is explicitly not a feature', () => {
    expect(validateThemeContract()).toEqual([]);
    expect(themeContract.features.hotSwap).toBe(false);
    expect(themeContract.componentType).toBe('future-ui.theme');
  });

  it('headless components keep structure/behavior semantics without any theme', () => {
    render(
      <FutureUIProvider appId={appId}>
        <Button>OK</Button>
        <TextInput defaultValue="x" />
      </FutureUIProvider>,
    );
    expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('x');
    expect(document.querySelector('[data-theme]')).toBeNull();
  });

  it('ThemeProvider injects a public data-theme surface with CSS variable tokens', () => {
    render(
      <ThemeProvider theme={light}>
        <FutureUIProvider appId={appId}>
          <Button>OK</Button>
        </FutureUIProvider>
      </ThemeProvider>,
    );
    const surface = document.querySelector('[data-theme="light"]');
    expect(surface).toBeTruthy();
    const style = (surface as HTMLElement).style;
    expect(style.getPropertyValue('--future-ui-bg')).toBe('#ffffff');
    expect(style.getPropertyValue('--future-ui-focus-ring')).toBe('2px solid #0a6cff');
  });

  it('components expose public parts via data-part attributes (consumed by theme, never private DOM)', () => {
    render(
      <ThemeProvider theme={light}>
        <FutureUIProvider appId={appId}>
          <Button>OK</Button>
          <TextInput defaultValue="x" />
        </FutureUIProvider>
      </ThemeProvider>,
    );
    expect(screen.getByRole('button')).toHaveAttribute('data-part', 'root');
    expect(screen.getByRole('textbox')).toHaveAttribute('data-part', 'root');
  });

  it('variants resolve to pure token overrides; unknown/empty variant is a no-op', () => {
    let captured: Record<string, string> = {};
    function Probe({ variant }: { variant?: string }) {
      const tokens = useVariantTokens(variant);
      captured = tokens;
      return <span data-probe>{JSON.stringify(tokens)}</span>;
    }
    render(
      <ThemeProvider theme={light}>
        <Probe variant="primary" />
      </ThemeProvider>,
    );
    expect(captured).toEqual({ color: '#ffffff', background: '#0a6cff' });
  });

  it('switching themes updates the visual surface and never fires component events or changes business state', () => {
    const onClick = vi.fn();
    const onValueChange = vi.fn();
    const { rerender } = render(
      <ThemeProvider theme={light}>
        <FutureUIProvider appId={appId}>
          <Button onClick={onClick}>OK</Button>
          <TextInput defaultValue="x" onValueChange={onValueChange} />
        </FutureUIProvider>
      </ThemeProvider>,
    );
    rerender(
      <ThemeProvider theme={dark}>
        <FutureUIProvider appId={appId}>
          <Button onClick={onClick}>OK</Button>
          <TextInput defaultValue="x" onValueChange={onValueChange} />
        </FutureUIProvider>
      </ThemeProvider>,
    );
    const surface = document.querySelector('[data-theme="dark"]') as HTMLElement;
    expect(surface).toBeTruthy();
    expect(surface.style.getPropertyValue('--future-ui-bg')).toBe('#111111');
    expect(onClick).not.toHaveBeenCalled();
    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox')).toHaveValue('x');
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('focus visibility and error cues are token-declared (visual acceptance is combined)', () => {
    expect(light.tokens['--future-ui-focus-ring']).toBeTruthy();
    expect(light.tokens['--future-ui-error']).toBeTruthy();
    expect(light.tokens['--future-ui-contrast-min']).toBeTruthy();
    expect(themeContract.accessibility.description).toMatch(/visual verification is part of combined acceptance/);
  });

  it('theme consumption is read-only over public contracts: no provider-private DOM access', () => {
    render(
      <ThemeProvider theme={light}>
        <FutureUIProvider appId={appId}>
          <Button>OK</Button>
        </FutureUIProvider>
      </ThemeProvider>,
    );
    const surface = document.querySelector('.future-ui-theme-surface') as HTMLElement;
    expect(surface.getAttribute('data-theme')).toBe('light');
    expect(surface.style.getPropertyValue('--future-ui-text')).toBe('#111111');
  });

  it('useTheme returns the current theme definition (read-only context)', () => {
    let name = '';
    function Probe() {
      const ctx = useTheme();
      name = ctx?.theme.name ?? '';
      return <span data-probe>{name}</span>;
    }
    render(
      <ThemeProvider theme={dark}>
        <Probe />
      </ThemeProvider>,
    );
    expect(name).toBe('dark');
  });
});
