import { addDaysISO, diffDays, type ISODate } from './dates';
import { effectiveEnd, findPeriodOn, sortPeriods } from './periods';
import type { DayEntry, Flow, Period } from './types';

/** Values a doctor typically asks about. Intimacy is never part of a report. */
export const REPORT_METRICS = [
  { id: 'cramps', read: (d: DayEntry) => d.symptoms?.cramps },
  { id: 'headache', read: (d: DayEntry) => d.symptoms?.headache },
  { id: 'backPain', read: (d: DayEntry) => num(d.metrics?.backPain) },
  { id: 'bloating', read: (d: DayEntry) => num(d.metrics?.bloating) },
  { id: 'breastTenderness', read: (d: DayEntry) => num(d.metrics?.breastTenderness) },
  { id: 'mood', read: (d: DayEntry) => d.symptoms?.mood },
  { id: 'energy', read: (d: DayEntry) => d.symptoms?.energy },
  { id: 'sleepQuality', read: (d: DayEntry) => num(d.metrics?.sleepQuality) },
  { id: 'stress', read: (d: DayEntry) => num(d.metrics?.stress) },
] as const;
export type ReportMetricId = (typeof REPORT_METRICS)[number]['id'];

function num(v: unknown): number | undefined {
  return typeof v === 'number' ? v : undefined;
}

const FLOW_RANK: Record<Flow, number> = { light: 1, medium: 2, heavy: 3 };

export interface ReportCycle {
  start: ISODate;
  /** Days until the next period started; null for the ongoing cycle. */
  length: number | null;
  periodLength: number;
  heaviestFlow: Flow | null;
  heavyDays: number;
  /** Mean cramps on period days with a value. */
  cramps: number | null;
  painkillerDays: number;
}

export interface ReportMetric {
  id: ReportMetricId;
  days: number;
  mean: number;
  /** Days rated 4–5 (strong). */
  strongDays: number;
  periodMean: number | null;
  otherMean: number | null;
}

export interface Report {
  from: ISODate;
  to: ISODate;
  cycles: ReportCycle[];
  summary: {
    cycles: number;
    avgCycle: number | null;
    minCycle: number | null;
    maxCycle: number | null;
    avgPeriod: number | null;
    loggedDays: number;
  };
  metrics: ReportMetric[];
  medication?: { painkillerDays: number; pillDays: number; notes: { date: ISODate; text: string }[] };
  notes?: { date: ISODate; text: string }[];
}

export interface ReportOptions {
  months: number;
  includeMedication: boolean;
  includeNotes: boolean;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Summary of the last `months` for a doctor's visit, computed only from the user's own logs. */
export function buildReport(
  periods: readonly Period[],
  days: Readonly<Record<ISODate, DayEntry>>,
  today: ISODate,
  { months, includeMedication, includeNotes }: ReportOptions,
): Report {
  const from = addDaysISO(today, -Math.round(months * 30.44));
  const sorted = sortPeriods(periods);
  const inRange = (d: ISODate) => d >= from && d <= today;
  const entries = Object.values(days)
    .filter((d) => inRange(d.date))
    .sort((a, b) => a.date.localeCompare(b.date));

  const cycles: ReportCycle[] = [];
  sorted.forEach((p, i) => {
    if (!inRange(p.start)) return;
    const end = effectiveEnd(p, today);
    const next = sorted[i + 1];
    const periodDays = entries.filter((d) => d.date >= p.start && d.date <= end);
    let heaviest: Flow | null = null;
    for (const d of periodDays) if (d.flow && (!heaviest || FLOW_RANK[d.flow] > FLOW_RANK[heaviest])) heaviest = d.flow;
    const cramps = periodDays.map((d) => d.symptoms?.cramps).filter((v): v is NonNullable<typeof v> => typeof v === 'number');
    cycles.push({
      start: p.start,
      length: next ? diffDays(next.start, p.start) : null,
      periodLength: diffDays(end, p.start) + 1,
      heaviestFlow: heaviest,
      heavyDays: periodDays.filter((d) => d.flow === 'heavy').length,
      cramps: mean(cramps),
      painkillerDays: periodDays.filter((d) => d.metrics?.painkiller === true).length,
    });
  });

  const lengths = cycles.map((c) => c.length).filter((l): l is number => l !== null);
  const avgCycle = mean(lengths);
  const metrics: ReportMetric[] = [];
  for (const m of REPORT_METRICS) {
    const all: number[] = [];
    const inPeriod: number[] = [];
    const outside: number[] = [];
    for (const d of entries) {
      const v = m.read(d);
      if (typeof v !== 'number') continue;
      all.push(v);
      (findPeriodOn(periods, d.date, today) ? inPeriod : outside).push(v);
    }
    if (all.length === 0) continue;
    metrics.push({
      id: m.id,
      days: all.length,
      mean: mean(all)!,
      strongDays: all.filter((v) => v >= 4).length,
      periodMean: mean(inPeriod),
      otherMean: mean(outside),
    });
  }

  const report: Report = {
    from,
    to: today,
    cycles,
    summary: {
      cycles: cycles.length,
      avgCycle: avgCycle === null ? null : Math.round(avgCycle * 10) / 10,
      minCycle: lengths.length ? Math.min(...lengths) : null,
      maxCycle: lengths.length ? Math.max(...lengths) : null,
      avgPeriod: cycles.length ? Math.round((mean(cycles.map((c) => c.periodLength)) ?? 0) * 10) / 10 : null,
      loggedDays: entries.length,
    },
    metrics,
  };
  if (includeMedication) {
    report.medication = {
      painkillerDays: entries.filter((d) => d.metrics?.painkiller === true).length,
      pillDays: entries.filter((d) => d.metrics?.pill === true).length,
      notes: entries.flatMap((d) => (typeof d.metrics?.medication === 'string' && d.metrics.medication.trim() ? [{ date: d.date, text: d.metrics.medication.trim() }] : [])),
    };
  }
  if (includeNotes) report.notes = entries.flatMap((d) => (d.note?.trim() ? [{ date: d.date, text: d.note.trim() }] : []));
  return report;
}
