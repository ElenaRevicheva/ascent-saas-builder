import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown } from 'lucide-react';
import { Link } from 'react-router-dom';

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
  return (
    <Card className="border-border/50 shadow-magical" style={{ background: 'var(--gradient-card)' }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-[hsl(var(--espaluz-secondary))]" />
          Your Spanish Journey
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Plan</span>
          <span className="font-medium capitalize">{planType.replace('_', ' ')}</span>
        </div>
        
        {isTrialActive && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Trial Days Left</span>
            <span className="font-medium text-[hsl(var(--espaluz-primary))]">{trialDaysLeft}</span>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Status</span>
          <span className={`font-medium ${isSubscriptionActive || isTrialActive ? 'text-green-600' : 'text-orange-600'}`}>
            {isSubscriptionActive ? '¡Activo!' : isTrialActive ? '¡Prueba!' : 'Gratis'}
          </span>
        </div>

        {!isSubscriptionActive && (
          <Link to="/#pricing" className="block">
            <Button 
              size="sm" 
              className="w-full bg-gradient-to-r from-[hsl(var(--espaluz-primary))] to-[hsl(var(--espaluz-accent))] hover:opacity-90"
            >
              ¡Upgrade Now! ⭐
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
};