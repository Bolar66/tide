import { addDaysISO, diffDays, type ISODate } from './dates';
import type { DayMark } from './calendar';
import { sortPeriods } from './periods';
import type { CycleStats } from './prediction';
import type { Period } from './types';

export type RingDayKind = 'period' | 'past' | 'future';

export interface RingDay {
  date: ISODate;
  kind: RingDayKind;
  isToday: boolean;
}

export interface Ring {
  days: RingDay[];
  /** 0–1, how far through the current cycle today is. Drives the wave level. */
  progress: number;
  cycleDay: number | null;
}

/**
 * Days of the current cycle laid out around the home screen ring. The ring is as long as the
 * average cycle, and grows when the current cycle runs longer (a late period). The next period
 * is expected where the ring closes, so predicted days never fall on the ring itself.
 */
export function buildRing(
  periods: readonly Period[],
  stats: CycleStats,
  marks: ReadonlyMap<ISODate, DayMark>,
  today: ISODate,
): Ring {
  const started = sortPeriods(periods).filter((p) => p.start <= today);
  const last = started[started.length - 1];

  if (!last) {
    const days = Array.from({ length: stats.avgCycle }, (_, i) => ({
      date: addDaysISO(today, i),
      kind: 'future' as const,
      isToday: i === 0,
    }));
    return { days, progress: 0, cycleDay: null };
  }

  const cycleDay = diffDays(today, last.start) + 1;
  const length = Math.max(stats.avgCycle, cycleDay);
  const days: RingDay[] = Array.from({ length }, (_, i) => {
    const date = addDaysISO(last.start, i);
    const mark = marks.get(date);
    const kind: RingDayKind = mark === 'period' ? 'period' : date <= today ? 'past' : 'future';
    return { date, kind, isToday: date === today };
  });
  return { days, progress: Math.min(1, cycleDay / length), cycleDay };
}
