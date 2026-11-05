import { createContext, useContext } from 'react';
import type { LockConfig } from '../crypto/lock';

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
}

export const SessionContext = createContext<Session | null>(null);

export function useSession(): Session {
  const s = useContext(SessionContext);
  if (!s) throw new Error('SessionContext puuttuu');
  return s;
}
