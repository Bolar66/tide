import { useEffect, useRef, useState } from 'react';
import {
  IconChevronLeft,
  IconChevronRight,
  IconDatabase,
  IconExport,
  IconHeart,
  IconImport,
  IconInfo,
  IconKey,
  IconLock,
  IconSparkle,
  IconSun,
  IconUser,
} from '../../components/icons';
import { useSession } from '../../session/context';
import { Segmented } from '../../components/Segmented';
import { Sheet } from '../../components/Sheet';
import { PalettePicker } from '../../components/PalettePicker';
import { ProfilePicker } from '../../components/ProfilePicker';
import { Switch } from '../../components/Switch';
import { profileOf, type Profile } from '../../domain/profile';
import { useSubPage } from '../../hooks/useSubPage';
import { parseBackup } from '../../db/backup';
import type { Snapshot } from '../../db/persistence';
import { todayISO } from '../../domain/dates';
import type { ThemeSetting } from '../../domain/types';
import { useI18n } from '../../i18n';
import { useStore, useTide } from '../../store/context';
import { BACKUP_GUIDE_FLAG, exportBackup } from './backupIO';
import { BackupGuide } from './BackupGuide';
import { AccountSettings } from '../account/AccountSettings';
import { SharingSettings } from '../sharing/SharingSettings';
import { LockSettings } from './LockSettings';
import { TrackerSettings } from './TrackerSettings';
import './settings.css';

type Page = 'menu' | 'account' | 'use' | 'appearance' | 'security' | 'backup' | 'profile';
const MENU = [
  { page: 'account', Icon: IconHeart },
  { page: 'use', Icon: IconSparkle },
  { page: 'appearance', Icon: IconSun },
  { page: 'security', Icon: IconLock },
  { page: 'backup', Icon: IconExport },
] as const;

/** sessionStorage key: open this settings page on mount (e.g. "Valitse seurattavat" from home). */
export const SETTINGS_PAGE_KEY = 'tide.settingsPage';

