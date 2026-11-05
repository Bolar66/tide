import type { Snapshot } from '../db/persistence';
import type { DayEntry, Period, Settings } from '../domain/types';

/**
 * Three-way merge of whole snapshots: `base` is the last state both sides agreed on.
 * Per record (period by id, day by date, setting by key):
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

const byId = (ps: Period[]) => new Map(ps.map((p) => [p.id, p]));
const byDate = (ds: DayEntry[]) => new Map(ds.map((d) => [d.date, d]));
const byKey = (s: Settings) => new Map(Object.entries(s));

export function mergeThreeWay(base: Snapshot | null, local: Snapshot, remote: Snapshot): Snapshot {
  const b: Snapshot = base ?? { periods: [], days: [], settings: {} as Settings };
  const periods = mergeMaps(byId(b.periods), byId(local.periods), byId(remote.periods), (l) => l);
  const days = mergeMaps(byDate(b.days), byDate(local.days), byDate(remote.days), (l, r) => (r.updatedAt > l.updatedAt ? r : l));
  // Without a common base (first sign-in on this device) the account's settings are the established ones.
  const settings = base
    ? mergeMaps(byKey(b.settings), byKey(local.settings), byKey(remote.settings), (l) => l)
    : byKey({ ...local.settings, ...remote.settings });
  return {
    periods: [...periods.values()].sort((x, y) => x.start.localeCompare(y.start) || x.id.localeCompare(y.id)),
    days: [...days.values()].sort((x, y) => x.date.localeCompare(y.date)),
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
