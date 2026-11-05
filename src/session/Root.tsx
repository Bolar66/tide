import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { EMPTY_SYNC_STATE, syncOnce } from '../sync/engine';
import { AuthError } from '../sync/remote';
import { supabaseRemote as remote } from '../sync/supabaseRemote';
import { SessionContext, type Session, type SyncStatus } from './context';

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

  const openStore = useCallback(async (config: lock.LockConfig | null, secret: Master | null) => {
    master.current = secret ?? (await lock.readPlainMaster(db));
    const persistence = config && secret ? new EncryptedPersistence(db, await deriveDataKeys(secret)) : new DexiePersistence(db);
    const store = createStore(persistence);
    await store.load();
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
      setSync({ state: 'idle', lastSyncedAt: Date.now() });
    } catch (err) {
      console.error('Synkronointi epäonnistui', err);
      const offline = !navigator.onLine || (err instanceof AuthError && err.code === 'network') || err instanceof TypeError;
      setSync((s) => ({ state: offline ? 'offline' : 'error', lastSyncedAt: 'lastSyncedAt' in s ? s.lastSyncedAt : null }));
    } finally {
      syncing.current = false;
    }
  }, [store, acct]);

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
    };
  }, [phase, lockNow, acct, sync, runSync]);

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
