import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '../account/config';
import { AuthError, type Remote, type RemoteSnapshot, type RemoteUser, type VaultRow } from './remote';

let clientPromise: Promise<SupabaseClient> | null = null;

/** Loaded on first use, so people without an account never download the Supabase library. */
function client(): Promise<SupabaseClient> {
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'tide.auth' },
    }),
  );
  return clientPromise;
}

function authError(error: { message?: string; status?: number; code?: string } | null): AuthError {
  const msg = error?.message ?? '';
  const code = error?.code ?? '';
  if (code === 'invalid_credentials' || /invalid login/i.test(msg)) return new AuthError('invalid-credentials', msg);
  if (code === 'user_already_exists' || code === 'email_exists' || /already registered/i.test(msg)) return new AuthError('email-taken', msg);
  if (code === 'weak_password') return new AuthError('weak-password', msg);
  if (error?.status === 429 || code === 'over_request_rate_limit') return new AuthError('rate-limited', msg);
  if (/fetch|network/i.test(msg)) return new AuthError('network', msg);
  return new AuthError('unknown', msg);
}

function check<T>(r: { data: T; error: { message: string; code?: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}

const toUser = (u: { id: string; email?: string } | null | undefined): RemoteUser | null => (u ? { id: u.id, email: u.email ?? '' } : null);

export const supabaseRemote: Remote = {
  async currentUser() {
    const { data } = await (await client()).auth.getSession();
    return toUser(data.session?.user);
  },

  async signUp(email, authSecret) {
    const { data, error } = await (await client()).auth.signUp({ email, password: authSecret });
    if (error) throw authError(error);
    if (!data.session) throw new AuthError('unknown', 'Email confirmation is required before signing in');
    return toUser(data.user)!;
  },

  async signIn(email, authSecret) {
    const { data, error } = await (await client()).auth.signInWithPassword({ email, password: authSecret });
    if (error) throw authError(error);
    return toUser(data.user)!;
  },

  async signOut() {
    await (await client()).auth.signOut();
  },

  async setAuthSecret(authSecret) {
    const { error } = await (await client()).auth.updateUser({ password: authSecret });
    if (error) throw authError(error);
  },

  async getVault() {
    const c = await client();
    const rows = check(await c.from('vaults').select('wrapped_master, recovery').limit(1));
    return (rows?.[0] as VaultRow | undefined) ?? null;
  },

  async putVault(vault) {
    const c = await client();
    const { data } = await c.auth.getSession();
    const user_id = data.session?.user.id;
    if (!user_id) throw new AuthError('invalid-credentials', 'not signed in');
    check(await c.from('vaults').upsert({ user_id, ...vault, updated_at: new Date().toISOString() }));
  },

  async pull() {
    const rows = check(await (await client()).from('snapshots').select('version, iv, data').limit(1));
    return (rows?.[0] as RemoteSnapshot | undefined) ?? null;
  },

  async push(expectedVersion, iv, data) {
    const result = check(
      await (await client()).rpc('push_snapshot', { expected_version: expectedVersion, new_iv: iv, new_data: data }),
    );
    return typeof result === 'number' ? result : null;
  },

  async deleteAccount() {
    const c = await client();
    check(await c.rpc('delete_my_account'));
    await c.auth.signOut({ scope: 'local' });
  },
};
