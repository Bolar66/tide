import { describe, expect, it } from 'vitest';
import { calendarMarks } from './calendar';
import { computeStats, predict } from './prediction';
import { buildRing } from './ring';
import type { Period } from './types';

function ring(periods: Period[], today: string) {
  const stats = computeStats(periods);
  const prediction = predict(periods, stats, today);
  return buildRing(periods, stats, calendarMarks(periods, prediction.upcoming, today), today);
}

describe('buildRing', () => {
  const history: Period[] = [
    { id: 'a', start: '2026-09-08', end: '2026-09-12' },
    { id: 'b', start: '2026-10-06', end: '2026-10-10' },
  ];

  it('lays out the current cycle from the latest start', () => {
    const r = ring(history, '2026-10-19');
    expect(r.days).toHaveLength(28);
    expect(r.cycleDay).toBe(14);
    expect(r.progress).toBe(0.5);
    expect(r.days[0]).toEqual({ date: '2026-10-06', kind: 'period', isToday: false });
    expect(r.days[13]).toEqual({ date: '2026-10-19', kind: 'past', isToday: true });
    expect(r.days[14]?.kind).toBe('future');
  });

  it('grows the ring when the period is late', () => {
    const r = ring(history, '2026-11-05');
    expect(r.days).toHaveLength(31);
    expect(r.progress).toBe(1);
    expect(r.days[30]?.isToday).toBe(true);
  });

  it('shows an empty ring without history', () => {
    const r = ring([], '2026-11-05');
    expect(r.cycleDay).toBeNull();
    expect(r.days).toHaveLength(28);
    expect(r.days.every((d) => d.kind === 'future')).toBe(true);
  });
});
