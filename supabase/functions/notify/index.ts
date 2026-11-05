// Tide `notify` Edge Function: sends a generic Web Push notification to the other member of a share.
// Deploy with "Verify JWT" OFF; requests are authenticated with the x-tide-secret header instead.
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (https URL or mailto:), TIDE_WEBHOOK_SECRET.
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';

// With the sender's chosen display name when they have set one, otherwise neutral.
const TEXT: Record<string, (name: string | null) => string> = {
  message: (n) => (n ? `${n} lähetti sinulle jotain 💛` : 'Sinulle on jotain uutta Tidessä 💛'),
  request: (n) => (n ? `${n} haluaa liittyä, hyväksy pyyntö Tidessä` : 'Uusi liittymispyyntö odottaa hyväksyntääsi'),
  approved: (n) => (n ? `${n} hyväksyi pyyntösi` : 'Liittymispyyntösi hyväksyttiin'),
};

// Scheduled reminders (migration 0005). Deliberately generic: the server never knows why.
const REMINDER_TEXT: Record<number, string[]> = {
  1: ['Miltä tänään tuntuu? Kirjaus vie vain hetken 🌙', 'Hetki itsellesi? Päiväsi odottaa kirjausta.', 'Pieni pysähdys: miten voit tänään?'],
  2: ['Tide muistuttaa: vilkaise tulevia päiviäsi 🌙', 'Sinulle on muistutus Tidessä.'],
};

type Sub = { endpoint: string; p256dh: string; auth: string };

async function send(db: ReturnType<typeof createClient>, subs: Sub[], payload: object): Promise<number> {
  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), {
        TTL: 6 * 3600,
        urgency: 'normal',
      });
      sent++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
    }
  }
  return sent;
}

/** Claim every due reminder (so a parallel run cannot send it twice) and notify each user once. */
async function sendReminders(db: ReturnType<typeof createClient>): Promise<Response> {
  const { data: due } = await db
    .from('reminders')
    .update({ sent: true })
    .eq('sent', false)
    .lte('send_at', new Date().toISOString())
    .gte('send_at', new Date(Date.now() - 3 * 3600_000).toISOString())
    .select('user_id, kind');
  if (!due?.length) return Response.json({ sent: 0 });
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!);
  const byUser = new Map<string, number>();
  for (const r of due as { user_id: string; kind: number }[]) byUser.set(r.user_id, Math.max(byUser.get(r.user_id) ?? 0, r.kind));
  let sent = 0;
  for (const [user, kind] of byUser) {
    const { data: subs } = await db.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', user);
    if (!subs?.length) continue;
    const texts = REMINDER_TEXT[kind] ?? REMINDER_TEXT[1]!;
    const body = texts[new Date().getUTCDate() % texts.length]!;
    sent += await send(db, subs as Sub[], { title: 'Tide', body, tag: `tide-reminder-${kind}`, url: kind === 1 ? '#/' : '#/calendar' });
  }
  return Response.json({ sent });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST' || req.headers.get('x-tide-secret') !== Deno.env.get('TIDE_WEBHOOK_SECRET')) {
    return new Response('forbidden', { status: 403 });
  }
  const { kind, share_id, sender_id } = await req.json();
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  if (kind === 'reminders') return sendReminders(db);
  if (!TEXT[kind] || typeof share_id !== 'string') return new Response('bad request', { status: 400 });

  const { data: share } = await db.from('shares').select('owner_id, partner_id').eq('id', share_id).maybeSingle();
  if (!share) return Response.json({ sent: 0 });

  // Notify whoever is not the sender (for a request: the owner; for an approval: the partner).
  const recipient = [share.owner_id, share.partner_id].find((id) => id && id !== sender_id);
  if (!recipient) return Response.json({ sent: 0 });

  const { data: subs } = await db.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', recipient);
  if (!subs?.length) return Response.json({ sent: 0 });
  const { data: profile } = await db.from('profiles').select('display_name').eq('user_id', sender_id).maybeSingle();
  const body = TEXT[kind](profile?.display_name ?? null);
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!);

  const sent = await send(db, subs as Sub[], { title: 'Tide', body, tag: `tide-${kind}` });
  return Response.json({ sent });
});
