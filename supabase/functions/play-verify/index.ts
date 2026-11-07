// 7 Nov 2026 — Google Play Billing check for the EspaLuz Android app (Elena: "Play payments from version 1").
//
// The app sends a Play purchase token; this function asks GOOGLE whether it is a real, active subscription before any
// family gets access, acknowledges it (Play refunds purchases left unacknowledged for 3 days), and writes the period
// into user_subscriptions with the service role, the same table PayPal and PagueloFacil end up in. The browser can never
// mark itself paid: the user_subscriptions_from_browser trigger turns browser writes into 'pending_verification'.
//
// Secrets (set once the Play Console exists): GOOGLE_PLAY_SA_JSON (service-account key with access to the app in Play
// Console), PLAY_PACKAGE_NAME (e.g. lat.espaluz.app). Without them it answers {ok:false,error:'not-configured'}.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const b64url = (data: ArrayBuffer | string) => {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

async function googleToken(sa: { client_email: string; private_key: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({
    iss: sa.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  }));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${head}.${claims}`));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${claims}.${b64url(sig)}` }),
  });
  const out = await res.json();
  if (!out.access_token) throw new Error(`google token: ${res.status}`);
  return out.access_token;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const saJson = Deno.env.get('GOOGLE_PLAY_SA_JSON');
    const pkg = Deno.env.get('PLAY_PACKAGE_NAME');
    if (!saJson || !pkg) return json({ ok: false, error: 'not-configured' });

    const url = Deno.env.get('SUPABASE_URL')!;
    const authHeader = req.headers.get('Authorization') ?? '';
    const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) return json({ ok: false, error: 'sign-in-first' }, 401);

    const { purchaseToken, productId } = await req.json();
    if (typeof purchaseToken !== 'string' || purchaseToken.length < 10 || typeof productId !== 'string') {
      return json({ ok: false, error: 'bad-request' }, 400);
    }

    const token = await googleToken(JSON.parse(saJson));
    const api = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(pkg)}/purchases`;
    const got = await fetch(`${api}/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!got.ok) {
      console.log(`[play-verify] google said ${got.status}`);
      return json({ ok: false, error: 'not-a-valid-purchase' });
    }
    const sub = await got.json();
    const line = (sub.lineItems ?? []).find((l: { productId?: string }) => l.productId === productId);
    const state = String(sub.subscriptionState ?? '');
    const until = line?.expiryTime ? new Date(line.expiryTime) : null;
    const live = ['SUBSCRIPTION_STATE_ACTIVE', 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD'].includes(state) && until && until > new Date();
    if (!live) {
      console.log(`[play-verify] not active: ${state}`);
      return json({ ok: false, error: 'not-active', state });
    }

    const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const orderKey = `play:${sub.latestOrderId ?? purchaseToken.slice(0, 40)}`;
    // One Play purchase belongs to one EspaLuz account: a token already used by someone else is refused.
    const { data: taken } = await db.from('user_subscriptions').select('user_id').eq('subscription_id', orderKey).neq('user_id', user.id).limit(1);
    if (taken?.length) {
      console.log('[play-verify] purchase already linked to another account');
      return json({ ok: false, error: 'linked-to-another-account' }, 409);
    }

    if (sub.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_PENDING') {
      const ack = await fetch(`${api}/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}',
      });
      console.log(`[play-verify] acknowledge ${ack.status}`);
    }

    const { data: mine } = await db.from('user_subscriptions').select('id').eq('user_id', user.id).eq('subscription_id', orderKey).limit(1);
    const fields = { status: 'active', plan_type: 'standard', current_period_end: until!.toISOString(), trial_end: null };
    const write = mine?.length
      ? await db.from('user_subscriptions').update(fields).eq('id', mine[0].id)
      : await db.from('user_subscriptions').insert({ user_id: user.id, subscription_id: orderKey, current_period_start: new Date().toISOString(), ...fields });
    if (write.error) throw new Error(write.error.message);

    console.log(`[play-verify] active until ${until!.toISOString().slice(0, 10)}`);
    return json({ ok: true, paidUntil: until!.toISOString() });
  } catch (e) {
    console.error('[play-verify] error', (e as Error).message);
    return json({ ok: false, error: 'server-error' }, 500);
  }
});
