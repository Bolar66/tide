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
import { SYMPTOM_SECTION, trackerSection, type LogSection } from './sections';
import { TrackerField } from './TrackerField';
import './day.css';

const SYMPTOM_KEYS = ['cramps', 'headache', 'mood', 'energy'] as const satisfies readonly (keyof Symptoms)[];

/** Everything that can be logged for one day, optionally limited to one tab. Changes save immediately. */
export function DayEditor({
  date,
  showPeriodActions = true,
  onChooseTrackers,
  wellbeingOnly = false,
  section = 'all',
}: {
  date: ISODate;
  showPeriodActions?: boolean;
  onChooseTrackers?: () => void;
  /** For people who do not track a cycle: mood, energy and wellbeing trackers only. */
  wellbeingOnly?: boolean;
  section?: LogSection | 'all';
}) {
  const store = useStore();
  const { t } = useI18n();
  const entry = useTide((s) => s.days[date]);
  const trackerIds = useTide((s) => s.settings.enabledTrackers);
  const { periods, today } = useCycle();
  const [error, setError] = useState<string | null>(null);

  if (date > today) return <p className="muted">{t.day.future}</p>;

  const shows = (sec: LogSection) => section === 'all' || section === sec;
  const period = findPeriodOn(periods, date, today);
  const canEnd = period && period.end !== date;
  const flowOptions = [
    { value: 'none', label: t.day.noFlow },
    { value: 'light', label: t.day.flowLevels.light },
    { value: 'medium', label: t.day.flowLevels.medium },
    { value: 'heavy', label: t.day.flowLevels.heavy },
  ] as const;
  const symptoms = SYMPTOM_KEYS.filter((key) => (!wellbeingOnly || SYMPTOM_SECTION[key] === 'mind') && shows(SYMPTOM_SECTION[key]));
  const trackers = enabledTrackers(trackerIds).filter((def) => (!wellbeingOnly || trackerSection(def) !== 'cycle') && shows(trackerSection(def)));

  const run = (r: { ok: true } | { ok: false; reason: string }) => setError(r.ok ? null : (t.day.errors[r.reason] ?? null));

  return (
    <div className="day-editor">
      {showPeriodActions && !wellbeingOnly && shows('cycle') && (
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

      {!wellbeingOnly && shows('cycle') && (
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
      )}

      {(symptoms.length > 0 || trackers.length > 0) && (
        <section className="day-editor__trackers">
          {symptoms.map((key) => (
            <Scale
              key={key}
              label={t.symptoms[key].label}
              levels={t.symptoms[key].levels}
              value={entry?.symptoms?.[key]}
              onChange={(v) => store.updateDay(date, { symptoms: { [key]: v } })}
            />
          ))}
          {trackers.map((def) => (
            <TrackerField
              key={def.id}
              def={def}
              value={entry?.metrics?.[def.id]}
              onChange={(v) => store.updateDay(date, { metrics: { [def.id]: v } })}
            />
          ))}
        </section>
      )}

      {(section === 'body' || section === 'life' || section === 'all') && trackers.length === 0 && (
        <p className="muted small">{t.trackers.noneEnabled}</p>
      )}
      {onChooseTrackers && section !== 'note' && (
        <button type="button" className="button button--ghost button--small day-editor__more" onClick={onChooseTrackers}>
          {t.trackers.choose}
        </button>
      )}

      {shows('note') && <NoteField key={date} date={date} initial={entry?.note ?? ''} />}
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
  const [focused, setFocused] = useState(false);

  // Show changes that arrive from sync, unless the user is typing right now.
  const [seen, setSeen] = useState(initial);
  if (initial !== seen) {
    setSeen(initial);
    if (!focused) setValue(initial);
  }
  useEffect(() => {
    latest.current = value;
  }, [value]);

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
        onFocus={() => setFocused(true)}
        className="textarea"
        value={value}
        placeholder={t.day.notePlaceholder}
        onChange={(e) => {
          setValue(e.target.value);
          latest.current = e.target.value;
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(save, 800);
        }}
        onBlur={() => {
          setFocused(false);
          save();
        }}
      />
    </label>
  );
}
