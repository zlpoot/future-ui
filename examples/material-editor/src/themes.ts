/**
 * R2-A2 (#98) · 宿主两套受控视觉预设（Light / Dark）。
 *
 * - 主题是宿主视觉偏好，不属于业务 Action；换肤只改视觉 token，不触发
 *   组件事件、不改变业务状态（D08 Theme Contract：hotSwap=false，本轮只做
 *   受控预设切换，不宣称框架级运行时 Provider 热替换）。
 * - token 名使用公共 D08 命名空间 `--future-ui-*`；shadcn 渲染的语义类
 *   （bg-background / border / ring 等）由示例端 CSS 映射到这些 token。
 * - ThemeProvider 只在其容器上注入 data-theme 与 token（Portal 内的 Dialog
 *   不在其 DOM 子树内），因此示例端另以 applyThemeToRoot 把同一组 token
 *   同步到 <html>，让 Portal 真正随主题换肤——这是 #98 允许的示例端小型
 *   作用域方案，不读取 provider-private DOM，不改公共契约。
 */
import type { ThemeDefinition } from '@future-ui/theme';

export type ThemeName = 'light' | 'dark';

export const lightTheme: ThemeDefinition = {
  name: 'light',
  tokens: {
    '--future-ui-bg': '#ffffff',
    '--future-ui-surface': '#ffffff',
    '--future-ui-text': '#1a1a1a',
    '--future-ui-muted': '#555555',
    '--future-ui-border': '#e2e8f0',
    '--future-ui-accent': '#f1f5f9',
    '--future-ui-accent-text': '#1e293b',
    '--future-ui-primary': '#0f172a',
    '--future-ui-primary-text': '#ffffff',
    '--future-ui-focus': '#2563eb',
    '--future-ui-overlay': 'rgba(2, 6, 23, 0.5)',
    '--future-ui-danger': '#dc2626',
  },
};

export const darkTheme: ThemeDefinition = {
  name: 'dark',
  tokens: {
    '--future-ui-bg': '#0b1220',
    '--future-ui-surface': '#101a2c',
    '--future-ui-text': '#e6edf7',
    '--future-ui-muted': '#8fa3bf',
    '--future-ui-border': '#2a3a56',
    '--future-ui-accent': '#1c2b45',
    '--future-ui-accent-text': '#f1f5f9',
    '--future-ui-primary': '#3b82f6',
    '--future-ui-primary-text': '#0b1220',
    '--future-ui-focus': '#60a5fa',
    '--future-ui-overlay': 'rgba(0, 0, 0, 0.65)',
    '--future-ui-danger': '#f87171',
  },
};

export const themes: Record<ThemeName, ThemeDefinition> = {
  light: lightTheme,
  dark: darkTheme,
};

/**
 * 宿主侧 Portal 作用域方案：把当前主题的 data-theme 与 CSS token 同步到
 * <html>。页面内内容继承 ThemeProvider 容器上的 token；经 Portal 挂到
 * document.body 的 Dialog 继承 <html> 上的同一组 token，因此两者始终一致。
 * 纯视觉副作用；不改变组件事件或业务状态。
 */
export function applyThemeToRoot(theme: ThemeDefinition): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', theme.name);
  for (const [key, value] of Object.entries(theme.tokens)) {
    root.style.setProperty(key, value);
  }
}
