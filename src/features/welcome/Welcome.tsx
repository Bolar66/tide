import { useRef, useState, type CSSProperties } from 'react';
import { BRAND } from '../../brand';
import { IconChevronLeft } from '../../components/icons';
import { Logo } from '../../components/Logo';
import { parseBackup } from '../../db/backup';
import { useI18n } from '../../i18n';
import { useSession } from '../../session/context';
import { useStore } from '../../store/context';
import { AccountForm } from '../account/AccountForm';
import { RecoveryCode } from '../settings/LockSettings';
import { IntroArt } from './IntroArt';
import './welcome.css';

type View = 'hero' | 'intro' | 'signin' | 'create' | { code: string };

interface Props {
  /** first = first launch (then the intro and onboarding); signedOut = after signing out. */
  mode: 'first' | 'signedOut';
  /** first: the intro is done, go to onboarding. signedOut: continue without an account. */
  onContinue: () => void;
  /** Signed in or created an account. */
  onAccount: () => void;
}

/** Calm landing screen with the logo and slow waves: first launch and after signing out. */
export function Welcome({ mode, onContinue, onAccount }: Props) {
  const { t } = useI18n();
  const w = t.welcome;
  const store = useStore();
  const session = useSession();
  const [view, setView] = useState<View>('hero');
  const [restoreState, setRestoreState] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });

  /** New phone: restore everything from a backup file instead of answering the questions. */
  const restore = async (file: File | undefined) => {
    if (!file) return;
    setRestoreState({ busy: true, error: null });
    const r = parseBackup(await file.text());
    if (!r.ok) return setRestoreState({ busy: false, error: t.settings.importErrors[r.error] });
    try {
      await store.importSnapshot(r.data, 'replace');
      store.updateSettings({ onboarded: true });
    } catch (err) {
      console.error(err);
      setRestoreState({ busy: false, error: t.common.saveError });
    }
  };

  if (view === 'intro') return <Intro onDone={onContinue} onBack={() => setView('hero')} />;

  if (view !== 'hero') {
    return (
      <main className="welcome welcome--form">
        <div className="welcome__top">
          <button type="button" className="icon-button icon-button--filled" onClick={() => setView('hero')} aria-label={t.common.back}>
            <IconChevronLeft />
          </button>
        </div>
        <section className="welcome__form enter">
          {typeof view === 'object' ? (
            <RecoveryCode code={view.code} onContinue={onAccount} />
          ) : (
            <>
              <Logo size={56} className="welcome__logo-small" />
              <h1 className="display welcome__form-title">{view === 'create' ? t.account.create : w.signIn}</h1>
              <AccountForm
                key={view}
                mode={view}
                onSwitch={() => setView(view === 'create' ? 'signin' : 'create')}
                onDone={(code) => (code ? setView({ code }) : onAccount())}
              />
            </>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="welcome">
      <section className="welcome__hero">
        <div className="welcome__logo-wrap">
          <span className="welcome__halo" aria-hidden />
          <Logo size={120} className="welcome__logo" />
        </div>
        <h1 className={`welcome__name display ${mode === 'signedOut' ? 'welcome__name--small' : ''}`}>{mode === 'first' ? BRAND.name : w.signedOutTitle}</h1>
        <p className="welcome__tagline">{mode === 'first' ? w.tagline : w.signedOutText}</p>
      </section>

      <div className="welcome__actions">
        {mode === 'first' ? (
          <>
            <button type="button" className="button" onClick={() => setView('intro')} disabled={restoreState.busy}>
              {w.start}
            </button>
            <button type="button" className="button button--secondary" onClick={() => setView('signin')}>
              {w.haveAccount}
            </button>
            <label className="button button--ghost button--small">
              {restoreState.busy ? t.onboarding.restoring : t.onboarding.restore}
              <input
                type="file"
                accept="application/json,.json"
                className="visually-hidden"
                disabled={restoreState.busy}
                onChange={(e) => void restore(e.target.files?.[0])}
              />
            </label>
            {restoreState.error && (
              <p className="error-text" role="alert">
                {restoreState.error}
              </p>
            )}
          </>
        ) : (
          <>
            <button type="button" className="button" onClick={() => setView('signin')}>
              {w.signIn}
            </button>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => {
                session.dismissSignedOut();
                onContinue();
              }}
            >
              {w.continueWithout}
            </button>
          </>
        )}
      </div>

      <WelcomeWaves />
    </main>
  );
}

function WelcomeWaves() {
  const wave = (y: number, amp: number, len: number) => {
    let d = `M0 ${y}`;
    for (let x = 0; x < 800; x += len) d += ` q${len / 4} ${-amp} ${len / 2} 0 t${len / 2} 0`;
    return `${d} V200 H0 Z`;
  };
  return (
    <svg className="welcome__waves" viewBox="0 0 400 200" preserveAspectRatio="none" aria-hidden>
      <path d={wave(70, 16, 200)} className="welcome__wave" style={{ '--t': '18s' } as CSSProperties} />
      <path d={wave(100, 12, 160)} className="welcome__wave welcome__wave--rev" style={{ '--t': '14s' } as CSSProperties} />
      <path d={wave(130, 9, 200)} className="welcome__wave" style={{ '--t': '10s' } as CSSProperties} />
    </svg>
  );
}

/** Four swipeable slides introducing the app. */
function Intro({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const { t } = useI18n();
  const w = t.welcome;
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const last = index === w.slides.length - 1;

  const goTo = (i: number) => {
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <main className="welcome welcome--intro">
      <div className="welcome__top">
        <button type="button" className="icon-button icon-button--filled" onClick={index === 0 ? onBack : () => goTo(index - 1)} aria-label={t.common.back}>
          <IconChevronLeft />
        </button>
        <button type="button" className="button button--ghost button--small" onClick={onDone}>
          {w.skip}
        </button>
      </div>

      <div
        ref={track}
        className="intro__track"
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        }}
      >
        {w.slides.map((slide, i) => (
          <section key={slide.title} className={`intro__slide ${i === index ? 'is-active' : ''}`} aria-label={w.slide(i + 1, w.slides.length)}>
            <IntroArt index={i} />
            <h1 className="display intro__title">{slide.title}</h1>
            <p className="intro__text">{slide.text}</p>
          </section>
        ))}
      </div>

      <div className="welcome__actions">
        <ol className="onboarding__dots intro__dots" aria-hidden>
          {w.slides.map((s, i) => (
            <li key={s.title} className={i === index ? 'is-active' : i < index ? 'is-done' : ''} />
          ))}
        </ol>
        <button type="button" className="button" onClick={() => (last ? onDone() : goTo(index + 1))}>
          {last ? w.begin : w.next}
        </button>
      </div>
    </main>
  );
}
