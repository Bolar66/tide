import { useEffect, useRef, useState } from 'react';
import { IconChevronRight, IconDatabase, IconExport, IconImport, IconInfo, IconKey } from '../../components/icons';
import { Segmented } from '../../components/Segmented';
import { Sheet } from '../../components/Sheet';
import { Switch } from '../../components/Switch';
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

export function SettingsView({ onOpenAbout }: { onOpenAbout: () => void }) {
  const store = useStore();
  const { t, f } = useI18n();
  const settings = useTide((s) => s.settings);
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
    <div className="stack stack--lg">
      <header className="page-header">
        <h1 className="display">{t.settings.title}</h1>
      </header>

      <section className="settings-section">
        <h2 className="section-label">{t.account.section}</h2>
        <ul className="list">
          <li>
            <AccountSettings />
          </li>
        </ul>
      </section>

      <SharingSettings />

      <section className="settings-section">
        <h2 className="section-label">{t.settings.appearance}</h2>
        <div className="card">
          <Segmented<ThemeSetting>
            label={t.settings.theme}
            options={themeOptions}
            value={settings.theme}
            onChange={(theme) => store.updateSettings({ theme })}
          />
        </div>
      </section>

      <section className="settings-section">
        <h2 className="section-label">{t.settings.cycle}</h2>
        <ul className="list">
          {settings.ownTracking === false && (
            <li>
              <Switch
                label={t.settings.ownTracking}
                hint={t.settings.ownTrackingHint}
                checked={false}
                onChange={() => store.updateSettings({ ownTracking: true })}
              />
            </li>
          )}
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

      <section className="settings-section">
        <h2 className="section-label">{t.settings.security}</h2>
        <ul className="list">
          <li>
            <LockSettings />
          </li>
        </ul>
      </section>

      <section className="settings-section">
        <h2 className="section-label">{t.settings.data}</h2>
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

      <section className="settings-section">
        <ul className="list">
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
      </section>

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
