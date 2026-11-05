import { TabBar } from './components/TabBar';
import { tabOf, visibleTabs } from './components/tabs';
import { swipeHandlers } from './hooks/useSwipe';
import { isSubPageEntry } from './hooks/useSubPage';
import { AboutView } from './features/about/AboutView';
import { CycleView } from './features/calendar/CycleView';
import { LearnView } from './features/learn/LearnView';
import { Onboarding } from './features/onboarding/Onboarding';
import { SettingsView, SETTINGS_PAGE_KEY } from './features/settings/SettingsView';
import { JoinView } from './features/sharing/JoinView';
import { FollowedCalendar } from './features/followed/FollowedCalendar';
import { FollowedTab } from './features/followed/FollowedCards';
import { FollowerHome } from './features/followed/FollowerHome';
import { TodayView } from './features/today/TodayView';
import { Welcome } from './features/welcome/Welcome';
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
  // First launch: welcome screen and intro, then the onboarding questions.
  const [introDone, setIntroDone] = useState(false);
  const [route, navigate] = useHashRoute();
  const today = useToday();
  useTheme(theme, palette);

  // Close periods whose end was never marked, on start and whenever the day changes.
  useEffect(() => {
    if (status === 'ready') store.autoEnd(today);
  }, [store, status, today]);

  const openTrackers = () => {
    try {
      sessionStorage.setItem(SETTINGS_PAGE_KEY, 'use');
    } catch {
      /* ignore */
    }
    navigate('settings');
    // after the view transition has swapped the page in
    window.setTimeout(() => document.getElementById('trackers')?.scrollIntoView({ behavior: 'smooth' }), 350);
  };

  // Sideways swipes: back out of a sub page, otherwise move to the neighbouring tab.
  const swipe = swipeHandlers((dir) => {
    if (isSubPageEntry()) {
      if (dir === 'right') window.history.back();
      return;
    }
    if (route === 'about') {
      if (dir === 'right') navigate('settings');
      return;
    }
    const tabs = visibleTabs(profile, following);
    const next = tabs[tabs.indexOf(tabOf(route)) + (dir === 'left' ? 1 : -1)];
    if (next) navigate(next);
  });

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
  if (!onboarded) {
    return introDone || session.account ? (
      <Onboarding onBack={() => setIntroDone(false)} />
    ) : (
      <Welcome mode="first" onContinue={() => setIntroDone(true)} onAccount={() => setIntroDone(true)} />
    );
  }
  // Signed out: the data stays on the device; sign in again or continue without an account.
  if (session.signedOut) return <Welcome mode="signedOut" onContinue={() => navigate('today')} onAccount={() => navigate('today')} />;

  return (
    <>
      <main className="app" {...swipe}>
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
        {route === 'calendar' && (profile === 'follower' ? <FollowedCalendar /> : <CycleView key="c" initial="calendar" />)}
        {route === 'stats' && profile === 'own' && <CycleView key="s" initial="stats" />}
        {route === 'followed' && <FollowedTab />}
        {route === 'learn' && <LearnView />}
        {route === 'settings' && <SettingsView onOpenAbout={() => navigate('about')} />}
        {route === 'about' && <AboutView onBack={() => navigate('settings')} />}
      </main>
      <TabBar route={route} onNavigate={navigate} profile={profile} following={following} />
    </>
  );
}
