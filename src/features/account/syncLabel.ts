import type { Messages } from '../../i18n';
import type { SyncStatus } from '../../session/context';

export function syncLabel(sync: SyncStatus, a: Messages['account'], now: number): string {
  if (sync.state === 'off') return '';
  if (sync.state === 'idle') {
    const ago = sync.lastSyncedAt ? Math.round((now - sync.lastSyncedAt) / 60_000) : null;
    return a.status.idle(ago === null ? a.notYet : ago < 1 ? a.justNow : a.minutesAgo(ago));
  }
  return a.status[sync.state];
}