export function SettingsView({ onOpenAbout }: { onOpenAbout: () => void }) {
  const store = useStore();
  const { t, f } = useI18n();
  const settings = useTide((s) => s.settings);
  const session = useSession();
  const [initialPage] = useState<Page>(() => {
    try {
      const p = sessionStorage.getItem(SETTINGS_PAGE_KEY) as Page | null;
      sessionStorage.removeItem(SETTINGS_PAGE_KEY);
      if (sessionStorage.getItem(BACKUP_GUIDE_FLAG) === '1') return 'backup';
      return p && ['account', 'use', 'appearance', 'security', 'backup', 'profile'].includes(p) ? p : 'menu';
    } catch {
      return 'menu';
    }
  });
  // Sub pages are history entries: the back swipe returns to the menu, not to another tab.
  const nav = useSubPage<Page>('menu', initialPage);
  const page = nav.page;
  const go = (p: Page) => (p === 'menu' ? nav.back() : nav.go(p));
  const [profileChoice, setProfileChoice] = useState<Profile | null>(null);
  const subtitle = (p: Exclude<Page, 'menu'>): string => {
    switch (p) {
      case 'account':
        return session.account ? `${session.account.email}${session.shares.length + session.followed.length ? ` · ${t.settings.pages.account.sharing(session.shares.length + session.followed.length)}` : ''}` : t.account.rowOff;
      case 'use':
        return t.settings.pages.use.trackers(settings.enabledTrackers.length);
      case 'profile':
        return t.settings.profiles[profileOf(settings)].title;
      case 'appearance':
        return `${t.settings.palettes[settings.palette ?? 'meri']} · ${t.settings.themes[settings.theme]}`;
      case 'security':
        return session.lock ? t.settings.lockOn : t.settings.lockOff;
      case 'backup':
        return settings.lastBackupAt ? t.settings.lastBackup(f.fullDate(todayISO(new Date(settings.lastBackupAt)))) : t.settings.exportHint;
    }
  };
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, setPending] = useState<Snapshot | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [guideOpen, setGuideOpen] = useState(() => {
    // The home screen reminder asks for the guide when no backup has been made yet.
    try {
      const flagged = sessionStorage.getItem(BACKUP_GUIDE_FLAG) === '1';
      sessionStorage.removeItem(BACKUP_GUIDE_FLAG);
      return flagged;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted, () => setPersisted(null));
  }, []);

  const themeOptions = (['system', 'light', 'dark'] as const).map((value) => ({ value, label: t.settings.themes[value] }));

  const doExport = () => {
    exportBackup(store.snapshot())
      .then((done) => {
        if (!done) return;
        store.updateSettings({ lastBackupAt: Date.now() });
        setMessage({ text: t.settings.exportDone });
      })
      .catch((err: unknown) => {
        console.error(err);
        setMessage({ text: String(err), error: true });
      });
  };

  // First backup: show where to save the file before the share sheet opens.
  const onExport = () => (settings.lastBackupAt ? doExport() : setGuideOpen(true));

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const r = parseBackup(await file.text());
    if (fileInput.current) fileInput.current.value = '';
    if (r.ok) {
      setMessage(null);
      setPending(r.data);
    } else {
      setMessage({ text: t.settings.importErrors[r.error], error: true });
    }
  };

  const doImport = async (mode: 'merge' | 'replace') => {
    if (!pending) return;
    if (mode === 'replace' && !window.confirm(t.settings.importReplaceHint)) return;
    try {
      await store.importSnapshot(pending, mode);
      setMessage({ text: t.settings.importDone });
    } catch (err) {
      console.error(err);
      setMessage({ text: String(err), error: true });
    }
    setPending(null);
  };

  return (
    <div key={page} className={`stack stack--lg subpage--${nav.dir}`}>
      {page !== 'menu' && (
        <header className="about-nav">
          <button type="button" className="icon-button icon-button--filled" onClick={nav.back} aria-label={t.common.back}>
            <IconChevronLeft />
          </button>
        </header>
      )}
      <header className="page-header">
        <h1 className="display">{page === 'menu' ? t.settings.title : t.settings.pages[page].title}</h1>
      </header>

      {page === 'menu' && (
        <ul className="list settings-menu">
          {MENU.map(({ page: p, Icon }) => (
            <li key={p}>
              <button type="button" className="list__row" onClick={() => go(p)}>
                <span className="list__icon">
                  <Icon />
                </span>
                <span className="list__text">
                  {t.settings.pages[p].title}
                  <span className="list__sub">{subtitle(p)}</span>
                </span>
                <IconChevronRight className="list__chevron" />
              </button>
            </li>
          ))}
          <li>
            <button type="button" className="list__row" onClick={onOpenAbout}>
              <span className="list__icon">
                <IconInfo />
              </span>
              <span className="list__text">
                {t.settings.about}
                <span className="list__sub">{t.settings.aboutHint}</span>
              </span>
              <IconChevronRight className="list__chevron" />
            </button>
          </li>
        </ul>
      )}

      {/* Changing how the app is used is rare, so it sits apart at the bottom. */}
      {page === 'menu' && (
        <ul className="list settings-menu">
          <li>
            <button type="button" className="list__row" onClick={() => go('profile')}>
              <span className="list__icon">
                <IconUser />
              </span>
              <span className="list__text">
                {t.settings.pages.profile.title}
                <span className="list__sub">{subtitle('profile')}</span>
              </span>
              <IconChevronRight className="list__chevron" />
            </button>
          </li>
        </ul>
      )}

      {page === 'profile' && (
        <section className="settings-section stack">
          {message && <p className="success-text" role="status">{message.text}</p>}
          <p className="muted settings-note">{t.settings.profileIntro}</p>
          <ProfilePicker
            value={profileChoice ?? profileOf(settings)}
            onChange={(p) => {
              setMessage(null);
              setProfileChoice(p === profileOf(settings) ? null : p);
            }}
          />
          {profileChoice && (
            <div
              ref={(el) => el?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              className="card stack settings-confirm"
              role="alertdialog" aria-label={t.settings.profileConfirmTitle}>
              <h2 className="card__title">{t.settings.profileConfirmTitle}</h2>
              <p className="muted">{t.settings.profileConfirmText(t.settings.profiles[profileChoice].title)}</p>
              <button
                type="button"
                className="button"
                onClick={() => {
                  store.updateSettings({ profile: profileChoice });
                  setProfileChoice(null);
                  setMessage({ text: t.settings.profileChanged });
                }}
              >
                {t.settings.profileConfirm}
              </button>
              <button type="button" className="button button--ghost" onClick={() => setProfileChoice(null)}>
                {t.common.cancel}
              </button>
            </div>
          )}
        </section>
      )}

      {page === 'account' && (
        <>
      <section className="settings-section">
        <h2 className="section-label">{t.account.section}</h2>
        <ul className="list">
          <li>
            <AccountSettings />
          </li>
        </ul>
      </section>

          <SharingSettings />
        </>
      )}

      {page === 'use' && (
        <>
      <section className="settings-section">
        <h2 className="section-label">{t.settings.cycle}</h2>
        <ul className="list">
          <li>
            <Switch
              label={t.settings.showFertility}
              hint={t.settings.showFertilityHint}
              checked={settings.showFertility}
              onChange={(showFertility) => store.updateSettings({ showFertility })}
            />
          </li>
        </ul>
      </section>

      <section className="settings-section" id="trackers">
        <h2 className="section-label">{t.settings.trackers}</h2>
        <p className="muted small settings-note">{t.settings.trackersHint}</p>
        <TrackerSettings enabled={settings.enabledTrackers} onChange={(enabledTrackers) => store.updateSettings({ enabledTrackers })} />
      </section>

        </>
      )}

      {page === 'appearance' && (
        <>
      <section className="settings-section">
        <div className="card stack">
          <PalettePicker value={settings.palette ?? 'meri'} onChange={(palette) => store.updateSettings({ palette })} />
          <Segmented<ThemeSetting>
            label={t.settings.theme}
            options={themeOptions}
            value={settings.theme}
            onChange={(theme) => store.updateSettings({ theme })}
          />
        </div>
      </section>

        </>
      )}

      {page === 'security' && (
        <>
      <section className="settings-section">
        <h2 className="section-label">{t.settings.security}</h2>
        <ul className="list">
          <li>
            <LockSettings />
          </li>
        </ul>
      </section>

        </>
      )}

      {page === 'backup' && (
        <>
      <section className="settings-section">
        <ul className="list">
          <li>
            <button type="button" className="list__row" onClick={onExport}>
              <span className="list__icon">
                <IconExport />
              </span>
              <span className="list__text">
                {t.settings.export}
                <span className="list__sub">
                  {settings.lastBackupAt
                    ? t.settings.lastBackup(f.fullDate(todayISO(new Date(settings.lastBackupAt))))
                    : t.settings.exportHint}
                </span>
              </span>
              <IconChevronRight className="list__chevron" />
            </button>
          </li>
          <li>
            <button type="button" className="list__row" onClick={() => setGuideOpen(true)}>
              <span className="list__icon">
                <IconKey />
              </span>
              <span className="list__text">
                {t.settings.guideRow}
                <span className="list__sub">{t.settings.guideHint}</span>
              </span>
              <IconChevronRight className="list__chevron" />
            </button>
          </li>
          <li>
            <label className="list__row">
              <span className="list__icon">
                <IconImport />
              </span>
              <span className="list__text">
                {t.settings.import}
                <span className="list__sub">{t.settings.importHint}</span>
              </span>
              <IconChevronRight className="list__chevron" />
              <input
                ref={fileInput}
                type="file"
                accept="application/json,.json"
                className="visually-hidden"
                onChange={(e) => void onFile(e.target.files?.[0])}
              />
            </label>
          </li>
          <li>
            <div className="list__row">
              <span className="list__icon">
                <IconDatabase />
              </span>
              <span className="list__text">
                {t.settings.storage}
                <span className="list__sub">{persisted ? t.settings.persisted : t.settings.notPersisted}</span>
              </span>
            </div>
          </li>
        </ul>
        {message && (
          <p className={message.error ? 'error-text' : 'success-text'} role="status">
            {message.text}
          </p>
        )}
        <p className="muted small settings-note">{t.settings.backupInfo}</p>
        <p className="muted small settings-note">{t.settings.exportWarning}</p>
      </section>

        </>
      )}

      <BackupGuide
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        onBackup={() => {
          setGuideOpen(false);
          doExport();
        }}
      />

      <Sheet open={pending !== null} onClose={() => setPending(null)} title={t.settings.importTitle}>
        {pending && (
          <div className="stack">
            <p>{t.settings.importSummary(pending.periods.length, pending.days.length)}</p>
            <button type="button" className="button" onClick={() => void doImport('merge')}>
              {t.settings.importMerge}
            </button>
            <p className="muted small">{t.settings.importMergeHint}</p>
            <button type="button" className="button button--danger" onClick={() => void doImport('replace')}>
              {t.settings.importReplace}
            </button>
            <p className="muted small">{t.settings.importReplaceHint}</p>
          </div>
        )}
      </Sheet>
    </div>
  );
}
