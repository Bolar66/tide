import { describe, expect, it } from 'vitest';
import { addDaysISO, diffDays } from './dates';
import { fertileWindowBefore } from './fertility';
import { cyclePhase, ovulationDay } from './phases';

describe('cyclePhase', () => {
  const base = { cycleLength: 28, inPeriod: false };

  it('is menstrual during a logged period', () => {
    expect(cyclePhase({ ...base, cycleDay: 3, inPeriod: true })).toBe('menstrual');
  });

  it('follows the period with the follicular phase', () => {
    expect(cyclePhase({ ...base, cycleDay: 6 })).toBe('follicular');
    expect(cyclePhase({ ...base, cycleDay: 13 })).toBe('follicular');
  });

  it('marks ovulation ±1 day around 14 days before the next period', () => {
    expect(ovulationDay(28)).toBe(15);
    expect([14, 15, 16].map((d) => cyclePhase({ ...base, cycleDay: d }))).toEqual(['ovulation', 'ovulation', 'ovulation']);
  });

  it('agrees with the fertile window on which day ovulation is', () => {
    for (const length of [21, 28, 35]) {
      const start = '2026-11-03';
      const { ovulation } = fertileWindowBefore(addDaysISO(start, length));
      expect(diffDays(ovulation, start) + 1).toBe(ovulationDay(length));
    }
  });

  it('ends with the luteal phase and then reports lateness', () => {
    expect(cyclePhase({ ...base, cycleDay: 17 })).toBe('luteal');
    expect(cyclePhase({ ...base, cycleDay: 28 })).toBe('luteal');
    expect(cyclePhase({ ...base, cycleDay: 29 })).toBe('late');
  });

  it('adapts to longer cycles', () => {
    expect(cyclePhase({ cycleLength: 35, inPeriod: false, cycleDay: 20 })).toBe('follicular');
    expect(cyclePhase({ cycleLength: 35, inPeriod: false, cycleDay: 22 })).toBe('ovulation');
  });
});
