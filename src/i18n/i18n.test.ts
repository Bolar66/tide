import { describe, expect, it } from 'vitest';
import { bundleFor } from './index';

describe('fi locale', () => {
  const { t, f } = bundleFor('fi');

  it('formats the standalone weekday', () => {
    expect(f.longDate('2026-11-05')).toBe('torstai 5. marraskuuta');
  });

  it('starts weeks on Monday', () => {
    expect(f.weekdaysShort()).toEqual(['ma', 'ti', 'ke', 'to', 'pe', 'la', 'su']);
  });

  it('pluralises days', () => {
    expect(t.days(1)).toBe('1 päivä');
    expect(t.days(3)).toBe('3 päivää');
    expect(t.inDays(0)).toBe('tänään');
    expect(t.inDays(1)).toBe('huomenna');
    expect(t.inDays(4)).toBe('4 päivän päästä');
  });

  it('has a label for every scale step', () => {
    for (const s of Object.values(t.symptoms)) expect(s.levels).toHaveLength(5);
  });

  it('has complete texts for every cycle phase', () => {
    for (const phase of ['menstrual', 'follicular', 'ovulation', 'luteal', 'late'] as const) {
      expect(t.phases.names[phase]).toBeTruthy();
      expect(t.phases.summaries[phase]).toBeTruthy();
      expect(t.phases.body[phase]).toBeTruthy();
      expect(t.phases.notice[phase].length).toBeGreaterThan(0);
      expect(t.phases.tips[phase].length).toBeGreaterThan(0);
    }
  });

  it('has a label for every tracker and its options', async () => {
    const { TRACKERS } = await import('../trackers/registry');
    for (const def of TRACKERS) {
      const copy = t.trackers.items[def.id];
      expect(copy?.label, def.id).toBeTruthy();
      if (def.kind === 'scale5') expect(copy?.levels, def.id).toHaveLength(5);
      if (def.kind === 'chips' || def.kind === 'choice') for (const o of def.options) expect(copy?.options?.[o], `${def.id}.${o}`).toBeTruthy();
    }
  });
});
