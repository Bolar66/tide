import { useEffect, useRef, useState } from 'react';
import { Scale } from '../../components/Scale';
import { Segmented } from '../../components/Segmented';
import type { ISODate } from '../../domain/dates';
import { findPeriodOn } from '../../domain/periods';
import type { Flow, Symptoms } from '../../domain/types';
import { useCycle } from '../../hooks/useCycle';
import { useI18n } from '../../i18n';
import { useStore, useTide } from '../../store/context';
import { enabledTrackers } from '../../trackers/registry';
import { TrackerField } from './TrackerField';
import './day.css';

const SYMPTOM_KEYS = ['cramps', 'headache', 'mood', 'energy'] as const satisfies readonly (keyof Symptoms)[];

/** Everything that can be logged for one day. Changes save immediately. */
export function DayEditor({
  date,
  showPeriodActions = true,
  onChooseTrackers,
}: {
  date: ISODate;
  showPeriodActions?: boolean;
  onChooseTrackers?: () => void;
}) {
  const store = useStore();
  const { t } = useI18n();
  const entry = useTide((s) => s.days[date]);
  const trackerIds = useTide((s) => s.settings.enabledTrackers);
  const { periods, today } = useCycle();
  const [error, setError] = useState<string | null>(null);

  if (date > today) return <p className="muted">{t.day.future}</p>;

  const period = findPeriodOn(periods, date, today);
  const canEnd = period && period.end !== date;
  const flowOptions = [
    { value: 'none', label: t.day.noFlow },
    { value: 'light', label: t.day.flowLevels.light },
    { value: 'medium', label: t.day.flowLevels.medium },
    { value: 'heavy', label: t.day.flowLevels.heavy },
  ] as const;

  const run = (r: { ok: true } | { ok: false; reason: string }) => setError(r.ok ? null : (t.day.errors[r.reason] ?? null));

  return (
    <div className="day-editor">
      {showPeriodActions && (
        <section className="day-editor__period">
          {period ? (
            <span className="pill">{t.day.inPeriod}</span>
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
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
        </section>
      )}

      <section>
        <h3 className="section-label">{t.day.flow}</h3>
        <div className="segmented--flow">
          <Segmented
            label={t.day.flow}
            options={flowOptions}
            value={entry?.flow ?? 'none'}
            onChange={(v) => store.updateDay(date, { flow: v === 'none' ? undefined : (v as Flow) })}
          />
        </div>
      </section>

      <section>
        <h3 className="section-label">{t.day.symptoms}</h3>
        {SYMPTOM_KEYS.map((key) => (
          <Scale
            key={key}
            label={t.symptoms[key].label}
            levels={t.symptoms[key].levels}
            value={entry?.symptoms?.[key]}
            onChange={(v) => store.updateDay(date, { symptoms: { [key]: v } })}
          />
        ))}
      </section>

      <section className="day-editor__trackers">
        <h3 className="section-label">{t.trackers.section}</h3>
        {enabledTrackers(trackerIds).map((def) => (
          <TrackerField
            key={def.id}
            def={def}
            value={entry?.metrics?.[def.id]}
            onChange={(v) => store.updateDay(date, { metrics: { [def.id]: v } })}
          />
        ))}
        {trackerIds.length === 0 && <p className="muted small">{t.trackers.noneEnabled}</p>}
        {onChooseTrackers && (
          <button type="button" className="button button--ghost button--small day-editor__more" onClick={onChooseTrackers}>
            {t.trackers.choose}
          </button>
        )}
      </section>

      <NoteField key={date} date={date} initial={entry?.note ?? ''} />
    </div>
  );
}

/** Keeps typing local and saves after a short pause and on blur, so every keystroke is not a DB write. */
function NoteField({ date, initial }: { date: ISODate; initial: string }) {
  const store = useStore();
  const { t } = useI18n();
  const [value, setValue] = useState(initial);
  const timer = useRef<number | undefined>(undefined);
  const latest = useRef(value);

  const save = () => {
    window.clearTimeout(timer.current);
    const trimmed = latest.current.trim();
    if (trimmed !== (store.getState().days[date]?.note ?? '')) store.updateDay(date, { note: trimmed || undefined });
  };

  // Flush a pending save when the editor unmounts (e.g. the sheet closes).
  useEffect(() => () => save(), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <label className="field">
      <span className="section-label">{t.day.note}</span>
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
