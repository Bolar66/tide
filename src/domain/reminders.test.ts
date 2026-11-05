import { describe, expect, it } from 'vitest';
import { atLocal, DEFAULT_REMINDERS, MAX_REMINDERS, planReminders, REMINDER_HORIZON_DAYS } from './reminders';
import type { Period } from './types';

const today = '2026-11-10';
const now = atLocal(today, '12:00');
const periods: Period[] = [{ id: 'a', start: '2026-10-20', end: '2026-10-24' }];
const predicted = [
  { start: '2026-11-17', end: '2026-11-21' },
  { start: '2026-12-15', end: '2026-12-19' },
];

describe('planReminders', () => {
  it('plans nothing by default', () => {
    expect(planReminders(DEFAULT_REMINDERS, periods, predicted, today, now)).toEqual([]);
    expect(planReminders(undefined, periods, predicted, today, now)).toEqual([]);
  });

  it('daily: every day at the chosen time, starting today if the time is still ahead', () => {
    const plan = planReminders({ ...DEFAULT_REMINDERS, log: { mode: 'daily', time: '20:00' } }, periods, predicted, today, now);
    expect(plan[0]!.at).toBe(atLocal(today, '20:00').toISOString());
    expect(plan).toHaveLength(REMINDER_HORIZON_DAYS + 1);
    expect(plan.every((p) => p.kind === 1)).toBe(true);
  });

  it('skips today when the time has passed', () => {
    const plan = planReminders({ ...DEFAULT_REMINDERS, log: { mode: 'daily', time: '08:00' } }, periods, predicted, today, now);
    expect(plan[0]!.at).toBe(atLocal('2026-11-11', '08:00').toISOString());
  });

  it('period mode: only on predicted (and ongoing) period days', () => {
    const plan = planReminders({ ...DEFAULT_REMINDERS, log: { mode: 'period', time: '20:00' } }, periods, predicted, today, now);
    expect(plan.map((p) => p.at)).toEqual(
      ['2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-12-15', '2026-12-16', '2026-12-17', '2026-12-18', '2026-12-19'].map((d) =>
        atLocal(d, '20:00').toISOString(),
      ),
    );
  });

  it('period mode includes an ongoing period', () => {
    const ongoing: Period[] = [{ id: 'b', start: '2026-11-09' }];
    const plan = planReminders({ ...DEFAULT_REMINDERS, log: { mode: 'period', time: '20:00' } }, ongoing, [], today, now);
    expect(plan.length).toBeGreaterThan(0);
    expect(plan[0]!.at).toBe(atLocal(today, '20:00').toISOString());
  });

  it('heads-up: N days before each predicted start', () => {
    const plan = planReminders({ ...DEFAULT_REMINDERS, headsUp: { on: true, daysBefore: 2, time: '09:00' } }, periods, predicted, today, now);
    expect(plan).toEqual([
      { at: atLocal('2026-11-15', '09:00').toISOString(), kind: 2 },
      { at: atLocal('2026-12-13', '09:00').toISOString(), kind: 2 },
    ]);
  });

  it('caps the number of reminders', () => {
    const plan = planReminders(
      { log: { mode: 'daily', time: '20:00' }, headsUp: { on: true, daysBefore: 1, time: '09:00' } },
      periods,
      Array.from({ length: 200 }, (_, i) => ({ start: '2026-11-20', end: '2026-11-20', i })),
      today,
      now,
    );
    expect(plan.length).toBeLessThanOrEqual(MAX_REMINDERS);
  });
});
