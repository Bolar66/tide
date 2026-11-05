import { describe, expect, it } from 'vitest';
import { addDaysISO } from './dates';
import { phaseAverages, phaseInsight, phaseOfDate } from './phaseStats';
import { computeStats } from './prediction';
import type { DayEntry, Period } from './types';

// Two completed 28-day cycles + a current one.
const periods: Period[] = [
  { id: 'a', start: '2026-09-01', end: '2026-09-05' },
  { id: 'b', start: '2026-09-29', end: '2026-10-03' },
  { id: 'c', start: '2026-10-27', end: '2026-10-31' },
];
const stats = computeStats(periods);
const today = '2026-11-05';

describe('phaseOfDate', () => {
  it('classifies days of a completed cycle by its real length', () => {
    expect(phaseOfDate(periods, stats, '2026-09-02', today)).toBe('menstrual');
    expect(phaseOfDate(periods, stats, '2026-09-08', today)).toBe('follicular');
    expect(phaseOfDate(periods, stats, '2026-09-15', today)).toBe('ovulation'); // day 15
    expect(phaseOfDate(periods, stats, '2026-09-25', today)).toBe('luteal');
  });

  it('returns null before the first period', () => {
    expect(phaseOfDate(periods, stats, '2026-08-20', today)).toBeNull();
  });

  it('uses the actual cycle length for an irregular cycle', () => {
    const irregular: Period[] = [
      { id: 'a', start: '2026-09-01', end: '2026-09-05' },
      { id: 'b', start: '2026-10-06', end: '2026-10-10' }, // 35-day cycle → ovulation day 22
    ];
    const s = computeStats(irregular);
    expect(phaseOfDate(irregular, s, '2026-09-15', today)).toBe('follicular');
    expect(phaseOfDate(irregular, s, '2026-09-22', today)).toBe('ovulation');
  });
});

describe('phaseAverages + phaseInsight', () => {
  const days: Record<string, DayEntry> = {};
  const add = (date: string, e: Partial<DayEntry>) => (days[date] = { date, updatedAt: 1, ...e });
  // Sleep: 6 h during periods, 8 h in the follicular phase, in both cycles.
  for (const start of ['2026-09-01', '2026-09-29']) {
    for (let i = 0; i < 4; i++) add(addDaysISO(start, i), { metrics: { sleepHours: 6 }, symptoms: { mood: 2 } });
    for (let i = 6; i < 10; i++) add(addDaysISO(start, i), { metrics: { sleepHours: 8 }, symptoms: { mood: 4 } });
  }

  const table = phaseAverages(periods, days, stats, today);

  it('averages per phase and counts the days', () => {
    expect(table.sleepHours.menstrual).toEqual({ mean: 6, n: 8 });
    expect(table.sleepHours.follicular).toEqual({ mean: 8, n: 8 });
    expect(table.sleepHours.luteal).toBeNull();
    expect(table.mood.follicular?.mean).toBe(4);
  });

  it('names the clearest difference', () => {
    expect(phaseInsight(table, 'sleepHours')).toEqual({ metric: 'sleepHours', high: 'follicular', low: 'menstrual', difference: 2 });
  });

  it('does not single out one phase when several tie', () => {
    const tied: Record<string, DayEntry> = {};
    for (const start of ['2026-09-01', '2026-09-29']) {
      for (let i = 0; i < 4; i++) tied[addDaysISO(start, i)] = { date: addDaysISO(start, i), updatedAt: 1, metrics: { stress: 2 } };
      for (let i = 6; i < 10; i++) tied[addDaysISO(start, i)] = { date: addDaysISO(start, i), updatedAt: 1, metrics: { stress: 2 } };
      for (let i = 20; i < 24; i++) tied[addDaysISO(start, i)] = { date: addDaysISO(start, i), updatedAt: 1, metrics: { stress: 4 } };
    }
    const r = phaseInsight(phaseAverages(periods, tied, stats, today), 'stress');
    expect(r).toEqual({ metric: 'stress', high: 'luteal', low: null, difference: 2 });
  });

  it('stays quiet without enough data', () => {
    expect(phaseInsight(table, 'stress')).toBeNull();
  });
});
