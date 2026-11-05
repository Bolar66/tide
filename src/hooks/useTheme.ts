import { useEffect } from 'react';
import type { ThemeSetting } from '../domain/types';

const BG = { light: '#fdf6f7', dark: '#1a1215' };

/** Apply the manual theme choice and keep the iOS status bar colour in sync. */
export function useTheme(theme: ThemeSetting) {
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      if (theme === 'system') delete root.dataset.theme;
      else root.dataset.theme = theme;
      const dark = theme === 'dark' || (theme === 'system' && media.matches);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? BG.dark : BG.light);
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
}
