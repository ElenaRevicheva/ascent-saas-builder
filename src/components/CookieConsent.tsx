import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { replayRoute } from '@/lib/posthogReplay';
import { loadHubSpotChat } from '@/lib/hubspotChat';

export const CookieConsent = () => {
  const { t } = useTranslation();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      // Show banner after a short delay
      setTimeout(() => setShowBanner(true), 1000);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setShowBanner(false);
    // 16 Nov 2026: PostHog starts only now (front page / sign-in page only), never before this click.
    void replayRoute(window.location.pathname).catch(() => undefined);
    loadHubSpotChat(); // 21 Nov 2026: HubSpot's chat (support door) also waits for this click
  };

  const declineCookies = () => {
    localStorage.setItem('cookie-consent', 'declined');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  // 16 Nov 2026 (Elena, from the live audit: the cookie box covered the bottom 29% of a phone's first screen, on top of
  // the headline): one thin strip on the bottom edge. Honest short text - nothing is counted before "Accept"
  // (PostHog waits for it; the old line said "by continuing, you agree", which was not true).
  return (
    <div role="region" aria-label={t("cookie.title")}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card px-3 py-2 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
      <div className="mx-auto flex max-w-3xl items-center gap-2">
        <p className="min-w-0 flex-1 text-xs leading-snug text-muted-foreground">
          {t("cookie.short")}{' '}
          <Link to="/privacy-policy" className="text-primary underline-offset-2 hover:underline">{t("cookie.privacy")}</Link>
        </p>
        <Button onClick={declineCookies} variant="ghost" size="sm" className="h-8 shrink-0 px-2 text-xs">
          {t("cookie.decline")}
        </Button>
        <Button onClick={acceptCookies} size="sm" className="h-8 shrink-0 px-3 text-xs">
          {t("cookie.accept")}
        </Button>
      </div>
    </div>
  );
};