import { describe, expect, it } from 'vitest';
import { autoEndPeriods, effectiveEnd, endPeriod, includeDayInPeriods, startPeriod, validatePeriodEdit } from './periods';
import type { Period } from './types';

const p = (id: string, start: string, end?: string): Period => ({ id, start, ...(end ? { end } : {}) });
const ids = () => {
  let n = 0;
  return () => `new${++n}`;
};

describe('effectiveEnd', () => {
  it('runs an open period until today', () => {
    expect(effectiveEnd(p('a', '2026-11-01'), '2026-11-03')).toBe('2026-11-03');
  });
  it('caps a forgotten open period at 10 days', () => {
    expect(effectiveEnd(p('a', '2026-10-01'), '2026-11-05')).toBe('2026-10-10');
  });
});

describe('startPeriod', () => {
  it('creates an open period for the newest start', () => {
    const r = startPeriod([p('a', '2026-10-01', '2026-10-05')], '2026-10-29', ids());
    expect(r.ok && r.changed).toEqual({ id: 'new1', start: '2026-10-29' });
  });

  it('refuses a date inside an existing period', () => {
    const r = startPeriod([p('a', '2026-10-01', '2026-10-05')], '2026-10-03', ids());
    expect(r).toEqual({ ok: false, reason: 'inside-existing' });
  });

  it('refuses while an earlier period is still open', () => {
    const r = startPeriod([p('a', '2026-10-01')], '2026-10-29', ids());
    expect(r).toEqual({ ok: false, reason: 'open-period-exists' });
  });

  it('closes a back-filled period before the next one', () => {
    const r = startPeriod([p('a', '2026-10-01', '2026-10-05')], '2026-09-03', ids(), 5);
    expect(r.ok && r.changed).toEqual({ id: 'new1', start: '2026-09-03', end: '2026-09-07' });
  });

  it('never lets a back-filled period touch the next start', () => {
    const r = startPeriod([p('a', '2026-10-04', '2026-10-08')], '2026-10-01', ids(), 5);
    expect(r.ok && r.changed.end).toBe('2026-10-02');
  });
});

describe('endPeriod', () => {
  it('ends the open period', () => {
    const r = endPeriod([p('a', '2026-11-01')], '2026-11-05');
    expect(r.ok && r.changed).toEqual({ id: 'a', start: '2026-11-01', end: '2026-11-05' });
  });

  it('allows a one-day period', () => {
    const r = endPeriod([p('a', '2026-11-05')], '2026-11-05');
    expect(r.ok && r.changed.end).toBe('2026-11-05');
  });

  it('fails without a started period', () => {
    expect(endPeriod([p('a', '2026-11-06')], '2026-11-05')).toEqual({ ok: false, reason: 'no-period' });
  });
});

describe('includeDayInPeriods', () => {
  const today = '2026-11-05';

  it('does nothing for a day already in a period', () => {
    const periods = [p('a', '2026-11-01', '2026-11-05')];
    expect(includeDayInPeriods(periods, '2026-11-03', today, ids()).changed).toBeUndefined();
  });

  it('extends a period ending the day before', () => {
    const r = includeDayInPeriods([p('a', '2026-10-01', '2026-10-05')], '2026-10-06', today, ids());
    expect(r.changed).toEqual({ id: 'a', start: '2026-10-01', end: '2026-10-06' });
  });

  it('bridges a single gap day', () => {
    const r = includeDayInPeriods([p('a', '2026-10-01', '2026-10-05')], '2026-10-07', today, ids());
    expect(r.changed?.end).toBe('2026-10-07');
  });

  it('pulls the next start back', () => {
    const r = includeDayInPeriods([p('a', '2026-10-10', '2026-10-14')], '2026-10-09', today, ids());
    expect(r.changed).toEqual({ id: 'a', start: '2026-10-09', end: '2026-10-14' });
  });

  it('creates an open period when flow is logged today', () => {
    const r = includeDayInPeriods([p('a', '2026-10-01', '2026-10-05')], today, today, ids());
    expect(r.changed).toEqual({ id: 'new1', start: today });
  });

  it('creates a closed one-day period for an isolated past day', () => {
    const r = includeDayInPeriods([p('a', '2026-10-01', '2026-10-05')], '2026-10-20', today, ids());
    expect(r.changed).toEqual({ id: 'new1', start: '2026-10-20', end: '2026-10-20' });
  });
});

describe('validatePeriodEdit', () => {
  const periods = [p('a', '2026-09-01', '2026-09-05'), p('b', '2026-10-01', '2026-10-05')];
  it('accepts a valid edit', () => {
    expect(validatePeriodEdit(periods, p('a', '2026-09-02', '2026-09-06'))).toBeNull();
  });
  it('rejects end before start', () => {
    expect(validatePeriodEdit(periods, p('a', '2026-09-05', '2026-09-01'))).toBe('end-before-start');
  });
  it('rejects overlaps', () => {
    expect(validatePeriodEdit(periods, p('a', '2026-09-01', '2026-10-02'))).toBe('overlap');
  });
});

describe('autoEndPeriods', () => {
  const open = p('a', '2026-11-01');
  const flow = (...d: string[]) => new Set(d);

  it('keeps a period open until the average length has passed', () => {
    expect(autoEndPeriods([open], flow('2026-11-01'), '2026-11-05', 5)).toEqual([]);
  });

  it('closes it after the average length when no more flow was logged', () => {
    expect(autoEndPeriods([open], flow('2026-11-01'), '2026-11-06', 5)).toEqual([{ id: 'a', start: '2026-11-01', end: '2026-11-05' }]);
  });

  it('waits for the last logged flow day when it runs longer than average', () => {
    const days = flow('2026-11-01', '2026-11-06', '2026-11-07');
    expect(autoEndPeriods([open], days, '2026-11-07', 5)).toEqual([]);
    expect(autoEndPeriods([open], days, '2026-11-08', 5)).toEqual([{ id: 'a', start: '2026-11-01', end: '2026-11-07' }]);
  });

  it('leaves closed and future periods alone', () => {
    expect(autoEndPeriods([p('a', '2026-10-01', '2026-10-04'), p('b', '2026-12-01')], flow(), '2026-11-20', 5)).toEqual([]);
  });
});
