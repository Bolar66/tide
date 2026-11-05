import type { CSSProperties } from 'react';

const DOTS = 28;

/** Illustrations for the intro slides: the cycle ring, quick taps, a lock and two hearts. */
export function IntroArt({ index }: { index: number }) {
  return (
    <svg viewBox="0 0 200 200" className="intro-art" aria-hidden>
      <circle cx="100" cy="100" r="92" className="intro-art__bg" />
      {index === 0 && (
        <g>
          <circle cx="100" cy="100" r="52" className="intro-art__disc" />
          {Array.from({ length: DOTS }, (_, i) => {
            const a = (i / DOTS) * Math.PI * 2 - Math.PI / 2;
            const kind = i < 5 ? 'period' : i >= 11 && i <= 16 ? 'fertile' : 'plain';
            return (
              <circle
                key={i}
                cx={100 + 72 * Math.cos(a)}
                cy={100 + 72 * Math.sin(a)}
                r={kind === 'plain' ? 3 : 5}
                className={`intro-art__dot intro-art__dot--${kind}`}
                style={{ '--i': i } as CSSProperties}
              />
            );
          })}
          <text x="100" y="112" textAnchor="middle" className="intro-art__num display">
            14
          </text>
        </g>
      )}
      {index === 1 && (
        <g>
          {[0, 1, 2, 3, 4].map((i) => (
            <rect
              key={i}
              x={34 + i * 27}
              y="88"
              width="24"
              height="24"
              rx="12"
              className={`intro-art__step ${i === 3 ? 'is-on' : ''}`}
              style={{ '--i': i } as CSSProperties}
            />
          ))}
          <rect x="44" y="52" width="70" height="20" rx="10" className="intro-art__chip" />
          <rect x="120" y="52" width="40" height="20" rx="10" className="intro-art__chip intro-art__chip--on" />
          <rect x="54" y="128" width="92" height="20" rx="10" className="intro-art__chip" />
          <circle cx="127" cy="100" r="22" className="intro-art__tap" />
        </g>
      )}
      {index === 2 && (
        <g>
          <path d="M100 38l50 18v36c0 34-22 56-50 68-28-12-50-34-50-68V56z" className="intro-art__shield" />
          <rect x="80" y="96" width="40" height="32" rx="7" className="intro-art__lock" />
          <path d="M88 96v-9a12 12 0 0 1 24 0v9" className="intro-art__shackle" />
          <circle cx="100" cy="111" r="4" className="intro-art__keyhole" />
        </g>
      )}
      {index === 3 && (
        <g>
          <path
            d="M84 140c-26-18-42-34-42-52a20 20 0 0 1 42-8 20 20 0 0 1 42 8c0 18-16 34-42 52z"
            className="intro-art__heart"
          />
          <path
            d="M122 124c-18-13-29-24-29-37a14 14 0 0 1 29-6 14 14 0 0 1 29 6c0 13-11 24-29 37z"
            className="intro-art__heart intro-art__heart--2"
          />
        </g>
      )}
    </svg>
  );
}
