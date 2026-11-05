import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';

/** Calendar date as 'yyyy-MM-dd'. Stored as a string to avoid time zone drift. */
export type ISODate = string;

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isISODate(value: unknown): value is ISODate {
  return typeof value === 'string' && ISO_RE.test(value) && !Number.isNaN(parseISO(value).getTime());
}

export function toISO(date: Date): ISODate {
  return format(date, 'yyyy-MM-dd');
}

export function fromISO(date: ISODate): Date {
  return parseISO(date);
}

export function todayISO(now: Date = new Date()): ISODate {
  return toISO(now);
}

export function addDaysISO(date: ISODate, days: number): ISODate {
  return toISO(addDays(parseISO(date), days));
}

/** Whole calendar days from `b` to `a` (a - b). */
export function diffDays(a: ISODate, b: ISODate): number {
  return differenceInCalendarDays(parseISO(a), parseISO(b));
}

export function minISO(a: ISODate, b: ISODate): ISODate {
  return a < b ? a : b;
}

export function maxISO(a: ISODate, b: ISODate): ISODate {
  return a > b ? a : b;
}
