import { useState } from 'react';
import { Sheet } from '../../components/Sheet';
import type { ISODate } from '../../domain/dates';
import type { Period } from '../../domain/types';
import { useI18n } from '../../i18n';
import { useStore } from '../../store/context';

interface Props {
  /** Period to edit, 'new' to add one, null when closed. */
  target: Period | 'new' | null;
  today: ISODate;
  onClose: () => void;
}

export function PeriodSheet({ target, today, onClose }: Props) {
  const store = useStore();
  const { t } = useI18n();
  const existing = target !== 'new' ? target : null;
  const [start, setStart] = useState(existing?.start ?? '');
  const [end, setEnd] = useState(existing?.end ?? '');
  const [ongoing, setOngoing] = useState(existing ? !existing.end : false);
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const period: Period = {
      id: existing?.id ?? crypto.randomUUID(),
      start,
      ...(ongoing || !end ? {} : { end }),
    };
    if (!ongoing && !end) return setError(t.stats.errors['end-before-start'] ?? null);
    const r = store.savePeriod(period);
    if (r.ok) onClose();
    else setError(t.stats.errors[r.reason] ?? null);
  };

  const remove = () => {
    if (existing && window.confirm(t.stats.confirmDelete)) {
      store.deletePeriod(existing.id);
      onClose();
    }
  };

  return (
    <Sheet open={target !== null} onClose={onClose} title={existing ? t.stats.editTitle : t.stats.addTitle}>
      <div className="stack">
        <label className="field">
          {t.stats.start}
          <input className="input" type="date" value={start} max={today} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="field">
          {t.stats.end}
          <input
            className="input"
            type="date"
            value={ongoing ? '' : end}
            min={start}
            max={today}
            disabled={ongoing}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={ongoing} onChange={(e) => setOngoing(e.target.checked)} />
          {t.stats.noEnd}
        </label>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <button type="button" className="button" onClick={save} disabled={!start}>
          {t.common.save}
        </button>
        {existing && (
          <button type="button" className="button button--danger" onClick={remove}>
            {t.common.delete}
          </button>
        )}
      </div>
    </Sheet>
  );
}
