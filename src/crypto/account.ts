import { toBase64, utf8 } from './encoding';
import { kekFromSecret, PIN_ITERATIONS } from './keys';

/**
 * Account password handling, so that the server never learns anything that can decrypt data:
 *
 *   password ──PBKDF2(salt = SHA-256("tide:" + email))──► password key (never leaves the device)
 *      ├─ HKDF "tide/account-auth" → auth secret: sent to Supabase *as the password*
 *      └─ HKDF "tide/account-kek"  → key-encryption key: wraps the master secret
 *
 * HKDF outputs are independent, so knowing the auth secret (as the server does after login)
 * reveals nothing about the key-encryption key. The salt is derived from the email so a new
 * device can compute the same keys without asking the server first.
 */

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function passwordKey(email: string, password: string, iterations: number): Promise<Uint8Array<ArrayBuffer>> {
  const salt = new Uint8Array(await crypto.subtle.digest('SHA-256', utf8.encode(`tide:${normalizeEmail(email)}`)));
  const base = await crypto.subtle.importKey('raw', utf8.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, base, 256);
  return new Uint8Array(bits);
}

export interface AccountKeys {
  /** Goes to Supabase Auth instead of the real password. */
  authSecret: string;
  /** Wraps / unwraps the master secret. Stays on the device. */
  kek: CryptoKey;
}

export async function deriveAccountKeys(email: string, password: string, iterations = PIN_ITERATIONS): Promise<AccountKeys> {
  const pk = await passwordKey(email, password, iterations);
  const zeroSalt = new Uint8Array(32);
  const base = await crypto.subtle.importKey('raw', pk, 'HKDF', false, ['deriveBits']);
  const authBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: zeroSalt, info: utf8.encode('tide/account-auth') },
    base,
    256,
  );
  return {
    authSecret: toBase64(new Uint8Array(authBits)),
    kek: await kekFromSecret(pk, zeroSalt, 'tide/account-kek'),
  };
}
