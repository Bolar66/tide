import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { App } from '../App';
import * as account from '../account/service';
import { EncryptedPersistence } from '../crypto/encryptedPersistence';
import { deriveDataKeys, generateMasterSecret } from '../crypto/keys';
import * as lock from '../crypto/lock';
import { TideDB } from '../db/db';
import { DexiePersistence } from '../db/persistence';
import { LockScreen } from '../features/lock/LockScreen';
import { StoreContext } from '../store/context';
import { createStore, type Store } from '../store/store';
import { todayISO } from '../domain/dates';
import { buildSharedSnapshot } from '../sharing/build';
import { createInvite, inviteLink, newShareKey, openForShare, openInvite, sealForShare } from '../sharing/crypto';
import { ShareError } from '../sharing/errors';
import { parseMessageBody, type Message } from '../sharing/messages';
import { DEFAULT_SCOPES, type SharedCache } from '../sharing/types';
import { EMPTY_SYNC_STATE, syncOnce } from '../sync/engine';
import { canonical } from '../sync/merge';
import { AuthError, type ShareRow } from '../sync/remote';
import { subscribePush, unsubscribePush } from '../sync/push';
import { supabaseRemote as remote } from '../sync/supabaseRemote';
import { SessionContext, type FollowedView, type OwnedShareView, type Session, type SyncStatus } from './context';

const appBaseUrl = () => `${window.location.origin}${import.meta.env.BASE_URL}`;

/** Lock again after the app has been in the background this long. */
const AUTO_LOCK_MS = 60_000;
/** Push local edits this long after the last change. */
const SYNC_DEBOUNCE_MS = 3_000;
/** Background sync while the app is open. */
const SYNC_INTERVAL_MS = 5 * 60_000;

type Master = Uint8Array<ArrayBuffer>;

type Phase =
  | { kind: 'checking' }
  | { kind: 'locked'; config: lock.LockConfig }
  | { kind: 'ready'; store: Store; config: lock.LockConfig | null };

const db = new TideDB();

/**
 * Decides what to show before the app (nothing yet, the lock screen, or the app) and owns the
 * secrets: the master secret lives only in this component's memory (or, with an account and no
 * PIN lock, in plaintext meta like the data itself). Also runs account sync.
 */
