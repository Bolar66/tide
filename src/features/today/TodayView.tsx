import { useState, type CSSProperties } from 'react';
import { diffDays, todayISO } from '../../domain/dates';
import { openPeriod } from '../../domain/periods';
import type { Period } from '../../domain/types';
import { useCycle } from '../../hooks/useCycle';
import { capitalize, useI18n } from '../../i18n';
import { useStore, useTide } from '../../store/context';
import { TodaySummary } from './TodaySummary';
import { BACKUP_GUIDE_FLAG, exportBackup } from '../settings/backupIO';
import { OwnerConnectCard } from '../connect/ConnectCards';
import { CycleRing } from './CycleRing';
import { OtherDaySheet } from './OtherDaySheet';
import { PatternWarnings } from './PatternWarnings';
import { PhaseCard } from './PhaseCard';
import './today.css';

const BACKUP_INTERVAL_DAYS = 30;

type Undo = { kind: 'start' | 'end'; period: Period };

interface Props {
  onOpenCalendar: () => void;
  onOpenSettings: () => void;
  onOpenTrackers: () => void;
}

export function TodayView({ onOpenCalendar, onOpenSettings, onOpenTrackers }: Props) {
  const store = useStore();
  const { t, f } = useI18n();
  const lastBackupAt = useTide((s) => s.settings.lastBackupAt);
  const { today, periods, prediction, stats, ring, hasHints, phase, warnings, fertile, cycleDay, ovulation } = useCycle();
  const [undo, setUndo] = useState<Undo | null>(null);
  const [otherDay, setOtherDay] = useState<'start' | 'end' | null>(null);
  // Ping today's ring dot whenever today's log or the periods change.
  const todayEntry = useTide((s) => s.days[today]);
  const [seen, setSeen] = useState({ todayEntry, periods });
  const [pulse, setPulse] = useState(0);
  if (seen.todayEntry !== todayEntry || seen.periods !== periods) {
    setSeen({ todayEntry, periods });
    setPulse((n) => n + 1);
  }

  const open = openPeriod(periods);
  const inPeriod = open !== undefined && open.start <= today;
  const periodDay = open ? diffDays(today, open.start) + 1 : 0;
  const next = prediction.upcoming[0];

  const backupAge = lastBackupAt ? diffDays(today, todayISO(new Date(lastBackupAt))) : null;
  const showBackupReminder = periods.length > 0 && (backupAge === null || backupAge >= BACKUP_INTERVAL_DAYS);

  const status =
    periods.length === 0
      ? t.today.noHistory
      : inPeriod
        ? t.ring.inPeriod(periodDay)
        : prediction.daysLate > 0
          ? t.ring.late(prediction.daysLate)
          : next
            ? t.ring.next(diffDays(next.start, today))
            : '';

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
    <div className="stack stack--lg">
      <header className="page-header enter">
        <div>
          <p className="eyebrow">{capitalize(f.longDate(today))}</p>
          <h1 className="display">{t.tabs.today}</h1>
        </div>
      </header>

      {showBackupReminder && (
        <div className="banner">
          <span>{t.today.backupReminder(backupAge)}</span>
          <button
            type="button"
            className="button button--ghost button--small"
            onClick={() => {
              if (backupAge === null) {
                // First backup: go through the guide in settings so the file lands somewhere safe.
                try {
                  sessionStorage.setItem(BACKUP_GUIDE_FLAG, '1');
                } catch {
                  /* ignore */
                }
                onOpenSettings();
                return;
              }
              // Called straight from the tap: iOS only opens the share sheet from a user gesture.
              exportBackup(store.snapshot()).then(
                (done) => done && store.updateSettings({ lastBackupAt: Date.now() }),
                () => onOpenSettings(),
              );
            }}
          >
            {t.today.backupAction}
          </button>
        </div>
      )}

      <section className="today-hero" aria-live="polite">
        <CycleRing ring={ring} cycleLength={stats.avgCycle} status={status} onOpen={onOpenCalendar} pulse={pulse} />

        <div className="today-hero__actions enter" style={{ '--i': 2 } as CSSProperties}>
          <button type="button" className="button" onClick={inPeriod ? end : start}>
            {inPeriod ? t.today.ended : t.today.started}
          </button>
          <div className="today-hero__secondary">
            <button type="button" className="button button--ghost button--small" onClick={() => setOtherDay(inPeriod ? 'end' : 'start')}>
              {inPeriod ? t.today.endedOther : t.today.startedOther}
            </button>
            {undo && (
              <button type="button" className="button button--ghost button--small" onClick={revert}>
                {t.common.undo}
              </button>
            )}
          </div>
        </div>

        {inPeriod && <p className="today-hero__note">{t.today.autoEndNote}</p>}

        {periods.length > 0 && stats.usingDefaultCycle && (
          <p className="today-hero__note">{hasHints ? t.today.hintsNote : t.today.defaultsNote}</p>
        )}
      </section>

      <TodaySummary date={today} onChooseTrackers={onOpenTrackers} />

      <PatternWarnings warnings={warnings} />

      {phase && cycleDay !== null && (
        <PhaseCard
          phase={phase}
          cycleDay={cycleDay}
          showFertileNote={fertile.length > 0 && (phase === 'ovulation' || phase === 'follicular')}
          ovulation={ovulation ? { date: ovulation, inDays: diffDays(ovulation, today) } : null}
        />
      )}

      <OwnerConnectCard />

      <OtherDaySheet key={otherDay ?? 'closed'} mode={otherDay} today={today} onClose={() => setOtherDay(null)} />
    </div>
  );
}
