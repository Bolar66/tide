import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { TideDB } from '../db/db';
import { DexiePersistence } from '../db/persistence';
import { DEFAULT_SETTINGS } from '../domain/types';
import { EncryptedPersistence } from './encryptedPersistence';
import { deriveDataKeys } from './keys';
import {
  changePin,
  disableLock,
  enableLock,
  nextBlock,
  readAttempts,
  readLockConfig,
  recordFailure,
  regenerateRecovery,
  unlockWithPin,
  unlockWithRecovery,
} from './lock';
import { generateRecoveryCode, normalizeRecoveryCode } from './recovery';

// Fast KDF for tests; production uses PIN_ITERATIONS.
const IT = 1000;
let n = 0;

async function seeded() {
  const db = new TideDB(`lock-test-${++n}`);
  const plain = new DexiePersistence(db);
  await plain.putPeriod({ id: 'p1', start: '2026-10-07', end: '2026-10-11' });
  await plain.putDay({ date: '2026-10-07', flow: 'heavy', note: 'salainen muistiinpano', updatedAt: 1 });
  await plain.putSettings({ ...DEFAULT_SETTINGS, onboarded: true, cycleLengthHint: 30 });
  return db;
}

describe('recovery code', () => {
  it('has 6 groups of 4 unambiguous characters', () => {
    expect(generateRecoveryCode()).toMatch(/^([0-9A-HJKMNP-TV-Z]{4}-){5}[0-9A-HJKMNP-TV-Z]{4}$/);
  });
  it('accepts sloppy input', () => {
    expect(normalizeRecoveryCode(' abcd efgh-jkmn pqrs tvwx yz0o ')).toBe('ABCDEFGHJKMNPQRSTVWXYZ00');
    expect(normalizeRecoveryCode('il11')).toBeNull();
    expect(normalizeRecoveryCode('ABCD-EFGH-JKMN-PQRS-TVWX-YZ0U')).toBeNull();
  });
});

describe('lock', () => {
  it('encrypts existing data and leaves no plaintext behind', async () => {
    const db = await seeded();
    const { master } = await enableLock(db, '123456', IT);

    expect(await db.periods.count()).toBe(0);
    expect(await db.days.count()).toBe(0);
    expect(await db.settings.count()).toBe(0);
    const raw = JSON.stringify(await db.sealed.toArray());
    expect(raw).not.toContain('2026-10-07');
    expect(raw).not.toContain('salainen');

    const loaded = await new EncryptedPersistence(db, await deriveDataKeys(master)).load();
    expect(loaded.periods).toEqual([{ id: 'p1', start: '2026-10-07', end: '2026-10-11' }]);
    expect(loaded.days[0]?.note).toBe('salainen muistiinpano');
    expect(loaded.settings.cycleLengthHint).toBe(30);
  });

  it('unlocks with the right PIN only', async () => {
    const db = await seeded();
    const { master } = await enableLock(db, '123456', IT);
    const config = (await readLockConfig(db))!;
    expect(await unlockWithPin(config, '123456')).toEqual(master);
    expect(await unlockWithPin(config, '654321')).toBeNull();
  });

  it('recovers with the recovery code and allows a new PIN', async () => {
    const db = await seeded();
    const { recoveryCode, master } = await enableLock(db, '123456', IT);
    const config = (await readLockConfig(db))!;

    const recovered = await unlockWithRecovery(config, recoveryCode.toLowerCase().replace(/-/g, ' '));
    expect(recovered).toEqual(master);
    expect(await unlockWithRecovery(config, generateRecoveryCode())).toBeNull();

    const updated = await changePin(db, config, recovered!, '111111', IT);
    expect(await unlockWithPin(updated, '111111')).toEqual(master);
    expect(await unlockWithPin(updated, '123456')).toBeNull();
  });

  it('invalidates the old recovery code when a new one is made', async () => {
    const db = await seeded();
    const { recoveryCode: old, master } = await enableLock(db, '123456', IT);
    const { config, recoveryCode } = await regenerateRecovery(db, (await readLockConfig(db))!, master);
    expect(await unlockWithRecovery(config, old)).toBeNull();
    expect(await unlockWithRecovery(config, recoveryCode)).toEqual(master);
  });

  it('writes through encrypted persistence and decrypts back on disable', async () => {
    const db = await seeded();
    const { master } = await enableLock(db, '123456', IT);
    const enc = new EncryptedPersistence(db, await deriveDataKeys(master));
    await enc.putDay({ date: '2026-11-05', note: 'uusi', updatedAt: 2 });
    await enc.deleteDay('2026-10-07');

    await disableLock(db, master);
    expect(await readLockConfig(db)).toBeNull();
    expect(await db.sealed.count()).toBe(0);
    const plain = await new DexiePersistence(db).load();
    expect(plain.days.map((d) => d.note)).toEqual(['uusi']);
    expect(plain.periods).toHaveLength(1);
    expect(plain.settings.onboarded).toBe(true);
  });

  it('throttles repeated wrong PINs', async () => {
    const db = await seeded();
    for (let i = 0; i < 4; i++) await recordFailure(db, 0);
    expect((await readAttempts(db)).blockedUntil).toBe(0);
    expect((await recordFailure(db, 0)).blockedUntil).toBe(30_000);
    expect(nextBlock(6, 0)).toBe(60_000);
    expect(nextBlock(50, 0)).toBe(3_600_000);
  });
});
