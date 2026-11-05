import type { TideDB } from '../db/db';
import { DexiePersistence, type Snapshot } from '../db/persistence';
import { fromBase64, randomBytes, toBase64 } from './encoding';
import { EncryptedPersistence, openSnapshot, sealSnapshot } from './encryptedPersistence';
import { deriveDataKeys, generateMasterSecret, kekFromPin, kekFromSecret, open, PIN_ITERATIONS, seal, type Sealed } from './keys';
import { createPasskey, passkeySecret } from './passkey';
import { generateRecoveryCode, normalizeRecoveryCode, recoverySecret } from './recovery';

export const PIN_LENGTH = 6;

export interface LockConfig {
  version: 1;
  pin: { salt: string; iterations: number; wrapped: Sealed };
  recovery: { salt: string; wrapped: Sealed };
  passkey?: { credentialId: string; salt: string; wrapped: Sealed };
}

export interface Attempts {
  failures: number;
  /** Epoch ms before which no PIN attempt is accepted. */
  blockedUntil: number;
}

const LOCK_KEY = 'lock';
const ATTEMPTS_KEY = 'pinAttempts';
const RECOVERY_INFO = 'tide/recovery-kek';
const PASSKEY_INFO = 'tide/passkey-kek';

type Master = Uint8Array<ArrayBuffer>;

export async function readLockConfig(db: TideDB): Promise<LockConfig | null> {
  return ((await db.meta.get(LOCK_KEY))?.value as LockConfig | undefined) ?? null;
}

async function wrapWithPin(master: Master, pin: string, iterations: number) {
  const salt = randomBytes(16);
  return { salt: toBase64(salt), iterations, wrapped: await seal(await kekFromPin(pin, salt, iterations), master) };
}

async function wrapWithRecovery(master: Master) {
  const code = generateRecoveryCode();
  const salt = randomBytes(16);
  const kek = await kekFromSecret(recoverySecret(normalizeRecoveryCode(code)!), salt, RECOVERY_INFO);
  return { code, recovery: { salt: toBase64(salt), wrapped: await seal(kek, master) } };
}

/**
 * Turn the lock on: create a master secret, wrap it with the PIN and a new recovery code,
 * encrypt the current data and remove the plaintext copy, all in one transaction.
 */
export async function enableLock(db: TideDB, pin: string, iterations = PIN_ITERATIONS, existingMaster?: Master) {
  // With an account the master secret already exists (it also unlocks the cloud copy): reuse it.
  const master = existingMaster ?? generateMasterSecret();
  const keys = await deriveDataKeys(master);
  const plainPersistence = new DexiePersistence(db);
  const plaintext = await plainPersistence.load();
  const syncState = await plainPersistence.loadSyncState();
  const [pinPart, { code, recovery }, rows] = await Promise.all([
    wrapWithPin(master, pin, iterations),
    wrapWithRecovery(master),
    sealSnapshot(keys, plaintext),
  ]);
  const config: LockConfig = { version: 1, pin: pinPart, recovery };

  await db.transaction('rw', [db.meta, db.sealed, db.periods, db.days, db.settings], async () => {
    await db.sealed.clear();
    await db.sealed.bulkPut(rows);
    await db.meta.put({ key: LOCK_KEY, value: config });
    await db.meta.delete(ATTEMPTS_KEY);
    await db.meta.delete(ACCOUNT_MASTER_KEY);
    await plainPersistence.saveSyncState(null);
    await Promise.all([db.periods.clear(), db.days.clear(), db.settings.clear()]);
  });
  if (syncState) await new EncryptedPersistence(db, keys).saveSyncState(syncState);
  return { config, master, recoveryCode: code };
}

/**
 * Decrypt everything back into the plaintext tables and forget the lock. Needs the unlocked master secret.
 * With `keepMaster` (an account exists) the master secret stays on the device, as unprotected as the data.
 */
export async function disableLock(db: TideDB, master: Master, keepMaster = false) {
  const keys = await deriveDataKeys(master);
  const snapshot: Snapshot = await openSnapshot(keys, await db.sealed.toArray());
  const syncState = await new EncryptedPersistence(db, keys).loadSyncState();
  await db.transaction('rw', [db.meta, db.sealed, db.periods, db.days, db.settings], async () => {
    await Promise.all([db.periods.clear(), db.days.clear(), db.settings.clear()]);
    await db.periods.bulkPut(snapshot.periods);
    await db.days.bulkPut(snapshot.days);
    await db.settings.bulkPut(Object.entries(snapshot.settings).map(([key, value]) => ({ key, value })));
    await db.sealed.clear();
    await db.meta.delete(LOCK_KEY);
    await db.meta.delete(ATTEMPTS_KEY);
    if (keepMaster) await db.meta.put({ key: ACCOUNT_MASTER_KEY, value: toBase64(master) });
    if (syncState) await db.meta.put({ key: 'syncState', value: syncState });
  });
}

