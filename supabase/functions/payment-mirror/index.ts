import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

// 1 Nov 2026 (cto-aipa docs/espaluz/ONE_PAYMENT_TRUTH_PLAN_2026-11-01.md, phase 4): the web's copy of the ONE payment
// truth. Who paid lives in Oracle's espaluz_unified.subscribers, written only from verified PayPal / PágueloFácil events
// (EspaLuzFamilybot espaluz_payment_truth.py). The browser can no longer mark itself paid: a row it writes stays
// 'pending_verification' (database trigger) until the truth confirms the PayPal subscription it names. This function is
// the truth's only door into user_subscriptions, and it answers only with the bots' shared secret.
//   mode 'links': web accounts (id, email), their Telegram/WhatsApp links, and the browser's pending claims.
//   mode 'write': [{ user_id, paid_until, status, paypal_subscription_id? }] onto each account's newest row.

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

serve(async (req) => {
  const secret = Deno.env.get('ESPALUZ_BOT_SECRET');
  if (!secret || req.headers.get('x-espaluz-bot-secret') !== secret) return json({ error: 'unauthorized' }, 401);
  try {
    const { mode, rows } = await req.json();
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    if (mode === 'links') {
      const { data: links } = await db.from('connected_bots').select('user_id, platform, platform_user_id').eq('is_active', true);
      const { data: pending } = await db.from('user_subscriptions').select('id, user_id, paypal_subscription_id')
        .eq('status', 'pending_verification');
      const { data: list, error } = await db.auth.admin.listUsers({ perPage: 1000 });
      if (error) throw error;
      const users = (list?.users ?? []).map((u) => ({ user_id: u.id, email: u.email ?? null }));
      return json({ links: links ?? [], pending: pending ?? [], users });
    }
    if (mode === 'write') {
      let written = 0;
      for (const r of Array.isArray(rows) ? rows : []) {
        if (!r?.user_id || !r?.paid_until) continue;
        const fields: Record<string, unknown> = {
          status: r.status === 'active' ? 'active' : 'expired',
          current_period_end: r.paid_until,
        };
        if (r.paypal_subscription_id) fields.paypal_subscription_id = r.paypal_subscription_id;
        const { data: latest } = await db.from('user_subscriptions').select('id').eq('user_id', r.user_id)
          .order('created_at', { ascending: false }).limit(1);
        const { error } = latest?.[0]
          ? await db.from('user_subscriptions').update(fields).eq('id', latest[0].id)
          : await db.from('user_subscriptions').insert({ user_id: r.user_id, plan_type: 'standard', trial_end: null,
              subscription_id: r.paypal_subscription_id ?? `truth-${r.source ?? 'paid'}`, ...fields });
        if (error) console.error('payment-mirror write:', error.message);
        else written++;
      }
      console.log(`payment-mirror: ${written} account(s) written`);
      return json({ written });
    }
    return json({ error: 'unknown mode' }, 400);
  } catch (e) {
    console.error('payment-mirror error:', (e as Error).message);
    return json({ error: 'failed' }, 500);
  }
});
