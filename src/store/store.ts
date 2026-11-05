import { mergeSnapshots } from '../db/backup';
import type { Persistence, Snapshot } from '../db/persistence';
import { addDaysISO, todayISO, type ISODate } from '../domain/dates';
import {
  autoEndPeriods,
  endPeriod as endPeriodOp,
  includeDayInPeriods,
  startPeriod as startPeriodOp,
  validatePeriodEdit,
} from '../domain/periods';
import { computeStats } from '../domain/prediction';
import { DEFAULT_SETTINGS, type DayEntry, type MetricValue, type Period, type Settings } from '../domain/types';

export interface State {
  status: 'loading' | 'ready' | 'error';
  periods: Period[];
  days: Record<ISODate, DayEntry>;
  settings: Settings;
  /** Set when a write to IndexedDB fails, shown as a banner. */
  saveError: boolean;
}

export interface OnboardingAnswers {
  lastPeriodStart?: ISODate;
  cycleLength?: number;
  periodLength?: number;
}

/** Fields to merge into a day. `undefined` clears a field, symptom or metric. */
export type DayPatch = Partial<Omit<DayEntry, 'date' | 'updatedAt' | 'metrics'>> & {
  metrics?: Record<string, MetricValue | undefined>;
};
export type ActionResult = { ok: true; period?: Period } | { ok: false; reason: string };

const initial: State = { status: 'loading', periods: [], days: {}, settings: DEFAULT_SETTINGS, saveError: false };

const newId = () => crypto.randomUUID();

/** Drop undefined/empty values so cleared fields do not linger in storage. */
function compact<T extends object>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) continue;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      const inner = compact(v as object);
      if (Object.keys(inner).length) out[k] = inner;
      continue;
    }
    out[k] = v;
  }
  return out as T;
}

function isEmptyDay(d: DayEntry): boolean {
  return Object.keys(d).every((k) => k === 'date' || k === 'updatedAt');
}

