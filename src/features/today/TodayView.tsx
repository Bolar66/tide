import { useState } from 'react';
import { diffDays, todayISO } from '../../domain/dates';
import { MAX_OPEN_PERIOD_DAYS, openPeriod } from '../../domain/periods';
import type { Period } from '../../domain/types';
import { useCycle } from '../../hooks/useCycle';
import { capitalize, inDays, longDate, shortDate, t } from '../../i18n/fi';
import { useStore, useTide } from '../../store/context';
import { DayEditor } from '../day/DayEditor';
import { OtherDaySheet } from './OtherDaySheet';
import './today.css';

const BACKUP_INTERVAL_DAYS = 30;

type Undo = { kind: 'start'; period: Period } | { kind: 'end'; period: Period };

export function TodayView({ onOpenSettings }: { onOpenSettings: () => void }) {
  const store = useStore();
  const lastBackupAt = useTide((s) => s.settings.lastBackupAt);
  const { today, periods, prediction, stats, cycleDay } = useCycle();
  const [undo, setUndo] = useState<Undo | null>(null);
  const [otherDay, setOtherDay] = useState<'start' | 'end' | null>(null);

  const open = openPeriod(periods);
  const openDay = open ? diffDays(today, open.start) + 1 : null;
  const inPeriod = open !== undefined && open.start <= today;
  const next = prediction.upcoming[0];

  const backupAge = lastBackupAt ? diffDays(today, todayISO(new Date(lastBackupAt))) : null;
  const showBackupReminder = periods.length > 0 && (backupAge === null || backupAge >= BACKUP_INTERVAL_DAYS);

  const start = () => {
    const r = store.startPeriod(today);
    if (r.ok && r.period) setUndo({ kind: 'start', period: r.period });
  };
  const end = () => {
    const before = open;
    const r = store.endPeriod(today);
    if (r.ok && before) setUndo({ kind: 'end', period: before });
  };
  const revert = () => {
    if (!undo) return;
    if (undo.kind === 'start') {
      store.deletePeriod(undo.period.id);
      store.updateDay(undo.period.start, { flow: undefined });
    } else {
      store.savePeriod(undo.period);
    }
    setUndo(null);
  };

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1>Tide</h1>
          <p className="page-header__sub">{capitalize(longDate(today))}</p>
        </div>
      </header>

      {showBackupReminder && (
        <div className="banner">
          <span>{t.today.backupReminder(backupAge)}</span>
          <button type="button" className="button button--ghost button--small" onClick={onOpenSettings}>
            {t.today.backupAction}
          </button>
        </div>
      )}

      <section className={`status-card${inPeriod ? ' status-card--period' : ''}`} aria-live="polite">
        {inPeriod && openDay !== null ? (
          <>
            <p className="status-card__eyebrow">{t.today.periodDay(openDay)}</p>
            {openDay > MAX_OPEN_PERIOD_DAYS && <p className="status-card__text">{t.today.forgotEnd(openDay)}</p>}
            <button type="button" className="button" onClick={end}>
              {t.today.ended}
            </button>
            <button type="button" className="button button--ghost" onClick={() => setOtherDay('end')}>
              {t.today.endedOther}
            </button>
          </>
        ) : (
          <>
            {cycleDay !== null && <p className="status-card__eyebrow">{t.today.cycleDay(cycleDay)}</p>}
            <p className="status-card__title">
              {periods.length === 0
                ? t.today.noHistory
                : prediction.daysLate > 0
                  ? t.today.late(prediction.daysLate)
                  : next
                    ? `${t.today.next(inDays(diffDays(next.start, today)))} (${shortDate(next.start)})`
                    : null}
            </p>
            <button type="button" className="button" onClick={start}>
              {t.today.started}
            </button>
            <button type="button" className="button button--ghost" onClick={() => setOtherDay('start')}>
              {t.today.startedOther}
            </button>
          </>
        )}
        {undo && (
          <button type="button" className="button button--ghost button--small status-card__undo" onClick={revert}>
            {t.common.undo}
          </button>
        )}
        {periods.length > 0 && stats.usingDefaultCycle && <p className="status-card__note">{t.today.defaultsNote}</p>}
      </section>

      <section className="card">
        <h2>{t.today.todayLog}</h2>
        <DayEditor date={today} showPeriodActions={false} />
      </section>

      <OtherDaySheet key={otherDay ?? 'closed'} mode={otherDay} today={today} onClose={() => setOtherDay(null)} />
    </div>
  );
}
