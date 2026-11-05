import { addDaysISO, type ISODate } from './dates';
import { effectiveEnd } from './periods';
import type { FertileWindow } from './fertility';
import type { PredictedPeriod } from './prediction';
import type { Period } from './types';

export type DayMark = 'period' | 'predicted' | 'ovulation' | 'fertile';

/** Map of date → mark for drawing the calendar. Priority: logged period > predicted > ovulation > fertile. */
export function calendarMarks(
  periods: readonly Period[],
  predicted: readonly PredictedPeriod[],
  today: ISODate,
  fertile: readonly FertileWindow[] = [],
): Map<ISODate, DayMark> {
  const marks = new Map<ISODate, DayMark>();
  const paint = (start: ISODate, end: ISODate, mark: DayMark) => {
    for (let d = start; d <= end; d = addDaysISO(d, 1)) {
      if (!marks.has(d)) marks.set(d, mark);
    }
  };
  for (const p of periods) paint(p.start, effectiveEnd(p, today), 'period');
  for (const p of predicted) paint(p.start, p.end, 'predicted');
  for (const w of fertile) paint(w.ovulation, w.ovulation, 'ovulation');
  for (const w of fertile) paint(w.start, w.end, 'fertile');
  return marks;
}
