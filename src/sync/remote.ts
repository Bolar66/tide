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
}

/** In-memory server with the same semantics as the SQL functions. Used in tests. */
export class MemoryServer {
  users = new Map<string, { id: string; email: string; secret: string }>();
  vaults = new Map<string, VaultRow>();
  snapshots = new Map<string, RemoteSnapshot>();

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
        session = null;
      },
    };
  }
}
