// Single source of truth for theme colours. `node scripts/build-palettes.mjs` writes
// src/styles/palettes.css; `pnpm contrast` checks every palette in both modes.
// Only colour tokens live here; spacing, type and motion stay in tokens.css.

const shared = {
  light: { danger: '#b3261e', success: '#2f6e4f', 'warning-bg': '#fbf1e1', 'warning-text': '#6b4508' },
  dark: { danger: '#ff8f86', success: '#8fd1ad', 'warning-bg': '#352914', 'warning-text': '#f2d49a' },
};

export const PALETTES = {
  // Default: neutral deep sea with a coral period colour.
  meri: {
    label: 'Meri',
    light: {
      bg: '#f4f7f7', surface: '#ffffff', 'surface-2': '#e9f0f0', 'surface-3': '#d9e5e5', border: '#d8e4e4',
      text: '#13262b', 'text-muted': '#4b6166', 'text-faint': '#8299a0',
      accent: '#0e6a70', 'accent-strong': '#0a565b', 'accent-soft': '#dcefee', 'on-accent': '#ffffff',
      period: '#b84a35', 'on-period': '#ffffff', 'period-soft': '#f6dcd5',
      predicted: '#dc9c8e', 'predicted-soft': '#fbefeb',
      fertile: '#4f4fa6', 'fertile-soft': '#e6e6f7',
      wave: '14 106 112',
    },
    dark: {
      bg: '#0d1618', surface: '#142023', 'surface-2': '#1c2b2f', 'surface-3': '#25373b', border: '#233438',
      text: '#e8f1f1', 'text-muted': '#a1b4b7', 'text-faint': '#6a8083',
      accent: '#5cc4be', 'accent-strong': '#80d5d0', 'accent-soft': '#173a3b', 'on-accent': '#04201f',
      period: '#ef8a73', 'on-period': '#2a0b05', 'period-soft': '#4a281f',
      predicted: '#9c5a4c', 'predicted-soft': '#2b1e1b',
      fertile: '#a8a8f0', 'fertile-soft': '#25254a',
      wave: '92 196 190',
    },
  },
  ruusu: {
    label: 'Ruusu',
    light: {
      bg: '#faf6f4', surface: '#ffffff', 'surface-2': '#f4ece9', 'surface-3': '#ebe0dc', border: '#ebdfdb',
      text: '#2b1d21', 'text-muted': '#6f5a5f', 'text-faint': '#a08c91',
      accent: '#b23c5a', 'accent-strong': '#962e4a', 'accent-soft': '#f6e3e7', 'on-accent': '#ffffff',
      period: '#c4445f', 'on-period': '#ffffff', 'period-soft': '#f7d9df',
      predicted: '#e29aab', 'predicted-soft': '#fbeef1',
      fertile: '#6650a8', 'fertile-soft': '#ece7f8',
      wave: '210 79 108',
    },
    dark: {
      bg: '#141011', surface: '#1e1719', 'surface-2': '#281f22', 'surface-3': '#33282c', border: '#33292c',
      text: '#f4ebe8', 'text-muted': '#b8a6aa', 'text-faint': '#7f6e72',
      accent: '#ee8aa0', 'accent-strong': '#f5a5b6', 'accent-soft': '#3b2329', 'on-accent': '#2a0c15',
      period: '#e5728b', 'on-period': '#22070f', 'period-soft': '#4a2630',
      predicted: '#a35a6d', 'predicted-soft': '#2c1d21',
      fertile: '#b3a3ea', 'fertile-soft': '#2d2640',
      wave: '229 114 139',
    },
  },
  salvia: {
    label: 'Salvia',
    light: {
      bg: '#f5f7f2', surface: '#ffffff', 'surface-2': '#eaeee4', 'surface-3': '#dde3d4', border: '#dee4d6',
      text: '#1e291e', 'text-muted': '#536150', 'text-faint': '#8e9b8a',
      accent: '#4a6a4d', 'accent-strong': '#3b573e', 'accent-soft': '#e1ebdf', 'on-accent': '#ffffff',
      period: '#ad4c34', 'on-period': '#ffffff', 'period-soft': '#f2dbd2',
      predicted: '#d79e8c', 'predicted-soft': '#f9eee9',
      fertile: '#5f50a0', 'fertile-soft': '#e9e5f5',
      wave: '74 106 77',
    },
    dark: {
      bg: '#111510', surface: '#192018', 'surface-2': '#212a20', 'surface-3': '#2b3629', border: '#293327',
      text: '#edf2e9', 'text-muted': '#adb9a8', 'text-faint': '#73806d',
      accent: '#9cc29a', 'accent-strong': '#b6d5b3', 'accent-soft': '#243424', 'on-accent': '#0f200e',
      period: '#e68a6f', 'on-period': '#2a0b04', 'period-soft': '#46281e',
      predicted: '#995b49', 'predicted-soft': '#2a1d18',
      fertile: '#b2a5ee', 'fertile-soft': '#292440',
      wave: '156 194 154',
    },
  },
  laventeli: {
    label: 'Laventeli',
    light: {
      bg: '#f8f6fb', surface: '#ffffff', 'surface-2': '#eeeaf6', 'surface-3': '#e2dbee', border: '#e3ddef',
      text: '#231c32', 'text-muted': '#5c5271', 'text-faint': '#9a90ad',
      accent: '#664c9f', 'accent-strong': '#533d85', 'accent-soft': '#ebe5f8', 'on-accent': '#ffffff',
      period: '#bd4760', 'on-period': '#ffffff', 'period-soft': '#f6d8de',
      predicted: '#df98a7', 'predicted-soft': '#fbeef1',
      fertile: '#226d74', 'fertile-soft': '#dbeff0',
      wave: '102 76 159',
    },
    dark: {
      bg: '#13111a', surface: '#1b1825', 'surface-2': '#24202f', 'surface-3': '#2e2a3b', border: '#2d2838',
      text: '#efeaf7', 'text-muted': '#b5adc5', 'text-faint': '#7a728f',
      accent: '#b8a1f0', 'accent-strong': '#ccbbf5', 'accent-soft': '#2e2547', 'on-accent': '#1d1135',
      period: '#ea7c92', 'on-period': '#2a0710', 'period-soft': '#492430',
      predicted: '#a0566a', 'predicted-soft': '#2c1c22',
      fertile: '#7ecfd2', 'fertile-soft': '#163536',
      wave: '184 161 240',
    },
  },
};

export const DEFAULT_PALETTE = 'meri';

export function resolved(name, mode) {
  return { ...shared[mode], ...PALETTES[name][mode] };
}
