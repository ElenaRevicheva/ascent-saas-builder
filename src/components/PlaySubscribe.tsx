import { useEffect, useState } from 'react';
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
        <CardTitle>EspaLuz {price ? `· ${price} / mes · month` : ''}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-center">
        {!user ? (
          <>
            <p className="text-sm">Primero entra a tu cuenta. / Please sign in first.</p>
            <Button className="w-full" onClick={() => window.location.assign('/auth')}>Entrar / Sign in</Button>
          </>
        ) : ready === false ? (
          <p className="text-sm text-muted-foreground">
            Google Play no está disponible ahora. Inténtalo más tarde. / Google Play is not available right now. Please try later.
          </p>
        ) : state === 'done' ? (
          <p className="text-sm font-semibold">¡Listo! Tu suscripción está activa. / Done! Your subscription is active.</p>
        ) : (
          <>
            <Button className="w-full" size="lg" disabled={ready !== true || state === 'buying'} onClick={buy}>
              {state === 'buying' ? '…' : 'Suscribirme con Google Play / Subscribe with Google Play'}
            </Button>
            {state === 'failed' && (
              <p className="text-sm text-red-600">No se completó. No se cobró nada extra. / It did not complete. Nothing extra was charged.</p>
            )}
            <p className="text-xs text-muted-foreground">Cancela cuando quieras en Google Play. / Cancel any time in Google Play.</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
