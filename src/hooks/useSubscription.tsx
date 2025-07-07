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

    const fetchSubscriptionStatus = async () => {
      try {
        const { data, error } = await supabase.rpc('get_user_subscription_status', {
          user_uuid: user.id
        });

        if (error) {
          console.error('Error fetching subscription:', error);
          return;
        }

        if (data && data.length > 0) {
          const subData = data[0];
          setSubscription({
            status: subData.status,
            planType: subData.plan_type,
            trialDaysLeft: subData.trial_days_left,
            isTrialActive: subData.is_trial_active,
            isSubscriptionActive: subData.is_subscription_active,
            loading: false
          });
        }
      } catch (error) {
        console.error('Error fetching subscription status:', error);
        setSubscription(prev => ({ ...prev, loading: false }));
      }
    };

    fetchSubscriptionStatus();
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