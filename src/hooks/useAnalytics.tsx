import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsEvent {
  event_type: string;
  event_data?: Record<string, any>;
  source?: string;
}

export const useAnalytics = () => {
  const { user } = useAuth();

  const trackEvent = async (event: AnalyticsEvent) => {
    if (!user) return;

    try {
      // Track in learning_sessions table for now (we can create a dedicated analytics table later)
      await supabase
        .from('learning_sessions')
        .insert({
          user_id: user.id,
          session_type: 'analytics',
          source: event.source || 'web',
          content: {
            event_type: event.event_type,
            timestamp: new Date().toISOString(),
            ...event.event_data
          },
          progress_data: {}
        });
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  };

  const trackUserSignup = async (method: string = 'email') => {
    await trackEvent({
      event_type: 'user_signup',
      event_data: { method },
      source: 'web'
    });
  };

  const trackReferralUsed = async (referralCode: string) => {
    await trackEvent({
      event_type: 'referral_used',
      event_data: { referral_code: referralCode },
      source: 'web'
    });
  };

  const trackFeatureUsage = async (feature: string, data?: Record<string, any>) => {
    await trackEvent({
      event_type: 'feature_usage',
      event_data: { feature, ...data },
      source: 'web'
    });
  };

  const trackPageView = async (page: string) => {
    await trackEvent({
      event_type: 'page_view',
      event_data: { page, url: window.location.href },
      source: 'web'
    });
  };

  const trackSubscriptionEvent = async (event: 'started' | 'cancelled' | 'upgraded', planType?: string) => {
    await trackEvent({
      event_type: 'subscription_event',
      event_data: { event, plan_type: planType },
      source: 'web'
    });
  };

  // Auto-track page views
  useEffect(() => {
    if (user) {
      const currentPage = window.location.pathname;
      trackPageView(currentPage);
    }
  }, [user]); // Removed window.location.pathname to prevent infinite re-renders

  return {
    trackEvent,
    trackUserSignup,
    trackReferralUsed,
    trackFeatureUsage,
    trackPageView,
    trackSubscriptionEvent
  };
};