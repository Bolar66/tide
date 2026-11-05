import { describe, expect, it } from 'vitest';
import { days, inDays, longDate } from './fi';

describe('fi formatting', () => {
  it('uses the nominative weekday', () => {
    expect(longDate('2026-11-05')).toBe('torstai 5. marraskuuta');
  });
  it('pluralises days', () => {
    expect(days(1)).toBe('1 päivä');
    expect(days(3)).toBe('3 päivää');
    expect(inDays(0)).toBe('tänään');
    expect(inDays(1)).toBe('huomenna');
    expect(inDays(4)).toBe('4 päivän päästä');
  });
});
