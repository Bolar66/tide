import type { SVGProps } from 'react';

const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

type P = SVGProps<SVGSVGElement>;

export const IconWave = (p: P) => (
  <svg {...base} {...p}>
    <path d="M15.5 4.2a5 5 0 1 0 3.3 6.6 4.2 4.2 0 0 1-3.3-6.6Z" />
    <path d="M3 17c1.5-1.6 3-1.6 4.5 0s3 1.6 4.5 0 3-1.6 4.5 0 3 1.6 4.5 0" />
  </svg>
);
export const IconCalendar = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3.5" y="5" width="17" height="15" rx="3" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </svg>
);
export const IconChart = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 20h16M7 16v-5M12 16V7M17 16v-8" />
  </svg>
);
export const IconSettings = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </svg>
);
export const IconChevronLeft = (p: P) => (
  <svg {...base} {...p}>
    <path d="m15 5-7 7 7 7" />
  </svg>
);
export const IconChevronRight = (p: P) => (
  <svg {...base} {...p}>
    <path d="m9 5 7 7-7 7" />
  </svg>
);
export const IconClose = (p: P) => (
  <svg {...base} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const IconDrop = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3.5s-6 6.4-6 10.6a6 6 0 0 0 12 0c0-4.2-6-10.6-6-10.6Z" />
  </svg>
);
export const IconLock = (p: P) => (
  <svg {...base} {...p}>
    <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </svg>
);
export const IconCloudOff = (p: P) => (
  <svg {...base} {...p}>
    <path d="M7.5 18.5h9.8a3.7 3.7 0 0 0 1.4-7.1A6 6 0 0 0 8 8.6M4.6 10.9A4.2 4.2 0 0 0 7.5 18.5" />
    <path d="M3 3l18 18" />
  </svg>
);
export const IconUserOff = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c.8-3.4 3.6-5.5 7-5.5s6.2 2.1 7 5.5" />
    <path d="M3 3l18 18" />
  </svg>
);
export const IconExport = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 15V3.5M7.5 8 12 3.5 16.5 8" />
    <path d="M5 12.5v5A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5v-5" />
  </svg>
);
export const IconImport = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3.5V15M7.5 10.5 12 15l4.5-4.5" />
    <path d="M5 12.5v5A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5v-5" />
  </svg>
);
export const IconInfo = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5M12 8h.01" />
  </svg>
);
export const IconDatabase = (p: P) => (
  <svg {...base} {...p}>
    <ellipse cx="12" cy="6" rx="7" ry="2.8" />
    <path d="M5 6v12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8V6M5 12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8" />
  </svg>
);
export const IconPlus = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const IconMinus = (p: P) => (
  <svg {...base} {...p}>
    <path d="M5 12h14" />
  </svg>
);
export const IconFaceId = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
    <path d="M9 9.5v1M15 9.5v1M12 9.5v3.5h-1M9.5 15.5c1.4 1 3.6 1 5 0" />
  </svg>
);
export const IconKey = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="8" cy="15" r="4" />
    <path d="m10.8 12.2 8.7-8.7M16 7l2.5 2.5M14 9l2 2" />
  </svg>
);
export const IconSparkle = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3.5c.6 4.2 2.3 5.9 6.5 6.5-4.2.6-5.9 2.3-6.5 6.5-.6-4.2-2.3-5.9-6.5-6.5 4.2-.6 5.9-2.3 6.5-6.5Z" />
    <path d="M18.5 15.5c.3 1.6 1 2.3 2.5 2.5-1.6.3-2.3 1-2.5 2.5-.3-1.6-1-2.3-2.5-2.5 1.6-.3 2.3-1 2.5-2.5Z" />
  </svg>
);
export const IconBook = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 6.5c-1.8-1.3-4.3-2-7-2v13c2.7 0 5.2.7 7 2 1.8-1.3 4.3-2 7-2v-13c-2.7 0-5.2.7-7 2Z" />
    <path d="M12 6.5v13" />
  </svg>
);
export const IconHeart = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 19.5s-7-4.3-7-9.4A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.1c0 5.1-7 9.4-7 9.4Z" />
  </svg>
);
export const IconSprout = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 20v-8M12 12c0-3.5-2.5-6-6.5-6 0 3.5 2.5 6 6.5 6ZM12 12c0-3 2.2-5.5 6-5.5 0 3-2.2 5.5-6 5.5Z" />
  </svg>
);
export const IconFlask = (p: P) => (
  <svg {...base} {...p}>
    <path d="M9.5 3.5h5M10.5 3.5v5.5L5.3 17.6A2 2 0 0 0 7 20.5h10a2 2 0 0 0 1.7-2.9L13.5 9V3.5" />
    <path d="M7.5 14.5h9" />
  </svg>
);
export const IconSun = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
  </svg>
);
