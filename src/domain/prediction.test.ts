import { describe, expect, it } from 'vitest';
import { computeStats, cycleDay, getCycles, predict, stdDev } from './prediction';
import type { Period } from './types';

const p = (id: string, start: string, end?: string): Period => ({ id, start, ...(end ? { end } : {}) });

describe('getCycles', () => {
  it('measures cycles between consecutive starts regardless of input order', () => {
    const cycles = getCycles([p('b', '2026-02-01', '2026-02-05'), p('a', '2026-01-04', '2026-01-08')]);
    expect(cycles).toEqual([{ start: '2026-01-04', length: 28, periodLength: 5, valid: true }]);
  });

  it('flags implausible cycles as invalid', () => {
    const cycles = getCycles([p('a', '2026-01-01'), p('b', '2026-01-10'), p('c', '2026-04-01')]);
    expect(cycles.map((c) => c.valid)).toEqual([false, false]);
  });

  it('crosses DST changes without off-by-one errors', () => {
    const [c] = getCycles([p('a', '2026-03-15', '2026-03-19'), p('b', '2026-04-12')]);
    expect(c?.length).toBe(28);
  });
});

describe('computeStats', () => {
  it('falls back to 28/5 without history', () => {
    const s = computeStats([]);
    expect(s).toMatchObject({ avgCycle: 28, avgPeriod: 5, cycleCount: 0, sd: null, usingDefaultCycle: true, usingDefaultPeriod: true });
  });

  it('prefers user-given typical lengths over the defaults', () => {
    const s = computeStats([], { cycle: 31, period: 4 });
    expect(s).toMatchObject({ avgCycle: 31, avgPeriod: 4, usingDefaultCycle: true, usingDefaultPeriod: true });
  });

  it('own history overrides user-given lengths', () => {
    const s = computeStats([p('a', '2026-01-01', '2026-01-05'), p('b', '2026-01-27')], { cycle: 35, period: 3 });
    expect(s).toMatchObject({ avgCycle: 26, avgPeriod: 5, usingDefaultCycle: false });
  });

  it('uses own period length before the first full cycle', () => {
    const s = computeStats([p('a', '2026-01-01', '2026-01-04')]);
    expect(s).toMatchObject({ avgCycle: 28, avgPeriod: 4, usingDefaultCycle: true, usingDefaultPeriod: false });
  });

  it('averages valid cycles and ignores outliers', () => {
    const s = computeStats([
      p('a', '2026-01-01', '2026-01-05'),
      p('b', '2026-01-31', '2026-02-04'), // 30
      p('c', '2026-03-02', '2026-03-07'), // 30
      p('d', '2026-03-10', '2026-03-11'), // 8 → outlier
      p('e', '2026-04-11'), // 32
    ]);
    expect(s.cycleCount).toBe(3);
    expect(s.avgCycle).toBe(31); // (30 + 30 + 32) / 3 = 30.67
    expect(s.min).toBe(30);
    expect(s.max).toBe(32);
    expect(s.avgPeriod).toBe(5); // (5 + 5 + 6 + 2) / 4 = 4.5 → 5
  });

  it('only uses the six most recent cycles', () => {
    const starts = ['2025-01-01', '2025-02-20', '2025-03-20', '2025-04-17', '2025-05-15', '2025-06-12', '2025-07-10', '2025-08-07'];
    // first cycle 50 days, the rest 28
    const s = computeStats(starts.map((d, i) => p(String(i), d)));
    expect(s.cycleCount).toBe(6);
    expect(s.avgCycle).toBe(28);
    expect(s.sd).toBe(0);
  });
});

describe('stdDev', () => {
  it('returns null for fewer than two values', () => {
    expect(stdDev([28])).toBeNull();
  });
  it('computes the sample standard deviation', () => {
    expect(stdDev([26, 28, 30])).toBeCloseTo(2);
  });
});

describe('predict', () => {
  const history = [p('a', '2026-09-01', '2026-09-05'), p('b', '2026-09-29', '2026-10-03')];
  const stats = computeStats(history);

  it('returns nothing without any period', () => {
    expect(predict([], computeStats([]), '2026-11-05').upcoming).toEqual([]);
  });

  it('predicts the next periods from the latest start', () => {
    const r = predict(history, stats, '2026-10-10');
    expect(r.daysLate).toBe(0);
    expect(r.upcoming).toEqual([
      { start: '2026-10-27', end: '2026-10-31' },
      { start: '2026-11-24', end: '2026-11-28' },
      { start: '2026-12-22', end: '2026-12-26' },
    ]);
  });

  it('anchors to today and reports lateness when the period is overdue', () => {
    const r = predict(history, stats, '2026-11-01');
    expect(r.expectedStart).toBe('2026-10-27');
    expect(r.daysLate).toBe(5);
    expect(r.upcoming[0]).toEqual({ start: '2026-11-01', end: '2026-11-05' });
    expect(r.upcoming[1]?.start).toBe('2026-11-29');
  });

  it('is not late on the expected day itself', () => {
    expect(predict(history, stats, '2026-10-27').daysLate).toBe(0);
  });

  it('predicts from an ongoing period', () => {
    const ongoing = [...history, p('c', '2026-10-27')];
    const r = predict(ongoing, computeStats(ongoing), '2026-10-29');
    expect(r.upcoming[0]?.start).toBe('2026-11-24');
  });
});

describe('cycleDay', () => {
  it('is null without history', () => {
    expect(cycleDay([], '2026-11-05')).toBeNull();
  });
  it('counts the start day as day 1', () => {
    expect(cycleDay([p('a', '2026-11-05')], '2026-11-05')).toBe(1);
    expect(cycleDay([p('a', '2026-10-23')], '2026-11-05')).toBe(14);
  });
  it('ignores periods logged in the future', () => {
    expect(cycleDay([p('a', '2026-10-01'), p('b', '2026-12-01')], '2026-11-05')).toBe(36);
  });
});
