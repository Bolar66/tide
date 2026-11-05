import { useId } from 'react';

/** The Tide mark (crescent moon over waves), coloured by the active palette. */
export function Logo({ size = 64, className }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} className={className} aria-hidden>
      <defs>
        <linearGradient id={`bg${id}`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" style={{ stopColor: 'color-mix(in srgb, var(--accent) 45%, white)' }} />
          <stop offset="0.55" style={{ stopColor: 'var(--accent)' }} />
          <stop offset="1" style={{ stopColor: 'var(--accent-strong)' }} />
        </linearGradient>
        <mask id={`m${id}`}>
          <rect width="512" height="512" fill="#000" />
          <circle cx="262" cy="196" r="96" fill="#fff" />
          <circle cx="306" cy="164" r="84" fill="#000" />
        </mask>
      </defs>
      <rect width="512" height="512" rx="112" fill={`url(#bg${id})`} />
      <rect width="512" height="512" fill="#fffdfc" mask={`url(#m${id})`} />
      <path d="M116 334 q35 -38 70 0 t70 0 t70 0 t70 0" fill="none" stroke="#fffdfc" strokeWidth="24" strokeLinecap="round" />
      <path d="M146 388 q27.5 -28 55 0 t55 0 t55 0 t55 0" fill="none" stroke="#fffdfc" strokeOpacity="0.55" strokeWidth="18" strokeLinecap="round" />
    </svg>
  );
}
