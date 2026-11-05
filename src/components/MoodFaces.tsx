import type { Scale5 } from '../domain/types';

const STEPS: Scale5[] = [1, 2, 3, 4, 5];
/** Mouth curve per step: frown → smile. */
const MOUTH = ['M9 17c1.6-2 4.4-2 6 0', 'M9 16.5c1.6-1 4.4-1 6 0', 'M9 16h6', 'M9 15.5c1.6 1 4.4 1 6 0', 'M8.5 15c1.8 2.4 5.2 2.4 7 0'];

/** One-tap mood: five faces from low to great. Tapping the chosen face again clears it. */
export function MoodFaces({
  value,
  levels,
  label,
  onChange,
}: {
  value?: Scale5;
  levels: readonly string[];
  label: string;
  onChange: (v: Scale5 | undefined) => void;
}) {
  return (
    <div className="mood-faces" role="radiogroup" aria-label={label}>
      {STEPS.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={levels[n - 1]}
          className={`mood-face mood-face--${n}`}
          onClick={() => onChange(value === n ? undefined : n)}
        >
          <svg viewBox="0 0 24 24" aria-hidden>
            <circle cx="12" cy="12" r="9.5" className="mood-face__head" />
            <circle cx="9" cy="10" r="1.1" className="mood-face__eye" />
            <circle cx="15" cy="10" r="1.1" className="mood-face__eye" />
            <path d={MOUTH[n - 1]} className="mood-face__mouth" />
          </svg>
        </button>
      ))}
    </div>
  );
}
