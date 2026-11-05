import { TabBar } from './components/TabBar';
import { AboutView } from './features/about/AboutView';
import { CalendarView } from './features/calendar/CalendarView';
import { LearnView } from './features/learn/LearnView';
import { Onboarding } from './features/onboarding/Onboarding';
import { SettingsView } from './features/settings/SettingsView';
import { StatsView } from './features/stats/StatsView';
import { JoinView } from './features/sharing/JoinView';
import { HomeView } from './features/today/HomeView';
import { parseInviteHash } from './sharing/crypto';
import { useEffect, useState } from 'react';
import { useHashRoute } from './hooks/useHashRoute';
import { useToday } from './hooks/useToday';
import { useTheme } from './hooks/useTheme';
import { useI18n } from './i18n';
import { useStore, useTide } from './store/context';

export function App() {
  const store = useStore();
  const { t } = useI18n();
  const status = useTide((s) => s.status);
  const theme = useTide((s) => s.settings.theme);
  const onboarded = useTide((s) => s.settings.onboarded);
  const ownTracking = useTide((s) => s.settings.ownTracking !== false);
  // An invite link opens the join flow before anything else (also before onboarding).
  const [invite, setInvite] = useState(() => parseInviteHash(window.location.hash));
  const saveError = useTide((s) => s.saveError);
  const [route, navigate] = useHashRoute();
  const today = useToday();
  useTheme(theme);

  // Close periods whose end was never marked, on start and whenever the day changes.
  useEffect(() => {
    if (status === 'ready') store.autoEnd(today);
  }, [store, status, today]);

  if (status === 'loading') return <div className="center-screen" aria-busy="true" />;
  if (status === 'error') return <div className="center-screen">{t.common.loadError}</div>;
  if (invite) {
    return (
      <JoinView
        shareId={invite.shareId}
        secret={invite.secret}
        onDone={() => {
          window.history.replaceState(null, '', window.location.pathname);
          setInvite(null);
        }}
      />
    );
  }
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
          <HomeView
            onOpenCalendar={() => navigate('calendar')}
            onOpenSettings={() => navigate('settings')}
            onOpenTrackers={() => {
              navigate('settings');
              // after the view transition has swapped the page in
              window.setTimeout(() => document.getElementById('trackers')?.scrollIntoView({ behavior: 'smooth' }), 350);
            }}
          />
        )}
        {route === 'calendar' && ownTracking && <CalendarView />}
        {route === 'stats' && ownTracking && <StatsView />}
        {route === 'learn' && <LearnView />}
        {route === 'settings' && <SettingsView onOpenAbout={() => navigate('about')} />}
        {route === 'about' && <AboutView onBack={() => navigate('settings')} />}
      </main>
      <TabBar route={route} onNavigate={navigate} ownTracking={ownTracking} />
    </>
  );
}
