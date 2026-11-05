import { useMemo } from 'react';
import { calendarMarks } from '../domain/calendar';
import { cycleDay, computeStats, predict } from '../domain/prediction';
import { buildRing } from '../domain/ring';
import { useTide } from '../store/context';
import { useToday } from './useToday';

/** Derived cycle information shared by the views. */
export function useCycle() {
  const periods = useTide((s) => s.periods);
  const cycleHint = useTide((s) => s.settings.cycleLengthHint);
  const periodHint = useTide((s) => s.settings.periodLengthHint);
  const today = useToday();
  return useMemo(() => {
    const stats = computeStats(periods, { cycle: cycleHint, period: periodHint });
    const prediction = predict(periods, stats, today);
    const marks = calendarMarks(periods, prediction.upcoming, today);
    return {
      today,
      periods,
      stats,
      prediction,
      cycleDay: cycleDay(periods, today),
      marks,
      ring: buildRing(periods, stats, marks, today),
      hasHints: cycleHint !== undefined || periodHint !== undefined,
    };
  }, [periods, today, cycleHint, periodHint]);
}
