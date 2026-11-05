import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { generateMasterSecret } from '../crypto/keys';
import { newRecoveryFor, unlockWithRecovery } from '../crypto/lock';
import { AuthError, MemoryServer } from '../sync/remote';
import { changeAccountPassword, createAccount, signInAccount } from './service';

const IT = 1000;

describe('account service', () => {
  it('creates an account and recovers the master secret on another device', async () => {
    const server = new MemoryServer();
    const master = generateMasterSecret();
    const { recovery } = await newRecoveryFor(master);
    const info = await createAccount(server.client(), ' Liisa@Example.com ', 'salasana-123', master, recovery, IT);
    expect(info.email).toBe('liisa@example.com');

    const other = await signInAccount(server.client(), 'liisa@example.com', 'salasana-123', IT);
    expect(other.master).toEqual(master);

    // The server holds no password and no usable key.
    const stored = JSON.stringify([...server.users.values(), ...server.vaults.values()]);
    expect(stored).not.toContain('salasana-123');
  });

  it('rejects a wrong password', async () => {
    const server = new MemoryServer();
    const master = generateMasterSecret();
    await createAccount(server.client(), 'a@example.com', 'salasana-123', master, (await newRecoveryFor(master)).recovery, IT);
    await expect(signInAccount(server.client(), 'a@example.com', 'vaara-salasana', IT)).rejects.toBeInstanceOf(AuthError);
  });

  it('changes the password without changing the master secret', async () => {
    const server = new MemoryServer();
    const master = generateMasterSecret();
    const remote = server.client();
    await createAccount(remote, 'a@example.com', 'salasana-123', master, (await newRecoveryFor(master)).recovery, IT);
    await changeAccountPassword(remote, 'a@example.com', 'uusi-salasana-456', master, IT);
    await expect(signInAccount(server.client(), 'a@example.com', 'salasana-123', IT)).rejects.toBeInstanceOf(AuthError);
    expect((await signInAccount(server.client(), 'a@example.com', 'uusi-salasana-456', IT)).master).toEqual(master);
  });

  it('stores a recovery wrapper that opens with the recovery code', async () => {
    const server = new MemoryServer();
    const master = generateMasterSecret();
    const { code, recovery } = await newRecoveryFor(master);
    const remote = server.client();
    await createAccount(remote, 'a@example.com', 'salasana-123', master, recovery, IT);
    const vault = (await remote.getVault())!;
    const config = { version: 1 as const, pin: { salt: '', iterations: 0, wrapped: vault.wrapped_master }, recovery: vault.recovery };
    expect(await unlockWithRecovery(config, code)).toEqual(master);
  });
});
