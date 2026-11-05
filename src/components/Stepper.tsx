import { useI18n } from '../i18n';
import { IconMinus, IconPlus } from './icons';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (value: number) => void;
}

export function Stepper({ label, value, min, max, unit, onChange }: Props) {
  const { t } = useI18n();
  return (
    <div className="stepper">
      <span className="stepper__label">{label}</span>
      <div className="stepper__control">
        <button
          type="button"
          className="icon-button icon-button--filled"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`${t.onboarding.decrease}: ${label}`}
        >
          <IconMinus />
        </button>
        <output className="stepper__value display tabular" aria-live="polite">
          {value} <span className="small muted">{unit}</span>
        </output>
        <button
          type="button"
          className="icon-button icon-button--filled"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`${t.onboarding.increase}: ${label}`}
        >
          <IconPlus />
        </button>
      </div>
    </div>
  );
}
