import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../domain/types';
import { createBackup, mergeSnapshots, parseBackup } from './backup';
import type { Snapshot } from './persistence';

const snap = (over: Partial<Snapshot> = {}): Snapshot => ({ periods: [], days: [], settings: DEFAULT_SETTINGS, ...over });

describe('parseBackup', () => {
  it('round-trips an export', () => {
    const data = snap({
      periods: [{ id: 'a', start: '2026-10-01', end: '2026-10-05' }],
      days: [{ date: '2026-10-01', flow: 'heavy', symptoms: { cramps: 4 }, metrics: { sleepHours: 7.5 }, updatedAt: 1 }],
    });
    const r = parseBackup(JSON.stringify(createBackup(data)));
    expect(r).toEqual({ ok: true, data });
  });

  it('rejects non-JSON and foreign files', () => {
    expect(parseBackup('{oops')).toEqual({ ok: false, error: 'not-json' });
    expect(parseBackup('{"app":"other"}')).toEqual({ ok: false, error: 'not-tide' });
  });

  it('rejects files from a newer app version', () => {
    expect(parseBackup('{"app":"tide","schemaVersion":99,"periods":[],"days":[]}')).toEqual({ ok: false, error: 'too-new' });
  });

  it('rejects malformed rows', () => {
    const bad = { app: 'tide', schemaVersion: 1, periods: [{ id: 'a', start: '2026-10-05', end: '2026-10-01' }], days: [] };
    expect(parseBackup(JSON.stringify(bad))).toEqual({ ok: false, error: 'invalid' });
    const badFlow = { app: 'tide', schemaVersion: 1, periods: [], days: [{ date: '2026-10-01', flow: 'lots' }] };
    expect(parseBackup(JSON.stringify(badFlow))).toEqual({ ok: false, error: 'invalid' });
  });
});

describe('mergeSnapshots', () => {
  it('keeps the newer day and adds non-overlapping periods', () => {
    const local = snap({
      periods: [{ id: 'a', start: '2026-10-01', end: '2026-10-05' }],
      days: [{ date: '2026-10-01', note: 'local', updatedAt: 5 }],
    });
    const incoming = snap({
      periods: [
        { id: 'x', start: '2026-10-03', end: '2026-10-06' }, // overlaps a
        { id: 'y', start: '2026-09-03', end: '2026-09-07' },
      ],
      days: [
        { date: '2026-10-01', note: 'old', updatedAt: 1 },
        { date: '2026-09-03', note: 'new day', updatedAt: 1 },
      ],
      settings: { ...DEFAULT_SETTINGS, theme: 'dark' },
    });
    const merged = mergeSnapshots(local, incoming);
    expect(merged.periods.map((p) => p.id)).toEqual(['y', 'a']);
    expect(merged.days.map((d) => d.note)).toEqual(['new day', 'local']);
    expect(merged.settings.theme).toBe('system');
  });
});
