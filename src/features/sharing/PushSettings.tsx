import { useEffect, useState } from 'react';
import { Switch } from '../../components/Switch';
import { useI18n } from '../../i18n';
import { useSession } from '../../session/context';
import { currentSubscription, isIOS, isStandalone, pushSupported } from '../../sync/push';

/** Device-level push toggle, shown with the partner settings. */
export function PushSettings() {
  const { t } = useI18n();
  const p = t.push;
  const session = useSession();
  const [on, setOn] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void currentSubscription().then((s) => setOn(s !== null && Notification.permission === 'granted'));
  }, []);

  const needsHomeScreen = isIOS() && !isStandalone();
  if (!session.account) return null;

  return (
    <>
      <ul className="list">
        <li>
          <Switch
            label={p.toggle}
            hint={p.hint}
            checked={on}
            onChange={async (next) => {
              if (busy) return;
              setBusy(true);
              setNote(null);
              try {
                if (next) {
                  const r = await session.enablePush();
                  setOn(r === 'on');
                  if (r === 'denied') setNote(p.denied);
                  if (r === 'unsupported') setNote(needsHomeScreen ? p.iosHomeScreen : p.unsupported);
                } else {
                  await session.disablePush();
                  setOn(false);
                }
              } catch (err) {
                console.error(err);
                setNote(p.failed);
              } finally {
                setBusy(false);
              }
            }}
          />
        </li>
      </ul>
      {(note || needsHomeScreen || !pushSupported()) && (
        <p className="muted small settings-note">{note ?? (needsHomeScreen ? p.iosHomeScreen : p.unsupported)}</p>
      )}
    </>
  );
}
