import type { Route } from '../hooks/useHashRoute';
import { useI18n } from '../i18n';
import { IconBook, IconCalendar, IconChart, IconSettings, IconWave } from './icons';

const TABS = [
  { route: 'today', Icon: IconWave },
  { route: 'calendar', Icon: IconCalendar },
  { route: 'stats', Icon: IconChart },
  { route: 'learn', Icon: IconBook },
  { route: 'settings', Icon: IconSettings },
] as const;

export function TabBar({ route, onNavigate, ownTracking = true }: { route: Route; onNavigate: (r: Route) => void; ownTracking?: boolean }) {
  const { t } = useI18n();
  const active = route === 'about' ? 'settings' : route;
  // Someone who only follows a partner has no own calendar or stats.
  const tabs = ownTracking ? TABS : TABS.filter((tab) => tab.route !== 'calendar' && tab.route !== 'stats');
  return (
    <nav className="tabbar" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
      {tabs.map(({ route: r, Icon }) => (
        <button
          key={r}
          type="button"
          className="tabbar__item"
          aria-current={active === r ? 'page' : undefined}
          onClick={() => onNavigate(r)}
        >
          <Icon />
          <span>{t.tabs[r]}</span>
        </button>
      ))}
    </nav>
  );
}
