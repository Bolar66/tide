import { Logo } from '../../components/Logo';
import { Segmented } from '../../components/Segmented';
import { Stepper } from '../../components/Stepper';
import { Switch } from '../../components/Switch';
import { DEFAULT_REMINDERS, type ReminderSettings as Settings } from '../../domain/reminders';
import { useI18n } from '../../i18n';
import { useSession } from '../../session/context';
import { useStore, useTide } from '../../store/context';
import { PushSettings } from '../sharing/PushSettings';

/** Reminder choices. Needs an account: iPhone web apps can only be woken up by a server push. */
export function ReminderSettings({ onOpenAccount }: { onOpenAccount: () => void }) {
  const { t } = useI18n();
  const r = t.reminders;
  const store = useStore();
  const session = useSession();
  const value = useTide((s) => s.settings.reminders) ?? DEFAULT_REMINDERS;
  const update = (patch: Partial<Settings>) => store.updateSettings({ reminders: { ...value, ...patch } });

  if (!session.account) {
    return (
      <section className="settings-section stack">
        <p className="muted settings-note">{r.needsAccount}</p>
        <button type="button" className="button" onClick={onOpenAccount}>
          {r.openAccount}
        </button>
      </section>
    );
  }

  const anyOn = value.log.mode !== 'off' || value.headsUp.on;
  return (
    <>
      <section className="settings-section">
        <h2 className="section-label">{r.device}</h2>
        <PushSettings />
      </section>

      <section className="settings-section">
        <h2 className="section-label">{r.logTitle}</h2>
        <div className="card stack">
          <Segmented
            label={r.logTitle}
            options={(['off', 'daily', 'period'] as const).map((v) => ({ value: v, label: r.logModes[v] }))}
            value={value.log.mode}
            onChange={(mode) => update({ log: { ...value.log, mode } })}
          />
          <p className="muted small">{r.logHints[value.log.mode]}</p>
          {value.log.mode !== 'off' && (
            <label className="field reminder-time">
              {r.time}
              <input
                className="input"
                type="time"
                value={value.log.time}
                onChange={(e) => e.target.value && update({ log: { ...value.log, time: e.target.value } })}
              />
            </label>
          )}
        </div>
      </section>

      <section className="settings-section">
        <h2 className="section-label">{r.headsUpTitle}</h2>
        <ul className="list">
          <li>
            <Switch label={r.headsUpToggle} hint={r.headsUpHint} checked={value.headsUp.on} onChange={(on) => update({ headsUp: { ...value.headsUp, on } })} />
          </li>
        </ul>
        {value.headsUp.on && (
          <div className="card stack reminder-headsup">
            <Stepper
              label={r.daysBefore}
              value={value.headsUp.daysBefore}
              min={1}
              max={5}
              unit={t.stats.daysUnit}
              onChange={(daysBefore) => update({ headsUp: { ...value.headsUp, daysBefore } })}
            />
            <label className="field reminder-time">
              {r.time}
              <input
                className="input"
                type="time"
                value={value.headsUp.time}
                onChange={(e) => e.target.value && update({ headsUp: { ...value.headsUp, time: e.target.value } })}
              />
            </label>
          </div>
        )}
      </section>

      {anyOn && (
        <section className="settings-section">
          <h2 className="section-label">{r.previewTitle}</h2>
          <div className="notification-preview" aria-hidden>
            <Logo size={38} className="notification-preview__icon" />
            <div>
              <p className="notification-preview__app">
                Tide <span>{r.now}</span>
              </p>
              <p>{value.log.mode !== 'off' ? r.sampleLog : r.sampleHeadsUp}</p>
            </div>
          </div>
        </section>
      )}

      <p className="muted small settings-note">{r.privacy}</p>
    </>
  );
}
