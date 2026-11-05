import { addDaysISO, type ISODate } from './dates';
import { findPeriodOn, sortPeriods } from './periods';
import {
  COMPARED_PHASES,
  MEANINGFUL,
  MIN_DAYS_FOR_INSIGHT,
  PHASE_METRICS,
  type ComparedPhase,
  type PhaseMetricId,
  type PhaseTable,
} from './phaseStats';
import type { DayEntry, Period } from './types';

/** A metric that is clearly different in one part of the cycle than in the rest of it. */
export interface CycleInsight {
  metric: PhaseMetricId;
  /** Mean in the phase / window in question. */
  mean: number;
  /** Mean over all other logged days. */
  otherMean: number;
  direction: 'higher' | 'lower';
  /** Days behind `mean`. */
  n: number;
}

const byStrength = (a: CycleInsight, b: CycleInsight) =>
  Math.abs(b.mean - b.otherMean) / MEANINGFUL[b.metric] - Math.abs(a.mean - a.otherMean) / MEANINGFUL[a.metric];

/** How this phase usually differs from the rest of the cycle, strongest first. */
export function insightsForPhase(table: PhaseTable, phase: ComparedPhase, max = 3): CycleInsight[] {
  const found: CycleInsight[] = [];
  for (const { id } of PHASE_METRICS) {
    const here = table[id][phase];
    if (!here || here.n < MIN_DAYS_FOR_INSIGHT) continue;
    let sum = 0;
    let n = 0;
    for (const other of COMPARED_PHASES) {
      const v = table[id][other];
      if (other === phase || !v) continue;
      sum += v.mean * v.n;
      n += v.n;
    }
    if (n < MIN_DAYS_FOR_INSIGHT) continue;
    const otherMean = sum / n;
    if (Math.abs(here.mean - otherMean) < MEANINGFUL[id]) continue;
    found.push({ metric: id, mean: here.mean, otherMean, direction: here.mean > otherMean ? 'higher' : 'lower', n: here.n });
  }
  return found.sort(byStrength).slice(0, max);
}

/** Days before a period start that count as "just before" it. */
export const PRE_PERIOD_DAYS = 3;
const MIN_PRE_DAYS = 4;
const MIN_PRE_CYCLES = 2;

/**
 * What tends to change in the few days before a period (the classic PMS window), compared with
 * all other days outside periods. Needs data from at least two cycles.
 */
export function prePeriodInsights(
  periods: readonly Period[],
  days: Readonly<Record<ISODate, DayEntry>>,
  today: ISODate,
  max = 3,
): CycleInsight[] {
  const starts = sortPeriods(periods)
    .map((p) => p.start)
    .filter((s) => s <= today);
  const window = new Map<ISODate, ISODate>(); // day → the period start it precedes
  for (const s of starts) {
    for (let i = 1; i <= PRE_PERIOD_DAYS; i++) window.set(addDaysISO(s, -i), s);
  }

  const found: CycleInsight[] = [];
  for (const m of PHASE_METRICS) {
    let preSum = 0;
    let preN = 0;
    let restSum = 0;
    let restN = 0;
    const cycles = new Set<ISODate>();
    for (const entry of Object.values(days)) {
      if (entry.date > today) continue;
      const v = m.read(entry);
      if (typeof v !== 'number') continue;
      const before = window.get(entry.date);
      if (before && !findPeriodOn(periods, entry.date, today)) {
        preSum += v;
        preN++;
        cycles.add(before);
      } else if (!findPeriodOn(periods, entry.date, today)) {
        restSum += v;
        restN++;
      }
    }
    if (preN < MIN_PRE_DAYS || cycles.size < MIN_PRE_CYCLES || restN < MIN_PRE_DAYS) continue;
    const mean = preSum / preN;
    const otherMean = restSum / restN;
    if (Math.abs(mean - otherMean) < MEANINGFUL[m.id]) continue;
    found.push({ metric: m.id, mean, otherMean, direction: mean > otherMean ? 'higher' : 'lower', n: preN });
  }
  return found.sort(byStrength).slice(0, max);
}

/** Logged days with any compared metric: drives the "insights unlock as you log" progress. */
export function insightDataDays(days: Readonly<Record<ISODate, DayEntry>>, today: ISODate): number {
  return Object.values(days).filter((d) => d.date <= today && PHASE_METRICS.some((m) => typeof m.read(d) === 'number')).length;
}

/** Roughly enough logged days (three per phase) for the first phase insights to appear. */
export const INSIGHT_TARGET_DAYS = MIN_DAYS_FOR_INSIGHT * COMPARED_PHASES.length * 2;
