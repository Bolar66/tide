import { useState, type CSSProperties, type ReactNode } from 'react';
import { IconChevronLeft, IconCloudOff, IconLock, IconUserOff } from '../../components/icons';
import { Stepper } from '../../components/Stepper';
import { parseBackup } from '../../db/backup';
import { addDaysISO } from '../../domain/dates';
import { DEFAULT_CYCLE_LENGTH, DEFAULT_PERIOD_LENGTH } from '../../domain/prediction';
import { useToday } from '../../hooks/useToday';
import { useI18n } from '../../i18n';
import { useStore } from '../../store/context';
import { DEFAULT_TRACKERS } from '../../trackers/registry';
import { AccountComparison, AccountForm } from '../account/AccountForm';
import { RecoveryCode } from '../settings/LockSettings';
import { TrackerSettings } from '../settings/TrackerSettings';
import './onboarding.css';

const STEPS = ['welcome', 'privacy', 'account', 'lastPeriod', 'lengths', 'trackers', 'done'] as const;
type Step = (typeof STEPS)[number];

const PRIVACY_ICONS = [IconUserOff, IconCloudOff, IconLock];

export function Onboarding() {
  const store = useStore();
  const { t } = useI18n();
  const today = useToday();
  const [index, setIndex] = useState(0);
  const [lastStart, setLastStart] = useState('');
  const [cycle, setCycle] = useState(DEFAULT_CYCLE_LENGTH);
  const [period, setPeriod] = useState(DEFAULT_PERIOD_LENGTH);
  const [useDefaults, setUseDefaults] = useState(false);
  const [trackers, setTrackers] = useState<string[]>(DEFAULT_TRACKERS);
  const [accountView, setAccountView] = useState<'choose' | 'create' | 'signin' | { code: string }>('choose');
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

  const step: Step = STEPS[index] ?? 'done';
  const next = () => setIndex((i) => Math.min(i + 1, STEPS.length - 1));
  const back = () => setIndex((i) => Math.max(i - 1, 0));

  const finish = () => {
    store.updateSettings({ enabledTrackers: trackers });
    store.completeOnboarding({
      lastPeriodStart: lastStart && lastStart <= today ? lastStart : undefined,
      ...(useDefaults ? {} : { cycleLength: cycle, periodLength: period }),
    });
  };

  let content: ReactNode;
  let actions: ReactNode;

  switch (step) {
    case 'welcome':
      content = (
        <>
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" className="onboarding__logo" width={112} height={112} />
          <h1 className="onboarding__title display">{t.onboarding.welcomeTitle}</h1>
          <p className="onboarding__text">{t.onboarding.welcomeText}</p>
        </>
      );
      actions = (
        <>
          <button type="button" className="button" onClick={next} disabled={restoreState.busy}>
            {t.onboarding.start}
          </button>
          <label className="button button--ghost">
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
            <p className="error-text onboarding__error" role="alert">
              {restoreState.error}
            </p>
          )}
        </>
      );
      break;

    case 'privacy':
      content = (
        <>
          <h1 className="onboarding__title display">{t.onboarding.privacyTitle}</h1>
          <ul className="onboarding__points">
            {t.onboarding.privacyPoints.map((p, i) => {
              const Icon = PRIVACY_ICONS[i] ?? IconLock;
              return (
                <li key={p.title} className="enter" style={{ '--i': i + 1 } as CSSProperties}>
                  <span className="onboarding__point-icon">
                    <Icon />
                  </span>
                  <span>
                    <strong>{p.title}</strong>
                    <span className="muted">{p.text}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      );
      actions = (
        <button type="button" className="button" onClick={next}>
          {t.common.next}
        </button>
      );
      break;

    case 'account':
      if (accountView === 'choose') {
        content = (
          <>
            <h1 className="onboarding__title display">{t.account.introTitle}</h1>
            <AccountComparison />
          </>
        );
        actions = (
          <>
            <button type="button" className="button" onClick={next}>
              {t.account.continueWithout}
            </button>
            <button type="button" className="button button--secondary" onClick={() => setAccountView('create')}>
              {t.account.create}
            </button>
            <button type="button" className="button button--ghost" onClick={() => setAccountView('signin')}>
              {t.account.haveAccount}
            </button>
          </>
        );
      } else if (typeof accountView === 'object') {
        content = <RecoveryCode code={accountView.code} onContinue={next} />;
        actions = null;
      } else {
        content = (
          <>
            <h1 className="onboarding__title display">{accountView === 'create' ? t.account.create : t.account.signIn}</h1>
            <AccountForm
              key={accountView}
              mode={accountView}
              onSwitch={() => setAccountView(accountView === 'create' ? 'signin' : 'create')}
              // After signing in, sync brings the existing data (and onboarded = true) from the account.
              onDone={(code) => (code ? setAccountView({ code }) : next())}
            />
          </>
        );
        actions = null;
      }
      break;

    case 'lastPeriod':
      content = (
        <>
          <h1 className="onboarding__title display">{t.onboarding.lastPeriodTitle}</h1>
          <p className="onboarding__text">{t.onboarding.lastPeriodText}</p>
          <label className="field onboarding__field">
            {t.onboarding.lastPeriodLabel}
            <input
              className="input"
              type="date"
              value={lastStart}
              min={addDaysISO(today, -120)}
              max={today}
              onChange={(e) => setLastStart(e.target.value)}
            />
          </label>
        </>
      );
      actions = (
        <>
          <button type="button" className="button" onClick={next} disabled={!lastStart}>
            {t.common.next}
          </button>
          <button
            type="button"
            className="button button--ghost"
            onClick={() => {
              setLastStart('');
              next();
            }}
          >
            {t.onboarding.dontRemember}
          </button>
        </>
      );
      break;

    case 'lengths':
      content = (
        <>
          <h1 className="onboarding__title display">{t.onboarding.lengthsTitle}</h1>
          <p className="onboarding__text">{t.onboarding.lengthsText}</p>
          <div className="card onboarding__steppers">
            <Stepper label={t.onboarding.cycleLength} value={cycle} min={18} max={45} unit={t.stats.daysUnit} onChange={setCycle} />
            <Stepper label={t.onboarding.periodLength} value={period} min={1} max={10} unit={t.stats.daysUnit} onChange={setPeriod} />
          </div>
        </>
      );
      actions = (
        <>
          <button
            type="button"
            className="button"
            onClick={() => {
              setUseDefaults(false);
              next();
            }}
          >
            {t.common.next}
          </button>
          <button
            type="button"
            className="button button--ghost"
            onClick={() => {
              setUseDefaults(true);
              next();
            }}
          >
            {t.onboarding.dontKnow}
          </button>
        </>
      );
      break;

    case 'trackers':
      content = (
        <>
          <h1 className="onboarding__title display">{t.onboarding.trackersTitle}</h1>
          <p className="onboarding__text">{t.onboarding.trackersText}</p>
          <TrackerSettings enabled={trackers} onChange={setTrackers} />
        </>
      );
      actions = (
        <button type="button" className="button" onClick={next}>
          {t.common.next}
        </button>
      );
      break;

    case 'done':
      content = (
        <>
          <svg viewBox="0 0 120 60" className="onboarding__waves" aria-hidden>
            <path d="M4 26c9-10 19-10 28 0s19 10 28 0 19-10 28 0 19 10 28 0" />
            <path d="M18 40c7-7 14-7 21 0s14 7 21 0 14-7 21 0 14 7 21 0" />
          </svg>
          <h1 className="onboarding__title display">{t.onboarding.doneTitle}</h1>
          <p className="onboarding__text">{t.onboarding.doneText}</p>
        </>
      );
      actions = (
        <button type="button" className="button" onClick={finish}>
          {t.onboarding.finish}
        </button>
      );
      break;
  }

  return (
    <main className="onboarding">
      <div className="onboarding__top">
        {index > 0 ? (
          <button type="button" className="icon-button icon-button--filled" onClick={back} aria-label={t.common.back}>
            <IconChevronLeft />
          </button>
        ) : (
          <span className="onboarding__spacer" />
        )}
        <ol className="onboarding__dots" aria-label={t.onboarding.step(index + 1, STEPS.length)}>
          {STEPS.map((s, i) => (
            <li key={s} className={i === index ? 'is-active' : i < index ? 'is-done' : ''} />
          ))}
        </ol>
        <span className="onboarding__spacer" />
      </div>

      <section key={step} className={`onboarding__content onboarding__content--${step}`}>
        {content}
      </section>

      <div key={`${step}-actions`} className="onboarding__actions">
        {actions}
      </div>
    </main>
  );
}
