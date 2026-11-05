import type { Route } from '../hooks/useHashRoute';
import { t } from '../i18n/fi';
import { IconCalendar, IconChart, IconSettings, IconWave } from './icons';

const TABS = [
  { route: 'today', label: t.tabs.today, Icon: IconWave },
  { route: 'calendar', label: t.tabs.calendar, Icon: IconCalendar },
  { route: 'stats', label: t.tabs.stats, Icon: IconChart },
  { route: 'settings', label: t.tabs.settings, Icon: IconSettings },
] as const;

export function TabBar({ route, onNavigate }: { route: Route; onNavigate: (r: Route) => void }) {
  return (
    <nav className="tabbar">
      {TABS.map(({ route: r, label, Icon }) => (
        <button
          key={r}
          type="button"
          className="tabbar__item"
          aria-current={route === r ? 'page' : undefined}
          onClick={() => onNavigate(r)}
        >
          <Icon />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
