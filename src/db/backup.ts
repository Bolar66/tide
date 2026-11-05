import { isISODate } from '../domain/dates';
import { DEFAULT_SETTINGS, type DayEntry, type Flow, type Period, type Settings } from '../domain/types';
import type { Snapshot } from './persistence';

export const BACKUP_APP = 'tide';
export const BACKUP_VERSION = 1;

export interface BackupFile extends Snapshot {
  app: typeof BACKUP_APP;
  schemaVersion: number;
  exportedAt: string;
}

export function createBackup(snapshot: Snapshot, now = new Date()): BackupFile {
  return { app: BACKUP_APP, schemaVersion: BACKUP_VERSION, exportedAt: now.toISOString(), ...snapshot };
}

export type ParseResult = { ok: true; data: Snapshot } | { ok: false; error: 'not-json' | 'not-tide' | 'too-new' | 'invalid' };

const FLOWS: readonly Flow[] = ['light', 'medium', 'heavy'];
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function validPeriod(v: unknown): v is Period {
  return (
    isObj(v) &&
    typeof v.id === 'string' &&
    isISODate(v.start) &&
    (v.end === undefined || (isISODate(v.end) && v.end >= v.start))
  );
}

function validDay(v: unknown): v is DayEntry {
  return (
    isObj(v) &&
    isISODate(v.date) &&
    (v.flow === undefined || FLOWS.includes(v.flow as Flow)) &&
    (v.symptoms === undefined || isObj(v.symptoms)) &&
    (v.note === undefined || typeof v.note === 'string') &&
    (v.metrics === undefined || isObj(v.metrics))
  );
}

/** Validate an imported file. Unknown extra fields are kept, so newer trackers survive a round trip. */
export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'not-json' };
  }
  if (!isObj(raw) || raw.app !== BACKUP_APP) return { ok: false, error: 'not-tide' };
  if (typeof raw.schemaVersion !== 'number' || raw.schemaVersion > BACKUP_VERSION) return { ok: false, error: 'too-new' };
  if (!Array.isArray(raw.periods) || !Array.isArray(raw.days)) return { ok: false, error: 'invalid' };
  if (!raw.periods.every(validPeriod) || !raw.days.every(validDay)) return { ok: false, error: 'invalid' };

  const settings: Settings = { ...DEFAULT_SETTINGS, ...(isObj(raw.settings) ? (raw.settings as Partial<Settings>) : {}) };
  const days = (raw.days as DayEntry[]).map((d) => ({ ...d, updatedAt: typeof d.updatedAt === 'number' ? d.updatedAt : 0 }));
  return { ok: true, data: { periods: raw.periods as Period[], days, settings } };
}

/**
 * Merge an import into local data. Days: the newer `updatedAt` wins. Periods: imported
 * ones are added unless they overlap a local period (local wins). Local settings are kept.
 */
export function mergeSnapshots(local: Snapshot, incoming: Snapshot): Snapshot {
  const days = new Map(local.days.map((d) => [d.date, d]));
  for (const d of incoming.days) {
    const cur = days.get(d.date);
    if (!cur || d.updatedAt > cur.updatedAt) days.set(d.date, d);
  }

  const far = '9999-12-31';
  const overlaps = (a: Period, b: Period) => a.start <= (b.end ?? far) && b.start <= (a.end ?? far);
  const periods = [...local.periods];
  for (const p of incoming.periods) {
    const sameId = periods.findIndex((x) => x.id === p.id);
    if (sameId >= 0) continue;
    if (!periods.some((x) => overlaps(x, p))) periods.push(p);
  }

  return {
    periods: periods.sort((a, b) => a.start.localeCompare(b.start)),
    days: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)),
    settings: local.settings,
  };
}
