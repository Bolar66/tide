import type { Settings } from './types';

/**
 * How the app is used: tracking one's own cycle, or learning and following what others share
 * ("Haluan ymmärtää ja pysyä mukana"). Older installs stored the latter as ownTracking: false.
 */
export type Profile = 'own' | 'follower';

export function profileOf(settings: Pick<Settings, 'profile' | 'ownTracking'>): Profile {
  return settings.profile ?? (settings.ownTracking === false ? 'follower' : 'own');
}
