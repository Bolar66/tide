import { addDaysISO, type ISODate } from './dates';
import { findPeriodOn } from './periods';
import type { Period } from './types';

/** User's reminder choices (synced with the other settings). */
export interface ReminderSettings {
  /** Daily "how are you" reminder: off, every day, or only on (actual or predicted) period days. */
  log: { mode: 'off' | 'daily' | 'period'; time: string };
  /** Gentle heads-up a few days before the predicted period. */
  headsUp: { on: boolean; daysBefore: number; time: string };
}

export const DEFAULT_REMINDERS: ReminderSettings = {
  log: { mode: 'off', time: '20:00' },
  headsUp: { on: false, daysBefore: 2, time: '09:00' },
};

/** 1 = daily log reminder, 2 = heads-up. The server only ever sees these numbers and the times. */
export type ReminderKind = 1 | 2;
export interface PlannedReminder {
  /** ISO timestamp (UTC). */
  at: string;
  kind: ReminderKind;
}

/** How far ahead reminders are scheduled; the plan is refreshed whenever the app is opened. */
export const REMINDER_HORIZON_DAYS = 45;
export const MAX_REMINDERS = 120;

/** Local date + "HH:mm" → Date in the device's time zone. */
export function atLocal(date: ISODate, time: string): Date {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const [hh, mm] = time.split(':').map(Number) as [number, number];
  return new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0);
}

/**
 * Every reminder for the next weeks, computed on the device from its own data. Only future
 * times are returned, sorted, at most MAX_REMINDERS.
 */
export function planReminders(
  settings: ReminderSettings | undefined,
  periods: readonly Period[],
  predicted: readonly { start: ISODate; end: ISODate }[],
  today: ISODate,
  now: Date,
): PlannedReminder[] {
  if (!settings) return [];
  const out: PlannedReminder[] = [];
  const horizonEnd = addDaysISO(today, REMINDER_HORIZON_DAYS);
  const push = (date: ISODate, time: string, kind: ReminderKind) => {
    const at = atLocal(date, time);
    if (at > now && date <= horizonEnd) out.push({ at: at.toISOString(), kind });
  };

  const inPredicted = (d: ISODate) => predicted.some((p) => d >= p.start && d <= p.end);
  if (settings.log.mode !== 'off') {
    for (let d = today; d <= horizonEnd; d = addDaysISO(d, 1)) {
      const periodDay = findPeriodOn(periods, d, today) !== undefined;
      if (settings.log.mode === 'daily' || periodDay || inPredicted(d)) push(d, settings.log.time, 1);
    }
  }
  if (settings.headsUp.on) {
    for (const p of predicted) push(addDaysISO(p.start, -Math.max(1, settings.headsUp.daysBefore)), settings.headsUp.time, 2);
  }
  return out.sort((a, b) => a.at.localeCompare(b.at)).slice(0, MAX_REMINDERS);
}
