import type { Sealed } from '../crypto/keys';

export interface RemoteSnapshot {
  version: number;
  iv: string;
  data: string;
}

/** Key material stored on the server; both parts are ciphertext only the user can open. */
export interface VaultRow {
  wrapped_master: Sealed;
  recovery: { salt: string; wrapped: Sealed };
}

export interface ShareRow {
  id: string;
  owner_id: string;
  partner_id: string | null;
  status: 'invited' | 'pending' | 'active';
  partner_info: Sealed | null;
  expires_at: string;
  created_at: string;
}

export interface SharedRow {
  iv: string;
  data: string;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  share_id: string;
  sender_id: string;
  iv: string;
  data: string;
  created_at: string;
}

export interface RemoteUser {
  id: string;
  email: string;
}

export class AuthError extends Error {
  constructor(
    public readonly code: 'invalid-credentials' | 'email-taken' | 'weak-password' | 'rate-limited' | 'network' | 'unknown',
    message?: string,
  ) {
    super(message ?? code);
  }
}

/** Everything the app needs from the server. Implemented by Supabase and by an in-memory fake for tests. */
export interface Remote {
  currentUser(): Promise<RemoteUser | null>;
  signUp(email: string, authSecret: string): Promise<RemoteUser>;
  signIn(email: string, authSecret: string): Promise<RemoteUser>;
  signOut(): Promise<void>;
  setAuthSecret(authSecret: string): Promise<void>;
  getVault(): Promise<VaultRow | null>;
  putVault(vault: VaultRow): Promise<void>;
  pull(): Promise<RemoteSnapshot | null>;
  /** Returns the new version, or null when someone else pushed first. */
  push(expectedVersion: number, iv: string, data: string): Promise<number | null>;
  deleteAccount(): Promise<void>;

  // --- Sharing (phase 5) ---
  createShare(wrappedKey: Sealed): Promise<string>;
  /** Shares where this user is the owner or the partner. */
  listShares(): Promise<ShareRow[]>;
  activateShare(id: string): Promise<void>;
  deleteShare(id: string): Promise<void>;
  getInvite(id: string): Promise<Sealed | null>;
  acceptInvite(id: string, info: Sealed): Promise<boolean>;
  pushShared(id: string, iv: string, data: string): Promise<void>;
  pullShared(id: string): Promise<SharedRow | null>;
  sendMessage(shareId: string, iv: string, data: string): Promise<void>;
  /** Messages of the given shares created after `since` (ISO), oldest first. */
  listMessages(shareIds: string[], since: string | null): Promise<MessageRow[]>;
  currentUserId(): Promise<string | null>;
  savePushSubscription(sub: { endpoint: string; p256dh: string; auth: string }): Promise<void>;
  deletePushSubscription(endpoint: string): Promise<void>;
  /** The only plaintext the user puts on the server: their display name, for notifications. */
  setDisplayName(name: string): Promise<void>;
  /** Replace this user's upcoming reminders (times and kinds only). */
  setReminders(items: { at: string; kind: 1 | 2 }[]): Promise<void>;
}

/** In-memory server with the same semantics as the SQL functions. Used in tests. */
export class MemoryServer {
  users = new Map<string, { id: string; email: string; secret: string }>();
  vaults = new Map<string, VaultRow>();
  reminders = new Map<string, { at: string; kind: 1 | 2 }[]>();
  snapshots = new Map<string, RemoteSnapshot>();
  shares = new Map<string, ShareRow & { wrapped_key: Sealed }>();
  shared = new Map<string, SharedRow>();
  messages: MessageRow[] = [];
  push = new Map<string, { user: string; p256dh: string; auth: string }>();
  now = () => Date.now();

