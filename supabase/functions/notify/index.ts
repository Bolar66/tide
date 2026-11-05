// Tide `notify` Edge Function: sends a generic Web Push notification to the other member of a share.
// Deploy with "Verify JWT" OFF; requests are authenticated with the x-tide-secret header instead.
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (https URL or mailto:), TIDE_WEBHOOK_SECRET.
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';

const TEXT: Record<string, string> = {
  message: 'Kumppanisi lähetti sinulle jotain 💛',
  request: 'Uusi liittymispyyntö odottaa hyväksyntääsi',
  approved: 'Kumppanisi hyväksyi pyyntösi',
};

Deno.serve(async (req) => {
  if (req.method !== 'POST' || req.headers.get('x-tide-secret') !== Deno.env.get('TIDE_WEBHOOK_SECRET')) {
    return new Response('forbidden', { status: 403 });
  }
  const { kind, share_id, sender_id } = await req.json();
  if (!TEXT[kind] || typeof share_id !== 'string') return new Response('bad request', { status: 400 });

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: share } = await db.from('shares').select('owner_id, partner_id').eq('id', share_id).maybeSingle();
  if (!share) return Response.json({ sent: 0 });

  // Notify whoever is not the sender (for a request: the owner; for an approval: the partner).
  const recipient = [share.owner_id, share.partner_id].find((id) => id && id !== sender_id);
  if (!recipient) return Response.json({ sent: 0 });

  const { data: subs } = await db.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', recipient);
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!);

  let sent = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title: 'Tide', body: TEXT[kind], tag: `tide-${kind}` }),
        { TTL: 24 * 3600, urgency: 'normal' },
      );
      sent++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
    }
  }
  return Response.json({ sent });
});
