import { insidePlayApp } from '@/lib/playBilling';

/*
 * 16 Nov 2026 (Andy, EdTech founder-tester: "explore PostHog - see how long visitors stay on the landing, how they
 * behave and how well its text converts"; Elena created the project). PostHog shows HOW strangers read the front page:
 * recordings, scroll depth, the path front page -> Start -> sign-up. Google Analytics (src/lib/track.ts) keeps counting.
 *
 * Stricter than GA, on purpose (families and children use this app):
 *  - only on app.espaluz.lat in a browser - NEVER inside the Google Play app (Families policy: children 6-8 declared);
 *  - only after the visitor pressed "Accept" on the cookie banner;
 *  - only on the front page and the sign-in page (PAGES). Every event from any other page is dropped before it leaves
 *    the browser (before_send), and the recording stops - the dashboard, classroom and chat are never recorded;
 *  - everything typed is masked in recordings; no person profiles; Elena's own browser (?internal=1) is skipped.
 * The project token is write-only and made to sit in public pages (PostHog: "Safe to use in public apps").
 */
const TOKEN = 'phc_tGQg2u2vrQHquDn7fWEUArGgB9yoMjtgmGNTVangA3Fj';
const HOST = 'https://us.i.posthog.com';
const LIVE_HOST = 'app.espaluz.lat';
const PAGES = ['/', '/auth'];

type PH = typeof import('posthog-js').default;
let ph: PH | null = null;
let loading = false;

const allowedPath = (path: string) => PAGES.includes(path.replace(/\/+$/, '') || '/');
const consented = () => { try { return localStorage.getItem('cookie-consent') === 'accepted'; } catch { return false; } };
const internal = () => { try { return localStorage.getItem('espaluz-internal') === '1'; } catch { return false; } };
const pathOf = (url: unknown) => { try { return new URL(String(url)).pathname; } catch { return ''; } };

function canRun() {
  return window.location.hostname === LIVE_HOST && !insidePlayApp() && consented() && !internal()
    && !window.location.hash.includes('access_token');
}

/** Call on every route change and once after the visitor accepts cookies. */
export async function replayRoute(pathname: string) {
  if (!ph) {
    if (loading || !allowedPath(pathname) || !canRun()) return;
    loading = true;
    const mod = await import('posthog-js');
    ph = mod.default;
    ph.init(TOKEN, {
      api_host: HOST,
      person_profiles: 'never',
      capture_pageview: false,
      capture_pageleave: true,
      disable_session_recording: true,
      session_recording: { maskAllInputs: true },
      // Nothing from a page outside PAGES ever leaves the browser.
      before_send: (event) => (event && allowedPath(pathOf(event.properties?.$current_url)) ? event : null),
    });
  }
  if (allowedPath(pathname) && canRun()) {
    ph.startSessionRecording();
    ph.capture('$pageview');
  } else {
    ph.stopSessionRecording();
  }
}

/** The same small event names GA gets (sign-up steps, door clicks) - only ever sent from PAGES. */
export function replayEvent(name: string, params: Record<string, string | number | boolean> = {}) {
  if (ph && allowedPath(window.location.pathname)) ph.capture(name, params);
}
