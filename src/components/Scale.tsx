import type { Scale5 } from '../domain/types';

interface Props {
  label: string;
  low: string;
  high: string;
  value?: Scale5;
  onChange: (value: Scale5 | undefined) => void;
}

const STEPS: Scale5[] = [1, 2, 3, 4, 5];

/** 1–5 rating. Tapping the selected value again clears it. */
export function Scale({ label, low, high, value, onChange }: Props) {
  return (
    <div className="scale">
      <span className="scale__label" id={`scale-${label}`}>
        {label}
      </span>
      <div className="scale__buttons" role="radiogroup" aria-labelledby={`scale-${label}`}>
        {STEPS.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n}${n === 1 ? ` (${low})` : n === 5 ? ` (${high})` : ''}`}
            className="scale__step"
            onClick={() => onChange(value === n ? undefined : n)}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="scale__ends" aria-hidden>
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}
