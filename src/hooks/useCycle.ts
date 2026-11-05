import { useMemo } from 'react';
import { calendarMarks } from '../domain/calendar';
import { fertileWindows, nextOvulation } from '../domain/fertility';
import { findPatternWarnings } from '../domain/patterns';
import { findPeriodOn } from '../domain/periods';
import { cyclePhase } from '../domain/phases';
import { cycleDay as getCycleDay, computeStats, predict } from '../domain/prediction';
import { buildRing } from '../domain/ring';
import { useTide } from '../store/context';
import { useToday } from './useToday';

/** Derived cycle information shared by the views. Recomputed only when its inputs change. */
export function useCycle() {
  const periods = useTide((s) => s.periods);
  const days = useTide((s) => s.days);
  const cycleHint = useTide((s) => s.settings.cycleLengthHint);
  const periodHint = useTide((s) => s.settings.periodLengthHint);
  const showFertility = useTide((s) => s.settings.showFertility);
  const today = useToday();

  const base = useMemo(() => {
    const stats = computeStats(periods, { cycle: cycleHint, period: periodHint });
    const prediction = predict(periods, stats, today);
    const fertile = showFertility ? fertileWindows(prediction) : [];
    const marks = calendarMarks(periods, prediction.upcoming, today, fertile);
    const cycleDay = getCycleDay(periods, today);
    const phase =
      cycleDay === null
        ? null
        : cyclePhase({ cycleDay, cycleLength: stats.avgCycle, inPeriod: findPeriodOn(periods, today, today) !== undefined });
    return {
      today,
      periods,
      stats,
      prediction,
      fertile,
      ovulation: nextOvulation(fertile, today),
      marks,
      cycleDay,
      phase,
      ring: buildRing(periods, stats, marks, today),
      hasHints: cycleHint !== undefined || periodHint !== undefined,
    };
  }, [periods, today, cycleHint, periodHint, showFertility]);

  // Day entries change often (every tap); keep the pattern scan separate from the rest.
  const warnings = useMemo(() => findPatternWarnings(base.periods, days, base.stats, today), [base, days, today]);

  return { ...base, warnings };
}
