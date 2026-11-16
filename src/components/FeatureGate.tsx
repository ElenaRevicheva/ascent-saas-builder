import { ReactNode } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Crown, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { insidePlayApp } from '@/lib/playBilling';
import { PlaySubscribe } from '@/components/PlaySubscribe';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgrade?: boolean;
}

/**
 * 11 Nov 2026 (Elena: "how can the trial end if it has just started today? … he will think it's a scam").
 * A family that opens the Android app with an account made long ago (her test account: July 2025) saw only
 * "Your free trial has ended". True, but with no dates it reads like a trick. Same clock as
 * get_user_subscription_status: app_metadata.trial_until (bot families) or account creation + 14 days.
 */
const trialEndedText = (user: { created_at?: string; app_metadata?: Record<string, unknown> } | null, t: TFunction): string => {
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  const created = user?.created_at ? new Date(user.created_at) : null;
  const fromBot = typeof user?.app_metadata?.trial_until === 'string' ? new Date(user.app_metadata.trial_until as string) : null;
  const end = fromBot ?? (created ? new Date(created.getTime() + 14 * 86400000) : null);
  if (!end || isNaN(end.getTime())) return t('misc.gateEndedUnknown');
  if (!fromBot && created) {
    return t('misc.gateEndedFromCreated', { created: fmt(created), end: fmt(end) });
  }
  return t('misc.gateEnded', { end: fmt(end) });
};

export const FeatureGate = ({
  feature, 
  children, 
  fallback, 
  showUpgrade = true 
}: FeatureGateProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { hasFeatureAccess, isTrialActive, trialDaysLeft, isPremium, loading } = useSubscription();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <Card className="border-border shadow-card">
        <CardHeader className="text-center">
          <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <CardTitle>{t('misc.gateSignInTitle')}</CardTitle>
          <CardDescription>
            {t('misc.gateSignInBody')}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Link to="/auth">
            <Button variant="hero">{t('nav.signIn')}</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (hasFeatureAccess(feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgrade) {
    return null;
  }

  return (
    <Card className="border-border shadow-card">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Crown className="h-12 w-12 text-yellow-500" />
          {isTrialActive && (
            <Badge variant="secondary" className="ml-2">
              <Clock className="h-3 w-3 mr-1" />
              {t('misc.gateDaysLeft', { count: trialDaysLeft })}
            </Badge>
          )}
        </div>
        <CardTitle>
          {isTrialActive ? t('misc.gateTrialTitle') : t('misc.gatePaidTitle')}
        </CardTitle>
        <CardDescription>
          {isTrialActive 
            ? t('misc.gateTrialBody', { count: trialDaysLeft })
            : trialEndedText(user, t)
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        {!isPremium && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {t('misc.gateAccessTo')}
            </p>
            <ul className="text-sm text-left space-y-1 max-w-xs mx-auto">
              <li>• {t('misc.gateB1')}</li>
              <li>• {t('misc.gateB2')}</li>
              <li>• {t('misc.gateB3')}</li>
              <li>• {t('misc.gateB4')}</li>
            </ul>
          </div>
        )}
        
        <div className="space-y-2">
          {/* 12 Nov 2026 (Elena, Play app as Kira): this button linked to "/#pricing" - inside the app it landed on the TOP
              of the home page, so "Get EspaLuz Family" looked like it led nowhere. In the Play app the Google Play
              purchase now opens right here (the same PlaySubscribe as the pricing card); the website keeps the link. */}
          {insidePlayApp() ? (
            <PlaySubscribe onSuccess={() => window.location.reload()} />
          ) : (
            <Link to="/#pricing">
              <Button variant="hero" className="w-full">
                {isTrialActive ? t('misc.gateUpgrade') : t('misc.gateGet')}
              </Button>
            </Link>
          )}
          {/* 11 Nov 2026: inside the Play app Google allows ONLY Google Play billing and no mention of other ways to pay
              (Payments policy). This line named PayPal and PágueloFácil in the app - a review risk. The website keeps it. */}
          {/* 12 Nov 2026: in the Play app the purchase card above already shows Google's price and "cancel any time" -
              this line only repeated it, so it shows on the website only. */}
          {!insidePlayApp() && (
            <p className="text-xs text-muted-foreground">
              {t('misc.gatePayNote')}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FeatureGate;