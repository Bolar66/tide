import { describe, expect, it } from 'vitest';
import { calendarMarks } from './calendar';
import { fertileWindowBefore, fertileWindows } from './fertility';
import { computeStats, predict } from './prediction';
import type { Period } from './types';

describe('fertileWindowBefore', () => {
  it('puts ovulation 14 days before the next period and the window 5 days before to 1 after', () => {
    expect(fertileWindowBefore('2026-11-29')).toEqual({ start: '2026-11-10', ovulation: '2026-11-15', end: '2026-11-16' });
  });
});

describe('fertileWindows', () => {
  const periods: Period[] = [
    { id: 'a', start: '2026-09-04', end: '2026-09-08' },
    { id: 'b', start: '2026-10-02', end: '2026-10-06' },
  ];
  const stats = computeStats(periods);

  it('covers the current cycle and the predicted ones', () => {
    const w = fertileWindows(predict(periods, stats, '2026-10-10'));
    expect(w.map((x) => x.ovulation)).toEqual(['2026-10-16', '2026-11-13', '2026-12-11']);
  });

  it('keeps the current window in place when the period is late', () => {
    const w = fertileWindows(predict(periods, stats, '2026-11-05'));
    expect(w[0]?.ovulation).toBe('2026-10-16');
  });

  it('never paints fertile days over a period', () => {
    // 21-day cycles: next start 2026-10-13, ovulation 2026-09-29, window from 2026-09-24 (a period day)
    const short: Period[] = [
      { id: 'a', start: '2026-09-01', end: '2026-09-05' },
      { id: 'b', start: '2026-09-22', end: '2026-09-26' },
    ];
    const pred = predict(short, computeStats(short), '2026-09-23');
    const marks = calendarMarks(short, pred.upcoming, '2026-09-23', fertileWindows(pred));
    expect(marks.get('2026-09-24')).toBe('period');
    expect(marks.get('2026-09-29')).toBe('ovulation');
    expect(marks.get('2026-09-27')).toBe('fertile');
  });
});
