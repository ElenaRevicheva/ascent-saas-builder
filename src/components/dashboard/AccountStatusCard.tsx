import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

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
  "Pere & Titi's classroom for your child",
  'EspaLuz for grown-ups here on the web, on WhatsApp and on Telegram',
  'One family memory across all of them - see and correct it in card 7 of your map',
  'Life in your new country: customs, holidays and local words from checked sources',
  'Voice replies, and the talking EspaLuz on the paid plan',
  'Your weekly overview: the days you practised and what your child worked on',
];

export const AccountStatusCard = ({ planType, isTrialActive, trialDaysLeft, isSubscriptionActive }: AccountStatusCardProps) => {
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

  const status = isSubscriptionActive ? 'Active' : isTrialActive ? 'Free trial' : 'Free';

  return (
    <Card className="border-border/50 shadow-magical" style={{ background: 'var(--gradient-card)' }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-[hsl(var(--espaluz-secondary))]" />
          Your plan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Plan</span>
          <span className="font-medium capitalize">{planType.replace('_', ' ')}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Status</span>
          <span className={`font-medium ${isSubscriptionActive || isTrialActive ? 'text-green-600' : 'text-orange-600'}`}>{status}</span>
        </div>
        {isTrialActive && !isSubscriptionActive && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Trial days left</span>
            <span className="font-medium text-[hsl(var(--espaluz-primary))]">{trialDaysLeft}</span>
          </div>
        )}
        {renewsOn && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Renews on</span>
            <span className="font-medium">{renewsOn}</span>
          </div>
        )}

        <div className="pt-2">
          <p className="text-sm font-semibold text-foreground">What your plan includes</p>
          <ul className="mt-2 space-y-1.5">
            {INCLUDES.map((line) => (
              <li key={line} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-hidden /> {line}
              </li>
            ))}
          </ul>
        </div>

        {!isSubscriptionActive && (
          <Link to="/#pricing" className="block">
            <Button size="sm" className="w-full bg-gradient-to-r from-[hsl(var(--espaluz-primary))] to-[hsl(var(--espaluz-accent))] hover:opacity-90">
              {isTrialActive ? 'Continue for $11 a month' : 'Choose your plan'}
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
};
