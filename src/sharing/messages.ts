/** Message payloads, encrypted with the share key. The server sees only sender, time and ciphertext. */
export type MessageBody =
  | { type: 'cheer'; preset?: string; text?: string }
  | { type: 'need'; need: string; text?: string }
  | { type: 'ack'; replyTo: string }
  | { type: 'coupon'; preset?: string; text?: string }
  | { type: 'redeem'; couponId: string }
  /** Automatic, from the owner's device (opt-in per share). */
  | { type: 'cycle'; event: 'periodStarted'; date: string };

export interface Message {
  id: string;
  shareId: string;
  fromMe: boolean;
  createdAt: string;
  body: MessageBody;
}

export const CHEER_PRESETS = ['thinking', 'lovely', 'strength', 'proud', 'hug'] as const;
export const NEED_PRESETS = ['hug', 'chocolate', 'heat', 'space', 'company', 'painkiller'] as const;
export const COUPON_PRESETS = ['massage', 'dinner', 'movie', 'breakfast', 'chores'] as const;

export const MAX_TEXT = 300;

export interface Coupon {
  id: string;
  fromMe: boolean;
  createdAt: string;
  body: Extract<MessageBody, { type: 'coupon' }>;
  redeemedAt: string | null;
}

/** Coupons with their redemption state, newest first. */
export function couponsFrom(messages: readonly Message[]): Coupon[] {
  const redeemed = new Map<string, string>();
  for (const m of messages) if (m.body.type === 'redeem') redeemed.set(m.body.couponId, m.createdAt);
  return messages
    .filter((m): m is Message & { body: Extract<MessageBody, { type: 'coupon' }> } => m.body.type === 'coupon')
    .map((m) => ({ id: m.id, fromMe: m.fromMe, createdAt: m.createdAt, body: m.body, redeemedAt: redeemed.get(m.id) ?? null }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Requests that have been acknowledged, so the UI can show "Tulossa!". */
export function ackedIds(messages: readonly Message[]): Set<string> {
  return new Set(messages.flatMap((m) => (m.body.type === 'ack' ? [m.body.replyTo] : [])));
}

/** Validate a decrypted payload before showing it: never trust shape or length. */
export function parseMessageBody(raw: unknown): MessageBody | null {
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as Record<string, unknown>;
  const text = typeof b.text === 'string' ? b.text.slice(0, MAX_TEXT) : undefined;
  const preset = typeof b.preset === 'string' ? b.preset : undefined;
  switch (b.type) {
    case 'cheer':
      return preset || text ? { type: 'cheer', preset, text } : null;
    case 'coupon':
      return preset || text ? { type: 'coupon', preset, text } : null;
    case 'need':
      return typeof b.need === 'string' ? { type: 'need', need: b.need, text } : null;
    case 'ack':
      return typeof b.replyTo === 'string' ? { type: 'ack', replyTo: b.replyTo } : null;
    case 'redeem':
      return typeof b.couponId === 'string' ? { type: 'redeem', couponId: b.couponId } : null;
    case 'cycle':
      return b.event === 'periodStarted' && typeof b.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.date)
        ? { type: 'cycle', event: 'periodStarted', date: b.date }
        : null;
    default:
      return null;
  }
}
