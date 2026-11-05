import { describe, expect, it } from 'vitest';
import type { Snapshot } from '../db/persistence';
import { DEFAULT_SETTINGS } from '../domain/types';
import { mergeThreeWay, sameSnapshot } from './merge';

const snap = (over: Partial<Snapshot> = {}): Snapshot => ({ periods: [], days: [], settings: DEFAULT_SETTINGS, ...over });
const day = (date: string, note: string, updatedAt = 1) => ({ date, note, updatedAt });

describe('mergeThreeWay', () => {
  const base = snap({
    periods: [{ id: 'a', start: '2026-10-01', end: '2026-10-05' }],
    days: [day('2026-10-01', 'base')],
  });

  it('takes changes made on either side to different records', () => {
    const local = snap({ ...base, days: [...base.days, day('2026-10-02', 'local')] });
    const remote = snap({ ...base, days: [...base.days, day('2026-10-03', 'remote')] });
    expect(mergeThreeWay(base, local, remote).days.map((d) => d.note)).toEqual(['base', 'local', 'remote']);
  });

  it('propagates a deletion instead of resurrecting the record', () => {
    const local = snap({ ...base, periods: [] });
    const merged = mergeThreeWay(base, local, base);
    expect(merged.periods).toEqual([]);
    expect(mergeThreeWay(base, base, local).periods).toEqual([]);
  });

  it('resolves the same day edited on both sides by updatedAt', () => {
    const local = snap({ ...base, days: [day('2026-10-01', 'local', 5)] });
    const remote = snap({ ...base, days: [day('2026-10-01', 'remote', 9)] });
    expect(mergeThreeWay(base, local, remote).days[0]?.note).toBe('remote');
    expect(mergeThreeWay(base, remote, local).days[0]?.note).toBe('remote');
  });

  it('merges the same day field by field (two devices logging different things)', () => {
    const b0 = snap({ days: [{ date: '2026-11-05', updatedAt: 1, note: 'aamu' }] });
    const local = snap({ days: [{ date: '2026-11-05', updatedAt: 5, note: 'aamu', symptoms: { mood: 2 } }] });
    const remote = snap({ days: [{ date: '2026-11-05', updatedAt: 3, note: 'aamu', symptoms: { cramps: 5 }, metrics: { sleepHours: 7 } }] });
    expect(mergeThreeWay(b0, local, remote).days).toEqual([
      { date: '2026-11-05', updatedAt: 5, note: 'aamu', symptoms: { mood: 2, cramps: 5 }, metrics: { sleepHours: 7 } },
    ]);
  });

  it('clears a field removed on one side', () => {
    const b0 = snap({ days: [{ date: '2026-11-05', updatedAt: 1, flow: 'light', note: 'x' }] });
    const local = snap({ days: [{ date: '2026-11-05', updatedAt: 2, note: 'x' }] }); // flow cleared
    expect(mergeThreeWay(b0, local, b0).days[0]).toEqual({ date: '2026-11-05', updatedAt: 2, note: 'x' });
  });

  it('keeps an edit over a concurrent delete', () => {
    const local = snap({ ...base, days: [] });
    const remote = snap({ ...base, days: [day('2026-10-01', 'edited', 9)] });
    expect(mergeThreeWay(base, local, remote).days[0]?.note).toBe('edited');
  });

  it('merges settings per field', () => {
    const local = snap({ ...base, settings: { ...DEFAULT_SETTINGS, theme: 'dark' } });
    const remote = snap({ ...base, settings: { ...DEFAULT_SETTINGS, showFertility: false } });
    expect(mergeThreeWay(base, local, remote).settings).toMatchObject({ theme: 'dark', showFertility: false });
  });

  it('unions both sides when there is no common base (first sign-in on a used device)', () => {
    const local = snap({ days: [day('2026-10-02', 'phone')] });
    const remote = snap({ days: [day('2026-10-03', 'cloud')] });
    expect(mergeThreeWay(null, local, remote).days.map((d) => d.note)).toEqual(['phone', 'cloud']);
  });

  it("takes the account's settings when signing in on a fresh device", () => {
    const local = snap({ settings: { ...DEFAULT_SETTINGS, onboarded: false } });
    const remote = snap({ settings: { ...DEFAULT_SETTINGS, onboarded: true, enabledTrackers: ['stress', 'skin'] } });
    expect(mergeThreeWay(null, local, remote).settings).toMatchObject({ onboarded: true, enabledTrackers: ['stress', 'skin'] });
  });

  it('compares snapshots independent of order', () => {
    const a = snap({ days: [day('2026-10-02', 'x'), day('2026-10-01', 'y')] });
    const b = snap({ days: [day('2026-10-01', 'y'), day('2026-10-02', 'x')] });
    expect(sameSnapshot(a, b)).toBe(true);
  });
});
