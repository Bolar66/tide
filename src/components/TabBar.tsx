import type { Route } from '../hooks/useHashRoute';
import { useI18n } from '../i18n';
import { IconCalendar, IconChart, IconSettings, IconWave } from './icons';

const TABS = [
  { route: 'today', Icon: IconWave },
  { route: 'calendar', Icon: IconCalendar },
  { route: 'stats', Icon: IconChart },
  { route: 'settings', Icon: IconSettings },
] as const;

export function TabBar({ route, onNavigate }: { route: Route; onNavigate: (r: Route) => void }) {
  const { t } = useI18n();
  const active = route === 'about' ? 'settings' : route;
  return (
    <nav className="tabbar">
      {TABS.map(({ route: r, Icon }) => (
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
