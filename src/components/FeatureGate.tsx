import { ReactNode } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Crown, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgrade?: boolean;
}

export const FeatureGate = ({ 
  feature, 
  children, 
  fallback, 
  showUpgrade = true 
}: FeatureGateProps) => {
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
          <CardTitle>Sign In Required</CardTitle>
          <CardDescription>
            Please sign in to access this feature
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Link to="/auth">
            <Button variant="hero">Sign In</Button>
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
              {trialDaysLeft} days left in trial
            </Badge>
          )}
        </div>
        <CardTitle>
          {isTrialActive ? 'Trial Feature' : 'Premium Feature'}
        </CardTitle>
        <CardDescription>
          {isTrialActive 
            ? `This feature is available during your free trial. ${trialDaysLeft} days remaining.`
            : 'Upgrade to Standard plan to access this feature'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        {!isPremium && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Get unlimited access to:
            </p>
            <ul className="text-sm text-left space-y-1 max-w-xs mx-auto">
              <li>• Unlimited AI conversations</li>
              <li>• Advanced personality modes</li>
              <li>• Voice & avatar videos</li>
              <li>• Progress analytics</li>
              <li>• Priority support</li>
            </ul>
          </div>
        )}
        
        <div className="space-y-2">
          <Link to="/#pricing">
            <Button variant="hero" className="w-full">
              {isTrialActive ? 'Upgrade to Continue' : 'Upgrade to Standard'}
            </Button>
          </Link>
          <p className="text-xs text-muted-foreground">
            Only $7.77/month • Cancel anytime
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default FeatureGate;