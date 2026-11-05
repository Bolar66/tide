import { DEFAULT_SETTINGS, type DayEntry, type Period, type Settings } from '../domain/types';
import type { SyncState } from '../sync/engine';
import { TideDB } from './db';

export interface Snapshot {
  periods: Period[];
  days: DayEntry[];
  settings: Settings;
}

/** Storage boundary for the store. Phase 2 adds an encrypting implementation behind the same interface. */
export interface Persistence {
  load(): Promise<Snapshot>;
  putPeriod(period: Period): Promise<void>;
  deletePeriod(id: string): Promise<void>;
  putDay(day: DayEntry): Promise<void>;
  deleteDay(date: string): Promise<void>;
  putSettings(settings: Settings): Promise<void>;
  replaceAll(snapshot: Snapshot): Promise<void>;
  /** Last state agreed with the server (account sync). Contains health data, so it is stored like the data. */
  loadSyncState(): Promise<SyncState | null>;
  saveSyncState(state: SyncState | null): Promise<void>;
}

const SYNC_STATE_KEY = 'syncState';

export class DexiePersistence implements Persistence {
  constructor(private readonly db: TideDB = new TideDB()) {}

  async load(): Promise<Snapshot> {
    const [periods, days, settingRows] = await Promise.all([
      this.db.periods.orderBy('start').toArray(),
      this.db.days.toArray(),
      this.db.settings.toArray(),
    ]);
    const stored = Object.fromEntries(settingRows.map((r) => [r.key, r.value])) as Partial<Settings>;
    return { periods, days, settings: { ...DEFAULT_SETTINGS, ...stored } };
  }

  async putPeriod(period: Period) {
    await this.db.periods.put(period);
  }

  async deletePeriod(id: string) {
    await this.db.periods.delete(id);
  }

  async putDay(day: DayEntry) {
    await this.db.days.put(day);
  }

  async deleteDay(date: string) {
    await this.db.days.delete(date);
  }

  async putSettings(settings: Settings) {
    await this.db.settings.bulkPut(Object.entries(settings).map(([key, value]) => ({ key, value })));
  }

  async loadSyncState() {
    return ((await this.db.meta.get(SYNC_STATE_KEY))?.value as SyncState | undefined) ?? null;
  }

  async saveSyncState(state: SyncState | null) {
    if (state) await this.db.meta.put({ key: SYNC_STATE_KEY, value: state });
    else await this.db.meta.delete(SYNC_STATE_KEY);
  }

  async replaceAll(snapshot: Snapshot) {
    await this.db.transaction('rw', this.db.periods, this.db.days, this.db.settings, async () => {
      await Promise.all([this.db.periods.clear(), this.db.days.clear(), this.db.settings.clear()]);
      await this.db.periods.bulkPut(snapshot.periods);
      await this.db.days.bulkPut(snapshot.days);
      await this.putSettings(snapshot.settings);
    });
  }
}
