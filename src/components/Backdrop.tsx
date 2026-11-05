import { useSyncExternalStore, type CSSProperties } from 'react';
import type { PaletteName } from '../domain/types';

/** Follows <html data-palette>, which useTheme sets (also on the lock screen before data is open). */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-palette'] });
  return () => observer.disconnect();
}
const current = () => (document.documentElement.dataset.palette as PaletteName | undefined) ?? 'meri';

// Deterministic pseudo-random positions so the pattern does not jump between renders.
function scatter(n: number, seed: number) {
  let x = seed;
  const rnd = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: n }, (_, i) => ({ i, x: rnd() * 400, y: rnd() * 800, s: 0.5 + rnd(), d: rnd() }));
}
const STARS = scatter(34, 7);
const LEAVES = scatter(9, 3);
const BUBBLES = scatter(7, 11);

const wave = (y: number, amp: number, len = 200) => {
  let d = `M0 ${y}`;
  for (let x = 0; x < 800; x += len) d += ` q${len / 4} ${-amp} ${len / 2} 0 t${len / 2} 0`;
  return `${d} V900 H0 Z`;
};

const vars = (o: Record<string, string | number>) => o as CSSProperties;

type Pattern = 'waves' | 'bubbles' | 'leaves' | 'stars' | 'dunes' | 'aurora' | 'none';
const PATTERN: Record<PaletteName, Pattern> = {
  meri: 'waves',
  ruusu: 'bubbles',
  salvia: 'leaves',
  laventeli: 'stars',
  hiekka: 'dunes',
  persikka: 'bubbles',
  grafiitti: 'none',
  revontuli: 'aurora',
};

/** Long, soft ribbon for the northern lights. */
const ribbon = (y: number, amp: number) => `M-100 ${y} C 0 ${y - amp}, 100 ${y + amp}, 200 ${y} S 400 ${y - amp}, 500 ${y}`;

/**
 * The theme's mood behind every view: a soft gradient, a glow and a slowly moving pattern
 * (Meri waves, Ruusu light bubbles, Salvia leaves, Laventeli stars). Purely decorative.
 */
export function Backdrop() {
  const palette = useSyncExternalStore(subscribe, current, () => 'meri' as PaletteName);
  const pattern = PATTERN[palette] ?? 'none';
  return (
    <div className={`backdrop backdrop--${palette}`} aria-hidden>
      <svg className="backdrop__art" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="bd-bubble">
            <stop offset="0%" stopColor="rgb(var(--glow-rgb))" stopOpacity="0.55" />
            <stop offset="100%" stopColor="rgb(var(--glow-rgb))" stopOpacity="0" />
          </radialGradient>
        </defs>
        {pattern === 'waves' && (
          <g className="backdrop__waves">
            <path d={wave(640, 18)} className="backdrop__wave" style={vars({ '--t': '70s' })} />
            <path d={wave(690, 14, 160)} className="backdrop__wave backdrop__wave--rev" style={vars({ '--t': '58s' })} />
            <path d={wave(740, 10)} className="backdrop__wave" style={vars({ '--t': '46s' })} />
          </g>
        )}
        {pattern === 'bubbles' &&
          BUBBLES.map((b) => (
            <circle
              key={b.i}
              cx={b.x}
              cy={b.y}
              r={50 + b.s * 60}
              fill="url(#bd-bubble)"
              className="backdrop__float"
              style={vars({ '--t': `${32 + b.d * 20}s`, '--delay': `${-b.d * 20}s` })}
            />
          ))}
        {pattern === 'leaves' &&
          LEAVES.map((l) => (
            <g key={l.i} transform={`translate(${l.x} ${l.y}) scale(${l.s}) rotate(${l.d * 360})`}>
              <path
                className="backdrop__leaf"
                d="M0 0c18-22 52-24 70-6-18 22-52 24-70 6zm4 0c20-4 40-6 62-6"
                style={vars({ '--t': `${16 + l.d * 10}s`, '--delay': `${-l.d * 8}s` })}
              />
            </g>
          ))}
        {(pattern === 'stars' || pattern === 'aurora') && (
          <g>
            {pattern === 'stars' && <path className="backdrop__moon" d="M330 70a38 38 0 1 0 30 62 30 30 0 1 1-30-62z" />}
            {STARS.map((s) => (
              <circle
                key={s.i}
                cx={s.x}
                cy={s.y * 0.75}
                r={0.8 + s.s * 1.1}
                className="backdrop__star"
                style={vars({ '--t': `${5 + s.d * 6}s`, '--delay': `${-s.d * 6}s` })}
              />
            ))}
          </g>
        )}
        {pattern === 'dunes' && (
          <g>
            <path d={wave(560, 30, 400)} className="backdrop__wave backdrop__dune" style={vars({ '--t': '120s' })} />
            <path d={wave(640, 22, 320)} className="backdrop__wave backdrop__dune backdrop__wave--rev" style={vars({ '--t': '100s' })} />
            <path d={wave(720, 14, 400)} className="backdrop__wave backdrop__dune" style={vars({ '--t': '80s' })} />
          </g>
        )}
        {pattern === 'aurora' && (
          <g className="backdrop__aurora">
            <path d={ribbon(140, 60)} className="backdrop__ribbon" />
            <path d={ribbon(210, 80)} className="backdrop__ribbon backdrop__ribbon--2" />
            <path d={ribbon(280, 50)} className="backdrop__ribbon backdrop__ribbon--3" />
          </g>
        )}
      </svg>
    </div>
  );
}
