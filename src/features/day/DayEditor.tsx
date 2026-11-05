import { useEffect, useRef, useState } from 'react';
import { Scale } from '../../components/Scale';
import { Segmented } from '../../components/Segmented';
import type { ISODate } from '../../domain/dates';
import { findPeriodOn } from '../../domain/periods';
import type { Flow, Symptoms } from '../../domain/types';
import { useCycle } from '../../hooks/useCycle';
import { flowLabels, t } from '../../i18n/fi';
import { useStore, useTide } from '../../store/context';
import './day.css';

const FLOW_OPTIONS = [
  { value: 'none', label: t.day.noFlow },
  { value: 'light', label: flowLabels.light },
  { value: 'medium', label: flowLabels.medium },
  { value: 'heavy', label: flowLabels.heavy },
] as const;

const SYMPTOM_KEYS = ['cramps', 'headache', 'mood', 'energy'] as const satisfies readonly (keyof Symptoms)[];

/** Everything that can be logged for one day. Changes save immediately. */
export function DayEditor({ date, showPeriodActions = true }: { date: ISODate; showPeriodActions?: boolean }) {
  const store = useStore();
  const entry = useTide((s) => s.days[date]);
  const { periods, today } = useCycle();
  const [error, setError] = useState<string | null>(null);

  if (date > today) return <p className="muted">{t.day.future}</p>;

  const period = findPeriodOn(periods, date, today);
  const canEnd = period && period.end !== date;

  const run = (r: { ok: true } | { ok: false; reason: string }) => setError(r.ok ? null : (t.day.errors[r.reason] ?? null));

  return (
    <div className="day-editor">
      {showPeriodActions && (
        <section className="day-editor__period">
          {period ? (
            <span className="pill pill--period">{t.day.inPeriod}</span>
          ) : (
            <button type="button" className="button button--secondary" onClick={() => run(store.startPeriod(date))}>
              {t.day.markStart}
            </button>
          )}
          {canEnd && (
            <button type="button" className="button button--secondary" onClick={() => run(store.endPeriod(date))}>
              {t.day.markEnd}
            </button>
          )}
          {error && <p className="error-text" role="alert">{error}</p>}
        </section>
      )}

      <section>
        <h3 className="section-title">{t.day.flow}</h3>
        <div className="segmented--flow">
          <Segmented
            label={t.day.flow}
            options={FLOW_OPTIONS}
            value={entry?.flow ?? 'none'}
            onChange={(v) => store.updateDay(date, { flow: v === 'none' ? undefined : (v as Flow) })}
          />
        </div>
      </section>

      <section>
        <h3 className="section-title">{t.day.symptoms}</h3>
        {SYMPTOM_KEYS.map((key) => (
          <Scale
            key={key}
            {...t.symptoms[key]}
            value={entry?.symptoms?.[key]}
            onChange={(v) => store.updateDay(date, { symptoms: { [key]: v } })}
          />
        ))}
      </section>

      <section>
        <NoteField key={date} date={date} initial={entry?.note ?? ''} />
      </section>
    </div>
  );
}

/** Keeps typing local and saves after a short pause and on blur, so every keystroke is not a DB write. */
function NoteField({ date, initial }: { date: ISODate; initial: string }) {
  const store = useStore();
  const [value, setValue] = useState(initial);
  const timer = useRef<number | undefined>(undefined);
  const latest = useRef(value);

  const save = () => {
    window.clearTimeout(timer.current);
    const trimmed = latest.current.trim();
    if (trimmed !== (store.getState().days[date]?.note ?? '')) store.updateDay(date, { note: trimmed || undefined });
  };

  // Flush a pending save when the sheet closes.
  useEffect(() => () => save(), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <label className="field">
      <span className="section-title">{t.day.note}</span>
      <textarea
        className="textarea"
        value={value}
        placeholder={t.day.notePlaceholder}
        onChange={(e) => {
          setValue(e.target.value);
          latest.current = e.target.value;
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(save, 800);
        }}
        onBlur={save}
      />
    </label>
  );
}
