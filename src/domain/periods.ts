import { addDaysISO, diffDays, type ISODate } from './dates';
import type { Period } from './types';

/** Periods left open longer than this are treated as forgotten when drawing day ranges. */
export const MAX_OPEN_PERIOD_DAYS = 10;

export function sortPeriods(periods: readonly Period[]): Period[] {
  return [...periods].sort((a, b) => a.start.localeCompare(b.start));
}

/**
 * Last day of a period for display purposes. Open periods run until today,
 * capped so a forgotten "ended" tap does not paint weeks of red.
 */
export function effectiveEnd(period: Period, today: ISODate): ISODate {
  if (period.end) return period.end;
  const cap = addDaysISO(period.start, MAX_OPEN_PERIOD_DAYS - 1);
  const last = today < period.start ? period.start : today;
  return last < cap ? last : cap;
}

export function findPeriodOn(periods: readonly Period[], date: ISODate, today: ISODate): Period | undefined {
  return periods.find((p) => p.start <= date && date <= effectiveEnd(p, today));
}

export function openPeriod(periods: readonly Period[]): Period | undefined {
  return periods.find((p) => !p.end);
}

/** Latest period that started on or before `date`. */
export function latestStartedBy(periods: readonly Period[], date: ISODate): Period | undefined {
  let found: Period | undefined;
  for (const p of sortPeriods(periods)) {
    if (p.start <= date) found = p;
  }
  return found;
}

export type PeriodChange =
  | { ok: true; periods: Period[]; changed: Period }
  | { ok: false; reason: 'inside-existing' | 'open-period-exists' | 'no-period' | 'before-start' | 'overlaps-next' };

/**
 * Mark a period as starting on `date`. The newest period stays open (no end);
 * a period back-filled before an existing one gets a provisional end so it never overlaps.
 */
export function startPeriod(
  periods: readonly Period[],
  date: ISODate,
  newId: () => string,
  typicalLength = 5,
): PeriodChange {
  const today = '9999-12-31';
  if (findPeriodOn(periods, date, today)) return { ok: false, reason: 'inside-existing' };
  const open = openPeriod(periods);
  if (open && open.start < date) return { ok: false, reason: 'open-period-exists' };

  const next = sortPeriods(periods).find((p) => p.start > date);
  let end: ISODate | undefined;
  if (next) {
    const provisional = addDaysISO(date, typicalLength - 1);
    const beforeNext = addDaysISO(next.start, -2);
    end = provisional < beforeNext ? provisional : beforeNext;
    if (end < date) end = date;
  }
  const created: Period = { id: newId(), start: date, ...(end ? { end } : {}) };
  return { ok: true, periods: sortPeriods([...periods, created]), changed: created };
}

/** Mark the period that started on or before `date` as ending on `date`. */
export function endPeriod(periods: readonly Period[], date: ISODate): PeriodChange {
  const target = latestStartedBy(periods, date);
  if (!target) return { ok: false, reason: 'no-period' };
  if (date < target.start) return { ok: false, reason: 'before-start' };
  const next = sortPeriods(periods).find((p) => p.start > target.start);
  if (next && date >= next.start) return { ok: false, reason: 'overlaps-next' };
  const changed: Period = { ...target, end: date };
  return { ok: true, periods: periods.map((p) => (p.id === target.id ? changed : p)), changed };
}

/**
 * Logging flow on a day should keep periods consistent: flow inside a period is a no-op,
 * flow right next to a period extends it, otherwise a one-day period is created.
 */
export function includeDayInPeriods(
  periods: readonly Period[],
  date: ISODate,
  today: ISODate,
  newId: () => string,
): { periods: Period[]; changed?: Period } {
  if (findPeriodOn(periods, date, today)) return { periods: [...periods] };
  const sorted = sortPeriods(periods);

  // Extend a closed period whose end is 1–2 days before this date (allows one gap day).
  const before = [...sorted].reverse().find((p) => p.end && p.end < date);
  if (before?.end && diffDays(date, before.end) <= 2) {
    const next = sorted.find((p) => p.start > before.start);
    if (!next || date < next.start) {
      const changed = { ...before, end: date };
      return { periods: sorted.map((p) => (p.id === before.id ? changed : p)), changed };
    }
  }

  // Pull the start of a following period back by up to 2 days.
  const after = sorted.find((p) => p.start > date);
  if (after && diffDays(after.start, date) <= 2) {
    const changed = { ...after, start: date };
    return { periods: sorted.map((p) => (p.id === after.id ? changed : p)), changed };
  }

  const isNewest = !after;
  const created: Period = { id: newId(), start: date, ...(isNewest && date === today ? {} : { end: date }) };
  return { periods: sortPeriods([...sorted, created]), changed: created };
}

export function validatePeriodEdit(periods: readonly Period[], edited: Period): string | null {
  if (edited.end && edited.end < edited.start) return 'end-before-start';
  const far = '9999-12-31';
  const clash = periods.some((p) => {
    if (p.id === edited.id) return false;
    const pEnd = p.end ?? far;
    const eEnd = edited.end ?? far;
    return p.start <= eEnd && edited.start <= pEnd;
  });
  return clash ? 'overlap' : null;
}

/**
 * Open periods the user forgot to end: once the average length has passed and no flow has been
 * logged since, the period is closed on its last day with flow (or after the average length if
 * flow was never logged). Logging flow again later reopens/extends it via includeDayInPeriods.
 */
export function autoEndPeriods(
  periods: readonly Period[],
  flowDays: ReadonlySet<ISODate>,
  today: ISODate,
  averageLength: number,
): Period[] {
  const changed: Period[] = [];
  for (const p of periods) {
    if (p.end || p.start > today) continue;
    let lastFlow: ISODate | null = null;
    for (const d of flowDays) if (d >= p.start && d <= today && (!lastFlow || d > lastFlow)) lastFlow = d;
    const expectedEnd = addDaysISO(p.start, Math.max(1, averageLength) - 1);
    const end = lastFlow && lastFlow > expectedEnd ? lastFlow : expectedEnd;
    // Only once a full day has passed after the presumed end without new flow.
    if (today > end) changed.push({ ...p, end });
  }
  return changed;
}

export interface PeriodToday {
  /** The period today belongs to, open or already closed. */
  current: Period | undefined;
  /** 1-based day of that period, 0 when not in a period. */
  day: number;
  /** Today is marked as the period's last day: the main action reopens it. */
  endedToday: boolean;
}

/** What the home screen's main period button should do today. */
export function periodToday(periods: readonly Period[], today: ISODate): PeriodToday {
  const current = findPeriodOn(periods, today, today);
  return {
    current,
    day: current ? diffDays(today, current.start) + 1 : 0,
    endedToday: current?.end === today,
  };
}
