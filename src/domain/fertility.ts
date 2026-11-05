import { addDaysISO, type ISODate } from './dates';
import type { Prediction } from './prediction';

/**
 * The luteal phase (ovulation → next period) is the most stable part of the cycle, ~14 days.
 * Counting back from the expected next period is the standard calendar-method estimate.
 * It is an estimate only and must never be presented as suitable for contraception.
 */
export const LUTEAL_LENGTH = 14;
/** Sperm survive up to ~5 days, the egg ~1 day. */
export const DAYS_BEFORE_OVULATION = 5;
export const DAYS_AFTER_OVULATION = 1;

export interface FertileWindow {
  start: ISODate;
  ovulation: ISODate;
  end: ISODate;
}

export function fertileWindowBefore(nextPeriodStart: ISODate): FertileWindow {
  const ovulation = addDaysISO(nextPeriodStart, -LUTEAL_LENGTH);
  return {
    start: addDaysISO(ovulation, -DAYS_BEFORE_OVULATION),
    ovulation,
    end: addDaysISO(ovulation, DAYS_AFTER_OVULATION),
  };
}

/**
 * Windows for the current cycle and the predicted ones after it. The current cycle uses the
 * nominal expected start (not the "late" anchor), so a late period does not drag the window forward.
 */
export function fertileWindows(prediction: Prediction): FertileWindow[] {
  if (!prediction.expectedStart) return [];
  return [prediction.expectedStart, ...prediction.upcoming.slice(1).map((p) => p.start)].map(fertileWindowBefore);
}
