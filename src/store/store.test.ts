import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { TideDB } from '../db/db';
import { DexiePersistence } from '../db/persistence';
import { createStore } from './store';

const NOW = new Date('2026-11-05T10:00:00');
let n = 0;

async function setup() {
  const db = new TideDB(`test-${++n}`);
  const persistence = new DexiePersistence(db);
  const store = createStore(persistence, () => NOW);
  await store.load();
  return { db, persistence, store };
}

describe('store', () => {
  it('starts and ends a period and persists it', async () => {
    const { store, persistence } = await setup();
    expect(store.startPeriod()).toMatchObject({ ok: true, period: { start: '2026-11-05' } });
    expect(store.getState().days['2026-11-05']?.flow).toBe('medium');
    expect(store.endPeriod('2026-11-05')).toMatchObject({ ok: true, period: { end: '2026-11-05' } });
    await new Promise((r) => setTimeout(r, 10));
    const loaded = await persistence.load();
    expect(loaded.periods).toMatchObject([{ start: '2026-11-05', end: '2026-11-05' }]);
    expect(loaded.days).toMatchObject([{ date: '2026-11-05', flow: 'medium' }]);
  });

  it('merges symptoms and deletes days that become empty', async () => {
    const { store, persistence } = await setup();
    store.updateDay('2026-11-01', { symptoms: { cramps: 3 } });
    store.updateDay('2026-11-01', { symptoms: { mood: 4 } });
    expect(store.getState().days['2026-11-01']?.symptoms).toEqual({ cramps: 3, mood: 4 });

    store.updateDay('2026-11-01', { symptoms: { cramps: undefined, mood: undefined } });
    expect(store.getState().days['2026-11-01']).toBeUndefined();
    await new Promise((r) => setTimeout(r, 10));
    expect((await persistence.load()).days).toEqual([]);
  });

  it('logging flow on a past day creates a period', async () => {
    const { store } = await setup();
    store.updateDay('2026-10-20', { flow: 'heavy' });
    expect(store.getState().periods).toMatchObject([{ start: '2026-10-20', end: '2026-10-20' }]);
  });

  it('rejects overlapping period edits', async () => {
    const { store } = await setup();
    store.startPeriod('2026-10-01');
    store.endPeriod('2026-10-05');
    store.startPeriod('2026-10-29');
    const first = store.getState().periods[0]!;
    expect(store.savePeriod({ ...first, end: '2026-10-30' })).toEqual({ ok: false, reason: 'overlap' });
  });

  it('replaces everything on import but keeps the backup timestamp', async () => {
    const { store, persistence } = await setup();
    store.updateSettings({ lastBackupAt: 123 });
    store.updateDay('2026-11-01', { note: 'vanha' });
    await store.importSnapshot(
      { periods: [{ id: 'z', start: '2026-09-01', end: '2026-09-04' }], days: [], settings: { theme: 'dark', enabledTrackers: [] } },
      'replace',
    );
    const loaded = await persistence.load();
    expect(loaded.days).toEqual([]);
    expect(loaded.periods.map((p) => p.id)).toEqual(['z']);
    expect(loaded.settings).toMatchObject({ theme: 'dark', lastBackupAt: 123 });
  });
});
