import { TabBar } from './components/TabBar';
import { CalendarView } from './features/calendar/CalendarView';
import { SettingsView } from './features/settings/SettingsView';
import { StatsView } from './features/stats/StatsView';
import { TodayView } from './features/today/TodayView';
import { useHashRoute } from './hooks/useHashRoute';
import { useTheme } from './hooks/useTheme';
import { t } from './i18n/fi';
import { useStore, useTide } from './store/context';

export function App() {
  const store = useStore();
  const status = useTide((s) => s.status);
  const theme = useTide((s) => s.settings.theme);
  const saveError = useTide((s) => s.saveError);
  const [route, navigate] = useHashRoute();
  useTheme(theme);

  if (status === 'loading') return <div className="center-screen">{t.common.loading}</div>;
  if (status === 'error') return <div className="center-screen">{t.common.loadError}</div>;

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
        {route === 'today' && <TodayView onOpenSettings={() => navigate('settings')} />}
        {route === 'calendar' && <CalendarView />}
        {route === 'stats' && <StatsView />}
        {route === 'settings' && <SettingsView />}
      </main>
      <TabBar route={route} onNavigate={navigate} />
    </>
  );
}
