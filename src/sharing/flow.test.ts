import { describe, expect, it } from 'vitest';
import { MemoryServer } from '../sync/remote';
import { createInvite, newShareKey, openForShare, openInvite, sealForShare } from './crypto';

async function setup() {
  const server = new MemoryServer();
  const owner = server.client();
  const partner = server.client();
  const stranger = server.client();
  await owner.signUp('liisa@example.com', 's1');
  await partner.signUp('ville@example.com', 's2');
  await stranger.signUp('x@example.com', 's3');
  return { server, owner, partner, stranger };
}

describe('sharing flow', () => {
  it('invite → accept → approve → partner reads, stranger cannot', async () => {
    const { owner, partner, stranger } = await setup();
    const key = newShareKey();
    const { secret, wrapped } = await createInvite(key);
    const id = await owner.createShare(wrapped);

    // Partner: link secret opens the key; encrypted name proves possession of the link.
    const partnerKey = await openInvite(secret, (await partner.getInvite(id))!);
    expect(partnerKey).toBe(key);
    expect(await partner.acceptInvite(id, await sealForShare(partnerKey, { name: 'Ville' }))).toBe(true);
    expect(await stranger.acceptInvite(id, await sealForShare(newShareKey(), { name: 'X' }))).toBe(false);

    // Owner sees the request and can verify the name before approving.
    const row = (await owner.listShares()).find((r) => r.id === id)!;
    expect(row.status).toBe('pending');
    expect(await openForShare<{ name: string }>(key, row.partner_info!)).toEqual({ name: 'Ville' });

    // Nothing flows before approval.
    await expect(owner.pushShared(id, 'iv', 'data')).rejects.toThrow();
    await owner.activateShare(id);
    const sealed = await sealForShare(key, { ownerName: 'Liisa' });
    await owner.pushShared(id, sealed.iv, sealed.data);

    const got = (await partner.pullShared(id))!;
    expect(await openForShare(key, got)).toEqual({ ownerName: 'Liisa' });
    expect(await stranger.pullShared(id)).toBeNull();
    expect(await stranger.listShares()).toEqual([]);
  });

  it('expired invites cannot be accepted', async () => {
    const { server, owner, partner } = await setup();
    const { wrapped } = await createInvite(newShareKey());
    const id = await owner.createShare(wrapped);
    server.now = () => Date.now() + 25 * 3600_000;
    expect(await partner.getInvite(id)).toBeNull();
  });

  it('revoking removes access and the shared data', async () => {
    const { owner, partner } = await setup();
    const key = newShareKey();
    const { secret, wrapped } = await createInvite(key);
    const id = await owner.createShare(wrapped);
    await partner.acceptInvite(id, await sealForShare(await openInvite(secret, (await partner.getInvite(id))!), { name: 'V' }));
    await owner.activateShare(id);
    await owner.pushShared(id, 'a', 'b');
    await owner.deleteShare(id);
    expect(await partner.pullShared(id)).toBeNull();
    expect(await partner.listShares()).toEqual([]);
  });

  it('the owner cannot accept their own invite', async () => {
    const { owner } = await setup();
    const { wrapped } = await createInvite(newShareKey());
    const id = await owner.createShare(wrapped);
    expect(await owner.getInvite(id)).toBeNull();
  });
});