  client(): Remote {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const server = this;
    let session: RemoteUser | null = null;
    const uid = () => {
      if (!session) throw new AuthError('invalid-credentials', 'not signed in');
      return session.id;
    };
    return {
      async currentUser() {
        return session;
      },
      async signUp(email, secret) {
        if ([...server.users.values()].some((u) => u.email === email)) throw new AuthError('email-taken');
        const user = { id: crypto.randomUUID(), email, secret };
        server.users.set(user.id, user);
        session = { id: user.id, email };
        return session;
      },
      async signIn(email, secret) {
        const user = [...server.users.values()].find((u) => u.email === email && u.secret === secret);
        if (!user) throw new AuthError('invalid-credentials');
        session = { id: user.id, email };
        return session;
      },
      async signOut() {
        session = null;
      },
      async setAuthSecret(secret) {
        server.users.get(uid())!.secret = secret;
      },
      async getVault() {
        return server.vaults.get(uid()) ?? null;
      },
      async putVault(v) {
        server.vaults.set(uid(), v);
      },
      async pull() {
        return server.snapshots.get(uid()) ?? null;
      },
      async push(expected, iv, data) {
        const cur = server.snapshots.get(uid());
        if ((cur?.version ?? 0) !== expected) return null;
        const version = expected + 1;
        server.snapshots.set(uid(), { version, iv, data });
        return version;
      },
      async deleteAccount() {
        const id = uid();
        server.users.delete(id);
        server.vaults.delete(id);
        server.snapshots.delete(id);
        for (const [sid, row] of server.shares) {
          if (row.owner_id === id || row.partner_id === id) {
            server.shares.delete(sid);
            server.shared.delete(sid);
          }
        }
        session = null;
      },

      async createShare(wrapped) {
        const id = crypto.randomUUID();
        server.shares.set(id, {
          id,
          owner_id: uid(),
          partner_id: null,
          status: 'invited',
          partner_info: null,
          wrapped_key: wrapped,
          expires_at: new Date(server.now() + 24 * 3600_000).toISOString(),
          created_at: new Date(server.now()).toISOString(),
        });
        return id;
      },
      async listShares() {
        const me = uid();
        return [...server.shares.values()]
          .filter((r) => r.owner_id === me || r.partner_id === me)
          .map(({ wrapped_key: _w, ...row }) => row);
      },
      async activateShare(id) {
        const row = server.shares.get(id);
        if (row && row.owner_id === uid() && row.status === 'pending') row.status = 'active';
      },
      async deleteShare(id) {
        const row = server.shares.get(id);
        if (row && (row.owner_id === uid() || row.partner_id === uid())) {
          server.shares.delete(id);
          server.shared.delete(id);
        }
      },
      async getInvite(id) {
        const row = server.shares.get(id);
        const ok = row && row.status === 'invited' && !row.partner_id && Date.parse(row.expires_at) > server.now() && row.owner_id !== uid();
        return ok ? row.wrapped_key : null;
      },
      async acceptInvite(id, info) {
        const row = server.shares.get(id);
        if (!row || row.status !== 'invited' || row.partner_id || Date.parse(row.expires_at) <= server.now() || row.owner_id === uid()) return false;
        Object.assign(row, { partner_id: uid(), status: 'pending', partner_info: info });
        return true;
      },
      async pushShared(id, iv, data) {
        const row = server.shares.get(id);
        if (!row || row.owner_id !== uid() || row.status !== 'active') throw new Error('permission denied');
        server.shared.set(id, { iv, data, updated_at: new Date(server.now()).toISOString() });
      },
      async sendMessage(shareId, iv, data) {
        const row = server.shares.get(shareId);
        const me = uid();
        if (!row || row.status !== 'active' || (row.owner_id !== me && row.partner_id !== me)) throw new Error('permission denied');
        server.messages.push({ id: crypto.randomUUID(), share_id: shareId, sender_id: me, iv, data, created_at: new Date(server.now()).toISOString() });
      },
      async listMessages(shareIds, since) {
        const me = uid();
        const allowed = new Set(
          shareIds.filter((id) => {
            const r = server.shares.get(id);
            return r && r.status === 'active' && (r.owner_id === me || r.partner_id === me);
          }),
        );
        return server.messages.filter((m) => allowed.has(m.share_id) && (!since || m.created_at > since));
      },
      async currentUserId() {
        return session?.id ?? null;
      },
      async savePushSubscription(sub) {
        server.push.set(sub.endpoint, { user: uid(), p256dh: sub.p256dh, auth: sub.auth });
      },
      async setDisplayName() {
        uid();
      },
      async setReminders(items) {
        server.reminders.set(uid(), items);
      },
      async deletePushSubscription(endpoint) {
        if (server.push.get(endpoint)?.user === uid()) server.push.delete(endpoint);
      },
      async pullShared(id) {
        const row = server.shares.get(id);
        if (!row || row.partner_id !== uid() || row.status !== 'active') return null;
        return server.shared.get(id) ?? null;
      },
    };
  }
}
