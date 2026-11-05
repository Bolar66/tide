import { createContext, useContext } from 'react';
import type { AccountInfo } from '../account/service';
import type { LockConfig } from '../crypto/lock';

export type SyncStatus =
  | { state: 'off' }
  | { state: 'idle'; lastSyncedAt: number | null }
  | { state: 'syncing'; lastSyncedAt: number | null }
  | { state: 'offline'; lastSyncedAt: number | null }
  | { state: 'error'; lastSyncedAt: number | null }
  /** The server session ended (e.g. password changed elsewhere): sign in again. */
  | { state: 'signed-out'; lastSyncedAt: number | null };

export interface Session {
  lock: LockConfig | null;
  /** Turn the lock on; resolves with the recovery code to show once. */
  enableLock(pin: string): Promise<string>;
  disableLock(): Promise<void>;
  verifyPin(pin: string): Promise<boolean>;
  changePin(newPin: string): Promise<void>;
  regenerateRecovery(): Promise<string>;
  addPasskey(): Promise<void>;
  removePasskey(): Promise<void>;
  lockNow(): void;

  account: AccountInfo | null;
  sync: SyncStatus;
  /** Resolves with a new recovery code to show, or null when the PIN lock's code is reused. */
  createAccount(email: string, password: string): Promise<string | null>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  deleteAccount(): Promise<void>;
  changePassword(newPassword: string): Promise<void>;
  syncNow(): Promise<void>;
}

export const SessionContext = createContext<Session | null>(null);

export function useSession(): Session {
  const s = useContext(SessionContext);
  if (!s) throw new Error('SessionContext puuttuu');
  return s;
}
