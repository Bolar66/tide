import { addDaysISO, diffDays, type ISODate } from './dates';
import { effectiveEnd, sortPeriods } from './periods';
import type { DayEntry, Period } from './types';

/** Symptoms counted in the recap: a day counts when the value is 3 or more on the 1–5 scale. */
const SYMPTOMS: { id: string; read: (d: DayEntry) => unknown }[] = [
  { id: 'cramps', read: (d) => d.symptoms?.cramps },
  { id: 'headache', read: (d) => d.symptoms?.headache },
  { id: 'bloating', read: (d) => d.metrics?.bloating },
  { id: 'breastTenderness', read: (d) => d.metrics?.breastTenderness },
  { id: 'backPain', read: (d) => d.metrics?.backPain },
  { id: 'stress', read: (d) => d.metrics?.stress },
  { id: 'anxiety', read: (d) => d.metrics?.anxiety },
  { id: 'irritability', read: (d) => d.metrics?.irritability },
];

export interface CycleRecap {
  /** First day of the finished cycle and the day before the next period. */
  start: ISODate;
  end: ISODate;
  length: number;
  periodLength: number;
  /** Average of the cycles before this one, null without history. */
  previousAverage: number | null;
  loggedDays: number;
  /** One value per cycle day (index 0 = day 1), null when not logged. */
  mood: (number | null)[];
  energy: (number | null)[];
  topSymptoms: { id: string; days: number }[];
  /** Best three-day stretch by mood + energy, as 1-based cycle days. */
  bestDays: { from: number; to: number } | null;
}

const num = (v: unknown) => (typeof v === 'number' ? v : null);

/**
 * Summary of the most recently finished cycle (the one that ended when the latest period
 * started). Null until there are two periods.
 */
export function lastCycleRecap(
  periods: readonly Period[],
  days: Readonly<Record<ISODate, DayEntry>>,
  today: ISODate,
): CycleRecap | null {
  const started = sortPeriods(periods).filter((p) => p.start <= today);
  if (started.length < 2) return null;
  const cycle = started[started.length - 2]!;
  const next = started[started.length - 1]!;
  const length = diffDays(next.start, cycle.start);
  const end = addDaysISO(next.start, -1);
  const dates = Array.from({ length }, (_, i) => addDaysISO(cycle.start, i));
  const entries = dates.map((d) => days[d]);

  const before = started.slice(0, -2);
  const prevLengths = before.slice(1).map((p, i) => diffDays(p.start, before[i]!.start));
  if (before.length > 0) prevLengths.push(diffDays(cycle.start, before[before.length - 1]!.start));
  const previousAverage = prevLengths.length ? Math.round((prevLengths.reduce((a, b) => a + b, 0) / prevLengths.length) * 10) / 10 : null;

  const mood = entries.map((e) => num(e?.symptoms?.mood));
  const energy = entries.map((e) => num(e?.symptoms?.energy));

  const topSymptoms = SYMPTOMS.map((s) => ({
    id: s.id,
    days: entries.filter((e) => e && (num(s.read(e)) ?? 0) >= 3).length,
  }))
    .filter((s) => s.days > 0)
    .sort((a, b) => b.days - a.days)
    .slice(0, 3);

  let bestDays: CycleRecap['bestDays'] = null;
  let bestScore = -Infinity;
  for (let i = 0; i + 2 < length; i++) {
    const vals = [i, i + 1, i + 2].flatMap((j) => [mood[j], energy[j]]).filter((v): v is number => v !== null);
    if (vals.length < 3) continue;
    const score = vals.reduce((a, b) => a + b, 0) / vals.length;
    if (score > bestScore) {
      bestScore = score;
      bestDays = { from: i + 1, to: i + 3 };
    }
  }

  return {
    start: cycle.start,
    end,
    length,
    periodLength: diffDays(effectiveEnd(cycle, today), cycle.start) + 1,
    previousAverage,
    loggedDays: entries.filter(Boolean).length,
    mood,
    energy,
    topSymptoms,
    bestDays,
  };
}

/** The recap is offered on the home screen for the first week of the new cycle. */
export const RECAP_OFFER_DAYS = 7;
