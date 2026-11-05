import { useEffect } from 'react';
import { PALETTE_NAMES, type PaletteName, type ThemeSetting } from '../domain/types';

const THEME_KEY = 'tide.theme';
const PALETTE_KEY = 'tide.palette';

/** Remembered outside the (possibly encrypted) database, so the lock screen matches the app. */
export function storedTheme(): ThemeSetting {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function storedPalette(): PaletteName | undefined {
  try {
    const v = localStorage.getItem(PALETTE_KEY);
    return (PALETTE_NAMES as readonly string[]).includes(v ?? '') ? (v as PaletteName) : undefined;
  } catch {
    return undefined;
  }
}

/** Apply light/dark and the colour palette, and keep the iOS status bar colour in sync. */
export function useTheme(theme: ThemeSetting, palette?: PaletteName) {
  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme);
      if (palette) localStorage.setItem(PALETTE_KEY, palette);
      else localStorage.removeItem(PALETTE_KEY);
    } catch {
      /* private mode: the lock screen just uses the defaults */
    }
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      if (theme === 'system') delete root.dataset.theme;
      else root.dataset.theme = theme;
      if (palette) root.dataset.palette = palette;
      else delete root.dataset.palette;
      const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
      if (bg) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme, palette]);
}
