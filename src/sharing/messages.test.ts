import { describe, expect, it } from 'vitest';
import { ackedIds, couponsFrom, parseMessageBody, type Message } from './messages';

const m = (id: string, body: Message['body'], createdAt: string, fromMe = false): Message => ({ id, shareId: 's', fromMe, createdAt, body });

describe('messages', () => {
  it('tracks coupon redemption', () => {
    const list = [
      m('c1', { type: 'coupon', preset: 'massage' }, '2026-11-01T10:00:00Z', true),
      m('c2', { type: 'coupon', text: 'Retki' }, '2026-11-02T10:00:00Z', true),
      m('r1', { type: 'redeem', couponId: 'c1' }, '2026-11-03T10:00:00Z'),
    ];
    expect(couponsFrom(list).map((c) => [c.id, c.redeemedAt])).toEqual([
      ['c2', null],
      ['c1', '2026-11-03T10:00:00Z'],
    ]);
  });

  it('knows which requests were acknowledged', () => {
    expect([...ackedIds([m('a', { type: 'ack', replyTo: 'n1' }, '2026-11-01T10:00:00Z')])]).toEqual(['n1']);
  });

  it('rejects malformed or oversized payloads', () => {
    expect(parseMessageBody({ type: 'nope' })).toBeNull();
    expect(parseMessageBody({ type: 'cheer' })).toBeNull();
    expect(parseMessageBody('x')).toBeNull();
    const long = parseMessageBody({ type: 'cheer', text: 'a'.repeat(1000) });
    expect(long?.type === 'cheer' && long.text?.length).toBe(300);
    expect(parseMessageBody({ type: 'need', need: 'hug' })).toEqual({ type: 'need', need: 'hug', text: undefined });
    expect(parseMessageBody({ type: 'cycle', event: 'periodStarted', date: '2026-11-05' })).toEqual({
      type: 'cycle',
      event: 'periodStarted',
      date: '2026-11-05',
    });
    expect(parseMessageBody({ type: 'cycle', event: 'other', date: '2026-11-05' })).toBeNull();
  });
});
