import { useState } from 'react';
import { Sheet } from '../../components/Sheet';
import { addDaysISO, type ISODate } from '../../domain/dates';
import { useI18n } from '../../i18n';
import { useStore } from '../../store/context';

interface Props {
  mode: 'start' | 'end' | null;
  today: ISODate;
  onClose: () => void;
}

/** Pick another day for "started"/"ended". A visible native date input is the most reliable picker on iOS. */
export function OtherDaySheet({ mode, today, onClose }: Props) {
  const store = useStore();
  const { t } = useI18n();
  const [date, setDate] = useState(addDaysISO(today, -1));
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!mode || !date) return;
    const r = mode === 'start' ? store.startPeriod(date) : store.endPeriod(date);
    if (r.ok) onClose();
    else setError(t.day.errors[r.reason] ?? null);
  };

  return (
    <Sheet open={mode !== null} onClose={onClose} title={mode === 'end' ? t.today.endedOther : t.today.startedOther}>
      <div className="stack">
        <label className="field">
          {mode === 'end' ? t.stats.end : t.stats.start}
          <input className="input" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
        </label>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <button type="button" className="button" onClick={submit} disabled={!date || date > today}>
          {t.common.save}
        </button>
      </div>
    </Sheet>
  );
}
