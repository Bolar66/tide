import type { SealedRow, TideDB } from '../db/db';
import type { Persistence, Snapshot } from '../db/persistence';
import type { SyncState } from '../sync/engine';
import { DEFAULT_SETTINGS, type DayEntry, type Period, type Settings } from '../domain/types';
import { opaqueId, openJSON, sealJSON, type DataKeys } from './keys';

type Record_ = { kind: 'period'; value: Period } | { kind: 'day'; value: DayEntry } | { kind: 'settings'; value: Settings };
type SyncRecord = { kind: 'sync'; value: SyncState };

const idFor = (keys: DataKeys, r: Record_) =>
  opaqueId(keys.mac, r.kind, r.kind === 'period' ? r.value.id : r.kind === 'day' ? r.value.date : 'main');

export async function sealRecord(keys: DataKeys, r: Record_): Promise<SealedRow> {
  const [id, sealed] = await Promise.all([idFor(keys, r), sealJSON(keys.enc, r)]);
  return { id, ...sealed };
}

export async function sealSnapshot(keys: DataKeys, s: Snapshot): Promise<SealedRow[]> {
  const records: Record_[] = [
    ...s.periods.map((value) => ({ kind: 'period' as const, value })),
    ...s.days.map((value) => ({ kind: 'day' as const, value })),
    { kind: 'settings', value: s.settings },
  ];
  return Promise.all(records.map((r) => sealRecord(keys, r)));
}

export async function openSnapshot(keys: DataKeys, rows: SealedRow[]): Promise<Snapshot> {
  const records = await Promise.all(rows.map((row) => openJSON<Record_ | SyncRecord>(keys.enc, row)));
  const snapshot: Snapshot = { periods: [], days: [], settings: DEFAULT_SETTINGS };
  for (const r of records) {
    if (r.kind === 'period') snapshot.periods.push(r.value);
    else if (r.kind === 'day') snapshot.days.push(r.value);
    else if (r.kind === 'settings') snapshot.settings = { ...DEFAULT_SETTINGS, ...r.value };
  }
  snapshot.periods.sort((a, b) => a.start.localeCompare(b.start));
  return snapshot;
}

/**
 * Same interface as DexiePersistence, but every record is encrypted before it touches IndexedDB.
 * Encryption happens before a Dexie transaction opens: awaiting WebCrypto inside one would commit it early.
 */
export class EncryptedPersistence implements Persistence {
  constructor(
    private readonly db: TideDB,
    private readonly keys: DataKeys,
  ) {}

  async load(): Promise<Snapshot> {
    return openSnapshot(this.keys, await this.db.sealed.toArray());
  }

  async putPeriod(value: Period) {
    await this.db.sealed.put(await sealRecord(this.keys, { kind: 'period', value }));
  }

  async deletePeriod(id: string) {
    await this.db.sealed.delete(await opaqueId(this.keys.mac, 'period', id));
  }

  async putDay(value: DayEntry) {
    await this.db.sealed.put(await sealRecord(this.keys, { kind: 'day', value }));
  }

  async deleteDay(date: string) {
    await this.db.sealed.delete(await opaqueId(this.keys.mac, 'day', date));
  }

  async putSettings(value: Settings) {
    await this.db.sealed.put(await sealRecord(this.keys, { kind: 'settings', value }));
  }

  async replaceAll(snapshot: Snapshot) {
    const rows = await sealSnapshot(this.keys, snapshot);
    const syncId = await opaqueId(this.keys.mac, 'sync', 'state');
    const sync = await this.db.sealed.get(syncId); // keep the sync state across a full replace
    await this.db.transaction('rw', this.db.sealed, async () => {
      await this.db.sealed.clear();
      await this.db.sealed.bulkPut(sync ? [...rows, sync] : rows);
    });
  }

  async loadSyncState() {
    const row = await this.db.sealed.get(await opaqueId(this.keys.mac, 'sync', 'state'));
    return row ? (await openJSON<SyncRecord>(this.keys.enc, row)).value : null;
  }

  async saveSyncState(state: SyncState | null) {
    const id = await opaqueId(this.keys.mac, 'sync', 'state');
    if (!state) return void (await this.db.sealed.delete(id));
    const sealed = await sealJSON(this.keys.enc, { kind: 'sync', value: state } satisfies SyncRecord);
    await this.db.sealed.put({ id, ...sealed });
  }
}
