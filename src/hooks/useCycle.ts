import { useMemo } from 'react';
import { calendarMarks } from '../domain/calendar';
import { cycleDay, computeStats, predict } from '../domain/prediction';
import { useTide } from '../store/context';
import { useToday } from './useToday';

/** Derived cycle information shared by the views. */
export function useCycle() {
  const periods = useTide((s) => s.periods);
  const today = useToday();
  return useMemo(() => {
    const stats = computeStats(periods);
    const prediction = predict(periods, stats, today);
    return {
      today,
      periods,
      stats,
      prediction,
      cycleDay: cycleDay(periods, today),
      marks: calendarMarks(periods, prediction.upcoming, today),
    };
  }, [periods, today]);
}
