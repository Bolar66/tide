import { BRAND } from '../brand';
import { fromBase64, randomBytes, toBase64 } from './encoding';

/**
 * Face ID / Touch ID via a passkey with the WebAuthn PRF extension: the authenticator returns a
 * secret that only exists after biometric verification, which then unwraps the master secret.
 * Supported on iOS/macOS 18+ with iCloud Keychain passkeys, and recent Chrome/Android.
 */

interface PrfResults {
  enabled?: boolean;
  results?: { first?: ArrayBuffer };
}

export class PasskeyUnavailableError extends Error {}

export function passkeysAvailable(): boolean {
  return typeof window !== 'undefined' && 'PublicKeyCredential' in window && !!navigator.credentials;
}

/** Best-effort capability check; when the browser cannot tell, we try and handle the failure. */
export async function prfMaybeSupported(): Promise<boolean> {
  if (!passkeysAvailable()) return false;
  const pkc = window.PublicKeyCredential as unknown as { getClientCapabilities?: () => Promise<Record<string, boolean>> };
  try {
    const caps = await pkc.getClientCapabilities?.();
    if (caps && 'extension:prf' in caps) return caps['extension:prf'] === true;
  } catch {
    /* fall through */
  }
  return true;
}

function prfOf(cred: Credential | null): PrfResults | undefined {
  const pk = cred as PublicKeyCredential | null;
  return (pk?.getClientExtensionResults() as { prf?: PrfResults } | undefined)?.prf;
}

/** Create a passkey and return its id plus the PRF output for `salt`. May prompt twice on some devices. */
export async function createPasskey(salt: Uint8Array<ArrayBuffer>): Promise<{ credentialId: string; secret: Uint8Array<ArrayBuffer> }> {
  if (!passkeysAvailable()) throw new PasskeyUnavailableError();
  const cred = await navigator.credentials.create({
    publicKey: {
      rp: { name: BRAND.name, id: window.location.hostname },
      user: { id: randomBytes(16), name: BRAND.name, displayName: BRAND.name },
      challenge: randomBytes(32),
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
      extensions: { prf: { eval: { first: salt } } } as AuthenticationExtensionsClientInputs,
    },
  });
  const prf = prfOf(cred);
  if (!cred || !prf?.enabled) throw new PasskeyUnavailableError();
  const credentialId = toBase64(new Uint8Array((cred as PublicKeyCredential).rawId));
  const first = prf.results?.first;
  // Some platforms only evaluate PRF during authentication, not registration.
  const secret = first ? new Uint8Array(first) : await passkeySecret(credentialId, salt);
  return { credentialId, secret };
}

export async function passkeySecret(credentialId: string, salt: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  if (!passkeysAvailable()) throw new PasskeyUnavailableError();
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(32),
      rpId: window.location.hostname,
      allowCredentials: [{ type: 'public-key', id: fromBase64(credentialId) }],
      userVerification: 'required',
      extensions: { prf: { eval: { first: salt } } } as AuthenticationExtensionsClientInputs,
    },
  });
  const first = prfOf(assertion)?.results?.first;
  if (!first) throw new PasskeyUnavailableError();
  return new Uint8Array(first);
}
