import { fromBase64, randomBytes, toBase64 } from '../crypto/encoding';
import { kekFromSecret, open, openJSON, seal, sealJSON, type Sealed } from '../crypto/keys';

const ZERO_SALT = new Uint8Array(32);

const b64url = (b: Uint8Array) => toBase64(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (s: string) => fromBase64(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));

export function newShareKey(): string {
  return toBase64(randomBytes(32));
}

/** AES key used for everything shared under one share (snapshot, partner info, later messages). */
export function shareCryptoKey(shareKey: string): Promise<CryptoKey> {
  return kekFromSecret(fromBase64(shareKey), ZERO_SALT, 'tide/share');
}

/** An invite: the share key wrapped with a one-time secret that only travels inside the link. */
export async function createInvite(shareKey: string) {
  const secret = randomBytes(32);
  const kek = await kekFromSecret(secret, ZERO_SALT, 'tide/invite');
  return { secret: b64url(secret), wrapped: await seal(kek, fromBase64(shareKey)) };
}

export async function openInvite(secret: string, wrapped: Sealed): Promise<string> {
  const kek = await kekFromSecret(fromB64url(secret), ZERO_SALT, 'tide/invite');
  return toBase64(await open(kek, wrapped));
}

/** The secret goes after "#", so it is never sent to any server (browsers do not transmit fragments). */
export function inviteLink(baseUrl: string, shareId: string, secret: string): string {
  return `${baseUrl}#/join/${shareId}.${secret}`;
}

export function parseInviteHash(hash: string): { shareId: string; secret: string } | null {
  const m = /^#\/join\/([0-9a-f-]{36})\.([A-Za-z0-9_-]{40,})$/.exec(hash);
  return m ? { shareId: m[1]!, secret: m[2]! } : null;
}

export async function sealForShare<T>(shareKey: string, value: T): Promise<Sealed> {
  return sealJSON(await shareCryptoKey(shareKey), value);
}

export async function openForShare<T>(shareKey: string, sealed: Sealed): Promise<T> {
  return openJSON<T>(await shareCryptoKey(shareKey), sealed);
}
