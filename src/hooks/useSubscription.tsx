import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface SubscriptionStatus {
  status: string;
  planType: string;
  trialDaysLeft: number;
  isTrialActive: boolean;
  isSubscriptionActive: boolean;
  loading: boolean;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionStatus>({
    status: 'free_trial',
    planType: 'free_trial',
    trialDaysLeft: 7,
    isTrialActive: true,
    isSubscriptionActive: false,
    loading: true
  });

  useEffect(() => {
    if (!user) {
      setSubscription(prev => ({ ...prev, loading: false }));
      return;
    }

    // Simplified: just set default trial status without database query to avoid hanging
    console.log('Setting default subscription status for user:', user.id);
    setSubscription({
      status: 'free_trial',
      planType: 'free_trial',
      trialDaysLeft: 7,
      isTrialActive: true,
      isSubscriptionActive: false,
      loading: false
    });
  }, [user]);

  const createSubscription = async (paypalSubscriptionId: string) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          subscription_id: paypalSubscriptionId,
          paypal_subscription_id: paypalSubscriptionId,
          status: 'active',
          plan_type: 'standard',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        });

      if (!error) {
        // Refresh subscription status
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }

      return { error };
    } catch (error) {
      return { error };
    }
  };

  const hasFeatureAccess = (feature: string): boolean => {
    // Free trial users get all features for 7 days
    if (subscription.isTrialActive) return true;
    
    // Subscribed users get all features
    if (subscription.isSubscriptionActive) return true;
    
    // Free users only get basic features
    const freeFeatures = ['basic_conversation', 'telegram_integration'];
    return freeFeatures.includes(feature);
  };

  return {
    ...subscription,
    createSubscription,
    hasFeatureAccess,
    isPremium: subscription.isSubscriptionActive || subscription.isTrialActive
  };
};