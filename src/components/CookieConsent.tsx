import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Cookie } from 'lucide-react';
import { Link } from 'react-router-dom';

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
  };

  const declineCookies = () => {
    localStorage.setItem('cookie-consent', 'declined');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:max-w-md">
      <Card className="p-4 shadow-lg border-border bg-card">
        <div className="flex items-start gap-3">
          <Cookie className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-2">{t("cookie.title")}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t("cookie.body")}
            </p>
            <div className="flex gap-2 mb-2">
              <Button 
                onClick={acceptCookies} 
                size="sm" 
                className="flex-1"
              >
                {t("cookie.accept")}
              </Button>
              <Button 
                onClick={declineCookies} 
                variant="outline" 
                size="sm"
                className="flex-1"
              >
                {t("cookie.decline")}
              </Button>
            </div>
            <Link 
              to="/privacy-policy" 
              className="text-xs text-primary hover:underline"
            >
              {t("cookie.more")}
            </Link>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowBanner(false)}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
};