import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { buyOnPlay, playBillingAvailable, playPrice } from '@/lib/playBilling';

/**
 * 7 Nov 2026 — the subscribe screen inside the EspaLuz Play app. Play policy: in the Play app the subscription is sold
 * through Google Play only, so this replaces the PayPal flow there; the website keeps PayPal / PagueloFacil.
 * A family signs in first, so the purchase is tied to their EspaLuz account (play-verify checks it with Google).
 */
export function PlaySubscribe({ onSuccess }: { onSuccess?: (id: string) => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [ready, setReady] = useState<boolean | null>(null);
  const [price, setPrice] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'buying' | 'done' | 'failed'>('idle');

  useEffect(() => {
    playBillingAvailable().then(setReady);
    playPrice().then(setPrice);
  }, []);

  const buy = async () => {
    setState('buying');
    const r = await buyOnPlay();
    setState(r.ok ? 'done' : 'failed');
    if (r.ok) onSuccess?.('google-play');
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>EspaLuz {price ? `· ${price} / ${t('play.month')}` : ''}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-center">
        {!user ? (
          <>
            <p className="text-sm">{t("play.signFirst")}</p>
            <Button className="w-full" onClick={() => window.location.assign('/auth')}>{t("play.signIn")}</Button>
          </>
        ) : ready === false ? (
          <p className="text-sm text-muted-foreground">
            {t("play.na")}
          </p>
        ) : state === 'done' ? (
          <p className="text-sm font-semibold">{t("play.done")}</p>
        ) : (
          <>
            {/* 12 Nov 2026 (Elena's phone): the bilingual label ran off both edges - it wraps now. */}
            <Button className="w-full h-auto min-h-11 whitespace-normal py-3 leading-snug" size="lg" disabled={ready !== true || state === 'buying'} onClick={buy}>
              {state === 'buying' ? '…' : t("play.buy")}
            </Button>
            {state === 'failed' && (
              <p className="text-sm text-red-600">{t("play.fail")}</p>
            )}
            <p className="text-xs text-muted-foreground">{t("play.cancel")}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
