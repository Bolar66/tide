import { addDaysISO, type ISODate } from './dates';
import { effectiveEnd } from './periods';
import type { PredictedPeriod } from './prediction';
import type { Period } from './types';

export type DayMark = 'period' | 'predicted';

/** Map of date → mark for drawing the calendar. Logged periods win over predictions. */
export function calendarMarks(
  periods: readonly Period[],
  predicted: readonly PredictedPeriod[],
  today: ISODate,
): Map<ISODate, DayMark> {
  const marks = new Map<ISODate, DayMark>();
  const paint = (start: ISODate, end: ISODate, mark: DayMark) => {
    for (let d = start; d <= end; d = addDaysISO(d, 1)) {
      if (!marks.has(d)) marks.set(d, mark);
    }
  };
  for (const p of periods) paint(p.start, effectiveEnd(p, today), 'period');
  for (const p of predicted) paint(p.start, p.end, 'predicted');
  return marks;
}
