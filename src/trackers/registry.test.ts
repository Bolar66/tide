import { describe, expect, it } from 'vitest';
import { DEFAULT_TRACKERS, enabledTrackers, sanitizeMetric, SELECTABLE_TRACKERS, trackerById, TRACKERS } from './registry';

describe('tracker registry', () => {
  it('has unique ids', () => {
    expect(new Set(TRACKERS.map((t) => t.id)).size).toBe(TRACKERS.length);
  });

  it('keeps sensitive and new trackers off by default', () => {
    for (const id of ['sex', 'libido', 'discharge', 'painkiller']) expect(DEFAULT_TRACKERS).not.toContain(id);
  });

  it('keeps weight off by default', () => {
    expect(DEFAULT_TRACKERS).not.toContain('weight');
    expect(DEFAULT_TRACKERS).toEqual(['sleepHours', 'sleepQuality', 'stress']);
  });

  it('brings follow-up fields along with their parent', () => {
    expect(enabledTrackers(['cravings', 'eating']).map((t) => t.id)).toEqual(['eating', 'meals', 'cravings', 'cravingsIntensity']);
  });

  it('lists only top-level trackers as selectable', () => {
    expect(SELECTABLE_TRACKERS.map((t) => t.id)).not.toContain('meals');
    expect(SELECTABLE_TRACKERS.map((t) => t.id)).not.toContain('cravingsIntensity');
  });

  it('returns enabled trackers in registry order and ignores unknown ids', () => {
    expect(enabledTrackers(['stress', 'future-thing', 'sleepHours']).map((t) => t.id)).toEqual(['sleepHours', 'stress']);
  });

  it('sanitizes values per kind', () => {
    const t = (id: string) => trackerById(id)!;
    expect(sanitizeMetric(t('stress'), 3)).toBe(3);
    expect(sanitizeMetric(t('stress'), 6)).toBeUndefined();
    expect(sanitizeMetric(t('sleepHours'), 20)).toBe(14);
    expect(sanitizeMetric(t('bbt'), 36.4567)).toBe(36.46);
    expect(sanitizeMetric(t('caffeine'), 2)).toBe(2);
    expect(sanitizeMetric(t('caffeine'), -1)).toBeUndefined();
    expect(sanitizeMetric(t('skin'), ['dry', 'dry', 'unknown'])).toEqual(['dry']);
    expect(sanitizeMetric(t('skin'), [])).toBeUndefined();
    expect(sanitizeMetric(t('discharge'), 'eggwhite')).toBe('eggwhite');
    expect(sanitizeMetric(t('discharge'), ['dry'])).toBeUndefined();
    expect(sanitizeMetric(t('sex'), 'sometimes')).toBeUndefined();
    expect(sanitizeMetric(t('pill'), true)).toBe(true);
    expect(sanitizeMetric(t('pill'), false)).toBeUndefined();
    expect(sanitizeMetric(t('medication'), '  Burana 400  ')).toBe('Burana 400');
  });
});
