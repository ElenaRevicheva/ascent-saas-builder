import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';

/*
 * 8 Nov 2026 (Elena: "remove all stale and fake data"): the ONE honest plan card. It replaced three cards that showed
 * typed-in numbers (Family Progress "24 this week / 7 days" for every family), a "Connect" button shown to connected
 * families (Start Learning), and a four-tier feature list with support that does not exist (Toolkit). Those components
 * stay in the code, off the dashboard. Every line in "What your plan includes" is something the code does today.
 */

interface AccountStatusCardProps {
  planType: string;
  isTrialActive: boolean;
  trialDaysLeft: number;
  isSubscriptionActive: boolean;
}

const INCLUDES = [
  'acct.inc1',
  'acct.inc2',
  'acct.inc3',
  'acct.inc4',
  'acct.inc5',
  'acct.inc6',
];

export const AccountStatusCard = ({ planType, isTrialActive, trialDaysLeft, isSubscriptionActive }: AccountStatusCardProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [renewsOn, setRenewsOn] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isSubscriptionActive) return;
    supabase.from('user_subscriptions').select('current_period_end').eq('user_id', user.id).eq('status', 'active')
      .order('current_period_end', { ascending: false }).limit(1)
      .then(({ data }) => {
        const end = data?.[0]?.current_period_end;
        if (end) setRenewsOn(new Date(end).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }));
      });
  }, [user, isSubscriptionActive]);

  const status = isSubscriptionActive ? t('acct.active') : isTrialActive ? t('acct.freeTrial') : t('acct.free');

  return (
    <Card className="border-border/50 shadow-magical" style={{ background: 'var(--gradient-card)' }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-[hsl(var(--espaluz-secondary))]" />
          {t('acct.yourPlan')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t('acct.plan')}</span>
          <span className="font-medium capitalize">{t(`acct.planNames.${planType}`, { defaultValue: planType.replace('_', ' ') })}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t('acct.status')}</span>
          <span className={`font-medium ${isSubscriptionActive || isTrialActive ? 'text-green-600' : 'text-orange-600'}`}>{status}</span>
        </div>
        {isTrialActive && !isSubscriptionActive && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('acct.trialDaysLeft')}</span>
            <span className="font-medium text-[hsl(var(--espaluz-primary))]">{trialDaysLeft}</span>
          </div>
        )}
        {renewsOn && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('acct.renewsOn')}</span>
            <span className="font-medium">{renewsOn}</span>
          </div>
        )}

        <div className="pt-2">
          <p className="text-sm font-semibold text-foreground">{t('acct.includes')}</p>
          <ul className="mt-2 space-y-1.5">
            {INCLUDES.map((line) => (
              <li key={line} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-hidden /> {t(line)}
              </li>
            ))}
          </ul>
        </div>

        {!isSubscriptionActive && (
          <Link to="/#pricing" className="block">
            <Button size="sm" className="w-full bg-gradient-to-r from-[hsl(var(--espaluz-primary))] to-[hsl(var(--espaluz-accent))] hover:opacity-90">
              {isTrialActive ? t('acct.continue11') : t('acct.choosePlan')}
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
};
