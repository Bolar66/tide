import { TabBar } from './components/TabBar';
import { AboutView } from './features/about/AboutView';
import { CalendarView } from './features/calendar/CalendarView';
import { Onboarding } from './features/onboarding/Onboarding';
import { SettingsView } from './features/settings/SettingsView';
import { StatsView } from './features/stats/StatsView';
import { TodayView } from './features/today/TodayView';
import { useHashRoute } from './hooks/useHashRoute';
import { useTheme } from './hooks/useTheme';
import { useI18n } from './i18n';
import { useStore, useTide } from './store/context';

export function App() {
  const store = useStore();
  const { t } = useI18n();
  const status = useTide((s) => s.status);
  const theme = useTide((s) => s.settings.theme);
  const onboarded = useTide((s) => s.settings.onboarded);
  const saveError = useTide((s) => s.saveError);
  const [route, navigate] = useHashRoute();
  useTheme(theme);

  if (status === 'loading') return <div className="center-screen" aria-busy="true" />;
  if (status === 'error') return <div className="center-screen">{t.common.loadError}</div>;
  if (!onboarded) return <Onboarding />;

  return (
    <>
      <main className="app">
        {saveError && (
          <div className="banner" role="alert" style={{ marginBottom: 16 }}>
            <span>{t.common.saveError}</span>
            <button type="button" className="button button--ghost button--small" onClick={store.dismissSaveError}>
              {t.common.close}
            </button>
          </div>
        )}
        {route === 'today' && (
          <TodayView
            onOpenCalendar={() => navigate('calendar')}
            onOpenSettings={() => navigate('settings')}
            onOpenTrackers={() => {
              navigate('settings');
              // after the view transition has swapped the page in
              window.setTimeout(() => document.getElementById('trackers')?.scrollIntoView({ behavior: 'smooth' }), 350);
            }}
          />
        )}
        {route === 'calendar' && <CalendarView />}
        {route === 'stats' && <StatsView />}
        {route === 'settings' && <SettingsView onOpenAbout={() => navigate('about')} />}
        {route === 'about' && <AboutView onBack={() => navigate('settings')} />}
      </main>
      <TabBar route={route} onNavigate={navigate} />
    </>
  );
}
