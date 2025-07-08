import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface AccountStatusCardProps {
  planType: string;
  isTrialActive: boolean;
  trialDaysLeft: number;
  isSubscriptionActive: boolean;
}

export const AccountStatusCard = ({ 
  planType, 
  isTrialActive, 
  trialDaysLeft, 
  isSubscriptionActive 
}: AccountStatusCardProps) => {
  const { t } = useTranslation();
  
  return (
    <Card className="border-border/50 shadow-magical" style={{ background: 'var(--gradient-card)' }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-[hsl(var(--espaluz-secondary))]" />
          {t('account.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t('account.plan')}</span>
          <span className="font-medium capitalize">{planType.replace('_', ' ')}</span>
        </div>
        
        {isTrialActive && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('account.trialDaysLeft')}</span>
            <span className="font-medium text-[hsl(var(--espaluz-primary))]">{trialDaysLeft}</span>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t('account.status')}</span>
          <span className={`font-medium ${isSubscriptionActive || isTrialActive ? 'text-green-600' : 'text-orange-600'}`}>
            {isSubscriptionActive ? t('account.active') : isTrialActive ? t('account.trial') : t('account.free')}
          </span>
        </div>

        {!isSubscriptionActive && (
          <Link to="/#pricing" className="block">
            <Button 
              size="sm" 
              className="w-full bg-gradient-to-r from-[hsl(var(--espaluz-primary))] to-[hsl(var(--espaluz-accent))] hover:opacity-90"
            >
              {t('account.upgradeNow')}
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
};