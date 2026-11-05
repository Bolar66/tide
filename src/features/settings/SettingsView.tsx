import { useEffect, useRef, useState } from 'react';
import { Segmented } from '../../components/Segmented';
import { Sheet } from '../../components/Sheet';
import { parseBackup } from '../../db/backup';
import type { Snapshot } from '../../db/persistence';
import { todayISO } from '../../domain/dates';
import type { ThemeSetting } from '../../domain/types';
import { fullDate, t } from '../../i18n/fi';
import { useStore, useTide } from '../../store/context';
import { exportBackup } from './backupIO';
import './settings.css';

const THEME_OPTIONS = (['system', 'light', 'dark'] as const).map((value) => ({ value, label: t.settings.themes[value] }));

export function SettingsView() {
  const store = useStore();
  const settings = useTide((s) => s.settings);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, setPending] = useState<Snapshot | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted, () => setPersisted(null));
  }, []);

  const onExport = () => {
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
    <div className="stack">
      <header className="page-header">
        <h1>{t.settings.title}</h1>
      </header>

      <section className="card">
        <h2>{t.settings.theme}</h2>
        <Segmented<ThemeSetting>
          label={t.settings.theme}
          options={THEME_OPTIONS}
          value={settings.theme}
          onChange={(theme) => store.updateSettings({ theme })}
        />
      </section>

      <section className="card stack">
        <h2>{t.settings.backup}</h2>
        <p className="muted">{t.settings.backupInfo}</p>
        <p className="settings__meta">
          {settings.lastBackupAt ? t.settings.lastBackup(fullDate(todayISO(new Date(settings.lastBackupAt)))) : t.settings.neverBackedUp}
        </p>
        <button type="button" className="button" onClick={onExport}>
          {t.settings.export}
        </button>
        <p className="muted">{t.settings.exportWarning}</p>
        <label className="button button--secondary">
          {t.settings.import}
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="visually-hidden"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
        </label>
        {message && (
          <p className={message.error ? 'error-text' : 'settings__ok'} role="status">
            {message.text}
          </p>
        )}
      </section>

      <section className="card">
        <h2>{t.settings.storage}</h2>
        <p className="muted">{persisted ? t.settings.persisted : t.settings.notPersisted}</p>
        <p className="muted settings__privacy">{t.settings.privacy}</p>
      </section>

      <p className="settings__version">Tide {__APP_VERSION__}</p>

      <Sheet open={pending !== null} onClose={() => setPending(null)} title={t.settings.importTitle}>
        {pending && (
          <div className="stack">
            <p>{t.settings.importSummary(pending.periods.length, pending.days.length)}</p>
            <button type="button" className="button" onClick={() => void doImport('merge')}>
              {t.settings.importMerge}
            </button>
            <p className="muted">{t.settings.importMergeHint}</p>
            <button type="button" className="button button--danger" onClick={() => void doImport('replace')}>
              {t.settings.importReplace}
            </button>
            <p className="muted">{t.settings.importReplaceHint}</p>
          </div>
        )}
      </Sheet>
    </div>
  );
}
