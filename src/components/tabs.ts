import type { Profile } from '../domain/profile';
import type { Route } from '../hooks/useHashRoute';

/** Tab order for the tab bar and for swiping between tabs. */
export function visibleTabs(profile: Profile, following: boolean): Route[] {
  // Statistics live under the "Kierto" tab (calendar route).
  return (['today', 'calendar', 'followed', 'learn', 'settings'] as const).filter(
    (r) => r !== 'followed' || (profile === 'own' && following),
  );
}

/** The tab that is highlighted for a route (pages that live under another tab). */
export const tabOf = (route: Route): Route =>
  route === 'about' ? 'settings' : route === 'stats' || route === 'report' ? 'calendar' : route;
