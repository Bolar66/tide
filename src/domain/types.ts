import type { ISODate } from './dates';

export type Flow = 'light' | 'medium' | 'heavy';
export type Scale5 = 1 | 2 | 3 | 4 | 5;

export interface Symptoms {
  cramps?: Scale5;
  headache?: Scale5;
  mood?: Scale5;
  energy?: Scale5;
}

/** Value of an optional wellbeing tracker (phase 3). Keyed by tracker id in DayEntry.metrics. */
export type MetricValue = number | boolean | string | string[];

/**
 * One row per calendar day. New trackers go into `metrics` (keyed by tracker id),
 * which is not indexed, so adding one needs no Dexie schema change.
 */
export interface DayEntry {
  date: ISODate;
  flow?: Flow;
  symptoms?: Symptoms;
  note?: string;
  metrics?: Record<string, MetricValue>;
  updatedAt: number;
}

/** A menstrual period. `end` missing = still ongoing. */
export interface Period {
  id: string;
  start: ISODate;
  end?: ISODate;
}

export type ThemeSetting = 'system' | 'light' | 'dark';

export interface Settings {
  theme: ThemeSetting;
  /** Epoch ms of the last successful export. */
  lastBackupAt?: number;
  /** Tracker ids shown in the day editor (phase 3). */
  enabledTrackers: string[];
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  enabledTrackers: [],
};
