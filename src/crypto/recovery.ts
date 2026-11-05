import { randomBytes, utf8 } from './encoding';

/** Crockford-style alphabet without look-alikes (no I, L, O, U). 32 symbols = 5 bits each. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const GROUPS = 6;
const GROUP_LEN = 4;

/** 24 symbols × 5 bits = 120 bits, shown as XXXX-XXXX-XXXX-XXXX-XXXX-XXXX. */
export function generateRecoveryCode(): string {
  const bytes = randomBytes(GROUPS * GROUP_LEN);
  const chars = Array.from(bytes, (b) => ALPHABET[b & 31]);
  const groups: string[] = [];
  for (let i = 0; i < GROUPS; i++) groups.push(chars.slice(i * GROUP_LEN, (i + 1) * GROUP_LEN).join(''));
  return groups.join('-');
}

/** Accept the code typed loosely: lower case, spaces, missing dashes, O for 0, I/L for 1. */
export function normalizeRecoveryCode(input: string): string | null {
  const cleaned = input
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
  if (cleaned.length !== GROUPS * GROUP_LEN || [...cleaned].some((c) => !ALPHABET.includes(c))) return null;
  return cleaned;
}

export function recoverySecret(normalized: string): Uint8Array<ArrayBuffer> {
  return utf8.encode(normalized) as Uint8Array<ArrayBuffer>;
}
