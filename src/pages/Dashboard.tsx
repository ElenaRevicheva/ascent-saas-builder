import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Clock, Crown } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { AccountStatusCard } from '@/components/dashboard/AccountStatusCard';
import { QuickActionsCard } from '@/components/dashboard/QuickActionsCard';
import { LearningProgressCard } from '@/components/dashboard/LearningProgressCard';
import { FeatureAccessCard } from '@/components/dashboard/FeatureAccessCard';
import { ChatWithEspaluz } from '@/components/dashboard/ChatWithEspaluz';
import { FamilyMembersManager } from '@/components/dashboard/FamilyMembersManager';
import { AvatarUpload } from '@/components/dashboard/AvatarUpload';
import { LearningModules } from '@/components/dashboard/LearningModules';
import { LearningAnalytics } from '@/components/dashboard/LearningAnalytics';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { ReferralSystem } from '@/components/ReferralSystem';
import { TelegramProgress } from '@/components/dashboard/TelegramProgress';
import { LearningOptions } from '@/components/dashboard/LearningOptions';

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
  
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const chatRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Simplified onboarding check without database queries that could hang
  useEffect(() => {
    // Skip onboarding for now to avoid hanging
    setCheckingOnboarding(false);
  }, []);

  useEffect(() => {
    const scrollToChat = () => {
      // Check if we should scroll to chat via hash or location state
      const shouldScrollToChat = window.location.hash === '#chat' || 
                                 (location.state as any)?.scrollToChat;
                                 
      if (shouldScrollToChat && chatRef.current) {
        // Simple scroll with a single timeout
        setTimeout(() => {
          chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 500);
      }
    };
    
    scrollToChat();
    window.addEventListener('hashchange', scrollToChat);
    return () => window.removeEventListener('hashchange', scrollToChat);
  }, [location.state]);

  if (loading || checkingOnboarding) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--gradient-magical)' }}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--espaluz-primary))]"></div>
        </div>
      </div>
    );
  }

  // Show onboarding flow for new users
  if (showOnboarding) {
    return (
      <OnboardingFlow 
        onComplete={() => setShowOnboarding(false)}
      />
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
        {/* Learning Analytics - Top Priority */}
        <div className="mb-8" data-learning-analytics>
          <LearningAnalytics />
        </div>

        {/* Main Dashboard Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <div data-account-status>
            <AccountStatusCard 
              planType={planType}
              isTrialActive={isTrialActive}
              trialDaysLeft={trialDaysLeft}
              isSubscriptionActive={isSubscriptionActive}
            />
          </div>
          
          <QuickActionsCard />
          
          <LearningProgressCard hasFeatureAccess={hasFeatureAccess} />
          
          <FeatureAccessCard hasFeatureAccess={hasFeatureAccess} />
        </div>

        {/* Telegram Progress - High Priority */}
        <div className="mb-8">
          <TelegramProgress />
        </div>

        {/* Learning Modules and Management */}
        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          <LearningModules />
          <div className="space-y-6">
            <AvatarUpload />
            <div data-family-members>
              <FamilyMembersManager />
            </div>
          </div>
        </div>

        {/* Referral System */}
        <div className="mb-8">
          <ReferralSystem />
        </div>
        
        {/* Chat Section - Full Width */}
        <div className="mt-8" id="chat" ref={chatRef}>
          <ChatWithEspaluz />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;