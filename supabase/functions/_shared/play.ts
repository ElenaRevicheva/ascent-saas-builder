// 7 Nov 2026 — shared Google Play helpers for play-verify (purchase) and play-rtdn (renewals, cancellations).
// A subscription is keyed by its purchase token, which stays the same across monthly renewals; the order id does not
// (GPA.xxxx, GPA.xxxx..0, ..1 …), so keying on it would lose the family at the first renewal.

const b64url = (data: ArrayBuffer | string) => {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export async function googleToken(sa: { client_email: string; private_key: string }): Promise<string> {
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

export const playApi = (pkg: string) =>
  `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(pkg)}/purchases`;

/** The row key for one Play subscription: never the raw token (it is a bearer secret), a hash of it. */
export async function tokenKey(purchaseToken: string): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(purchaseToken));
  return 'play:' + [...new Uint8Array(h)].slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export type PlaySub = { state: string; until: Date | null; ack: string; raw: Record<string, unknown> };

export async function getSubscription(pkg: string, token: string, purchaseToken: string, productId?: string): Promise<PlaySub | null> {
  const got = await fetch(`${playApi(pkg)}/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!got.ok) return null;
  const sub = await got.json();
  const items = (sub.lineItems ?? []) as { productId?: string; expiryTime?: string }[];
  const line = productId ? items.find((l) => l.productId === productId) : items[0];
  return {
    state: String(sub.subscriptionState ?? ''),
    until: line?.expiryTime ? new Date(line.expiryTime) : null,
    ack: String(sub.acknowledgementState ?? ''),
    raw: sub,
  };
}

/** The family keeps access: paid, in Google's grace period while a card is retried, or CANCELED — which in Play means
 *  "will not renew", not "ends now": they paid until `until`, so access runs to that date. */
export const isLive = (s: PlaySub) =>
  ['SUBSCRIPTION_STATE_ACTIVE', 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD', 'SUBSCRIPTION_STATE_CANCELED'].includes(s.state) &&
  !!s.until && s.until > new Date();
