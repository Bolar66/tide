import Dexie, { type Table } from 'dexie';
import type { DayEntry, Period } from '../domain/types';

export interface SettingRow {
  key: string;
  value: unknown;
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

  constructor(name = 'tide') {
    super(name);
    this.version(1).stores({
      periods: 'id, start',
      days: 'date',
      settings: 'key',
    });
  }
}
