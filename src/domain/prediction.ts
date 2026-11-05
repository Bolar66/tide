import { addDaysISO, diffDays, type ISODate } from './dates';
import { sortPeriods } from './periods';
import type { Period } from './types';

export const DEFAULT_CYCLE_LENGTH = 28;
export const DEFAULT_PERIOD_LENGTH = 5;
/** Cycles outside this range are almost certainly a missed or mistaken entry. */
export const MIN_CYCLE = 15;
export const MAX_CYCLE = 60;
export const MAX_PERIOD = 14;
/** Only recent cycles count, so the prediction follows changes over time. */
export const RECENT_CYCLES = 6;

export interface Cycle {
  start: ISODate;
  /** Days from this period's start to the next period's start. */
  length: number;
  periodLength?: number;
  /** False for outliers excluded from averages. */
  valid: boolean;
}

export interface CycleStats {
  avgCycle: number;
  avgPeriod: number;
  /** Number of valid cycles behind avgCycle. */
  cycleCount: number;
  /** Standard deviation of valid cycle lengths, null with fewer than 2. */
  sd: number | null;
  min: number | null;
  max: number | null;
  usingDefaultCycle: boolean;
  usingDefaultPeriod: boolean;
}

export function periodLength(p: Period): number | undefined {
  return p.end ? diffDays(p.end, p.start) + 1 : undefined;
}

/** Completed cycles, oldest first. The latest period has no following start, so it is not a cycle yet. */
export function getCycles(periods: readonly Period[]): Cycle[] {
  const sorted = sortPeriods(periods);
  const cycles: Cycle[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const cur = sorted[i]!;
    const next = sorted[i + 1]!;
    const length = diffDays(next.start, cur.start);
    cycles.push({
      start: cur.start,
      length,
      periodLength: periodLength(cur),
      valid: length >= MIN_CYCLE && length <= MAX_CYCLE,
    });
  }
  return cycles;
}

function mean(xs: readonly number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Sample standard deviation. */
export function stdDev(xs: readonly number[]): number | null {
  if (xs.length < 2) return null;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((acc, x) => acc + (x - m) ** 2, 0) / (xs.length - 1));
}

export function computeStats(periods: readonly Period[]): CycleStats {
  const valid = getCycles(periods).filter((c) => c.valid).slice(-RECENT_CYCLES);
  const lengths = valid.map((c) => c.length);

  const periodLengths = sortPeriods(periods)
    .map(periodLength)
    .filter((n): n is number => n !== undefined && n >= 1 && n <= MAX_PERIOD)
    .slice(-RECENT_CYCLES);

  return {
    avgCycle: lengths.length ? Math.round(mean(lengths)) : DEFAULT_CYCLE_LENGTH,
    avgPeriod: periodLengths.length ? Math.round(mean(periodLengths)) : DEFAULT_PERIOD_LENGTH,
    cycleCount: lengths.length,
    sd: stdDev(lengths),
    min: lengths.length ? Math.min(...lengths) : null,
    max: lengths.length ? Math.max(...lengths) : null,
    usingDefaultCycle: lengths.length === 0,
    usingDefaultPeriod: periodLengths.length === 0,
  };
}

export interface PredictedPeriod {
  start: ISODate;
  end: ISODate;
}

export interface Prediction {
  /** Upcoming periods, the first one never earlier than today. */
  upcoming: PredictedPeriod[];
  /** Days past the expected start of the next period, 0 if not late. */
  daysLate: number;
  /** Nominal next start (lastStart + avgCycle), may be in the past when late. */
  expectedStart: ISODate | null;
}

export function predict(
  periods: readonly Period[],
  stats: CycleStats,
  today: ISODate,
  count = 3,
): Prediction {
  const sorted = sortPeriods(periods);
  const last = sorted[sorted.length - 1];
  if (!last) return { upcoming: [], daysLate: 0, expectedStart: null };

  const expectedStart = addDaysISO(last.start, stats.avgCycle);
  const daysLate = Math.max(0, diffDays(today, expectedStart));

  // When late, the next period is expected any day now: anchor it to today and keep the rhythm after it.
  let start = daysLate > 0 ? today : expectedStart;
  const upcoming: PredictedPeriod[] = [];
  for (let i = 0; i < count; i++) {
    upcoming.push({ start, end: addDaysISO(start, stats.avgPeriod - 1) });
    start = addDaysISO(start, stats.avgCycle);
  }
  return { upcoming, daysLate, expectedStart };
}

/** 1-based day of the current cycle, or null before the first logged period. */
export function cycleDay(periods: readonly Period[], today: ISODate): number | null {
  const started = sortPeriods(periods).filter((p) => p.start <= today);
  const last = started[started.length - 1];
  return last ? diffDays(today, last.start) + 1 : null;
}
