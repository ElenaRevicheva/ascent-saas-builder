// 7 Nov 2026 — Google Play Real-time Developer Notifications for EspaLuz subscriptions.
//
// Google Play → Pub/Sub topic → push subscription → https://<project>.supabase.co/functions/v1/play-rtdn?secret=<PLAY_RTDN_SECRET>
// Every renewal, cancellation, expiry, grace period or refund arrives here. The message itself is never trusted: it only
// says WHICH purchase changed, and this function asks Google for the truth, then moves current_period_end / status on the
// family's row (found by the purchase-token hash that play-verify wrote). Unknown tokens (bought but never linked to an
// account yet) are logged and acknowledged; play-verify links them when the family opens the app.
//
// Secrets: GOOGLE_PLAY_SA_JSON, PLAY_PACKAGE_NAME, PLAY_RTDN_SECRET. Deploy with verify_jwt off (Pub/Sub sends no JWT).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getSubscription, googleToken, isLive, tokenKey } from '../_shared/play.ts';

const ok = (note: string) => {
  console.log(`[play-rtdn] ${note}`);
  return new Response('ok', { status: 200 }); // 200 = Pub/Sub will not retry
};

Deno.serve(async (req) => {
  const secret = Deno.env.get('PLAY_RTDN_SECRET');
  if (!secret || new URL(req.url).searchParams.get('secret') !== secret) return new Response('forbidden', { status: 403 });
  try {
    const saJson = Deno.env.get('GOOGLE_PLAY_SA_JSON');
    const pkg = Deno.env.get('PLAY_PACKAGE_NAME');
    if (!saJson || !pkg) return new Response('not configured', { status: 503 }); // Pub/Sub retries later

    const body = await req.json();
    const data = JSON.parse(atob(body?.message?.data ?? '') || '{}');
    if (data.testNotification) return ok('test notification received');
    if (data.packageName && data.packageName !== pkg) return ok('other package, ignored');
    const n = data.subscriptionNotification;
    if (!n?.purchaseToken) return ok('not a subscription notification');

    const sub = await getSubscription(pkg, await googleToken(JSON.parse(saJson)), n.purchaseToken, n.subscriptionId);
    if (!sub) return ok(`type ${n.notificationType}: google does not know the token`);

    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const key = await tokenKey(n.purchaseToken);
    const live = isLive(sub);
    const fields = live
      ? { status: 'active', current_period_end: sub.until!.toISOString() }
      : { status: 'canceled', current_period_end: (sub.until ?? new Date()).toISOString() };
    const { data: rows, error } = await db.from('user_subscriptions').update(fields).eq('subscription_id', key).select('id');
    if (error) throw new Error(error.message);
    return ok(`type ${n.notificationType} ${sub.state} → ${fields.status} until ${fields.current_period_end.slice(0, 10)} (${rows?.length ?? 0} row)`);
  } catch (e) {
    console.error('[play-rtdn] error', (e as Error).message);
    return new Response('error', { status: 500 }); // Pub/Sub retries
  }
});
