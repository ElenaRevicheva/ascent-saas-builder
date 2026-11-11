/**
 * 7 Nov 2026 — Google Play Billing for the EspaLuz Android app (Elena: "Play payments from version 1").
 *
 * The Android app is this same website inside a Trusted Web Activity. Inside it, Chrome exposes Google Play Billing
 * through the Digital Goods API + Payment Request; in a normal browser none of this exists, so the web, WhatsApp and
 * Telegram keep PayPal / PagueloFacil exactly as before. Play policy: inside the Play app the subscription is sold only
 * through Play, so screens use `insidePlayApp()` to hide the other payment buttons there.
 *
 * Server side: supabase/functions/play-verify checks every purchase token with Google before a subscription is active.
 */
import { supabase } from '@/integrations/supabase/client';

const PLAY_BILLING = 'https://play.google.com/billing';
/** The subscription product id created in Play Console (Monetize → Subscriptions). */
export const PLAY_SUBSCRIPTION_ID = 'espaluz_monthly';

type DigitalGoodsService = {
  getDetails: (ids: string[]) => Promise<{ itemId: string; title: string; price: { currency: string; value: string } }[]>;
  listPurchases: () => Promise<{ itemId: string; purchaseToken: string }[]>;
};

/**
 * True when the page runs inside the EspaLuz Play app. The TWA opens /dashboard?source=app (espaluz-android
 * twa-manifest launchUrl) and usually with an android-app:// referrer; the referrer is easily lost (sign-in redirects),
 * so either signal counts. Kept in sessionStorage = this app tab only: the TWA shares Chrome's localStorage, and the
 * Play button must never show in a normal browser, where Play Billing does not exist (12 Nov 2026, Elena's test).
 */
function markPlayApp(): void {
  try {
    const fromApp = new URLSearchParams(window.location.search).get('source') === 'app';
    if (fromApp || document.referrer.startsWith('android-app://')) sessionStorage.setItem('espaluz-play-app', '1');
  } catch { /* storage blocked: treated as a normal browser */ }
}
markPlayApp(); // on first load, before any redirect drops ?source=app

export function insidePlayApp(): boolean {
  try {
    markPlayApp();
    return sessionStorage.getItem('espaluz-play-app') === '1';
  } catch {
    return false;
  }
}

async function service(): Promise<DigitalGoodsService | null> {
  const w = window as unknown as { getDigitalGoodsService?: (m: string) => Promise<DigitalGoodsService> };
  if (!w.getDigitalGoodsService) return null;
  try {
    return await w.getDigitalGoodsService(PLAY_BILLING);
  } catch {
    return null;
  }
}

/** Play Billing is usable here (inside the Play app, with the subscription set up in Play Console). */
export async function playBillingAvailable(): Promise<boolean> {
  return insidePlayApp() && (await service()) !== null;
}

/** The price as Play shows it in the family's own currency, e.g. "US$11.00"; null when unknown. */
export async function playPrice(): Promise<string | null> {
  const s = await service();
  if (!s) return null;
  try {
    const [d] = await s.getDetails([PLAY_SUBSCRIPTION_ID]);
    return d ? new Intl.NumberFormat(undefined, { style: 'currency', currency: d.price.currency }).format(Number(d.price.value)) : null;
  } catch {
    return null;
  }
}

async function verify(purchaseToken: string): Promise<{ ok: boolean; paidUntil?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke('play-verify', {
    body: { purchaseToken, productId: PLAY_SUBSCRIPTION_ID },
  });
  if (error) return { ok: false, error: error.message };
  return data as { ok: boolean; paidUntil?: string; error?: string };
}

/** Opens Google Play's own checkout; the subscription counts only after play-verify confirmed it with Google. */
export async function buyOnPlay(): Promise<{ ok: boolean; paidUntil?: string; error?: string }> {
  if (!(await playBillingAvailable())) return { ok: false, error: 'play-billing-unavailable' };
  try {
    const request = new PaymentRequest(
      [{ supportedMethods: PLAY_BILLING, data: { sku: PLAY_SUBSCRIPTION_ID } }],
      { total: { label: 'EspaLuz', amount: { currency: 'USD', value: '0' } } },
    );
    const response = await request.show();
    const token = (response.details as { purchaseToken?: string })?.purchaseToken;
    if (!token) {
      await response.complete('fail');
      return { ok: false, error: 'no-purchase-token' };
    }
    const result = await verify(token);
    await response.complete(result.ok ? 'success' : 'fail');
    return result;
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** On app open: a purchase made earlier (or on another phone) is checked again, so the family is never locked out. */
export async function restorePlayPurchases(): Promise<boolean> {
  const s = await service();
  if (!s) return false;
  try {
    const purchases = await s.listPurchases();
    const mine = purchases.find((p) => p.itemId === PLAY_SUBSCRIPTION_ID);
    return mine ? (await verify(mine.purchaseToken)).ok : false;
  } catch {
    return false;
  }
}
