import { useId } from 'react';
import type { Scale5 } from '../domain/types';

interface Props {
  label: string;
  /** Word for each step 1–5, shown for the selected value. */
  levels: readonly string[];
  value?: Scale5;
  onChange: (value: Scale5 | undefined) => void;
}

const STEPS: Scale5[] = [1, 2, 3, 4, 5];

/** 1–5 rating. Tapping the selected value again clears it. */
export function Scale({ label, levels, value, onChange }: Props) {
  const id = useId();
  return (
    <div className="scale">
      <div className="scale__head">
        <span className="scale__label" id={id}>
          {label}
        </span>
        <span className="scale__value" aria-live="polite">
          {value ? levels[value - 1] : ''}
        </span>
      </div>
      <div className="scale__buttons" role="radiogroup" aria-labelledby={id}>
        {STEPS.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n}, ${levels[n - 1]}`}
            className="scale__step tabular"
            onClick={() => onChange(value === n ? undefined : n)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
