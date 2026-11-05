import Dexie, { type Table } from 'dexie';
import type { DayEntry, Period } from '../domain/types';

export interface SettingRow {
  key: string;
  value: unknown;
}

/** Plaintext values needed before unlocking (lock configuration, failed attempts). Never health data. */
export interface MetaRow {
  key: string;
  value: unknown;
}

/** An encrypted record. `id` is an HMAC of the natural key, so storage reveals no dates. */
export interface SealedRow {
  id: string;
  iv: string;
  data: string;
}

/**
 * Schema history. Never edit a released version: add a new `this.version(n)` with
 * the changed stores (and an `.upgrade()` if existing rows need rewriting).
 * Fields that are not indexed (e.g. DayEntry.metrics) need no version bump at all.
 */
export class TideDB extends Dexie {
  periods!: Table<Period, string>;
  days!: Table<DayEntry, string>;
  settings!: Table<SettingRow, string>;
  meta!: Table<MetaRow, string>;
  sealed!: Table<SealedRow, string>;

  constructor(name = 'tide') {
    super(name);
    this.version(1).stores({
      periods: 'id, start',
      days: 'date',
      settings: 'key',
    });
    // v2 (phase 2): optional encryption. With the lock on, data lives in `sealed` and the v1 tables are empty.
    this.version(2).stores({
      meta: 'key',
      sealed: 'id',
    });
  }
}
