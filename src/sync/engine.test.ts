import { describe, expect, it } from 'vitest';
import type { Snapshot } from '../db/persistence';
import { deriveDataKeys, generateMasterSecret } from '../crypto/keys';
import { DEFAULT_SETTINGS, type DayEntry } from '../domain/types';
import { EMPTY_SYNC_STATE, syncOnce, type SyncState } from './engine';
import { MemoryServer, type Remote } from './remote';

const empty = (): Snapshot => ({ periods: [], days: [], settings: DEFAULT_SETTINGS });
const day = (date: string, note: string, updatedAt = 1): DayEntry => ({ date, note, updatedAt });

/** A device: local data, its sync state and a server session. */
function device(remote: Remote, enc: CryptoKey) {
  const d = {
    data: empty(),
    state: EMPTY_SYNC_STATE as SyncState,
    async sync() {
      const r = await syncOnce({
        remote,
        enc,
        state: d.state,
        getLocal: () => d.data,
        applyLocal: async (s) => {
          d.data = s;
        },
      });
      d.state = r.state;
      return r;
    },
  };
  return d;
}

let lastServer: MemoryServer | null = null;
async function signedInClient(): Promise<Remote> {
  const r = lastServer!.client();
  await r.signIn('a@example.com', 's');
  return r;
}

async function twoDevices() {
  const server = new MemoryServer();
  lastServer = server;
  const { enc } = await deriveDataKeys(generateMasterSecret());
  const ra = server.client();
  const rb = server.client();
  await ra.signUp('a@example.com', 's');
  await rb.signIn('a@example.com', 's');
  return { server, a: device(ra, enc), b: device(rb, enc) };
}

describe('syncOnce', () => {
  it('uploads on first sync and a second device receives it', async () => {
    const { a, b, server } = await twoDevices();
    a.data = { ...empty(), periods: [{ id: 'p', start: '2026-10-01', end: '2026-10-05' }] };
    expect((await a.sync()).pushed).toBe(true);
    const stored = [...server.snapshots.values()][0]!;
    expect(stored.data).not.toContain('2026-10-01'); // ciphertext only

    const r = await b.sync();
    expect(r.changedLocal).toBe(true);
    expect(b.data.periods).toHaveLength(1);
  });

  it('does nothing when nothing changed', async () => {
    const { a } = await twoDevices();
    a.data = { ...empty(), days: [day('2026-10-01', 'x')] };
    await a.sync();
    expect(await a.sync()).toMatchObject({ pushed: false, changedLocal: false });
  });

  it('converges after both devices edit offline', async () => {
    const { a, b } = await twoDevices();
    a.data = { ...empty(), days: [day('2026-10-01', 'shared')] };
    await a.sync();
    await b.sync();

    a.data = { ...a.data, days: [...a.data.days, day('2026-10-02', 'from A')] };
    b.data = { ...b.data, days: [day('2026-10-01', 'shared'), day('2026-10-03', 'from B')] };
    await a.sync();
    await b.sync(); // merges A's change, pushes
    await a.sync(); // receives B's

    expect(a.data.days.map((d) => d.note)).toEqual(['shared', 'from A', 'from B']);
    expect(b.data).toEqual(a.data);
  });

  it('propagates deletions', async () => {
    const { a, b } = await twoDevices();
    a.data = { ...empty(), days: [day('2026-10-01', 'x'), day('2026-10-02', 'y')] };
    await a.sync();
    await b.sync();
    b.data = { ...b.data, days: [day('2026-10-02', 'y')] };
    await b.sync();
    await a.sync();
    expect(a.data.days.map((d) => d.date)).toEqual(['2026-10-02']);
  });

  it('retries when another device pushes in between, losing nothing', async () => {
    const server = new MemoryServer();
    const { enc } = await deriveDataKeys(generateMasterSecret());
    const ra = server.client();
    await ra.signUp('a@example.com', 's');
    const rb = server.client();
    await rb.signIn('a@example.com', 's');
    const b = device(rb, enc);

    // A's first pull lets B push right after it, so A's push hits a conflict.
    let raced = false;
    const racing: Remote = {
      ...ra,
      async pull() {
        const r = await ra.pull();
        if (!raced) {
          raced = true;
          b.data = { ...empty(), days: [day('2026-10-05', 'from B')] };
          await b.sync();
        }
        return r;
      },
    };
    const a = device(racing, enc);
    a.data = { ...empty(), days: [day('2026-10-06', 'from A')] };
    const r = await a.sync();

    expect(r.pushed).toBe(true);
    expect(a.data.days.map((d) => d.note)).toEqual(['from B', 'from A']);
    await b.sync();
    expect(b.data).toEqual(a.data);
  });

  it('refuses to overwrite data it cannot decrypt', async () => {
    const { a } = await twoDevices();
    a.data = { ...empty(), days: [day('2026-10-01', 'x')] };
    await a.sync();
    const stranger = device(await signedInClient(), (await deriveDataKeys(generateMasterSecret())).enc);
    await expect(stranger.sync()).rejects.toThrow();
  });
});
