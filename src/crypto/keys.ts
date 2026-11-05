import { fromBase64, randomBytes, toBase64, utf8 } from './encoding';

/**
 * Key hierarchy
 *
 *   master secret (32 random bytes, never stored in the clear)
 *     ├─ HKDF "tide/data-encryption" → AES-GCM key: encrypts every record
 *     └─ HKDF "tide/record-id"       → HMAC key: opaque record ids (dates are not visible in storage)
 *
 * The master secret is stored only wrapped (AES-GCM) by key-encryption keys:
 *   PIN (PBKDF2), recovery code (HKDF), passkey PRF output (HKDF) and, in phase 4, the account password.
 * Changing a PIN therefore re-wraps 32 bytes instead of re-encrypting the data.
 */

export const MASTER_BYTES = 32;
export const PIN_ITERATIONS = 600_000; // OWASP 2023 recommendation for PBKDF2-SHA256

/** AES-GCM ciphertext with its IV, both base64. */
export interface Sealed {
  iv: string;
  data: string;
}

export interface DataKeys {
  enc: CryptoKey;
  mac: CryptoKey;
}

export function generateMasterSecret(): Uint8Array<ArrayBuffer> {
  return randomBytes(MASTER_BYTES);
}

async function hkdf(secret: Uint8Array<ArrayBuffer>, salt: Uint8Array<ArrayBuffer>, info: string, usage: 'aes' | 'hmac') {
  const base = await crypto.subtle.importKey('raw', secret, 'HKDF', false, ['deriveKey']);
  const params = { name: 'HKDF', hash: 'SHA-256', salt, info: utf8.encode(info) };
  return usage === 'aes'
    ? crypto.subtle.deriveKey(params, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
    : crypto.subtle.deriveKey(params, base, { name: 'HMAC', hash: 'SHA-256', length: 256 }, false, ['sign']);
}

export async function deriveDataKeys(master: Uint8Array<ArrayBuffer>): Promise<DataKeys> {
  const salt = new Uint8Array(32);
  const [enc, mac] = await Promise.all([
    hkdf(master, salt, 'tide/data-encryption', 'aes'),
    hkdf(master, salt, 'tide/record-id', 'hmac'),
  ]);
  return { enc, mac };
}

/** Key-encryption key from a short PIN: deliberately slow to make guessing expensive. */
export async function kekFromPin(pin: string, salt: Uint8Array<ArrayBuffer>, iterations = PIN_ITERATIONS): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', utf8.encode(pin), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Key-encryption key from a high-entropy secret (recovery code, passkey PRF output). */
export function kekFromSecret(secret: Uint8Array<ArrayBuffer>, salt: Uint8Array<ArrayBuffer>, info: string): Promise<CryptoKey> {
  return hkdf(secret, salt, info, 'aes');
}

export async function seal(key: CryptoKey, plaintext: Uint8Array<ArrayBuffer>): Promise<Sealed> {
  const iv = randomBytes(12);
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext));
  return { iv: toBase64(iv), data: toBase64(data) };
}

/** Throws if the key is wrong or the data was tampered with (AES-GCM authenticates). */
export async function open(key: CryptoKey, sealed: Sealed): Promise<Uint8Array<ArrayBuffer>> {
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(sealed.iv) }, key, fromBase64(sealed.data));
  return new Uint8Array(plain);
}

export async function sealJSON(key: CryptoKey, value: unknown): Promise<Sealed> {
  return seal(key, utf8.encode(JSON.stringify(value)) as Uint8Array<ArrayBuffer>);
}

export async function openJSON<T>(key: CryptoKey, sealed: Sealed): Promise<T> {
  return JSON.parse(utf8.decode(await open(key, sealed))) as T;
}

/** Deterministic opaque id, so records can be updated in place without revealing their natural key. */
export async function opaqueId(mac: CryptoKey, kind: string, key: string): Promise<string> {
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', mac, utf8.encode(`${kind}:${key}`)));
  return Array.from(sig.slice(0, 16), (b) => b.toString(16).padStart(2, '0')).join('');
}