export function createStore(initialPersistence: Persistence, now: () => Date = () => new Date()) {
  let persistence = initialPersistence;
  let state = initial;
  const listeners = new Set<() => void>();

  const set = (patch: Partial<State>) => {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  };

  const write = (op: Promise<void>) =>
    op.catch((err: unknown) => {
      console.error('Tallennus epäonnistui', err);
      set({ saveError: true });
    });

  const today = () => todayISO(now());
  const fallback = () => ({ cycle: state.settings.cycleLengthHint, period: state.settings.periodLengthHint });

  function snapshot(): Snapshot {
    return { periods: state.periods, days: Object.values(state.days), settings: state.settings };
  }

  function applySnapshot(s: Snapshot) {
    set({
      periods: [...s.periods].sort((a, b) => a.start.localeCompare(b.start)),
      days: Object.fromEntries(s.days.map((d) => [d.date, d])),
      settings: s.settings,
    });
  }

  return {
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    snapshot,

    async load() {
      try {
        const loaded = await persistence.load();
        applySnapshot(loaded);
        // Installs that already have data (from before onboarding existed) skip the first-run flow.
        if (!loaded.settings.onboarded && (loaded.periods.length > 0 || loaded.days.length > 0)) {
          this.updateSettings({ onboarded: true });
        }
        set({ status: 'ready' });
      } catch (err) {
        console.error(err);
        set({ status: 'error' });
      }
    },

    startPeriod(date: ISODate = today()): ActionResult {
      const r = startPeriodOp(state.periods, date, newId, computeStats(state.periods, fallback()).avgPeriod);
      if (!r.ok) return r;
      set({ periods: r.periods });
      void write(persistence.putPeriod(r.changed));
      if (!state.days[date]?.flow) this.updateDay(date, { flow: 'medium' });
      return { ok: true, period: r.changed };
    },

    endPeriod(date: ISODate = today()): ActionResult {
      const r = endPeriodOp(state.periods, date);
      if (!r.ok) return r;
      set({ periods: r.periods });
      void write(persistence.putPeriod(r.changed));
      return { ok: true, period: r.changed };
    },

    savePeriod(period: Period): ActionResult {
      const clean = compact(period);
      const error = validatePeriodEdit(state.periods, clean);
      if (error) return { ok: false, reason: error };
      const exists = state.periods.some((p) => p.id === clean.id);
      const periods = exists ? state.periods.map((p) => (p.id === clean.id ? clean : p)) : [...state.periods, clean];
      set({ periods: periods.sort((a, b) => a.start.localeCompare(b.start)) });
      void write(persistence.putPeriod(clean));
      return { ok: true };
    },

    deletePeriod(id: string) {
      set({ periods: state.periods.filter((p) => p.id !== id) });
      void write(persistence.deletePeriod(id));
    },

    /** Merge a patch into a day. Pass `undefined` for a field to clear it. */
    updateDay(date: ISODate, patch: DayPatch) {
      const prev = state.days[date] ?? { date, updatedAt: 0 };
      // compact() drops the undefined values, so the result is a valid DayEntry.
      const merged = compact<DayEntry>({
        ...prev,
        ...patch,
        symptoms: patch.symptoms === undefined && 'symptoms' in patch ? undefined : { ...prev.symptoms, ...patch.symptoms },
        metrics: patch.metrics === undefined && 'metrics' in patch ? undefined : { ...prev.metrics, ...patch.metrics },
        date,
        updatedAt: now().getTime(),
      } as DayEntry);

      const days = { ...state.days };
      if (isEmptyDay(merged)) {
        delete days[date];
        void write(persistence.deleteDay(date));
      } else {
        days[date] = merged;
        void write(persistence.putDay(merged));
      }
      set({ days });

      if (patch.flow) {
        const r = includeDayInPeriods(state.periods, date, today(), newId);
        if (r.changed) {
          set({ periods: r.periods });
          void write(persistence.putPeriod(r.changed));
        }
      }
    },

    updateSettings(patch: Partial<Settings>) {
      const settings = { ...state.settings, ...patch };
      set({ settings });
      void write(persistence.putSettings(settings));
    },

    /** Close periods whose end was never marked (see autoEndPeriods). Safe to call often. */
    autoEnd(date: ISODate = today()) {
      const flowDays = new Set(Object.values(state.days).filter((d) => d.flow).map((d) => d.date));
      const changed = autoEndPeriods(state.periods, flowDays, date, computeStats(state.periods, fallback()).avgPeriod);
      if (changed.length === 0) return;
      const byId = new Map(changed.map((p) => [p.id, p]));
      set({ periods: state.periods.map((p) => byId.get(p.id) ?? p) });
      for (const p of changed) void write(persistence.putPeriod(p));
    },

    completeOnboarding(answers: OnboardingAnswers) {
      const { lastPeriodStart, cycleLength, periodLength } = answers;
      if (lastPeriodStart && state.periods.length === 0) {
        const len = periodLength ?? computeStats([]).avgPeriod;
        const end = addDaysISO(lastPeriodStart, len - 1);
        const period: Period = { id: newId(), start: lastPeriodStart, ...(end < today() ? { end } : {}) };
        set({ periods: [period] });
        void write(persistence.putPeriod(period));
      }
      this.updateSettings({
        onboarded: true,
        ...(cycleLength ? { cycleLengthHint: cycleLength } : {}),
        ...(periodLength ? { periodLengthHint: periodLength } : {}),
      });
    },

    async importSnapshot(incoming: Snapshot, mode: 'replace' | 'merge') {
      const next =
        mode === 'replace'
          ? { ...incoming, settings: { ...incoming.settings, lastBackupAt: state.settings.lastBackupAt } }
          : mergeSnapshots(snapshot(), incoming);
      await persistence.replaceAll(next);
      applySnapshot(next);
    },

    /** Switch storage (lock turned on/off). The data was already migrated, so in-memory state stays as is. */
    setPersistence(next: Persistence) {
      persistence = next;
    },

    getPersistence() {
      return persistence;
    },

    /** Replace everything with a merged result from account sync, exactly as given. */
    async applySynced(next: Snapshot) {
      await persistence.replaceAll(next);
      applySnapshot(next);
    },

    dismissSaveError() {
      set({ saveError: false });
    },
  };
}

export type Store = ReturnType<typeof createStore>;
