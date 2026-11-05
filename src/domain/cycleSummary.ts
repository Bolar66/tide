import { calendarMarks } from './calendar';
import type { ISODate } from './dates';
import { fertileWindows, nextOvulation } from './fertility';
import { findPeriodOn } from './periods';
import { cyclePhase } from './phases';
import { computeStats, cycleDay as getCycleDay, predict } from './prediction';
import { buildRing } from './ring';
import type { Period } from './types';

export interface CycleInput {
  periods: readonly Period[];
  today: ISODate;
  cycleHint?: number;
  periodHint?: number;
  showFertility: boolean;
}

/** Everything the home screen derives from periods. Pure, so it works for own and for shared data. */
export function deriveCycle({ periods, today, cycleHint, periodHint, showFertility }: CycleInput) {
  const stats = computeStats(periods, { cycle: cycleHint, period: periodHint });
  const prediction = predict(periods, stats, today);
  const fertile = showFertility ? fertileWindows(prediction) : [];
  const marks = calendarMarks(periods, prediction.upcoming, today, fertile);
  const cycleDay = getCycleDay(periods, today);
  const inPeriod = findPeriodOn(periods, today, today) !== undefined;
  const phase = cycleDay === null ? null : cyclePhase({ cycleDay, cycleLength: stats.avgCycle, inPeriod });
  return {
    today,
    periods,
    stats,
    prediction,
    fertile,
    ovulation: nextOvulation(fertile, today),
    marks,
    cycleDay,
    inPeriod,
    phase,
    ring: buildRing(periods, stats, marks, today),
    hasHints: cycleHint !== undefined || periodHint !== undefined,
  };
}

export type CycleSummary = ReturnType<typeof deriveCycle>;
