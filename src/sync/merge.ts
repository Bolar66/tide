import type { Snapshot } from '../db/persistence';
import type { DayEntry, Period, Settings } from '../domain/types';

/**
 * Three-way merge of whole snapshots: `base` is the last state both sides agreed on.
 * Per record (period by id, setting by key) and per field of a day:
 *   unchanged on one side → take the other side; changed on both → newest wins
 *   (days by updatedAt, otherwise the local device). A record missing on one side and unchanged
 *   on the other was deleted, so deletions propagate instead of being resurrected.
 */

type Keyed<T> = Map<string, T>;

/** Stable JSON: object keys sorted, so equal data always compares equal. */
export function canonical(value: unknown): string {
  return JSON.stringify(value, (_k, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );
}

const same = (a: unknown, b: unknown) => canonical(a) === canonical(b);

function mergeMaps<T>(base: Keyed<T>, local: Keyed<T>, remote: Keyed<T>, newer: (l: T, r: T) => T): Keyed<T> {
  const out: Keyed<T> = new Map();
  for (const key of new Set([...base.keys(), ...local.keys(), ...remote.keys()])) {
    const b = base.get(key);
    const l = local.get(key);
    const r = remote.get(key);
    let v: T | undefined;
    if (same(l, r)) v = l;
    else if (same(l, b)) v = r; // only remote changed (or deleted)
    else if (same(r, b)) v = l; // only local changed (or deleted)
    else if (l === undefined) v = r; // deleted here, edited there: keep the edit
    else if (r === undefined) v = l;
    else v = newer(l, r);
    if (v !== undefined) out.set(key, v);
  }
  return out;
}

/** Day entry flattened to independent fields, e.g. "flow", "symptoms.cramps", "metrics.sleepHours". */
function flattenDay(d: DayEntry | undefined): Keyed<unknown> {
  const out: Keyed<unknown> = new Map();
  if (!d) return out;
  for (const [k, v] of Object.entries(d)) {
    if (k === 'date' || k === 'updatedAt') continue;
    if ((k === 'symptoms' || k === 'metrics') && v && typeof v === 'object') {
      for (const [sub, sv] of Object.entries(v as Record<string, unknown>)) out.set(`${k}.${sub}`, sv);
    } else out.set(k, v);
  }
  return out;
}

function unflattenDay(date: string, fields: Keyed<unknown>, updatedAt: number): DayEntry | undefined {
  if (fields.size === 0) return undefined;
  const d: Record<string, unknown> = { date, updatedAt };
  for (const [k, v] of fields) {
    const [head, sub] = k.split('.') as [string, string | undefined];
    if (sub) d[head] = { ...(d[head] as object | undefined), [sub]: v };
    else d[head] = v;
  }
  return d as unknown as DayEntry;
}

/**
 * Two devices often edit the same day (one logs cramps, the other mood): merge field by field,
 * so neither edit is lost. A field changed on both sides goes to the newer entry.
 */
function mergeDay(b: DayEntry | undefined, l: DayEntry | undefined, r: DayEntry | undefined): DayEntry | undefined {
  const date = (l ?? r ?? b)!.date;
  const remoteNewer = (r?.updatedAt ?? 0) > (l?.updatedAt ?? 0);
  const fields = mergeMaps(flattenDay(b), flattenDay(l), flattenDay(r), (lv, rv) => (remoteNewer ? rv : lv));
  return unflattenDay(date, fields, Math.max(l?.updatedAt ?? 0, r?.updatedAt ?? 0));
}

function mergeDays(base: DayEntry[], local: DayEntry[], remote: DayEntry[]): DayEntry[] {
  const [b, l, r] = [byDate(base), byDate(local), byDate(remote)];
  const out: DayEntry[] = [];
  for (const date of new Set([...b.keys(), ...l.keys(), ...r.keys()])) {
    const merged = mergeDay(b.get(date), l.get(date), r.get(date));
    if (merged) out.push(merged);
  }
  return out;
}

const byId = (ps: Period[]) => new Map(ps.map((p) => [p.id, p]));
const byDate = (ds: DayEntry[]) => new Map(ds.map((d) => [d.date, d]));
const byKey = (s: Settings) => new Map(Object.entries(s));

export function mergeThreeWay(base: Snapshot | null, local: Snapshot, remote: Snapshot): Snapshot {
  const b: Snapshot = base ?? { periods: [], days: [], settings: {} as Settings };
  const periods = mergeMaps(byId(b.periods), byId(local.periods), byId(remote.periods), (l) => l);
  const days = mergeDays(b.days, local.days, remote.days);
  // Without a common base (first sign-in on this device) the account's settings are the established ones.
  const settings = base
    ? mergeMaps(byKey(b.settings), byKey(local.settings), byKey(remote.settings), (l) => l)
    : byKey({ ...local.settings, ...remote.settings });
  return {
    periods: [...periods.values()].sort((x, y) => x.start.localeCompare(y.start) || x.id.localeCompare(y.id)),
    days: days.sort((x, y) => x.date.localeCompare(y.date)),
    settings: { ...local.settings, ...(Object.fromEntries(settings) as Partial<Settings>) } as Settings,
  };
}

/** Snapshot in a canonical order, for comparison and for encryption. */
export function normalizeSnapshot(s: Snapshot): Snapshot {
  return {
    periods: [...s.periods].sort((x, y) => x.start.localeCompare(y.start) || x.id.localeCompare(y.id)),
    days: [...s.days].sort((x, y) => x.date.localeCompare(y.date)),
    settings: s.settings,
  };
}

export const sameSnapshot = (a: Snapshot, b: Snapshot) => canonical(normalizeSnapshot(a)) === canonical(normalizeSnapshot(b));