/** Master secret kept in plaintext meta when an account exists but the PIN lock is off. */
export const ACCOUNT_MASTER_KEY = 'accountMaster';

export async function readPlainMaster(db: TideDB): Promise<Master | null> {
  const v = (await db.meta.get(ACCOUNT_MASTER_KEY))?.value;
  return typeof v === 'string' ? fromBase64(v) : null;
}

export async function writePlainMaster(db: TideDB, master: Master | null) {
  if (master) await db.meta.put({ key: ACCOUNT_MASTER_KEY, value: toBase64(master) });
  else await db.meta.delete(ACCOUNT_MASTER_KEY);
}

/** Wrap an existing master secret with a fresh recovery code (e.g. when creating an account without a PIN lock). */
export async function newRecoveryFor(master: Master) {
  return wrapWithRecovery(master);
}

/** Returns the master secret, or null for a wrong PIN. */
export async function unlockWithPin(config: LockConfig, pin: string): Promise<Master | null> {
  try {
    const kek = await kekFromPin(pin, fromBase64(config.pin.salt), config.pin.iterations);
    return await open(kek, config.pin.wrapped);
  } catch {
    return null;
  }
}

export async function unlockWithRecovery(config: LockConfig, input: string): Promise<Master | null> {
  const code = normalizeRecoveryCode(input);
  if (!code) return null;
  try {
    const kek = await kekFromSecret(recoverySecret(code), fromBase64(config.recovery.salt), RECOVERY_INFO);
    return await open(kek, config.recovery.wrapped);
  } catch {
    return null;
  }
}

export async function unlockWithPasskey(config: LockConfig): Promise<Master | null> {
  if (!config.passkey) return null;
  const secret = await passkeySecret(config.passkey.credentialId, fromBase64(config.passkey.salt));
  try {
    const kek = await kekFromSecret(secret, fromBase64(config.passkey.salt), PASSKEY_INFO);
    return await open(kek, config.passkey.wrapped);
  } catch {
    return null;
  }
}

async function saveConfig(db: TideDB, config: LockConfig) {
  await db.meta.put({ key: LOCK_KEY, value: config });
  return config;
}

export async function changePin(db: TideDB, config: LockConfig, master: Master, newPin: string, iterations = PIN_ITERATIONS) {
  await db.meta.delete(ATTEMPTS_KEY);
  return saveConfig(db, { ...config, pin: await wrapWithPin(master, newPin, iterations) });
}

export async function regenerateRecovery(db: TideDB, config: LockConfig, master: Master) {
  const { code, recovery } = await wrapWithRecovery(master);
  return { config: await saveConfig(db, { ...config, recovery }), recoveryCode: code };
}

export async function addPasskey(db: TideDB, config: LockConfig, master: Master) {
  const salt = randomBytes(32);
  const { credentialId, secret } = await createPasskey(salt);
  const kek = await kekFromSecret(secret, salt, PASSKEY_INFO);
  return saveConfig(db, { ...config, passkey: { credentialId, salt: toBase64(salt), wrapped: await seal(kek, master) } });
}

export async function removePasskey(db: TideDB, config: LockConfig) {
  const rest = { ...config };
  delete rest.passkey;
  return saveConfig(db, rest);
}

// ---------- Throttling wrong PINs ----------

/** Free attempts, then an escalating wait: 30 s, 1 min, 5 min, 15 min, 1 h… */
const FREE_ATTEMPTS = 5;
const DELAYS_MS = [30_000, 60_000, 300_000, 900_000, 3_600_000];

export function nextBlock(failures: number, now: number): number {
  if (failures < FREE_ATTEMPTS) return 0;
  const delay = DELAYS_MS[Math.min(failures - FREE_ATTEMPTS, DELAYS_MS.length - 1)]!;
  return now + delay;
}

export async function readAttempts(db: TideDB): Promise<Attempts> {
  return ((await db.meta.get(ATTEMPTS_KEY))?.value as Attempts | undefined) ?? { failures: 0, blockedUntil: 0 };
}

export async function recordFailure(db: TideDB, now = Date.now()): Promise<Attempts> {
  const prev = await readAttempts(db);
  const failures = prev.failures + 1;
  const next = { failures, blockedUntil: nextBlock(failures, now) };
  await db.meta.put({ key: ATTEMPTS_KEY, value: next });
  return next;
}

export async function resetAttempts(db: TideDB) {
  await db.meta.delete(ATTEMPTS_KEY);
}
