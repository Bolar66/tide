import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { TideDB } from './db';
import { DexiePersistence } from './persistence';

describe('schema upgrades', () => {
  it('upgrades a v1 database (phase 1 installs) to v2 without losing data', async () => {
    const name = 'upgrade-test';
    const v1 = new Dexie(name);
    v1.version(1).stores({ periods: 'id, start', days: 'date', settings: 'key' });
    await v1.table('periods').put({ id: 'a', start: '2026-10-07', end: '2026-10-11' });
    await v1.table('days').put({ date: '2026-10-07', flow: 'heavy', updatedAt: 1 });
    await v1.table('settings').put({ key: 'theme', value: 'dark' });
    v1.close();

    const db = new TideDB(name);
    const loaded = await new DexiePersistence(db).load();
    expect(db.verno).toBe(2);
    expect(loaded.periods).toHaveLength(1);
    expect(loaded.days[0]?.flow).toBe('heavy');
    expect(loaded.settings.theme).toBe('dark');
    expect(await db.meta.count()).toBe(0);
  });
});
