import { createContext, useContext } from 'react';
import type { AccountInfo } from '../account/service';
import type { LockConfig } from '../crypto/lock';
import type { Message, MessageBody } from '../sharing/messages';
import type { SharedSnapshot, ShareScope } from '../sharing/types';

export interface OwnedShareView {
  id: string;
  status: 'invited' | 'pending' | 'active' | 'unknown';
  /** Partner's name, decrypted with the share key; null if it cannot be verified. */
  partnerName: string | null;
  scopes: ShareScope[];
  expiresAt: string | null;
  link: string | null;
}

export interface FollowedView {
  id: string;
  status: 'pending' | 'active' | 'unknown';
  data: SharedSnapshot | null;
  fetchedAt: number | null;
}

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

  shares: OwnedShareView[];
  followed: FollowedView[];
  /** Create an invite and return the link (secret in the fragment). */
  createInvite(): Promise<string>;
  approveShare(id: string): Promise<void>;
  /** Reject a request, cancel an invite or stop sharing. */
  removeShare(id: string): Promise<void>;
  setShareScopes(id: string, scopes: ShareScope[]): void;
  joinShare(shareId: string, secret: string, myName: string): Promise<void>;
  leaveShare(id: string): Promise<void>;

  /** Messages of all active shares, oldest first. */
  messages: Message[];
  sendMessage(shareId: string, body: MessageBody): Promise<void>;

  /** Turn push notifications on for this device; resolves with the outcome. */
  enablePush(): Promise<'on' | 'denied' | 'unsupported'>;
  disablePush(): Promise<void>;
}

export const SessionContext = createContext<Session | null>(null);

export function useSession(): Session {
  const s = useContext(SessionContext);
  if (!s) throw new Error('SessionContext puuttuu');
  return s;
}
