/**
 * Counting for app.espaluz.lat (6 Nov 2026, Elena: "we can't see visits, first messages or where people stop").
 * Same GA4 property as aideazz.xyz/espaluz, so the Monday funnel line reads both.
 *
 * What is sent: event names and page paths. Never message text, email, name, or anything a child says.
 * Children: on /classroom Google's script is not loaded by a direct visit, and is switched off by the official
 * ga-disable flag when arriving from another page. One app_classroom_open count goes out first, nothing after.
 * Elena's own visits: open any page once with ?internal=1 on each device; that browser stops counting.
 * Off this host nothing is sent; on localhost events go to the console so they can be tested.
 */
const GA_ID = 'G-TL5S8V23LT';
const LIVE_HOST = 'app.espaluz.lat';
const INTERNAL_KEY = 'espaluz-internal';
const FIRST_CHAT_KEY = 'espaluz-track-first-chat';
const LAST_CHAT_DAY_KEY = 'espaluz-track-chat-day';
const NO_COUNT_PATHS = ['/classroom', '/admin'];

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

let loaded = false;

const store = {
  get(key: string) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key: string, value: string) {
    try { localStorage.setItem(key, value); } catch { /* private mode: count without memory */ }
  },
};

const isLive = () => window.location.hostname === LIVE_HOST;
const isLocal = () => ['localhost', '127.0.0.1'].includes(window.location.hostname);
const isInternal = () => store.get(INTERNAL_KEY) === '1';
const isNoCountPath = (path: string) => NO_COUNT_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

/** The address without tokens: keeps the path and campaign tags only. */
function cleanLocation() {
  const { origin, pathname, search } = window.location;
  const tags = new URLSearchParams();
  new URLSearchParams(search).forEach((value, key) => {
    if (key.startsWith('utm_') || key === 'gclid') tags.set(key, value);
  });
  const query = tags.toString();
  return `${origin}${pathname}${query ? `?${query}` : ''}`;
}

function loadGoogle() {
  if (loaded || !isLive() || isInternal()) return;
  // A sign-in link carries its token in the address; wait for the next page.
  if (window.location.hash.includes('access_token')) return;
  loaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // gtag.js reads the raw arguments object, not an array.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID, {
    page_location: cleanLocation(),
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);
}

/** Count one event. Names and small labels only: never pass what a person typed. */
export function track(name: string, params: Record<string, string | number | boolean> = {}) {
  if (isLocal()) {
    console.debug('[track]', name, params);
    return;
  }
  if (!loaded || !window.gtag) return;
  window.gtag('event', name, { ...params, transport_type: 'beacon' });
}

/** Call on every route change. */
export function trackRoute(pathname: string) {
  const disableFlag = `ga-disable-${GA_ID}` as const;
  if (new URLSearchParams(window.location.search).get('internal') === '1') store.set(INTERNAL_KEY, '1');

  if (isNoCountPath(pathname)) {
    if (pathname.startsWith('/classroom')) track('app_classroom_open');
    window[disableFlag] = true;
    return;
  }
  window[disableFlag] = false;
  const firstLoad = !loaded;
  loadGoogle();
  if (loaded) window.gtag!('set', { page_location: cleanLocation() });
  // The first page is already counted by the config call above.
  if (!firstLoad || isLocal()) track('app_screen', { screen: pathname });
}

/** Call when a person sends a chat message: first message ever on this browser, and each later day they return. */
export function trackChatMessage(signedIn: boolean) {
  const today = new Date().toISOString().slice(0, 10);
  if (!store.get(FIRST_CHAT_KEY)) {
    store.set(FIRST_CHAT_KEY, today);
    track('app_chat_first', { signed_in: signedIn });
  } else if (store.get(LAST_CHAT_DAY_KEY) !== today) {
    track('app_chat_return', { signed_in: signedIn });
  }
  store.set(LAST_CHAT_DAY_KEY, today);
}

/** A short label for why sign-up failed, so a mail problem shows up as a number. */
export function signupErrorKind(message: string) {
  if (/registered|exists/i.test(message)) return 'already_exists';
  if (/not authorized/i.test(message)) return 'mail_not_authorized';
  if (/rate limit|too many/i.test(message)) return 'rate_limit';
  if (/sending|smtp|confirmation/i.test(message)) return 'mail_send_failed';
  return 'other';
}

/** WhatsApp and Telegram buttons anywhere in the app. Call once at start. */
export function trackDoorClicks() {
  document.addEventListener('click', (event) => {
    const link = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!link || isNoCountPath(window.location.pathname)) return;
    if (/wa\.me\/|bit\.ly\/EspaLuz/i.test(link.href)) track('app_door_whatsapp');
    else if (/t\.me\/EspaLuz/i.test(link.href)) track('app_door_telegram');
  });
}
