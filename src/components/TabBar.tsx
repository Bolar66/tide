import type { Profile } from '../domain/profile';
import type { Route } from '../hooks/useHashRoute';
import { useI18n } from '../i18n';
import { IconBook, IconCalendar, IconChart, IconHeart, IconSettings, IconWave } from './icons';

const ALL = [
  { route: 'today', Icon: IconWave },
  { route: 'calendar', Icon: IconCalendar },
  { route: 'stats', Icon: IconChart },
  { route: 'followed', Icon: IconHeart },
  { route: 'learn', Icon: IconBook },
  { route: 'settings', Icon: IconSettings },
] as const;

interface Props {
  route: Route;
  onNavigate: (r: Route) => void;
  profile: Profile;
  /** Someone shares with this user: own-profile users get the "Seuratut" tab. */
  following: boolean;
}

export function TabBar({ route, onNavigate, profile, following }: Props) {
  const { t } = useI18n();
  const active = route === 'about' ? 'settings' : route === 'stats' ? 'calendar' : route;
  const tabs = ALL.filter(({ route: r }) => {
    // Statistics live under the "Kierto" tab (calendar route) for own-cycle users.
    if (r === 'stats') return false;
    if (r === 'followed') return profile === 'own' && following;
    return true;
  });
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
          <span>{r === 'followed' ? t.followed.tab : r === 'calendar' && profile === 'own' ? t.tabs.cycle : t.tabs[r]}</span>
        </button>
      ))}
    </nav>
  );
}
