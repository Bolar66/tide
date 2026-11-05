import type { Phase } from '../domain/phases';

/** Small abstract illustration for each cycle phase: drop, sprout, sun, moon. Decorative only. */
export function PhaseArt({ phase, size = 84, className = '' }: { phase: Phase; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 96 96" width={size} height={size} className={`phase-art phase-art--${phase} ${className}`} aria-hidden>
      <circle cx="48" cy="48" r="44" className="phase-art__bg" />
      {phase === 'menstrual' && (
        <>
          <ellipse cx="48" cy="72" rx="22" ry="5" className="phase-art__ripple" />
          <ellipse cx="48" cy="72" rx="12" ry="3" className="phase-art__ripple phase-art__ripple--2" />
          <path d="M48 18c10 14 18 24 18 34a18 18 0 0 1-36 0c0-10 8-20 18-34z" className="phase-art__drop" />
          <path d="M40 52a8 8 0 0 0 6 9" className="phase-art__shine" />
        </>
      )}
      {phase === 'follicular' && (
        <>
          <circle cx="62" cy="34" r="12" className="phase-art__sun" />
          <path d="M48 78V46" className="phase-art__stem" />
          <g className="phase-art__sway">
            <path d="M48 56c-4-12-14-16-24-14 2 10 12 16 24 14z" className="phase-art__leaf" />
            <path d="M48 48c4-12 14-16 24-14-2 10-12 16-24 14z" className="phase-art__leaf phase-art__leaf--2" />
          </g>
          <path d="M28 78h40" className="phase-art__ground" />
        </>
      )}
      {phase === 'ovulation' && (
        <>
          <g className="phase-art__rays">
            {Array.from({ length: 12 }, (_, i) => (
              <ellipse key={i} cx="48" cy="22" rx="5" ry="10" transform={`rotate(${i * 30} 48 48)`} className="phase-art__petal" />
            ))}
          </g>
          <circle cx="48" cy="48" r="15" className="phase-art__core" />
        </>
      )}
      {(phase === 'luteal' || phase === 'late') && (
        <>
          <path d="M56 20a28 28 0 1 0 22 44 24 24 0 1 1-22-44z" className="phase-art__moon" />
          <path d="M26 26l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" className="phase-art__star" />
          <path d="M70 64l1.5 3.5 3.5 1.5-3.5 1.5-1.5 3.5-1.5-3.5-3.5-1.5 3.5-1.5z" className="phase-art__star phase-art__star--2" />
        </>
      )}
    </svg>
  );
}
