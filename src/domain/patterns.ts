import { addDaysISO, diffDays, type ISODate } from './dates';
import { sortPeriods } from './periods';
import { getCycles, RECENT_CYCLES, type CycleStats } from './prediction';
import type { DayEntry, Period, Scale5, Symptoms } from './types';

export type SymptomKey = keyof Symptoms;

/** What counts as a noteworthy entry for each symptom. Mood and energy are noteworthy when low. */
const NOTABLE: Record<SymptomKey, (v: Scale5) => boolean> = {
  cramps: (v) => v >= 3,
  headache: (v) => v >= 3,
  mood: (v) => v <= 2,
  energy: (v) => v <= 2,
};

const SYMPTOMS = Object.keys(NOTABLE) as SymptomKey[];
/** A pattern must repeat in at least this many cycles… */
export const MIN_HITS = 2;
/** …and in at least this share of the cycles where the symptom was logged at all. */
export const MIN_SHARE = 0.5;
/** Offsets match within ±1 day: cycles are never exactly alike. */
const TOLERANCE = 1;

export interface PatternWarning {
  symptom: SymptomKey;
  /** First upcoming day the symptom is expected. */
  date: ISODate;
  daysAhead: number;
  /** Past cycles in which it happened around the same point. */
  hits: number;
  /** Past cycles in which the symptom was logged at all. */
  cycles: number;
}

interface Occurrence {
  /** Days since the cycle started (0 = first period day). */
  fromStart: number;
  /** Days until the next period started (1 = the day before). */
  toEnd: number;
}

/**
 * Find symptoms that recurred at the same point of previous cycles and are likely within
 * `horizon` days. A pattern can be anchored to the cycle start (e.g. cramps on day 1–2) or to
 * the next period (e.g. headache two days before), whichever has more evidence.
 */
export function findPatternWarnings(
  periods: readonly Period[],
  days: Readonly<Record<ISODate, DayEntry>>,
  stats: CycleStats,
  today: ISODate,
  horizon = 3,
): PatternWarning[] {
  const started = sortPeriods(periods).filter((p) => p.start <= today);
  const current = started[started.length - 1];
  if (!current) return [];
  const expectedNext = addDaysISO(current.start, stats.avgCycle);

  const cycles = getCycles(periods)
    .filter((c) => c.valid && c.start < current.start)
    .slice(-RECENT_CYCLES);

  const warnings: PatternWarning[] = [];

  for (const symptom of SYMPTOMS) {
    const perCycle: Occurrence[][] = [];
    for (const c of cycles) {
      const nextStart = addDaysISO(c.start, c.length);
      let logged = false;
      const hits: Occurrence[] = [];
      for (let d = c.start; d < nextStart; d = addDaysISO(d, 1)) {
        const value = days[d]?.symptoms?.[symptom];
        if (value === undefined) continue;
        logged = true;
        if (NOTABLE[symptom](value)) hits.push({ fromStart: diffDays(d, c.start), toEnd: diffDays(nextStart, d) });
      }
      if (logged) perCycle.push(hits);
    }
    if (perCycle.length < MIN_HITS) continue;

    // Score each upcoming day; exact matches outweigh ±1 matches so the warning lands on the likeliest day.
    let best: { target: ISODate; ahead: number; hits: number; score: number } | null = null;
    for (let ahead = 0; ahead <= horizon; ahead++) {
      const target = addDaysISO(today, ahead);
      if (target >= expectedNext) break;
      const todayValue = ahead === 0 ? days[today]?.symptoms?.[symptom] : undefined;
      if (todayValue !== undefined && NOTABLE[symptom](todayValue)) break; // already logged, no need to warn

      const fromStart = diffDays(target, current.start);
      const toEnd = diffDays(expectedNext, target);
      const count = (pick: (o: Occurrence) => number, at: number, tol: number) =>
        perCycle.filter((occ) => occ.some((o) => Math.abs(pick(o) - at) <= tol)).length;
      const startHits = count((o) => o.fromStart, fromStart, TOLERANCE);
      const endHits = count((o) => o.toEnd, toEnd, TOLERANCE);
      const hits = Math.max(startHits, endHits);
      const exact = Math.max(count((o) => o.fromStart, fromStart, 0), count((o) => o.toEnd, toEnd, 0));

      if (hits >= MIN_HITS && hits / perCycle.length >= MIN_SHARE) {
        const score = hits * 10 + exact;
        if (!best || score > best.score) best = { target, ahead, hits, score };
      }
    }
    if (best) warnings.push({ symptom, date: best.target, daysAhead: best.ahead, hits: best.hits, cycles: perCycle.length });
  }

  return warnings.sort((a, b) => a.daysAhead - b.daysAhead || b.hits - a.hits);
}
