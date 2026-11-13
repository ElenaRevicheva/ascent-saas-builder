import { useEffect, useState } from 'react';

// 13 Nov 2026 - car mode step 1 (cto-aipa docs/espaluz/CAR_MODE_RESEARCH_2026-11-13.md). Registers public/sw.js in the
// built app only (never in the dev server, where it would keep stale files), and tells pages whether there is signal.
export function registerRoadWorker() {
  if (!import.meta.env.PROD || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => { /* no offline copy, app still works */ }); });
}

export function useOnline(): boolean {
  const [on, setOn] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const up = () => setOn(true), down = () => setOn(false);
    window.addEventListener('online', up); window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);
  return on;
}
