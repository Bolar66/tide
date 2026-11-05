import { useId, useState } from 'react';
import { IconClose, IconMinus, IconPlus } from '../../components/icons';
import { Scale } from '../../components/Scale';
import type { MetricValue, Scale5 } from '../../domain/types';
import { useI18n } from '../../i18n';
import { sanitizeMetric, type TrackerDef } from '../../trackers/registry';

interface Props {
  def: TrackerDef;
  value: MetricValue | undefined;
  onChange: (value: MetricValue | undefined) => void;
}

const fiNumber = (n: number, decimals: number) =>
  new Intl.NumberFormat('fi-FI', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);

/** One quick-entry control per tracker kind. Every change is sanitized against the tracker definition. */
export function TrackerField({ def, value, onChange }: Props) {
  const { t } = useI18n();
  const copy = t.trackers.items[def.id] ?? { label: def.id };
  const set = (v: unknown) => onChange(sanitizeMetric(def, v));
  const id = useId();

  switch (def.kind) {
    case 'scale5':
      return (
        <Scale
          label={copy.label}
          levels={copy.levels ?? ['1', '2', '3', '4', '5']}
          value={value as Scale5 | undefined}
          onChange={(v) => set(v)}
        />
      );

    case 'number': {
      const current = typeof value === 'number' ? value : undefined;
      return (
        <div className="tracker">
          <div className="tracker__head">
            <span className="tracker__label" id={id}>
              {copy.label}
              {copy.hint && <span className="tracker__hint">{copy.hint}</span>}
            </span>
            {current !== undefined && (
              <button type="button" className="tracker__clear" onClick={() => set(undefined)} aria-label={`${t.trackers.clear}: ${copy.label}`}>
                <IconClose width={16} height={16} />
              </button>
            )}
          </div>
          {current === undefined ? (
            <button type="button" className="tracker__add" onClick={() => set(def.default)} aria-describedby={id}>
              <IconPlus width={18} height={18} /> {t.trackers.add}
            </button>
          ) : (
            <>
              <div className="tracker__stepper">
                <button
                  type="button"
                  className="icon-button icon-button--filled"
                  onClick={() => set(current - def.step)}
                  disabled={current <= def.min}
                  aria-label={`${t.trackers.decrease}: ${copy.label}`}
                >
                  <IconMinus />
                </button>
                <output className="tracker__value display tabular" aria-live="polite">
                  {fiNumber(current, def.decimals)}
                  <span className="tracker__unit">{t.trackers.unit(def.unit, current)}</span>
                </output>
                <button
                  type="button"
                  className="icon-button icon-button--filled"
                  onClick={() => set(current + def.step)}
                  disabled={current >= def.max}
                  aria-label={`${t.trackers.increase}: ${copy.label}`}
                >
                  <IconPlus />
                </button>
              </div>
              <input
                type="range"
                className="tracker__range"
                min={def.min}
                max={def.max}
                step={def.step}
                value={current}
                aria-labelledby={id}
                onChange={(e) => set(Number(e.target.value))}
              />
            </>
          )}
        </div>
      );
    }

    case 'count': {
      const current = typeof value === 'number' ? value : undefined;
      return (
        <div className="tracker tracker--inline">
          <span className="tracker__label" id={id}>
            {copy.label}
          </span>
          <div className="tracker__stepper tracker__stepper--compact">
            <button
              type="button"
              className="icon-button icon-button--filled"
              onClick={() => set(current === 0 ? undefined : (current ?? 0) - 1)}
              disabled={current === undefined}
              aria-label={`${t.trackers.decrease}: ${copy.label}`}
            >
              <IconMinus />
            </button>
            <output className="tracker__count tabular" aria-live="polite" aria-labelledby={id}>
              {current === undefined ? '–' : `${current} ${t.trackers.unit(def.unit, current)}`}
            </output>
            <button
              type="button"
              className="icon-button icon-button--filled"
              onClick={() => set((current ?? 0) + 1)}
              disabled={current !== undefined && current >= def.max}
              aria-label={`${t.trackers.increase}: ${copy.label}`}
            >
              <IconPlus />
            </button>
          </div>
        </div>
      );
    }

    case 'chips': {
      const selected = Array.isArray(value) ? value : [];
      return (
        <div className="tracker">
          <span className="tracker__label" id={id}>
            {copy.label}
          </span>
          <div className="chips" role="group" aria-labelledby={id}>
            {def.options.map((opt) => {
              const on = selected.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  className="chip"
                  aria-pressed={on}
                  onClick={() => set(on ? selected.filter((s) => s !== opt) : [...selected, opt])}
                >
                  {copy.options?.[opt] ?? opt}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    case 'boolean':
      return (
        <button type="button" className="chip chip--wide" aria-pressed={value === true} onClick={() => set(value !== true)}>
          {copy.label}
        </button>
      );

    case 'text':
      return <TextTracker key={String(value ?? '')} label={copy.label} placeholder={copy.placeholder} initial={String(value ?? '')} onSave={set} />;
  }
}

function TextTracker({ label, placeholder, initial, onSave }: { label: string; placeholder?: string; initial: string; onSave: (v: string) => void }) {
  const [text, setText] = useState(initial);
  return (
    <label className="field tracker">
      <span className="tracker__label">{label}</span>
      <input
        className="input"
        value={text}
        placeholder={placeholder}
        maxLength={200}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => text !== initial && onSave(text)}
      />
    </label>
  );
}
