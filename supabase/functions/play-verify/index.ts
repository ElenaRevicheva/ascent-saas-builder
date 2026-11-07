// 7 Nov 2026 — Google Play Billing check for the EspaLuz Android app (Elena: "Play payments from version 1").
//
// The app sends a Play purchase token; this function asks GOOGLE whether it is a real, active subscription before any
// family gets access, acknowledges it (Play refunds purchases left unacknowledged for 3 days), and writes the period
// into user_subscriptions with the service role, the same table PayPal and PagueloFacil end up in. The browser can never
// mark itself paid: the user_subscriptions_from_browser trigger turns browser writes into 'pending_verification'.
// Renewals and cancellations arrive later through play-rtdn, keyed by the same purchase-token hash.
//
// Secrets (set once the Play Console exists): GOOGLE_PLAY_SA_JSON (service-account key with access to the app in Play
// Console), PLAY_PACKAGE_NAME (lat.espaluz.app). Without them it answers {ok:false,error:'not-configured'}.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getSubscription, googleToken, isLive, playApi, tokenKey } from '../_shared/play.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const saJson = Deno.env.get('GOOGLE_PLAY_SA_JSON');
    const pkg = Deno.env.get('PLAY_PACKAGE_NAME');
    if (!saJson || !pkg) return json({ ok: false, error: 'not-configured' });

    const url = Deno.env.get('SUPABASE_URL')!;
    const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) return json({ ok: false, error: 'sign-in-first' }, 401);

    const { purchaseToken, productId } = await req.json();
    if (typeof purchaseToken !== 'string' || purchaseToken.length < 10 || typeof productId !== 'string') {
      return json({ ok: false, error: 'bad-request' }, 400);
    }

    const token = await googleToken(JSON.parse(saJson));
    const sub = await getSubscription(pkg, token, purchaseToken, productId);
    if (!sub) {
      console.log('[play-verify] google did not recognise the token');
      return json({ ok: false, error: 'not-a-valid-purchase' });
    }
    if (!isLive(sub)) {
      console.log(`[play-verify] not active: ${sub.state}`);
      return json({ ok: false, error: 'not-active', state: sub.state });
    }

    const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const key = await tokenKey(purchaseToken);
    // One Play purchase belongs to one EspaLuz account: a token already linked to someone else is refused.
    const { data: taken } = await db.from('user_subscriptions').select('user_id').eq('subscription_id', key).neq('user_id', user.id).limit(1);
    if (taken?.length) {
      console.log('[play-verify] purchase already linked to another account');
      return json({ ok: false, error: 'linked-to-another-account' }, 409);
    }

    if (sub.ack === 'ACKNOWLEDGEMENT_STATE_PENDING') {
      const ack = await fetch(`${playApi(pkg)}/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}',
      });
      console.log(`[play-verify] acknowledge ${ack.status}`);
    }

    const { data: mine } = await db.from('user_subscriptions').select('id').eq('user_id', user.id).eq('subscription_id', key).limit(1);
    const fields = { status: 'active', plan_type: 'standard', current_period_end: sub.until!.toISOString(), trial_end: null };
    const write = mine?.length
      ? await db.from('user_subscriptions').update(fields).eq('id', mine[0].id)
      : await db.from('user_subscriptions').insert({ user_id: user.id, subscription_id: key, current_period_start: new Date().toISOString(), ...fields });
    if (write.error) throw new Error(write.error.message);

    console.log(`[play-verify] active until ${sub.until!.toISOString().slice(0, 10)}`);
    return json({ ok: true, paidUntil: sub.until!.toISOString() });
  } catch (e) {
    console.error('[play-verify] error', (e as Error).message);
    return json({ ok: false, error: 'server-error' }, 500);
  }
});
