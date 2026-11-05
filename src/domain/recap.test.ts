import { describe, expect, it } from 'vitest';
import { addDaysISO } from './dates';
import { lastCycleRecap } from './recap';
import type { DayEntry, Period } from './types';

const periods: Period[] = [
  { id: 'a', start: '2026-08-01', end: '2026-08-05' },
  { id: 'b', start: '2026-08-29', end: '2026-09-02' },
  { id: 'c', start: '2026-09-28' },
];

describe('lastCycleRecap', () => {
  it('needs two periods', () => {
    expect(lastCycleRecap(periods.slice(0, 1), {}, '2026-08-10')).toBeNull();
  });

  it('summarises the finished cycle', () => {
    const days: Record<string, DayEntry> = {};
    for (let i = 0; i < 30; i++) {
      const d = addDaysISO('2026-08-29', i);
      days[d] = { date: d, updatedAt: 1, symptoms: { mood: i >= 9 && i <= 11 ? 5 : 3, energy: 3, ...(i < 2 ? { cramps: 4 } : {}) } };
    }
    const r = lastCycleRecap(periods, days, '2026-09-30')!;
    expect(r).toMatchObject({ start: '2026-08-29', end: '2026-09-27', length: 30, periodLength: 5, previousAverage: 28, loggedDays: 30 });
    expect(r.mood).toHaveLength(30);
    expect(r.topSymptoms).toEqual([{ id: 'cramps', days: 2 }]);
    expect(r.bestDays).toEqual({ from: 10, to: 12 });
  });

  it('copes with a cycle without logs', () => {
    const r = lastCycleRecap(periods, {}, '2026-09-30')!;
    expect(r.loggedDays).toBe(0);
    expect(r.bestDays).toBeNull();
    expect(r.topSymptoms).toEqual([]);
  });
});
