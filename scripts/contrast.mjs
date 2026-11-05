// Checks WCAG contrast of the text/background pairs used in the UI, for every palette and mode.
// Usage: node scripts/contrast.mjs
import { PALETTES, resolved } from './palettes.mjs';

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// [foreground, background, minimum]: 4.5 for text, 3 for large text / UI parts.
const pairs = [
  ['text', 'bg', 4.5], ['text', 'surface', 4.5], ['text', 'surface-2', 4.5],
  ['text-muted', 'bg', 4.5], ['text-muted', 'surface', 4.5], ['text-muted', 'surface-2', 4.5],
  ['on-accent', 'accent', 4.5], ['accent', 'surface', 4.5], ['accent', 'bg', 4.5], ['accent', 'accent-soft', 4.5],
  ['on-period', 'period', 4.5], ['text', 'period-soft', 4.5], ['text', 'predicted-soft', 4.5],
  ['warning-text', 'warning-bg', 4.5], ['danger', 'surface', 4.5], ['danger', 'bg', 4.5],
  ['predicted', 'surface', 2], ['text-faint', 'surface', 2.5],
  ['fertile', 'fertile-soft', 4.5], ['surface', 'fertile', 4.5], ['text', 'fertile-soft', 4.5], ['text-muted', 'accent-soft', 4.5],
  ['period', 'surface', 3], ['fertile', 'surface', 3],
];

let failed = false;
for (const name of Object.keys(PALETTES)) {
  for (const mode of ['light', 'dark']) {
    const theme = resolved(name, mode);
    for (const [fg, bg, min] of pairs) {
      const r = ratio(theme[fg], theme[bg]);
      if (r < min) {
        failed = true;
        console.log(`FAIL ${name}/${mode} ${fg} on ${bg}: ${r.toFixed(2)} (min ${min})`);
      }
    }
  }
}
console.log(failed ? 'Contrast check failed.' : `All pairs pass in ${Object.keys(PALETTES).length} palettes × 2 modes.`);
process.exit(failed ? 1 : 0);
