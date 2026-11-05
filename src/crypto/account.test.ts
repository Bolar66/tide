import { describe, expect, it } from 'vitest';
import { deriveAccountKeys, normalizeEmail } from './account';
import { generateMasterSecret, open, seal } from './keys';

const IT = 1000;

describe('account keys', () => {
  it('normalizes the email', () => {
    expect(normalizeEmail('  Liisa@Example.COM ')).toBe('liisa@example.com');
  });

  it('is deterministic for the same email and password (new device can derive it)', async () => {
    const a = await deriveAccountKeys('liisa@example.com', 'salasana-123', IT);
    const b = await deriveAccountKeys(' LIISA@example.com', 'salasana-123', IT);
    expect(a.authSecret).toBe(b.authSecret);
    const master = generateMasterSecret();
    expect(await open(b.kek, await seal(a.kek, master))).toEqual(master);
  });

  it('differs per password and per email', async () => {
    const a = await deriveAccountKeys('a@example.com', 'salasana-123', IT);
    expect((await deriveAccountKeys('a@example.com', 'salasana-124', IT)).authSecret).not.toBe(a.authSecret);
    expect((await deriveAccountKeys('b@example.com', 'salasana-123', IT)).authSecret).not.toBe(a.authSecret);
  });

  it('never sends the password itself', async () => {
    const { authSecret } = await deriveAccountKeys('a@example.com', 'salasana-123', IT);
    expect(authSecret).not.toContain('salasana');
    expect(authSecret).toHaveLength(44);
  });
});
