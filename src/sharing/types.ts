import type { ISODate } from '../domain/dates';
import type { DayEntry, Period } from '../domain/types';

/** What an owner can choose to share. Medication and intimacy trackers are never shareable. */
export type ShareScope = 'cycle' | 'fertile' | 'mood' | 'symptoms' | 'sleep' | 'notes';
export const SHARE_SCOPES: readonly ShareScope[] = ['cycle', 'fertile', 'mood', 'symptoms', 'sleep', 'notes'];
export const DEFAULT_SCOPES: ShareScope[] = ['cycle', 'fertile'];

/** Owner side, kept in the owner's (encrypted, synced) settings. */
export interface OwnedShare {
  id: string;
  /** Share key, base64. */
  key: string;
  scopes: ShareScope[];
  createdAt: number;
  /** Link secret while the invite is open, so the link can be shown again. Removed once accepted. */
  inviteSecret?: string;
  /** Reverse share created while joining someone: approve them automatically once verified. */
  autoApprove?: boolean;
  /** Send a message when a new period is logged as started. */
  notifyPeriodStart?: boolean;
  /** Start date of the last period announced, to announce each one once. */
  lastPeriodNotified?: string;
}

/** Encrypted with the share key by the person joining; proves they had the link. */
export interface PartnerInfo {
  name: string;
  /** Invite to the joiner's own data ("Jaa myös omat tietoni"). */
  reverse?: { id: string; secret: string };
}

/** Partner side, kept in the partner's settings. */
export interface FollowedShare {
  id: string;
  key: string;
}

/** What the partner receives, encrypted with the share key. */
export interface SharedSnapshot {
  v: 1;
  ownerName: string;
  scopes: ShareScope[];
  updatedAt: number;
  periods: Period[];
  days: DayEntry[];
  cycleLengthHint?: number;
  periodLengthHint?: number;
}

export interface SharedCacheEntry {
  data: SharedSnapshot;
  fetchedAt: number;
}

export type SharedCache = Record<string, SharedCacheEntry>;

export type ShareDate = ISODate;
