import { useState } from 'react';
import { useNow } from '../../hooks/useNow';
import { useI18n } from '../../i18n';
import { useSession } from '../../session/context';
import { ackedIds, CHEER_PRESETS, COUPON_PRESETS, couponsFrom, MAX_TEXT, NEED_PRESETS, type Message } from '../../sharing/messages';
import './connect.css';

const RECENT_MS = 3 * 24 * 3600_000;

function useLabels() {
  const { t } = useI18n();
  const c = t.connect;
  return (m: Message): string => {
    const b = m.body;
    switch (b.type) {
      case 'cheer':
        return b.text || (b.preset ? (c.cheers[b.preset] ?? '') : '');
      case 'coupon':
        return b.text || (b.preset ? (c.coupons[b.preset] ?? '') : '');
      case 'need':
        return c.needs[b.need] ?? b.need;
      case 'ack':
        return c.ack;
      case 'redeem':
        return c.redeemed;
    }
  };
}

/** Owner's home: send "I need…" to partners, see cheers and redeem promise coupons. */
export function OwnerConnectCard() {
  const { t } = useI18n();
  const c = t.connect;
  const session = useSession();
  const label = useLabels();
  const now = useNow();
  const [sentAt, setSentAt] = useState<Record<string, number>>({});
  const active = session.shares.filter((s) => s.status === 'active');
  if (active.length === 0) return null;

  const names = new Map(active.map((s) => [s.id, s.partnerName ?? '']));
  const who = c.joinNames(active.map((s) => s.partnerName ?? '').filter(Boolean));
  const mine = session.messages.filter((m) => names.has(m.shareId));
  const acked = ackedIds(mine);
  const recent = (m: Message) => now - Date.parse(m.createdAt) < RECENT_MS;
  const myNeeds = mine.filter((m) => m.fromMe && m.body.type === 'need' && recent(m));
  const inbox = mine.filter((m) => !m.fromMe && m.body.type === 'cheer' && recent(m)).slice(-5).reverse();
  const coupons = couponsFrom(mine).filter((x) => !x.fromMe);

  const sendNeed = async (need: string) => {
    setSentAt((s) => ({ ...s, [need]: Date.now() }));
    await Promise.all(active.map((s) => session.sendMessage(s.id, { type: 'need', need })));
  };

  return (
    <section className="card connect">
      <h2 className="card__title">{who ? c.ownerTitle(who) : t.sharing.section}</h2>

      <h3 className="section-label">{c.needTitle}</h3>
      <div className="chips">
        {NEED_PRESETS.map((need) => (
          <button key={need} type="button" className="chip" aria-pressed={!!sentAt[need]} onClick={() => void sendNeed(need)}>
            {c.needs[need]}
          </button>
        ))}
      </div>
      <p className="muted small">{c.needHint(who)}</p>
      {myNeeds.length > 0 && (
        <ul className="connect__list">
          {myNeeds
            .slice(-3)
            .reverse()
            .map((m) => (
              <li key={m.id}>
                {label(m)} · {acked.has(m.id) ? c.acked(names.get(m.shareId) || '') : c.sent}
              </li>
            ))}
        </ul>
      )}

      <h3 className="section-label">{c.inboxTitle}</h3>
      {inbox.length === 0 ? (
        <p className="muted small">{c.nothingNew}</p>
      ) : (
        <ul className="connect__bubbles">
          {inbox.map((m) => (
            <li key={m.id}>
              <span className="connect__from">{c.from(names.get(m.shareId) || '')}</span> {label(m)}
            </li>
          ))}
        </ul>
      )}

      {coupons.length > 0 && (
        <>
          <h3 className="section-label">{c.couponsTitle}</h3>
          <ul className="connect__coupons">
            {coupons.map((cp) => (
              <li key={cp.id} className={cp.redeemedAt ? 'is-redeemed' : ''}>
                <span>{label({ id: cp.id, shareId: '', fromMe: false, createdAt: cp.createdAt, body: cp.body })}</span>
                {cp.redeemedAt ? (
                  <span className="muted small">{c.redeemed}</span>
                ) : (
                  <button
                    type="button"
                    className="button button--small"
                    onClick={() => {
                      const share = mine.find((m) => m.id === cp.id)?.shareId;
                      if (share) void session.sendMessage(share, { type: 'redeem', couponId: cp.id });
                    }}
                  >
                    {c.redeem}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/** Partner view: answer requests, send cheers and give promise coupons. */
export function PartnerConnectCard({ shareId, name }: { shareId: string; name: string }) {
  const { t } = useI18n();
  const c = t.connect;
  const session = useSession();
  const label = useLabels();
  const now = useNow();
  const [text, setText] = useState('');
  const [coupon, setCoupon] = useState('');
  const [busy, setBusy] = useState(false);
  const mine = session.messages.filter((m) => m.shareId === shareId);
  const acked = ackedIds(mine);
  const requests = mine.filter((m) => !m.fromMe && m.body.type === 'need' && now - Date.parse(m.createdAt) < RECENT_MS).reverse();
  const inbox = mine.filter((m) => !m.fromMe && m.body.type === 'cheer' && now - Date.parse(m.createdAt) < RECENT_MS).slice(-3).reverse();
  const given = couponsFrom(mine).filter((x) => x.fromMe);

  const send = async (body: Parameters<typeof session.sendMessage>[1]) => {
    setBusy(true);
    try {
      await session.sendMessage(shareId, body);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card connect">
      <h2 className="card__title">{c.partnerTitle}</h2>

      {requests.length > 0 && (
        <>
          <h3 className="section-label">{c.requestsTitle}</h3>
          <ul className="connect__requests">
            {requests.map((m) => (
              <li key={m.id}>
                <span>{label(m)}</span>
                {acked.has(m.id) ? (
                  <span className="muted small">{c.sent}</span>
                ) : (
                  <button type="button" className="button button--small" disabled={busy} onClick={() => void send({ type: 'ack', replyTo: m.id })}>
                    {c.ack}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {inbox.length > 0 && (
        <ul className="connect__bubbles">
          {inbox.map((m) => (
            <li key={m.id}>
              <span className="connect__from">{c.from(name)}</span> {label(m)}
            </li>
          ))}
        </ul>
      )}

      <h3 className="section-label">{c.cheerTitle}</h3>
      <div className="chips">
        {CHEER_PRESETS.map((p) => (
          <button key={p} type="button" className="chip" disabled={busy} onClick={() => void send({ type: 'cheer', preset: p })}>
            {c.cheers[p]}
          </button>
        ))}
      </div>
      <form
        className="connect__compose"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          void send({ type: 'cheer', text: text.trim() }).then(() => setText(''));
        }}
      >
        <input className="input" value={text} maxLength={MAX_TEXT} placeholder={c.ownMessage} onChange={(e) => setText(e.target.value)} />
        <button type="submit" className="button button--small" disabled={busy || !text.trim()}>
          {c.send}
        </button>
      </form>

      <h3 className="section-label">{c.couponTitle}</h3>
      <p className="muted small">{c.couponHint}</p>
      <div className="chips">
        {COUPON_PRESETS.map((p) => (
          <button key={p} type="button" className="chip" disabled={busy} onClick={() => void send({ type: 'coupon', preset: p })}>
            {c.coupons[p]}
          </button>
        ))}
      </div>
      <form
        className="connect__compose"
        onSubmit={(e) => {
          e.preventDefault();
          if (!coupon.trim()) return;
          void send({ type: 'coupon', text: coupon.trim() }).then(() => setCoupon(''));
        }}
      >
        <input className="input" value={coupon} maxLength={MAX_TEXT} placeholder={c.ownCoupon} onChange={(e) => setCoupon(e.target.value)} />
        <button type="submit" className="button button--small" disabled={busy || !coupon.trim()}>
          {c.give}
        </button>
      </form>
      {given.length > 0 && (
        <ul className="connect__coupons">
          {given.slice(0, 5).map((cp) => (
            <li key={cp.id} className={cp.redeemedAt ? 'is-redeemed' : ''}>
              <span>{label({ id: cp.id, shareId, fromMe: true, createdAt: cp.createdAt, body: cp.body })}</span>
              <span className="muted small">{cp.redeemedAt ? c.redeemed : c.waitingRedeem}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
