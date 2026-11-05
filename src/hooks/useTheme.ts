import { useEffect } from 'react';
import { BRAND } from '../brand';
import type { ThemeSetting } from '../domain/types';

const STORAGE_KEY = 'tide.theme';

/** Theme remembered outside the (possibly encrypted) database, so the lock screen matches the app. */
export function storedTheme(): ThemeSetting {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

/** Apply the manual theme choice and keep the iOS status bar colour in sync. */
export function useTheme(theme: ThemeSetting) {
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* private mode: the lock screen just follows the system */
    }
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      if (theme === 'system') delete root.dataset.theme;
      else root.dataset.theme = theme;
      const dark = theme === 'dark' || (theme === 'system' && media.matches);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? BRAND.themeDark : BRAND.themeLight);
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
}
