import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Clock, Crown } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { AccountStatusCard } from '@/components/dashboard/AccountStatusCard';
import { ChatWithEspaluz } from '@/components/dashboard/ChatWithEspaluz';
import { FamilyMembersManager } from '@/components/dashboard/FamilyMembersManager';
import { AvatarUpload } from '@/components/dashboard/AvatarUpload';
import { LearningModules } from '@/components/dashboard/LearningModules';
import { LearningAnalytics } from '@/components/dashboard/LearningAnalytics';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { ReferralSystem } from '@/components/ReferralSystem';
import { TelegramProgress } from '@/components/dashboard/TelegramProgress';
import { LearningOptions } from '@/components/dashboard/LearningOptions';
import { FamilyRoadmap } from '@/components/dashboard/FamilyRoadmap';
import SubscriptionFlow from '@/components/SubscriptionFlow';
import SubscriptionRecovery from '@/components/SubscriptionRecovery';
import { insidePlayApp, restorePlayPurchases } from '@/lib/playBilling';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const navigate = useNavigate();

  // 11 Nov 2026: the dashboard is for a signed-in family only. The Android app opens /dashboard, and with no session it
  // used to show "Hello, !" and a trial badge to nobody. useAuth sets loading=false before the session is read, so we
  // ask Supabase for the session here and send a visitor to the home page (palms + avatar films) instead.
  useEffect(() => {
    insidePlayApp(); // remember "inside the Play app" before the referrer is lost
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate({ pathname: '/', search: location.search }, { replace: true });
      else setCheckingOnboarding(false);
    }).catch(() => navigate({ pathname: '/', search: location.search }, { replace: true }));
  }, []);

  // 7 Nov 2026: inside the Play app, a subscription bought earlier (or on another phone) is checked with Google on open,
  // so a paying family is never locked out. Does nothing on the website.
  useEffect(() => {
    if (user && insidePlayApp()) restorePlayPurchases();
  }, [user]);

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

  // Remove loading spinner for instant dashboard rendering
  if (checkingOnboarding) {
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
        {/* Subscription Recovery - Critical Issues */}
        <div className="mb-8">
          <SubscriptionRecovery />
        </div>

        {/* Family map - always visible, ticks real steps (4 Nov 2026) */}
        <div className="mb-8">
          <FamilyRoadmap />
        </div>

        {/* Chat Section - Full Width. 8 Nov 2026 (Elena): right after the family map, before the learning journey. */}
        <div className="mb-8" id="chat" ref={chatRef}>
          <ChatWithEspaluz 
            onUpgradeClick={() => {
              setShowSubscriptionDialog(true);
            }}
          />
        </div>

        {/* Learning Analytics */}
        <div className="mb-8" data-learning-analytics>
          <LearningAnalytics />
        </div>

        {/* 8 Nov 2026 (Elena: "remove all stale and fake data"): one honest plan card. QuickActionsCard (a "Connect" button
            shown to connected families), LearningProgressCard ("24 this week / 7 days" typed into the code) and
            FeatureAccessCard (tiers and support that do not exist) are off the dashboard; their files stay. */}
        <div className="mb-8 max-w-2xl" data-account-status>
          <AccountStatusCard 
            planType={planType}
            isTrialActive={isTrialActive}
            trialDaysLeft={trialDaysLeft}
            isSubscriptionActive={isSubscriptionActive}
          />
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
        <div className="mb-8" data-referrals>
          <ReferralSystem />
        </div>

      </div>

      {/* Direct Subscription Dialog */}
      <Dialog open={showSubscriptionDialog} onOpenChange={setShowSubscriptionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
               Upgrade to Unlimited EspaLuz!
            </DialogTitle>
          </DialogHeader>
          <SubscriptionFlow
            planType="standard"
            onSuccess={(subscriptionId) => {
              console.log('Subscription successful:', subscriptionId);
              setShowSubscriptionDialog(false);
              // Don't redirect immediately, let the PayPal flow handle it
            }}
            onError={(error) => {
              console.error('Subscription error:', error);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;