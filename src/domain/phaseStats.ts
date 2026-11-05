import { addDaysISO, diffDays, type ISODate } from './dates';
import { findPeriodOn, sortPeriods } from './periods';
import { cyclePhase, type Phase } from './phases';
import type { CycleStats } from './prediction';
import type { DayEntry, Period } from './types';

/** Phases shown in the comparison; a late cycle's extra days count as luteal. */
export type ComparedPhase = Exclude<Phase, 'late'>;
export const COMPARED_PHASES: readonly ComparedPhase[] = ['menstrual', 'follicular', 'ovulation', 'luteal'];

/** Numeric values compared across phases: two symptom scales and three trackers. */
export const PHASE_METRICS = [
  { id: 'sleepHours', read: (d: DayEntry) => d.metrics?.sleepHours },
  { id: 'sleepQuality', read: (d: DayEntry) => d.metrics?.sleepQuality },
  { id: 'mood', read: (d: DayEntry) => d.symptoms?.mood },
  { id: 'energy', read: (d: DayEntry) => d.symptoms?.energy },
  { id: 'stress', read: (d: DayEntry) => d.metrics?.stress },
] as const;

export type PhaseMetricId = (typeof PHASE_METRICS)[number]['id'];

export interface PhaseValue {
  mean: number;
  /** Number of logged days behind the mean. */
  n: number;
}

export type PhaseTable = Record<PhaseMetricId, Record<ComparedPhase, PhaseValue | null>>;

/** Which phase a date falls in, judged against the cycle it belongs to (actual length once it is over). */
export function phaseOfDate(
  periods: readonly Period[],
  stats: CycleStats,
  date: ISODate,
  today: ISODate,
): ComparedPhase | null {
  const sorted = sortPeriods(periods);
  const index = sorted.findLastIndex((p) => p.start <= date);
  if (index < 0) return null;
  const start = sorted[index]!.start;
  const next = sorted[index + 1]?.start ?? addDaysISO(start, stats.avgCycle);
  const phase = cyclePhase({
    cycleDay: diffDays(date, start) + 1,
    cycleLength: diffDays(next, start),
    inPeriod: findPeriodOn(periods, date, today) !== undefined,
  });
  return phase === 'late' ? 'luteal' : phase;
}

export function phaseAverages(
  periods: readonly Period[],
  days: Readonly<Record<ISODate, DayEntry>>,
  stats: CycleStats,
  today: ISODate,
): PhaseTable {
  const sums = new Map<string, { sum: number; n: number }>();
  for (const entry of Object.values(days)) {
    if (entry.date > today) continue;
    const phase = phaseOfDate(periods, stats, entry.date, today);
    if (!phase) continue;
    for (const m of PHASE_METRICS) {
      const v = m.read(entry);
      if (typeof v !== 'number') continue;
      const key = `${m.id}:${phase}`;
      const cur = sums.get(key) ?? { sum: 0, n: 0 };
      sums.set(key, { sum: cur.sum + v, n: cur.n + 1 });
    }
  }

  const table = {} as PhaseTable;
  for (const m of PHASE_METRICS) {
    table[m.id] = {} as Record<ComparedPhase, PhaseValue | null>;
    for (const phase of COMPARED_PHASES) {
      const s = sums.get(`${m.id}:${phase}`);
      table[m.id][phase] = s ? { mean: s.sum / s.n, n: s.n } : null;
    }
  }
  return table;
}

/** Days per phase needed before a phase takes part in an insight. */
export const MIN_DAYS_FOR_INSIGHT = 3;
/** Smallest difference worth mentioning, per metric (hours for sleep, scale points otherwise). */
const MEANINGFUL: Record<PhaseMetricId, number> = { sleepHours: 0.5, sleepQuality: 0.5, mood: 0.5, energy: 0.5, stress: 0.5 };

export interface PhaseInsight {
  metric: PhaseMetricId;
  /** Phase where the metric is clearly highest; null when several phases tie for the top. */
  high: ComparedPhase | null;
  /** Phase where it is clearly lowest; null on a tie. */
  low: ComparedPhase | null;
  difference: number;
}

/** Means closer than this count as a tie, so the insight never singles out an arbitrary phase. */
const TIE = 0.15;

/** The clearest highest-vs-lowest phase difference for a metric, if the data supports one. */
export function phaseInsight(table: PhaseTable, metric: PhaseMetricId): PhaseInsight | null {
  const rows = COMPARED_PHASES.flatMap((phase) => {
    const v = table[metric][phase];
    return v && v.n >= MIN_DAYS_FOR_INSIGHT ? [{ phase, mean: v.mean }] : [];
  });
  if (rows.length < 2) return null;
  const high = rows.reduce((a, b) => (b.mean > a.mean ? b : a));
  const low = rows.reduce((a, b) => (b.mean < a.mean ? b : a));
  const difference = high.mean - low.mean;
  if (difference < MEANINGFUL[metric]) return null;
  const unique = (best: number) => rows.filter((r) => Math.abs(r.mean - best) < TIE).length === 1;
  const insight = {
    metric,
    high: unique(high.mean) ? high.phase : null,
    low: unique(low.mean) ? low.phase : null,
    difference,
  };
  return insight.high || insight.low ? insight : null;
}
