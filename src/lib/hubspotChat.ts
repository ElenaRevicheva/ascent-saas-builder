import { insidePlayApp } from '@/lib/playBilling';

/*
 * 21 Nov 2026 (Elena: "the HubSpot chat bubble everywhere, like on my /api website"): the SAME HubSpot loader the aideazz
 * site uses (portal 51409153 - HubSpot's chat + its tracking). HubSpot sets tracking cookies, so it follows EspaLuz's
 * existing rule for PostHog (posthogReplay.ts): only on the website, only after the visitor accepted cookies, never inside
 * the Google Play app. The WhatsApp bubble (no cookies) covers the Play app.
 */
const SRC = '//js-na1.hs-scripts.com/51409153.js?v=20260726';
// 21 Nov 2026 (Elena): OFF for now - EspaLuz support = the WhatsApp bubble. Turn on once the EspaLuz chatflow (HubSpot,
// targeting app.espaluz.lat) is ready and a second inbox is wanted.
export const HUBSPOT_CHAT_ON = false;

export function loadHubSpotChat(): void {
  try {
    if (typeof window === 'undefined' || insidePlayApp()) return;
    if (window.location.hostname !== 'app.espaluz.lat') return; // the live site only (same rule as PostHog)
    if (localStorage.getItem('cookie-consent') !== 'accepted') return;
    if (document.getElementById('hs-script-loader')) return;
    const s = document.createElement('script');
    s.id = 'hs-script-loader';
    s.async = true;
    s.defer = true;
    s.src = SRC;
    document.body.appendChild(s);
  } catch { /* the WhatsApp bubble is still there */ }
}
