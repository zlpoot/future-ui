/**
 * 模板自包含的宿主主题状态机（Light/Dark）。
 *
 * 主题 token 单一数据源 = `@future-ui/theme/theme.css`（由 styles.css 导入），
 * 本文件不复制任何色值：切换只同步 `data-theme` 到 <html>，CSS 内置的
 * `[data-theme='dark']` 规则负责换肤。Radix Dialog 挂在 body 外层 Portal，
 * 因此 token 写在 <html> 上，保证 Dialog 随主题一致换肤。
 */
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { ShadcnButton } from '@future-ui/shadcn-adapter/browser';

export type ThemeName = 'light' | 'dark';

export function useHostTheme(): { themeName: ThemeName; toggleTheme: () => void } {
  const [themeName, setThemeName] = useState<ThemeName>('light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeName);
  }, [themeName]);

  return {
    themeName,
    toggleTheme: () => setThemeName((prev) => (prev === 'light' ? 'dark' : 'light')),
  };
}

/** 右上角主题切换浮动按钮（fixed + pointer-events:auto，Dialog 打开时仍可物理点击）。 */
export function ThemeFloatToggle({
  themeName,
  onToggle,
}: {
  themeName: ThemeName;
  onToggle: () => void;
}): ReactElement {
  return (
    <div className="fixed right-4 top-4 z-50 pointer-events-auto">
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
