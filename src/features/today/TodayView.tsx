import { useState, type CSSProperties } from 'react';
import { diffDays, todayISO } from '../../domain/dates';
import { openPeriod, periodToday } from '../../domain/periods';
import { predictionSpread } from '../../domain/prediction';
import type { Period } from '../../domain/types';
import { useCycle } from '../../hooks/useCycle';
import { capitalize, useI18n } from '../../i18n';
import { useStore, useTide } from '../../store/context';
import { TodaySummary } from './TodaySummary';
import { InsightCard } from './InsightCard';
import { RecapCard } from '../recap/RecapEntry';
import { BACKUP_GUIDE_FLAG, exportBackup } from '../settings/backupIO';
import { OwnerConnectCard } from '../connect/ConnectCards';
import { CycleRing } from './CycleRing';
import { OtherDaySheet } from './OtherDaySheet';
import { PatternWarnings } from './PatternWarnings';
import { PhaseCard } from './PhaseCard';
import './today.css';

const BACKUP_INTERVAL_DAYS = 30;
const SCRUB_HINT_KEY = 'tide.scrubHintSeen';

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
  const spread = predictionSpread(stats);
  // One-time hint for scrubbing the ring, hidden after the first scrub.
  const [scrubHint, setScrubHint] = useState(() => {
    try {
      return localStorage.getItem(SCRUB_HINT_KEY) !== '1';
    } catch {
      return false;
    }
  });
  const hideScrubHint = () => {
    setScrubHint(false);
    try {
      localStorage.setItem(SCRUB_HINT_KEY, '1');
    } catch {
      /* ignore */
    }
  };
  if (seen.todayEntry !== todayEntry || seen.periods !== periods) {
    setSeen({ todayEntry, periods });
    setPulse((n) => n + 1);
  }

  const open = openPeriod(periods);
  // Today may also fall inside a period that already has an end date (auto-ended, edited in the
  // calendar or synced from another device). Then the main action is to end it today.
  const { current, day: periodDay, endedToday } = periodToday(periods, today);
  const inPeriod = current !== undefined;
  const [error, setError] = useState<string | null>(null);
  const next = prediction.upcoming[0];

  const backupAge = lastBackupAt ? diffDays(today, todayISO(new Date(lastBackupAt))) : null;
  const showBackupReminder = periods.length > 0 && (backupAge === null || backupAge >= BACKUP_INTERVAL_DAYS);

  const status =
    periods.length === 0
      ? t.today.noHistory
      : endedToday
        ? t.ring.endedToday
        : inPeriod
          ? t.ring.inPeriod(periodDay)
        : prediction.daysLate > 0
          ? t.ring.late(prediction.daysLate)
          : next
            ? `${t.ring.next(diffDays(next.start, today))} (${t.ring.spread(spread)})`
            : '';

  const start = () => {
    const r = store.startPeriod(today);
    setError(r.ok ? null : (t.day.errors[r.reason] ?? null));
    if (r.ok && r.period) setUndo({ kind: 'start', period: r.period });
  };
  const end = () => {
    const before = current;
    const r = store.endPeriod(today);
    setError(r.ok ? null : (t.day.errors[r.reason] ?? null));
    if (r.ok && before) setUndo({ kind: 'end', period: before });
  };
  const reopen = () => {
    if (!current) return;
    const r = store.savePeriod({ ...current, end: undefined });
    setError(r.ok ? null : (t.stats.errors[r.reason] ?? null));
    if (r.ok) setUndo({ kind: 'end', period: current });
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
        <CycleRing
          ring={ring}
          cycleLength={stats.avgCycle}
          status={status}
          onOpen={onOpenCalendar}
          pulse={pulse}
          spread={periods.length > 0 ? spread : undefined}
          onScrubbed={hideScrubHint}
        />
        {scrubHint && periods.length > 0 && <p className="cycle-ring-hint">{t.ring.scrubHint}</p>}

        <div className="today-hero__actions enter" style={{ '--i': 2 } as CSSProperties}>
          <button type="button" className="button" onClick={endedToday ? reopen : inPeriod ? end : start}>
            {endedToday ? t.today.continues : inPeriod ? t.today.ended : t.today.started}
          </button>
          <div className="today-hero__secondary">
            <button type="button" className="button button--ghost button--small" onClick={() => setOtherDay(inPeriod ? 'end' : 'start')}>
              {inPeriod ? t.today.endedOther : t.today.startedOther}
            </button>
            {undo && !endedToday && (
              <button type="button" className="button button--ghost button--small" onClick={revert}>
                {t.common.undo}
              </button>
            )}
          </div>
        </div>

        {error && (
          <p className="error-text today-hero__note" role="alert">
            {error}
          </p>
        )}
        {open && inPeriod && <p className="today-hero__note">{t.today.autoEndNote}</p>}

        {periods.length > 0 && stats.usingDefaultCycle && (
          <p className="today-hero__note">{hasHints ? t.today.hintsNote : t.today.defaultsNote}</p>
        )}
      </section>

      <TodaySummary date={today} onChooseTrackers={onOpenTrackers} />

      <RecapCard />

      <InsightCard />

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
