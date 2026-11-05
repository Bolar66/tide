// Single source of truth for theme colours. `node scripts/build-palettes.mjs` writes
// src/styles/palettes.css; `pnpm contrast` checks every palette in both modes.
// Only colour tokens live here; spacing, type and motion stay in tokens.css.

const shared = {
  light: { danger: '#b3261e', success: '#2f6e4f', 'warning-bg': '#fbf1e1', 'warning-text': '#6b4508' },
  dark: { danger: '#ff8f86', success: '#8fd1ad', 'warning-bg': '#352914', 'warning-text': '#f2d49a' },
};

export const PALETTES = {
  // Each palette is a mood with its own background gradient, glow and pattern (see Backdrop.tsx).
  // Default: deep sea with a coral period colour.
  meri: {
    label: 'Meri',
    light: {
      bg: '#eaf4f5', surface: '#fbfefe', 'surface-2': '#e2eff1', 'surface-3': '#cfe2e5', border: '#cde0e3',
      text: '#0f2a31', 'text-muted': '#41616a', 'text-faint': '#7d99a1',
      accent: '#0b6670', 'accent-strong': '#08525a', 'accent-soft': '#d3ecee', 'on-accent': '#ffffff',
      period: '#b84a35', 'on-period': '#ffffff', 'period-soft': '#f6dcd5',
      predicted: '#dc9c8e', 'predicted-soft': '#fbefeb',
      fertile: '#4f4fa6', 'fertile-soft': '#e6e6f7',
      wave: '14 106 112',
      'bg-2': '#d4e8ec',
      glow: '64 170 190',
    },
    dark: {
      bg: '#061a22', surface: '#0e2630', 'surface-2': '#14313c', 'surface-3': '#1d3e4a', border: '#1a3843',
      text: '#e3f3f5', 'text-muted': '#9dbac0', 'text-faint': '#62848c',
      accent: '#5cc8c8', 'accent-strong': '#86dada', 'accent-soft': '#123e44', 'on-accent': '#04201f',
      period: '#ef8a73', 'on-period': '#2a0b05', 'period-soft': '#4a281f',
      predicted: '#9c5a4c', 'predicted-soft': '#2b1e1b',
      fertile: '#a8a8f0', 'fertile-soft': '#25254a',
      wave: '92 196 190',
      'bg-2': '#0b2c38',
      glow: '40 150 180',
    },
  },
  ruusu: {
    label: 'Ruusu',
    light: {
      bg: '#fdf1ee', surface: '#fffaf9', 'surface-2': '#f9e9e7', 'surface-3': '#f0d8d6', border: '#efd9d7',
      text: '#2e1a1f', 'text-muted': '#6b4e55', 'text-faint': '#a3868c',
      accent: '#a93354', 'accent-strong': '#8f2846', 'accent-soft': '#f8e0e6', 'on-accent': '#ffffff',
      period: '#c4445f', 'on-period': '#ffffff', 'period-soft': '#f7d9df',
      predicted: '#e29aab', 'predicted-soft': '#fbeef1',
      fertile: '#6650a8', 'fertile-soft': '#ece7f8',
      wave: '210 79 108',
      'bg-2': '#f8dde1',
      glow: '250 170 140',
    },
    dark: {
      bg: '#1a0f14', surface: '#22141a', 'surface-2': '#2d1b23', 'surface-3': '#3a242e', border: '#3a252e',
      text: '#f8eaec', 'text-muted': '#c3a5ad', 'text-faint': '#856872',
      accent: '#f28ca6', 'accent-strong': '#f7a8bc', 'accent-soft': '#43202c', 'on-accent': '#2a0c15',
      period: '#e5728b', 'on-period': '#22070f', 'period-soft': '#4a2630',
      predicted: '#a35a6d', 'predicted-soft': '#2c1d21',
      fertile: '#b3a3ea', 'fertile-soft': '#2d2640',
      wave: '229 114 139',
      'bg-2': '#2c1522',
      glow: '210 80 115',
    },
  },
  salvia: {
    label: 'Salvia',
    light: {
      bg: '#eef2e6', surface: '#fbfcf8', 'surface-2': '#e6ecdc', 'surface-3': '#d6dfca', border: '#d5dec9',
      text: '#1b2a1c', 'text-muted': '#4b5d49', 'text-faint': '#8a9a86',
      accent: '#3d6943', 'accent-strong': '#31573a', 'accent-soft': '#dbe9d6', 'on-accent': '#ffffff',
      period: '#ad4c34', 'on-period': '#ffffff', 'period-soft': '#f2dbd2',
      predicted: '#d79e8c', 'predicted-soft': '#f9eee9',
      fertile: '#5f50a0', 'fertile-soft': '#e9e5f5',
      wave: '74 106 77',
      'bg-2': '#dce7cf',
      glow: '160 195 120',
    },
    dark: {
      bg: '#0c140e', surface: '#132017', 'surface-2': '#1a2b1f', 'surface-3': '#243828', border: '#223526',
      text: '#ebf3e7', 'text-muted': '#a9bca4', 'text-faint': '#6d8269',
      accent: '#9ccc94', 'accent-strong': '#b8dcb1', 'accent-soft': '#203a22', 'on-accent': '#0f200e',
      period: '#e68a6f', 'on-period': '#2a0b04', 'period-soft': '#46281e',
      predicted: '#995b49', 'predicted-soft': '#2a1d18',
      fertile: '#b2a5ee', 'fertile-soft': '#292440',
      wave: '156 194 154',
      'bg-2': '#15251a',
      glow: '90 150 80',
    },
  },
  laventeli: {
    label: 'Laventeli',
    light: {
      bg: '#f3effb', surface: '#fdfbff', 'surface-2': '#ebe5f6', 'surface-3': '#ddd4ef', border: '#dcd3ee',
      text: '#221a35', 'text-muted': '#574c70', 'text-faint': '#988dae',
      accent: '#5f45a0', 'accent-strong': '#4f3986', 'accent-soft': '#e7dff8', 'on-accent': '#ffffff',
      period: '#bd4760', 'on-period': '#ffffff', 'period-soft': '#f6d8de',
      predicted: '#df98a7', 'predicted-soft': '#fbeef1',
      fertile: '#226d74', 'fertile-soft': '#dbeff0',
      wave: '102 76 159',
      'bg-2': '#e2d9f5',
      glow: '175 145 235',
    },
    dark: {
      bg: '#0e0b1c', surface: '#17122a', 'surface-2': '#211a38', 'surface-3': '#2c2447', border: '#2b2345',
      text: '#eee8fa', 'text-muted': '#b4aac8', 'text-faint': '#7a7093',
      accent: '#bba4f4', 'accent-strong': '#cfbef7', 'accent-soft': '#2f2552', 'on-accent': '#1d1135',
      period: '#ea7c92', 'on-period': '#2a0710', 'period-soft': '#492430',
      predicted: '#a0566a', 'predicted-soft': '#2c1c22',
      fertile: '#7ecfd2', 'fertile-soft': '#163536',
      wave: '184 161 240',
      'bg-2': '#1c1538',
      glow: '120 90 225',
    },
  },
};

export const DEFAULT_PALETTE = 'meri';

export function resolved(name, mode) {
  return { ...shared[mode], ...PALETTES[name][mode] };
}
