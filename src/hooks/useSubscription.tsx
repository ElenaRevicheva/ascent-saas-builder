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
    loading: false
  });

  useEffect(() => {
    // Default trial status is already set in useState for instant loading
    if (user) {
      // Async background check for actual subscription status (non-blocking)
      setTimeout(async () => {
        try {
          const { data } = await supabase
            .rpc('get_user_subscription_status', { user_uuid: user.id });
          
          if (data?.[0]) {
            setSubscription({
              status: data[0].status,
              planType: data[0].plan_type,
              trialDaysLeft: data[0].trial_days_left,
              isTrialActive: data[0].is_trial_active,
              isSubscriptionActive: data[0].is_subscription_active,
              loading: false
            });
          }
        } catch (error) {
          console.error('Error fetching subscription status:', error);
          // Keep default trial status on error
        }
      }, 100);
    }
  }, [user]);

  const createSubscription = async (paypalSubscriptionId: string) => {
    if (!user) {
      console.error('User not authenticated for subscription creation');
      return { error: 'User not authenticated. Please log in to subscribe.' };
    }

    try {
      console.log('Creating subscription for user:', user.id, 'PayPal ID:', paypalSubscriptionId);
      
      const { data, error } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          subscription_id: paypalSubscriptionId,
          paypal_subscription_id: paypalSubscriptionId,
          status: 'active',
          plan_type: 'standard',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        })
        .select();

      if (error) {
        console.error('Database error creating subscription:', error);
        return { error: error.message };
      }

      console.log('Subscription created successfully:', data);

      // Refresh subscription status after successful creation
      setTimeout(() => {
        window.location.reload();
      }, 1500);

      return { error: null };
    } catch (error: any) {
      console.error('Unexpected error creating subscription:', error);
      return { error: error.message || 'Failed to create subscription' };
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
