import { describe, expect, it } from 'vitest';
import type { Snapshot } from '../db/persistence';
import { DEFAULT_SETTINGS } from '../domain/types';
import { buildSharedSnapshot } from './build';
import { createInvite, inviteLink, newShareKey, openForShare, openInvite, parseInviteHash, sealForShare } from './crypto';

const snapshot: Snapshot = {
  periods: [{ id: 'p', start: '2026-10-20', end: '2026-10-24' }],
  days: [
    {
      date: '2026-10-21',
      updatedAt: 1,
      flow: 'heavy',
      note: 'yksityinen',
      symptoms: { cramps: 4, mood: 2, energy: 3, headache: 2 },
      metrics: { stress: 4, sleepHours: 6, sex: 'unprotected', libido: 4, painkiller: true, medication: 'x', skin: ['dry'] },
    },
  ],
  settings: { ...DEFAULT_SETTINGS, cycleLengthHint: 30 },
};

describe('buildSharedSnapshot', () => {
  it('shares only cycle data by default scopes', () => {
    const s = buildSharedSnapshot(snapshot, ['cycle', 'fertile'], 'Liisa', '2026-11-05', 1);
    expect(s.periods).toHaveLength(1);
    expect(s.days).toEqual([{ date: '2026-10-21', updatedAt: 1, flow: 'heavy' }]);
    expect(s.cycleLengthHint).toBe(30);
  });

  it('adds mood, symptoms, sleep and notes only when chosen', () => {
    const s = buildSharedSnapshot(snapshot, ['mood', 'symptoms', 'sleep', 'notes'], 'Liisa', '2026-11-05', 1);
    expect(s.periods).toEqual([]);
    expect(s.days[0]).toEqual({
      date: '2026-10-21',
      updatedAt: 1,
      note: 'yksityinen',
      symptoms: { mood: 2, energy: 3, cramps: 4, headache: 2 },
      metrics: { stress: 4, skin: ['dry'], sleepHours: 6 },
    });
  });

  it('never shares intimacy or medication, whatever is chosen', () => {
    const s = buildSharedSnapshot(snapshot, ['cycle', 'fertile', 'mood', 'symptoms', 'sleep', 'notes'], 'Liisa', '2026-11-05', 1);
    const json = JSON.stringify(s);
    for (const secret of ['unprotected', 'libido', 'painkiller', 'medication']) expect(json).not.toContain(secret);
  });

  it('limits history to recent days', () => {
    const old: Snapshot = { ...snapshot, days: [{ date: '2024-01-01', updatedAt: 1, flow: 'light' }] };
    expect(buildSharedSnapshot(old, ['cycle'], 'L', '2026-11-05', 1).days).toEqual([]);
  });
});

describe('invite crypto', () => {
  it('lets the partner recover the share key from the link secret', async () => {
    const key = newShareKey();
    const { secret, wrapped } = await createInvite(key);
    expect(await openInvite(secret, wrapped)).toBe(key);
    const other = await createInvite(newShareKey());
    await expect(openInvite(other.secret, wrapped)).rejects.toThrow();
  });

  it('round-trips the link', () => {
    const id = '3f2b8c1e-1234-4abc-9def-0123456789ab';
    const link = inviteLink('https://bolar66.github.io/tide/', id, 'A'.repeat(43));
    expect(parseInviteHash(new URL(link).hash)).toEqual({ shareId: id, secret: 'A'.repeat(43) });
    expect(parseInviteHash('#/join/nonsense')).toBeNull();
  });

  it('encrypts shared data so only the share key opens it', async () => {
    const key = newShareKey();
    const sealed = await sealForShare(key, { hello: 'kumppani' });
    expect(JSON.stringify(sealed)).not.toContain('kumppani');
    expect(await openForShare(key, sealed)).toEqual({ hello: 'kumppani' });
    await expect(openForShare(newShareKey(), sealed)).rejects.toThrow();
  });
});
