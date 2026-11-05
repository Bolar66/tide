import type { Snapshot } from '../db/persistence';
import { addDaysISO, type ISODate } from '../domain/dates';
import type { DayEntry } from '../domain/types';
import type { SharedSnapshot, ShareScope } from './types';

/** Tracker ids shared under each scope. Anything not listed here is never shared. */
const SCOPE_METRICS: Partial<Record<ShareScope, readonly string[]>> = {
  mood: ['stress', 'anxiety', 'irritability', 'sensitivity', 'focus'],
  symptoms: ['breastTenderness', 'backPain', 'bloating', 'skin', 'digestion', 'appetite', 'cravings', 'cravingsIntensity'],
  sleep: ['sleepHours', 'sleepQuality'],
};

/** Shared history is limited to recent days: enough for the ring, patterns and context. */
export const SHARE_HISTORY_DAYS = 400;

function filterDay(day: DayEntry, scopes: ReadonlySet<ShareScope>): DayEntry | null {
  const out: DayEntry = { date: day.date, updatedAt: day.updatedAt };
  if (scopes.has('cycle') && day.flow) out.flow = day.flow;
  const symptoms: DayEntry['symptoms'] = {};
  if (scopes.has('mood')) {
    if (day.symptoms?.mood) symptoms.mood = day.symptoms.mood;
    if (day.symptoms?.energy) symptoms.energy = day.symptoms.energy;
  }
  if (scopes.has('symptoms')) {
    if (day.symptoms?.cramps) symptoms.cramps = day.symptoms.cramps;
    if (day.symptoms?.headache) symptoms.headache = day.symptoms.headache;
  }
  if (Object.keys(symptoms).length) out.symptoms = symptoms;
  const metrics: Record<string, NonNullable<DayEntry['metrics']>[string]> = {};
  for (const scope of scopes) {
    for (const id of SCOPE_METRICS[scope] ?? []) {
      const v = day.metrics?.[id];
      if (v !== undefined) metrics[id] = v;
    }
  }
  if (Object.keys(metrics).length) out.metrics = metrics;
  if (scopes.has('notes') && day.note) out.note = day.note;
  return Object.keys(out).length > 2 ? out : null;
}

/** The owner's data reduced to the chosen scopes, ready to be encrypted for one partner. */
export function buildSharedSnapshot(
  snapshot: Snapshot,
  scopes: readonly ShareScope[],
  ownerName: string,
  today: ISODate,
  now = Date.now(),
): SharedSnapshot {
  const set = new Set(scopes);
  const since = addDaysISO(today, -SHARE_HISTORY_DAYS);
  const cycle = set.has('cycle');
  return {
    v: 1,
    ownerName,
    scopes: [...scopes],
    updatedAt: now,
    periods: cycle ? snapshot.periods.filter((p) => (p.end ?? p.start) >= since) : [],
    days: snapshot.days
      .filter((d) => d.date >= since && d.date <= today)
      .map((d) => filterDay(d, set))
      .filter((d): d is DayEntry => d !== null),
    ...(cycle
      ? { cycleLengthHint: snapshot.settings.cycleLengthHint, periodLengthHint: snapshot.settings.periodLengthHint }
      : {}),
  };
}
