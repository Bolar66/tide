import { describe, expect, it } from 'vitest';
import { addDaysISO } from './dates';
import { findPatternWarnings } from './patterns';
import { computeStats } from './prediction';
import type { DayEntry, Period, Symptoms } from './types';

// Four 28-day cycles; the current one starts 2026-11-01.
const starts = ['2026-07-12', '2026-08-09', '2026-09-06', '2026-10-04', '2026-11-01'];
const periods: Period[] = starts.map((s, i) => ({ id: String(i), start: s, end: addDaysISO(s, 4) }));
const stats = computeStats(periods);

function log(entries: [string, Symptoms][]): Record<string, DayEntry> {
  return Object.fromEntries(entries.map(([date, symptoms]) => [date, { date, symptoms, updatedAt: 1 }]));
}

describe('findPatternWarnings', () => {
  it('warns about a symptom that recurs before the period', () => {
    // headache 2 days before each of the last three periods
    const days = log([
      ['2026-08-07', { headache: 4 }],
      ['2026-09-04', { headache: 3 }],
      ['2026-10-02', { headache: 4 }],
    ]);
    // next period expected 2026-11-29, so the pattern day is 2026-11-27
    const w = findPatternWarnings(periods, days, stats, '2026-11-25');
    expect(w).toEqual([{ symptom: 'headache', date: '2026-11-27', daysAhead: 2, hits: 3, cycles: 3 }]);
  });

  it('warns about a symptom tied to the cycle start', () => {
    const days = log([
      ['2026-07-13', { cramps: 4 }],
      ['2026-08-10', { cramps: 5 }],
      ['2026-09-07', { cramps: 3 }],
    ]);
    const w = findPatternWarnings(periods, days, stats, '2026-11-01');
    // always on cycle day 2 → tomorrow, not today
    expect(w[0]).toMatchObject({ symptom: 'cramps', date: '2026-11-02', daysAhead: 1 });
  });

  it('tolerates a one-day shift between cycles', () => {
    const days = log([
      ['2026-08-07', { headache: 4 }], // 2 days before
      ['2026-09-03', { headache: 4 }], // 3 days before
    ]);
    expect(findPatternWarnings(periods, days, stats, '2026-11-27')).toHaveLength(1);
  });

  it('needs at least two cycles', () => {
    const days = log([['2026-10-02', { headache: 5 }]]);
    expect(findPatternWarnings(periods, days, stats, '2026-11-25')).toEqual([]);
  });

  it('ignores a symptom that happened in fewer than half of the logged cycles', () => {
    const days = log([
      ['2026-07-14', { headache: 1 }],
      ['2026-08-07', { headache: 4 }],
      ['2026-09-04', { headache: 4 }],
      ['2026-09-10', { headache: 1 }],
      ['2026-10-10', { headache: 1 }],
      ['2026-07-30', { headache: 1 }],
    ]);
    // logged in all 4 cycles, notable before the period only in 2 → 50 % → still a warning
    expect(findPatternWarnings(periods, days, stats, '2026-11-25')).toHaveLength(1);
    const more = { ...days, ...log([['2026-06-20', { headache: 1 }]]) };
    expect(findPatternWarnings(periods, more, stats, '2026-11-25')).toHaveLength(1);
  });

  it('treats low mood as notable, not high mood', () => {
    const low = log([
      ['2026-08-08', { mood: 2 }],
      ['2026-09-05', { mood: 1 }],
    ]);
    const high = log([
      ['2026-08-08', { mood: 5 }],
      ['2026-09-05', { mood: 4 }],
    ]);
    expect(findPatternWarnings(periods, low, stats, '2026-11-27')).toHaveLength(1);
    expect(findPatternWarnings(periods, high, stats, '2026-11-27')).toEqual([]);
  });

  it('does not warn once the symptom is already logged today', () => {
    const days = log([
      ['2026-07-13', { cramps: 4 }],
      ['2026-08-10', { cramps: 5 }],
      ['2026-11-01', { cramps: 4 }],
    ]);
    expect(findPatternWarnings(periods, days, stats, '2026-11-01')).toEqual([]);
  });
});
