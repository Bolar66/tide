import { describe, expect, it } from 'vitest';
import { buildReport } from './report';
import type { DayEntry, Period } from './types';

const periods: Period[] = [
  { id: 'a', start: '2026-07-01', end: '2026-07-05' },
  { id: 'b', start: '2026-07-29', end: '2026-08-02' },
  { id: 'c', start: '2026-08-28', end: '2026-09-01' },
];
const days: Record<string, DayEntry> = {
  '2026-07-01': { date: '2026-07-01', updatedAt: 1, flow: 'heavy', symptoms: { cramps: 4 }, metrics: { painkiller: true } },
  '2026-07-02': { date: '2026-07-02', updatedAt: 1, flow: 'medium', symptoms: { cramps: 2 } },
  '2026-07-15': { date: '2026-07-15', updatedAt: 1, symptoms: { mood: 4 }, note: 'Hyvä päivä', metrics: { libido: 5, sex: 'protected', medication: 'Ibuprofeeni' } },
  '2026-07-29': { date: '2026-07-29', updatedAt: 1, flow: 'light', symptoms: { cramps: 5 } },
};
const today = '2026-09-10';

describe('buildReport', () => {
  const r = buildReport(periods, days, today, { months: 3, includeMedication: false, includeNotes: false });

  it('summarises cycles in the range', () => {
    expect(r.cycles.map((c) => c.start)).toEqual(['2026-07-01', '2026-07-29', '2026-08-28']);
    expect(r.cycles[0]).toMatchObject({ length: 28, periodLength: 5, heaviestFlow: 'heavy', heavyDays: 1, cramps: 3, painkillerDays: 1 });
    expect(r.cycles[2]!.length).toBeNull();
    expect(r.summary).toMatchObject({ cycles: 3, avgCycle: 29, minCycle: 28, maxCycle: 30, avgPeriod: 5 });
  });

  it('reports symptoms with period vs other days', () => {
    const cramps = r.metrics.find((m) => m.id === 'cramps')!;
    expect(cramps).toMatchObject({ days: 3, strongDays: 2, otherMean: null });
    expect(cramps.periodMean).toBeCloseTo(11 / 3);
  });

  it('never includes intimacy, and medication and notes only when asked', () => {
    const text = JSON.stringify(r);
    expect(text).not.toMatch(/libido|sex|protected|Ibuprofeeni|Hyvä päivä/);
    const full = buildReport(periods, days, today, { months: 3, includeMedication: true, includeNotes: true });
    const fullText = JSON.stringify(full);
    expect(fullText).not.toMatch(/libido|"sex"|protected/);
    expect(full.medication).toMatchObject({ painkillerDays: 1, notes: [{ date: '2026-07-15', text: 'Ibuprofeeni' }] });
    expect(full.notes).toEqual([{ date: '2026-07-15', text: 'Hyvä päivä' }]);
  });

  it('respects the time range', () => {
    const short = buildReport(periods, days, today, { months: 1, includeMedication: false, includeNotes: false });
    expect(short.cycles.map((c) => c.start)).toEqual(['2026-08-28']);
  });
});
