import { useSubscriptionQuery } from '@/queries/useSubscriptionQuery';

// Re-export with backwards-compatible interface
export const useSubscription = () => {
  const { subscription, isLoading, createSubscription, hasFeatureAccess, isPremium } = useSubscriptionQuery();
  
  return {
    status: subscription?.status ?? 'free_trial',
    planType: subscription?.plan_type ?? 'free_trial',
    trialDaysLeft: subscription?.trial_days_left ?? 7,
    isTrialActive: subscription?.is_trial_active ?? true,
    isSubscriptionActive: subscription?.is_subscription_active ?? false,
    loading: isLoading,
    createSubscription: async (paypalSubscriptionId: string) => {
      try {
        await createSubscription(paypalSubscriptionId);
        return { error: null };
      } catch (error: any) {
        console.error('Error creating subscription:', error);
        return { error: error.message || 'Failed to create subscription' };
      }
    },
    hasFeatureAccess,
    isPremium,
  };
};
