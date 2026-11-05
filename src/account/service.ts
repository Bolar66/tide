import type { TideDB } from '../db/db';
import { deriveAccountKeys, normalizeEmail } from '../crypto/account';
import { open, seal, type Sealed } from '../crypto/keys';
import type { Remote, VaultRow } from '../sync/remote';

export interface AccountInfo {
  userId: string;
  email: string;
}

export class AccountError extends Error {
  constructor(public readonly code: 'no-vault' | 'wrong-key' | 'lock-on') {
    super(code);
  }
}

const ACCOUNT_KEY = 'account';

export async function readAccount(db: TideDB): Promise<AccountInfo | null> {
  return ((await db.meta.get(ACCOUNT_KEY))?.value as AccountInfo | undefined) ?? null;
}

export async function writeAccount(db: TideDB, info: AccountInfo | null) {
  if (info) await db.meta.put({ key: ACCOUNT_KEY, value: info });
  else await db.meta.delete(ACCOUNT_KEY);
}

type Master = Uint8Array<ArrayBuffer>;
type Recovery = { salt: string; wrapped: Sealed };

/** Register, then upload the master secret wrapped with the password-derived key and the recovery code. */
export async function createAccount(remote: Remote, email: string, password: string, master: Master, recovery: Recovery, iterations?: number) {
  const normalized = normalizeEmail(email);
  const keys = await deriveAccountKeys(normalized, password, iterations);
  const user = await remote.signUp(normalized, keys.authSecret);
  const vault: VaultRow = { wrapped_master: await seal(keys.kek, master), recovery };
  await remote.putVault(vault);
  return { userId: user.id, email: normalized } satisfies AccountInfo;
}

/** Sign in on any device and recover the master secret from the server's wrapped copy. */
export async function signInAccount(remote: Remote, email: string, password: string, iterations?: number) {
  const normalized = normalizeEmail(email);
  const keys = await deriveAccountKeys(normalized, password, iterations);
  const user = await remote.signIn(normalized, keys.authSecret);
  const vault = await remote.getVault();
  if (!vault) throw new AccountError('no-vault');
  let master: Master;
  try {
    master = await open(keys.kek, vault.wrapped_master);
  } catch {
    throw new AccountError('wrong-key');
  }
  return { info: { userId: user.id, email: normalized } satisfies AccountInfo, master };
}

/** New password: re-wrap the same master secret, so data and other devices are unaffected. */
export async function changeAccountPassword(remote: Remote, email: string, newPassword: string, master: Master, iterations?: number) {
  const keys = await deriveAccountKeys(email, newPassword, iterations);
  const vault = await remote.getVault();
  if (!vault) throw new AccountError('no-vault');
  await remote.setAuthSecret(keys.authSecret);
  await remote.putVault({ ...vault, wrapped_master: await seal(keys.kek, master) });
}

/** Keep the server's recovery wrapper in sync when a new recovery code is created on the device. */
export async function updateAccountRecovery(remote: Remote, recovery: Recovery) {
  const vault = await remote.getVault();
  if (!vault) throw new AccountError('no-vault');
  await remote.putVault({ ...vault, recovery });
}
