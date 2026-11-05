import type { MetricValue } from '../domain/types';

/**
 * Optional wellbeing trackers (phase 3). Values are stored in DayEntry.metrics[id], which is not
 * indexed, so adding a tracker here needs no database migration. Never reuse or rename an id:
 * existing data and backups refer to it.
 */
export type TrackerKind =
  | { kind: 'scale5' }
  | { kind: 'number'; min: number; max: number; step: number; unit: string; default: number; decimals: number }
  | { kind: 'count'; max: number; unit: string }
  | { kind: 'chips'; options: readonly string[] }
  | { kind: 'boolean' }
  | { kind: 'text' };

export type TrackerGroup = 'sleep' | 'mind' | 'body' | 'lifestyle' | 'medication';

export type TrackerDef = TrackerKind & {
  id: string;
  group: TrackerGroup;
  /** Shown to new users unless they choose otherwise. */
  defaultEnabled: boolean;
};

export const TRACKERS = [
  { id: 'sleepHours', group: 'sleep', kind: 'number', min: 0, max: 14, step: 0.5, unit: 'h', default: 7.5, decimals: 1, defaultEnabled: true },
  { id: 'sleepQuality', group: 'sleep', kind: 'scale5', defaultEnabled: true },
  { id: 'stress', group: 'mind', kind: 'scale5', defaultEnabled: true },
  { id: 'skin', group: 'body', kind: 'chips', options: ['clear', 'breakout', 'dry', 'oily'], defaultEnabled: false },
  { id: 'cravings', group: 'body', kind: 'chips', options: ['sweet', 'salty', 'carbs', 'chocolate'], defaultEnabled: false },
  { id: 'digestion', group: 'body', kind: 'chips', options: ['normal', 'bloating', 'constipation', 'diarrhea', 'nausea'], defaultEnabled: false },
  { id: 'bbt', group: 'body', kind: 'number', min: 35, max: 38, step: 0.05, unit: '°C', default: 36.5, decimals: 2, defaultEnabled: false },
  { id: 'weight', group: 'body', kind: 'number', min: 30, max: 200, step: 0.1, unit: 'kg', default: 65, decimals: 1, defaultEnabled: false },
  { id: 'caffeine', group: 'lifestyle', kind: 'count', max: 10, unit: 'cups', defaultEnabled: false },
  { id: 'alcohol', group: 'lifestyle', kind: 'count', max: 15, unit: 'drinks', defaultEnabled: false },
  { id: 'exercise', group: 'lifestyle', kind: 'number', min: 0, max: 240, step: 5, unit: 'min', default: 30, decimals: 0, defaultEnabled: false },
  { id: 'steps', group: 'lifestyle', kind: 'number', min: 0, max: 40000, step: 500, unit: 'steps', default: 6000, decimals: 0, defaultEnabled: false },
  { id: 'pill', group: 'medication', kind: 'boolean', defaultEnabled: false },
  { id: 'medication', group: 'medication', kind: 'text', defaultEnabled: false },
] as const satisfies readonly TrackerDef[];

export type TrackerId = (typeof TRACKERS)[number]['id'];
export const TRACKER_GROUPS: readonly TrackerGroup[] = ['sleep', 'mind', 'body', 'lifestyle', 'medication'];

const BY_ID = new Map<string, TrackerDef>(TRACKERS.map((t) => [t.id, t]));

export function trackerById(id: string): TrackerDef | undefined {
  return BY_ID.get(id);
}

export const DEFAULT_TRACKERS: TrackerId[] = TRACKERS.filter((t) => t.defaultEnabled).map((t) => t.id);

/** Enabled trackers in registry order; unknown ids (e.g. from a newer backup) are ignored. */
export function enabledTrackers(ids: readonly string[]): TrackerDef[] {
  const set = new Set(ids);
  return TRACKERS.filter((t) => set.has(t.id));
}

/** Coerce a stored value to what the tracker accepts, or undefined if it does not fit. */
export function sanitizeMetric(def: TrackerDef, value: unknown): MetricValue | undefined {
  switch (def.kind) {
    case 'scale5':
      return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5 ? value : undefined;
    case 'number': {
      if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
      const clamped = Math.min(def.max, Math.max(def.min, value));
      return Number(clamped.toFixed(def.decimals));
    }
    case 'count':
      return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= def.max ? value : undefined;
    case 'chips': {
      if (!Array.isArray(value)) return undefined;
      const allowed = value.filter((v): v is string => typeof v === 'string' && (def.options as readonly string[]).includes(v));
      return allowed.length ? [...new Set(allowed)] : undefined;
    }
    case 'boolean':
      return value === true ? true : undefined;
    case 'text':
      return typeof value === 'string' && value.trim() ? value.trim().slice(0, 200) : undefined;
  }
}
