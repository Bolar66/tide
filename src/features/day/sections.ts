import type { TrackerDef } from '../../trackers/registry';

/** Tabs of the log panel. "all" shows everything on one page (follower wellbeing card). */
export type LogSection = 'cycle' | 'mind' | 'body' | 'life' | 'note';
export const LOG_SECTIONS: readonly LogSection[] = ['cycle', 'mind', 'body', 'life', 'note'];

export const SYMPTOM_SECTION: Record<'cramps' | 'headache' | 'mood' | 'energy', LogSection> = {
  cramps: 'cycle',
  headache: 'cycle',
  mood: 'mind',
  energy: 'mind',
};

/** Which tab each tracker belongs to; cycle-related body signs sit with the period. */
const CYCLE_TRACKERS = new Set(['discharge', 'breastTenderness', 'backPain', 'bloating', 'bbt']);
export function trackerSection(def: TrackerDef): LogSection {
  if (CYCLE_TRACKERS.has(def.id)) return 'cycle';
  if (def.group === 'mind' || def.group === 'sleep') return 'mind';
  if (def.group === 'body' || def.group === 'food') return 'body';
  return 'life';
}

