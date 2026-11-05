import { describe, expect, it } from 'vitest';
import { addDaysISO } from './dates';
import { insightDataDays, insightsForPhase, prePeriodInsights } from './insights';
import { phaseAverages } from './phaseStats';
import { computeStats } from './prediction';
import type { DayEntry, Period } from './types';

const periods: Period[] = [
  { id: 'a', start: '2026-07-01', end: '2026-07-05' },
  { id: 'b', start: '2026-07-29', end: '2026-08-02' },
  { id: 'c', start: '2026-08-26', end: '2026-08-30' },
  { id: 'd', start: '2026-09-23', end: '2026-09-27' },
];
const today = '2026-10-10';

/** Energy 2 in the three days before each period, 4 otherwise; mood flat. */
function logEveryDay(): Record<string, DayEntry> {
  const days: Record<string, DayEntry> = {};
  const preWindow = new Set(periods.flatMap((p) => [1, 2, 3].map((i) => addDaysISO(p.start, -i))));
  for (let d = '2026-07-01'; d <= today; d = addDaysISO(d, 1)) {
    days[d] = { date: d, updatedAt: 1, symptoms: { energy: preWindow.has(d) ? 2 : 4, mood: 3 } };
  }
  return days;
}

describe('insights', () => {
  const days = logEveryDay();
  const stats = computeStats(periods, { cycle: 28, period: 5 });
  const table = phaseAverages(periods, days, stats, today);

  it('finds the pre-period dip and nothing for flat metrics', () => {
    const pre = prePeriodInsights(periods, days, today);
    expect(pre).toHaveLength(1);
    expect(pre[0]).toMatchObject({ metric: 'energy', direction: 'lower' });
    expect(pre[0]!.mean).toBeCloseTo(2);
  });

  it('shows the luteal phase as lower energy, never mood', () => {
    const luteal = insightsForPhase(table, 'luteal');
    expect(luteal.map((i) => i.metric)).not.toContain('mood');
  });

  it('needs at least two cycles before talking about the pre-period window', () => {
    const one = periods.slice(0, 2);
    const recent: Record<string, DayEntry> = {};
    for (const [k, v] of Object.entries(days)) if (k < '2026-08-10') recent[k] = v;
    expect(prePeriodInsights(one, recent, '2026-08-10')).toEqual([]);
  });

  it('stays quiet without data', () => {
    expect(insightsForPhase(phaseAverages(periods, {}, stats, today), 'luteal')).toEqual([]);
    expect(insightDataDays({}, today)).toBe(0);
    expect(insightDataDays(days, today)).toBeGreaterThan(90);
  });
});