export function Root() {
  const [phase, setPhase] = useState<Phase>({ kind: 'checking' });
  const [acct, setAcct] = useState<account.AccountInfo | null>(null);
  const [sync, setSync] = useState<SyncStatus>({ state: 'off' });
  const master = useRef<Master | null>(null);
  const syncing = useRef(false);
  const [shareRows, setShareRows] = useState<ShareRow[]>([]);
  const [partnerNames, setPartnerNames] = useState<Record<string, string | null>>({});
  const [sharedCache, setSharedCache] = useState<SharedCache>({});
  const lastPushed = useRef<Record<string, string>>({});
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesRef = useRef<Message[]>([]);

  const openStore = useCallback(async (config: lock.LockConfig | null, secret: Master | null) => {
    master.current = secret ?? (await lock.readPlainMaster(db));
    const persistence = config && secret ? new EncryptedPersistence(db, await deriveDataKeys(secret)) : new DexiePersistence(db);
    const store = createStore(persistence);
    await store.load();
    setSharedCache(await persistence.loadSharedCache().catch(() => ({})));
    setAcct(await account.readAccount(db));
    setPhase({ kind: 'ready', store, config });
  }, []);

  useEffect(() => {
    lock.readLockConfig(db).then(
      (config) => (config ? setPhase({ kind: 'locked', config }) : openStore(null, null)),
      () => openStore(null, null),
    );
  }, [openStore]);

  const lockNow = useCallback(() => {
    setPhase((p) => {
      if (p.kind !== 'ready' || !p.config) return p;
      master.current = null;
      return { kind: 'locked', config: p.config };
    });
  }, []);

  // Auto-lock after time in the background.
  useEffect(() => {
    if (phase.kind !== 'ready' || !phase.config) return;
    let hiddenAt = 0;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > AUTO_LOCK_MS) lockNow();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [phase, lockNow]);

  const store = phase.kind === 'ready' ? phase.store : null;
  // Re-derive the session (share lists) when settings change.
  const settings = useSyncExternalStore(
    useCallback((cb: () => void) => (store ? store.subscribe(cb) : () => {}), [store]),
    () => store?.getState().settings,
  );

  /**
   * Sharing round after the own sync: push each active share's filtered, encrypted data, pull the
   * data of people this user follows, verify partner names and clean up expired or removed shares.
   */
  const syncShares = useCallback(async (store: Store) => {
    const rows = await remote.listShares();
    const settings = store.getState().settings;
    const owned = settings.shares ?? [];
    const following = settings.following ?? [];
    const names: Record<string, string | null> = {};
    let ownedNext = owned;
    let followingNext = following;

    for (const os of owned) {
      const row = rows.find((r) => r.id === os.id);
      const expired = row?.status === 'invited' && Date.parse(row.expires_at) < Date.now();
      if (!row || expired) {
        if (expired) await remote.deleteShare(os.id);
        ownedNext = ownedNext.filter((x) => x.id !== os.id);
        continue;
      }
      if (row.partner_info) {
        names[os.id] = await openForShare<{ name: string }>(os.key, row.partner_info).then(
          (x) => x.name,
          () => null, // not encrypted with our key: whoever claimed it never had the link
        );
      }
      if (row.status !== 'invited' && os.inviteSecret) {
        ownedNext = ownedNext.map((x) => (x.id === os.id ? { ...x, inviteSecret: undefined } : x));
      }
      if (row.status === 'active') {
        const shared = buildSharedSnapshot(store.snapshot(), os.scopes, settings.displayName ?? '', todayISO());
        const fingerprint = canonical({ ...shared, updatedAt: 0 });
        if (lastPushed.current[os.id] !== fingerprint) {
          const sealed = await sealForShare(os.key, shared);
          await remote.pushShared(os.id, sealed.iv, sealed.data);
          lastPushed.current[os.id] = fingerprint;
        }
      }
    }

    const cache: SharedCache = { ...(await store.getPersistence().loadSharedCache()) };
    for (const fs of following) {
      const row = rows.find((r) => r.id === fs.id);
      if (!row) {
        followingNext = followingNext.filter((x) => x.id !== fs.id);
        delete cache[fs.id];
        continue;
      }
      if (row.status === 'active') {
        const got = await remote.pullShared(fs.id);
        if (got) cache[fs.id] = { data: await openForShare(fs.key, got), fetchedAt: Date.now() };
      }
    }

    if (ownedNext !== owned || followingNext !== following) {
      store.updateSettings({ shares: ownedNext, following: followingNext });
    }
    await store.getPersistence().saveSharedCache(cache);

    // Messages of active shares, decrypted with each share's key; only new ones are fetched.
    const keys = new Map<string, string>([
      ...ownedNext.map((x) => [x.id, x.key] as const),
      ...followingNext.map((x) => [x.id, x.key] as const),
    ]);
    const active = rows.filter((r) => r.status === 'active' && keys.has(r.id)).map((r) => r.id);
    const known = messagesRef.current.filter((m) => active.includes(m.shareId));
    const since = known.length ? known[known.length - 1]!.createdAt : null;
    const me = await remote.currentUserId();
    const fresh: Message[] = [];
    for (const row of await remote.listMessages(active, since)) {
      const raw = await openForShare<unknown>(keys.get(row.share_id)!, row).catch(() => null);
      const body = parseMessageBody(raw);
      if (body) fresh.push({ id: row.id, shareId: row.share_id, fromMe: row.sender_id === me, createdAt: row.created_at, body });
    }
    const seen = new Set(known.map((m) => m.id));
    messagesRef.current = [...known, ...fresh.filter((m) => !seen.has(m.id))];
    setMessages(messagesRef.current);

    setShareRows(rows);
    setPartnerNames(names);
    setSharedCache(cache);
  }, []);

  /** One sync round. Never throws: the outcome is reflected in `sync`. */
  const runSync = useCallback(async () => {
    if (!store || !acct || !master.current || syncing.current) return;
    syncing.current = true;
    setSync((s) => ({ state: 'syncing', lastSyncedAt: 'lastSyncedAt' in s ? s.lastSyncedAt : null }));
    try {
      if (!(await remote.currentUser())) {
        setSync((s) => ({ state: 'signed-out', lastSyncedAt: 'lastSyncedAt' in s ? s.lastSyncedAt : null }));
        return;
      }
      const persistence = store.getPersistence();
      const { enc } = await deriveDataKeys(master.current);
      const result = await syncOnce({
        remote,
        enc,
        state: (await persistence.loadSyncState()) ?? EMPTY_SYNC_STATE,
        getLocal: () => store.snapshot(),
        applyLocal: (s) => store.applySynced(s),
      });
      await persistence.saveSyncState(result.state);
      await syncShares(store);
      setSync({ state: 'idle', lastSyncedAt: Date.now() });
    } catch (err) {
      console.error('Synkronointi epäonnistui', err);
      const offline = !navigator.onLine || (err instanceof AuthError && err.code === 'network') || err instanceof TypeError;
      setSync((s) => ({ state: offline ? 'offline' : 'error', lastSyncedAt: 'lastSyncedAt' in s ? s.lastSyncedAt : null }));
    } finally {
      syncing.current = false;
    }
  }, [store, acct, syncShares]);

  // Sync triggers: on start, back in foreground, online again, after edits and periodically.
  useEffect(() => {
    if (!store || !acct || !master.current) {
      setSync({ state: 'off' });
      return;
    }
    void runSync();
    let timer: number | undefined;
    const soon = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void runSync(), SYNC_DEBOUNCE_MS);
    };
    let last = store.getState();
    const unsubscribe = store.subscribe(() => {
      const s = store.getState();
      if (s.periods !== last.periods || s.days !== last.days || s.settings !== last.settings) soon();
      last = s;
    });
    const onVisible = () => document.visibilityState === 'visible' && void runSync();
    // A push arrived while the app is open: fetch the new message right away.
    const onSwMessage = (e: MessageEvent) => (e.data as { type?: string } | null)?.type === 'tide-push' && void runSync();
    navigator.serviceWorker?.addEventListener('message', onSwMessage);
    const onOnline = () => void runSync();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    const interval = window.setInterval(() => document.visibilityState === 'visible' && void runSync(), SYNC_INTERVAL_MS);
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      navigator.serviceWorker?.removeEventListener('message', onSwMessage);
    };
  }, [store, acct, runSync]);

  const session = useMemo<Session | null>(() => {
    if (phase.kind !== 'ready') return null;
    const { store, config } = phase;
    const setConfig = (next: lock.LockConfig | null) => setPhase({ kind: 'ready', store, config: next });
    const requireLock = () => {
      if (!config || !master.current) throw new Error('Lukko ei ole käytössä');
      return { config, secret: master.current };
    };
    const forgetAccount = async () => {
      await account.writeAccount(db, null);
      await store.getPersistence().saveSyncState(null);
      if (!config) {
        await lock.writePlainMaster(db, null);
        master.current = null;
      }
      setAcct(null);
    };

    return {
      lock: config,
      async enableLock(pin) {
        const r = await lock.enableLock(db, pin, undefined, acct ? (master.current ?? undefined) : undefined);
        master.current = r.master;
        store.setPersistence(new EncryptedPersistence(db, await deriveDataKeys(r.master)));
        if (acct) await account.updateAccountRecovery(remote, r.config.recovery);
        setConfig(r.config);
        return r.recoveryCode;
      },
      async disableLock() {
        const { secret } = requireLock();
        await lock.disableLock(db, secret, acct !== null);
        if (!acct) master.current = null;
        store.setPersistence(new DexiePersistence(db));
        setConfig(null);
      },
      async verifyPin(pin) {
        const { config: c } = requireLock();
        return (await lock.unlockWithPin(c, pin)) !== null;
      },
      async changePin(newPin) {
        const { config: c, secret } = requireLock();
        setConfig(await lock.changePin(db, c, secret, newPin));
      },
      async regenerateRecovery() {
        const { config: c, secret } = requireLock();
        const r = await lock.regenerateRecovery(db, c, secret);
        if (acct) await account.updateAccountRecovery(remote, r.config.recovery);
        setConfig(r.config);
        return r.recoveryCode;
      },
      async addPasskey() {
        const { config: c, secret } = requireLock();
        setConfig(await lock.addPasskey(db, c, secret));
      },
      async removePasskey() {
        const { config: c } = requireLock();
        setConfig(await lock.removePasskey(db, c));
      },
      lockNow,

      account: acct,
      sync,
      async createAccount(email, password) {
        // Reuse the PIN lock's master secret and recovery code when there is one.
        if (config && master.current) {
          const info = await account.createAccount(remote, email, password, master.current, config.recovery);
          await account.writeAccount(db, info);
          setAcct(info);
          return null;
        }
        const secret = master.current ?? generateMasterSecret();
        const { code, recovery } = await lock.newRecoveryFor(secret);
        const info = await account.createAccount(remote, email, password, secret, recovery);
        await lock.writePlainMaster(db, secret);
        await account.writeAccount(db, info);
        master.current = secret;
        setAcct(info);
        return code;
      },
      async signIn(email, password) {
        // Local data under a PIN lock is encrypted with this device's own key; adopting the
        // account's key would need the PIN flow, so ask to turn the lock off first.
        if (config) throw new account.AccountError('lock-on');
        const { info, master: secret } = await account.signInAccount(remote, email, password);
        await lock.writePlainMaster(db, secret);
        await account.writeAccount(db, info);
        await store.getPersistence().saveSyncState(null); // first sync merges both sides
        master.current = secret;
        setAcct(info);
      },
      async signOut() {
        await remote.signOut().catch(() => undefined);
        await forgetAccount();
      },
      async deleteAccount() {
        await remote.deleteAccount();
        await forgetAccount();
      },
      async changePassword(newPassword) {
        if (!acct || !master.current) throw new Error('Ei tiliä');
        await account.changeAccountPassword(remote, acct.email, newPassword, master.current);
      },
      syncNow: runSync,

      shares: (settings?.shares ?? []).map((os): OwnedShareView => {
        const row = shareRows.find((r) => r.id === os.id);
        return {
          id: os.id,
          status: row?.status ?? 'unknown',
          partnerName: partnerNames[os.id] ?? null,
          scopes: os.scopes,
          expiresAt: row?.expires_at ?? null,
          link: os.inviteSecret ? inviteLink(appBaseUrl(), os.id, os.inviteSecret) : null,
        };
      }),
      followed: (settings?.following ?? []).map((fs): FollowedView => {
        const row = shareRows.find((r) => r.id === fs.id);
        const cached = sharedCache[fs.id];
        return {
          id: fs.id,
          status: row?.status === 'active' ? 'active' : row?.status === 'pending' ? 'pending' : cached ? 'active' : 'unknown',
          data: cached?.data ?? null,
          fetchedAt: cached?.fetchedAt ?? null,
        };
      }),
      async createInvite() {
        if (!acct) throw new ShareError('no-account');
        const key = newShareKey();
        const { secret, wrapped } = await createInvite(key);
        const id = await remote.createShare(wrapped);
        const shares = store.getState().settings.shares ?? [];
        store.updateSettings({ shares: [...shares, { id, key, scopes: DEFAULT_SCOPES, createdAt: Date.now(), inviteSecret: secret }] });
        void runSync();
        return inviteLink(appBaseUrl(), id, secret);
      },
      async approveShare(id) {
        await remote.activateShare(id);
        delete lastPushed.current[id];
        await runSync();
      },
      async removeShare(id) {
        await remote.deleteShare(id).catch(() => undefined);
        store.updateSettings({ shares: (store.getState().settings.shares ?? []).filter((x) => x.id !== id) });
        setShareRows((rows) => rows.filter((r) => r.id !== id));
      },
      setShareScopes(id, scopes) {
        store.updateSettings({ shares: (store.getState().settings.shares ?? []).map((x) => (x.id === id ? { ...x, scopes } : x)) });
      },
      async joinShare(shareId, secret, myName) {
        if (!acct) throw new ShareError('no-account');
        const wrapped = await remote.getInvite(shareId);
        if (!wrapped) throw new ShareError('invite-invalid');
        const key = await openInvite(secret, wrapped).catch(() => {
          throw new ShareError('invite-invalid');
        });
        if (!(await remote.acceptInvite(shareId, await sealForShare(key, { name: myName })))) throw new ShareError('invite-invalid');
        const s = store.getState().settings;
        store.updateSettings({
          displayName: myName,
          following: [...(s.following ?? []).filter((x) => x.id !== shareId), { id: shareId, key }],
          // Someone joining from an invite on a fresh install follows a partner and skips own tracking.
          ...(s.onboarded ? {} : { onboarded: true, ownTracking: false }),
        });
        await runSync();
      },
      messages,
      async sendMessage(shareId, body) {
        const key = [...(settings?.shares ?? []), ...(settings?.following ?? [])].find((x) => x.id === shareId)?.key;
        if (!key) throw new Error('unknown share');
        const sealed = await sealForShare(key, body);
        await remote.sendMessage(shareId, sealed.iv, sealed.data);
        await runSync();
      },
      async enablePush() {
        const r = await subscribePush();
        if (typeof r === 'string') return r;
        await remote.savePushSubscription(r);
        return 'on';
      },
      async disablePush() {
        const endpoint = await unsubscribePush();
        if (endpoint) await remote.deletePushSubscription(endpoint).catch(() => undefined);
      },
      async leaveShare(id) {
        await remote.deleteShare(id).catch(() => undefined);
        store.updateSettings({ following: (store.getState().settings.following ?? []).filter((x) => x.id !== id) });
        const cache = { ...sharedCache };
        delete cache[id];
        await store.getPersistence().saveSharedCache(cache);
        setSharedCache(cache);
      },
    };
  }, [phase, lockNow, acct, sync, runSync, shareRows, partnerNames, sharedCache, settings, messages]);

  if (phase.kind === 'checking') return <div className="center-screen" aria-busy="true" />;
  if (phase.kind === 'locked') {
    return <LockScreen db={db} config={phase.config} onUnlock={(secret, config) => openStore(config, secret)} />;
  }
  return (
    <StoreContext.Provider value={phase.store}>
      <SessionContext.Provider value={session}>
        <App />
      </SessionContext.Provider>
    </StoreContext.Provider>
  );
}
