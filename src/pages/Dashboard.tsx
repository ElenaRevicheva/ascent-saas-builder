import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { Badge } from '@/components/ui/badge';
import { Clock, Crown } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { AccountStatusCard } from '@/components/dashboard/AccountStatusCard';
import { QuickActionsCard } from '@/components/dashboard/QuickActionsCard';
import { LearningProgressCard } from '@/components/dashboard/LearningProgressCard';
import { FeatureAccessCard } from '@/components/dashboard/FeatureAccessCard';
import { ChatWithEspaluz } from '@/components/dashboard/ChatWithEspaluz';
import { FamilyMembersManager } from '@/components/dashboard/FamilyMembersManager';

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { 
    planType, 
    trialDaysLeft, 
    isTrialActive, 
    isSubscriptionActive, 
    hasFeatureAccess,
    loading 
  } = useSubscription();

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--gradient-magical)' }}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--espaluz-primary))]"></div>
        </div>
      </div>
    );
  }

  const getStatusBadge = () => {
    if (isSubscriptionActive) {
      return <Badge variant="default" className="bg-green-500"><Crown className="h-3 w-3 mr-1" />Standard</Badge>;
    }
    if (isTrialActive) {
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />{trialDaysLeft} days trial</Badge>;
    }
    return <Badge variant="outline">Free</Badge>;
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--gradient-magical)' }}>
      <DashboardHeader 
        user={user} 
        getStatusBadge={getStatusBadge} 
        signOut={signOut} 
      />

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <AccountStatusCard 
            planType={planType}
            isTrialActive={isTrialActive}
            trialDaysLeft={trialDaysLeft}
            isSubscriptionActive={isSubscriptionActive}
          />
          
          <QuickActionsCard />
          
          <LearningProgressCard hasFeatureAccess={hasFeatureAccess} />
          
          <FeatureAccessCard hasFeatureAccess={hasFeatureAccess} />
        </div>
        
        {/* Family Members Manager */}
        <div className="mt-8">
          <FamilyMembersManager />
        </div>
        
        {/* Chat Section - Full Width */}
        <div className="mt-8">
          <ChatWithEspaluz />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;