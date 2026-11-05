import { LUTEAL_LENGTH } from './fertility';

export type Phase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal' | 'late';

export interface PhaseInput {
  /** 1-based day of the current cycle. */
  cycleDay: number;
  /** Expected cycle length (own average or fallback). */
  cycleLength: number;
  /** Whether today is inside a logged period. */
  inPeriod: boolean;
}

/**
 * 1-based cycle day of the estimated ovulation: LUTEAL_LENGTH days before the next cycle's
 * day 1 (= cycleLength + 1). Must agree with fertileWindowBefore().
 */
export function ovulationDay(cycleLength: number): number {
  return Math.max(1, cycleLength + 1 - LUTEAL_LENGTH);
}

export function cyclePhase({ cycleDay, cycleLength, inPeriod }: PhaseInput): Phase {
  if (inPeriod) return 'menstrual';
  if (cycleDay > cycleLength) return 'late';
  const ov = ovulationDay(cycleLength);
  if (Math.abs(cycleDay - ov) <= 1) return 'ovulation';
  return cycleDay < ov ? 'follicular' : 'luteal';
}
