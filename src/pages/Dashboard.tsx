import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { ReferralSystem } from '@/components/ReferralSystem';
import { FamilyNextSteps } from '@/components/dashboard/FamilyNextSteps';
import { BelongingPath } from '@/components/dashboard/BelongingPath';
import { TelegramProgress } from '@/components/dashboard/TelegramProgress';
import { LearningModules } from '@/components/dashboard/LearningModules';
import { LearningOptions } from '@/components/dashboard/LearningOptions';
import { FamilyRoadmap } from '@/components/dashboard/FamilyRoadmap';
import { ClassCard } from '@/components/dashboard/ClassCard';
import SubscriptionFlow from '@/components/SubscriptionFlow';
import SubscriptionRecovery from '@/components/SubscriptionRecovery';
import { insidePlayApp, restorePlayPurchases } from '@/lib/playBilling';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const Dashboard = () => {
  const { t } = useTranslation();
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
      return <Badge variant="default" className="bg-green-500"><Crown className="h-3 w-3 mr-1" />{t('badge.standard')}</Badge>;
    }
    if (isTrialActive) {
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />{t('badge.trial', { count: trialDaysLeft })}</Badge>;
    }
    return <Badge variant="outline">{t('badge.free')}</Badge>; // 19 Nov 2026: the header badge was English on ES/RU dashboards
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

        {/* 15 Nov 2026 (Elena: one memory across all channels, no duplicates): the family's week - last heard per channel,
            the timeline from WhatsApp / Telegram / the app / the classroom, next steps with Done / Not now, phrases to keep.
            It replaces LearningAnalytics here (its week dots and talk counts now live inside it; the file stays). */}
        {/* 18 Nov 2026: "<child>'s class" - the class's own numbers (ClassCard); after the chat, per the 8 Nov order. */}
        <div className="mb-8">
          <ClassCard />
        </div>
        {/* 15 Nov 2026 (Elena): "Your first year in <country>" - the heart of the dashboard (BelongingPath). */}
        <div className="mb-8">
          <BelongingPath />
        </div>

        <div className="mb-8" data-learning-analytics>
          <FamilyNextSteps />
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

        {/* 15 Nov 2026 (Elena: "these features should be present, but serve the goals, not generic simulations"):
            the journey block and the lessons are back where they were, now fed by real data - every channel, measured
            conversations and time, phrases EspaLuz taught; lessons from the family's checked country guide first, the
            original five below, Start fixed. Audit: cto-aipa docs/espaluz/DASHBOARD_PROGRESS_AUDIT_2026-11-15.md. */}
        <div className="mb-8">
          <TelegramProgress />
        </div>

        {/* grid-cols-1 = minmax(0,1fr): on a phone the one column fits the screen instead of growing to its widest row
            (iPhone WebKit test 15 Nov: the cards were 8 px wider than a 390 px screen). */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
          <LearningModules />
          <div className="space-y-6">
            <AvatarUpload />
            <div data-family-members>
              <FamilyMembersManager />
            </div>
          </div>
        </div>

        {/* Referral System. 18 Nov 2026: whole-dashboard readers scored the two referral cards 1/5 in EN/ES/RU ("takes
            prime screen space on day two") - folded into one line; card 7 of the map ("Invite") opens it. */}
        <details className="mb-8 rounded-xl border border-border/60 bg-card" data-referrals>
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-foreground">🎁 {t('ref.fold')}</summary>
          <div className="px-2 pb-2"><ReferralSystem /></div>
        </details>

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