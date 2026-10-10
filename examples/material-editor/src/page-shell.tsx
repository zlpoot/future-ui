/**
 * R2-A4 (#102) · 示例级共享 page shell / 主题配方（仅 examples/material-editor）。
 *
 * 两业务页面（素材编辑 A、任务管理 B）共用：
 *   1) `useHostTheme()` —— 宿主 Light/Dark 视觉偏好的唯一状态机：
 *      - 同一 `themes` 对象（A/B 唯一 Light/Dark 数据源，不手填第二组色值）；
 *      - `applyThemeToRoot` 同步 token 到 <html>（Portal 内 Dialog 随主题换肤）；
 *      - 键盘路径：按键 T 切换（焦点在输入框/文本域时不触发，避免打断输入）。
 *   2) `<ThemeFloatToggle>` —— 右上角主题浮层（fixed z-60 + pointer-events:auto，
 *      Dialog 打开时仍可真实指针点击；#98 P1-2 行为保留）。
 *
 * 本模块是 example 范围的共享配方，不新建公共 Theme/Profile/DSL；页面 B 的
 * 业务 JSX/字段/列表独立，只引用此配方与共享 CSS 类（styles.css 的 .fp-*）。
 */
import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { ThemeProvider } from '@future-ui/theme';
import { ShadcnButton } from '@future-ui/shadcn-adapter/browser';
import { applyThemeToRoot, themes } from './themes.js';
import type { ThemeDefinition, ThemeName } from './themes.js';

export type { ThemeDefinition, ThemeName };

/** 宿主 Light/Dark 唯一状态机（A/B 共享；主题是视觉偏好，不触碰业务状态）。 */
export function useHostTheme(): {
  themeName: ThemeName;
  activeTheme: ThemeDefinition;
  toggleTheme: () => void;
} {
  const [themeName, setThemeName] = useState<ThemeName>('light');
  const activeTheme = useMemo(() => themes[themeName], [themeName]);

  // Portal 内 Dialog 挂在 <html> 子树外：同步同一组 token 到 <html>，保证与页面一致换肤。
  useEffect(() => {
    applyThemeToRoot(activeTheme);
  }, [activeTheme]);

  // 键盘路径：按键 T 切换主题（焦点在输入框/文本域内时不触发，避免打断输入）。
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 't' && event.key !== 'T') return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      setThemeName((prev) => (prev === 'light' ? 'dark' : 'light'));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return {
    themeName,
    activeTheme,
    toggleTheme: () => setThemeName((prev) => (prev === 'light' ? 'dark' : 'light')),
  };
}

/** 右上角主题切换浮层（A/B 共享同一 UI 入口；data-testid 供测试/浏览器核对）。 */
export function ThemeFloatToggle({
  themeName,
  onToggle,
}: {
  themeName: ThemeName;
  onToggle: () => void;
}): ReactElement {
  return (
    <div className="fp-theme-float">
      <ShadcnButton
        type="button"
        variant="outline"
        data-testid="theme-toggle"
        aria-pressed={themeName === 'dark'}
        onClick={onToggle}
      >
        {themeName === 'light' ? '切换到深色' : '切换到浅色'}
      </ShadcnButton>
    </div>
  );
}

export { ThemeProvider, themes };
