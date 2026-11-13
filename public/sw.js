/*
 * 13 Nov 2026 - EspaLuz "On the road" (car mode, step 1). Elena: Alisa's tablet has no SIM; families spend hours in the
 * car. Plan: cto-aipa docs/espaluz/CAR_MODE_RESEARCH_2026-11-13.md.
 *
 * What it does, and only this:
 * - Pages: network first; with no signal the saved app opens (the app then shows /road).
 * - The app's own files (/assets/*, icons, manifest) and the heroes' clips/pictures: kept after the first online visit.
 * - Never touches other sites (Supabase, Google, PayPal), POSTs, or anything private: only same-origin GET.
 * - Video asks for byte ranges; a saved clip answers a range itself, so heroes play offline.
 * Bump VERSION to drop old copies.
 */
const VERSION = 'espaluz-road-v1';
const SHELL = ['/', '/index.html', '/road', '/manifest.webmanifest', '/espaluz-icon-192.png', '/espaluz-icon-512.png',
  '/heroes/duo-hello.mp4', '/heroes/kids-greeting.mp4', '/heroes/titi-dance.mp4'];
const KEEP = /^\/(assets|heroes|heroes-ru|mentora|mentora-ru|kids|kids-ru|classroom|classroom-ru)\/|\.(png|jpg|jpeg|webp|svg|ico|woff2?|webmanifest)$/;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function fromRange(cached, range) {
  const buf = await cached.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(range || '');
  const size = buf.byteLength;
  let start = m && m[1] ? Number(m[1]) : 0;
  let end = m && m[2] ? Number(m[2]) : size - 1;
  if (m && !m[1] && m[2]) { start = size - Number(m[2]); end = size - 1; }
  end = Math.min(end, size - 1);
  return new Response(buf.slice(start, end + 1), { status: 206, headers: {
    'Content-Type': cached.headers.get('Content-Type') || 'video/mp4', 'Content-Range': `bytes ${start}-${end}/${size}`,
    'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' } });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put('/index.html', copy)); }
      return res;
    }).catch(() => caches.match('/index.html').then((r) => r || caches.match('/'))));
    return;
  }

  if (!KEEP.test(url.pathname)) return;
  const range = req.headers.get('range');
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const cached = await cache.match(url.pathname);
    if (cached) return range ? fromRange(cached, range) : cached;
    try {
      if (range) {
        // Play now from the network; keep the whole file quietly for the road.
        e.waitUntil(fetch(url.pathname).then((full) => full.ok && full.status === 200 ? cache.put(url.pathname, full) : null).catch(() => null));
        return await fetch(req);
      }
      const res = await fetch(req);
      if (res.ok && res.status === 200) cache.put(url.pathname, res.clone());
      return res;
    } catch {
      return new Response('', { status: 504, statusText: 'offline' });
    }
  })());
});
