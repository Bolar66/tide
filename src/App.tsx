import { TabBar } from './components/TabBar';
import { AboutView } from './features/about/AboutView';
import { CalendarView } from './features/calendar/CalendarView';
import { LearnView } from './features/learn/LearnView';
import { Onboarding } from './features/onboarding/Onboarding';
import { SettingsView } from './features/settings/SettingsView';
import { StatsView } from './features/stats/StatsView';
import { JoinView } from './features/sharing/JoinView';
import { FollowedCalendar } from './features/followed/FollowedCalendar';
import { FollowedTab } from './features/followed/FollowedCards';
import { FollowerHome } from './features/followed/FollowerHome';
import { TodayView } from './features/today/TodayView';
import { profileOf } from './domain/profile';
import { useSession } from './session/context';
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
  const palette = useTide((s) => s.settings.palette);
  const onboarded = useTide((s) => s.settings.onboarded);
  const profile = useTide((s) => profileOf(s.settings));
  const session = useSession();
  const following = session.followed.length > 0;
  // An invite link opens the join flow before anything else (also before onboarding).
  const [invite, setInvite] = useState(() => parseInviteHash(window.location.hash));
  // Also when the app is already open and only the "#…" part changes (link opened in the same window).
  useEffect(() => {
    const onHash = () => {
      const found = parseInviteHash(window.location.hash);
      if (found) setInvite(found);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const saveError = useTide((s) => s.saveError);
  const [route, navigate] = useHashRoute();
  const today = useToday();
  useTheme(theme, palette);

  // Close periods whose end was never marked, on start and whenever the day changes.
  useEffect(() => {
    if (status === 'ready') store.autoEnd(today);
  }, [store, status, today]);

  const openTrackers = () => {
    navigate('settings');
    // after the view transition has swapped the page in
    window.setTimeout(() => document.getElementById('trackers')?.scrollIntoView({ behavior: 'smooth' }), 350);
  };

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
        {route === 'today' &&
          (profile === 'follower' ? (
            <FollowerHome onOpenLearn={() => navigate('learn')} onOpenTrackers={openTrackers} />
          ) : (
            <TodayView onOpenCalendar={() => navigate('calendar')} onOpenSettings={() => navigate('settings')} onOpenTrackers={openTrackers} />
          ))}
        {route === 'calendar' && (profile === 'follower' ? <FollowedCalendar /> : <CalendarView />)}
        {route === 'stats' && profile === 'own' && <StatsView />}
        {route === 'followed' && <FollowedTab />}
        {route === 'learn' && <LearnView />}
        {route === 'settings' && <SettingsView onOpenAbout={() => navigate('about')} />}
        {route === 'about' && <AboutView onBack={() => navigate('settings')} />}
      </main>
      <TabBar route={route} onNavigate={navigate} profile={profile} following={following} />
    </>
  );
}
