import { useMemo } from 'react';
import { deriveCycle } from '../domain/cycleSummary';
import { findPatternWarnings } from '../domain/patterns';
import { useTide } from '../store/context';
import { useToday } from './useToday';

/** Derived cycle information for the user's own data. Recomputed only when its inputs change. */
export function useCycle() {
  const periods = useTide((s) => s.periods);
  const days = useTide((s) => s.days);
  const cycleHint = useTide((s) => s.settings.cycleLengthHint);
  const periodHint = useTide((s) => s.settings.periodLengthHint);
  const showFertility = useTide((s) => s.settings.showFertility);
  const today = useToday();

  const base = useMemo(
    () => deriveCycle({ periods, today, cycleHint, periodHint, showFertility }),
    [periods, today, cycleHint, periodHint, showFertility],
  );

  // Day entries change often (every tap); keep the pattern scan separate from the rest.
  const warnings = useMemo(() => findPatternWarnings(base.periods, days, base.stats, today), [base, days, today]);

  return { ...base, warnings };
}
