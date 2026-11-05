import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { App } from '../App';
import { EncryptedPersistence } from '../crypto/encryptedPersistence';
import { deriveDataKeys } from '../crypto/keys';
import * as lock from '../crypto/lock';
import { TideDB } from '../db/db';
import { DexiePersistence } from '../db/persistence';
import { LockScreen } from '../features/lock/LockScreen';
import { StoreContext } from '../store/context';
import { createStore, type Store } from '../store/store';
import { SessionContext, type Session } from './context';

/** Lock again after the app has been in the background this long. */
const AUTO_LOCK_MS = 60_000;

type Phase =
  | { kind: 'checking' }
  | { kind: 'locked'; config: lock.LockConfig }
  | { kind: 'ready'; store: Store; config: lock.LockConfig | null };

const db = new TideDB();

/**
 * Decides what to show before the app: nothing yet, the lock screen, or the app with a store
 * backed by plain or encrypted storage. The master secret lives only in this component's memory.
 */
export function Root() {
  const [phase, setPhase] = useState<Phase>({ kind: 'checking' });
  const master = useRef<Uint8Array<ArrayBuffer> | null>(null);

  const openStore = useCallback(async (config: lock.LockConfig | null, secret: Uint8Array<ArrayBuffer> | null) => {
    master.current = secret;
    const persistence = secret ? new EncryptedPersistence(db, await deriveDataKeys(secret)) : new DexiePersistence(db);
    const store = createStore(persistence);
    await store.load();
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

  const session = useMemo<Session | null>(() => {
    if (phase.kind !== 'ready') return null;
    const { store, config } = phase;
    const setConfig = (next: lock.LockConfig | null) => setPhase({ kind: 'ready', store, config: next });
    const requireLock = () => {
      if (!config || !master.current) throw new Error('Lukko ei ole käytössä');
      return { config, secret: master.current };
    };

    return {
      lock: config,
      async enableLock(pin) {
        const r = await lock.enableLock(db, pin);
        master.current = r.master;
        store.setPersistence(new EncryptedPersistence(db, await deriveDataKeys(r.master)));
        setConfig(r.config);
        return r.recoveryCode;
      },
      async disableLock() {
        const { secret } = requireLock();
        await lock.disableLock(db, secret);
        master.current = null;
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
    };
  }, [phase, lockNow]);

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
