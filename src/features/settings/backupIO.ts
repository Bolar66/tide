import { createBackup } from '../../db/backup';
import type { Snapshot } from '../../db/persistence';
import { todayISO } from '../../domain/dates';

/** sessionStorage flag: open the backup guide when the settings view mounts. */
export const BACKUP_GUIDE_FLAG = 'tide.openBackupGuide';

/**
 * Export via the share sheet where files can be shared (iOS: "Save to Files"),
 * otherwise as a normal download. Resolves false if the user cancelled.
 * Must be called directly from a tap handler: iOS requires a user gesture for share().
 */
export async function exportBackup(snapshot: Snapshot): Promise<boolean> {
  const json = JSON.stringify(createBackup(snapshot), null, 2);
  const name = `tide-varmuuskopio-${todayISO()}.json`;
  const file = new File([json], name, { type: 'application/json' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Tide-varmuuskopio' });
      return true;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return false;
      throw err;
    }
  }

  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
