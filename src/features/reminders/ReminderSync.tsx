import { useEffect, useMemo } from 'react';
import { planReminders } from '../../domain/reminders';
import { useCycle } from '../../hooks/useCycle';
import { useSession } from '../../session/context';
import { useTide } from '../../store/context';

const SENT_KEY = 'tide.remindersPlan';

/**
 * Keeps the server's reminder schedule in step with the device: recomputed when the settings,
 * the periods or the day change, and sent only when the plan actually differs from the last one.
 */
export function ReminderSync() {
  const session = useSession();
  const settings = useTide((s) => s.settings.reminders);
  const { periods, prediction, today } = useCycle();
  const signedIn = session.account !== null;
  const email = session.account?.email ?? '';

  const plan = useMemo(
    // "now" is taken per day: the plan only needs to change when the date does.
    () => planReminders(settings, periods, prediction.upcoming, today, new Date(`${today}T00:00:00`)),
    [settings, periods, prediction.upcoming, today],
  );
  const items = JSON.stringify(plan);
  // Per account, so signing in with another account sends its own schedule.
  const key = `${email}|${items}`;

  useEffect(() => {
    if (!signedIn) return;
    let last: string | null = null;
    try {
      last = localStorage.getItem(SENT_KEY);
    } catch {
      /* ignore */
    }
    if (last === key) return;
    const timer = window.setTimeout(() => {
      session
        .scheduleReminders(JSON.parse(items) as { at: string; kind: 1 | 2 }[])
        .then(() => {
          try {
            localStorage.setItem(SENT_KEY, key);
          } catch {
            /* ignore */
          }
        })
        .catch((err: unknown) => console.warn('reminders not scheduled', err));
    }, 1500);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, signedIn]);

  return null;
}
