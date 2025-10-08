import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from './keys';
import { useAuth } from '@/hooks/useAuth';

interface SubscriptionStatus {
  status: string;
  plan_type: string;
  trial_days_left: number;
  is_trial_active: boolean;
  is_subscription_active: boolean;
}

const fetchSubscriptionStatus = async (userId: string): Promise<SubscriptionStatus> => {
  const { data, error } = await supabase
    .rpc('get_user_subscription_status', { user_uuid: userId });
  
  if (error) throw error;
  
  if (data?.[0]) {
    return data[0];
  }
  
  // Default trial status
  return {
    status: 'free_trial',
    plan_type: 'free_trial',
    trial_days_left: 7,
    is_trial_active: true,
    is_subscription_active: false,
  };
};

export const useSubscriptionQuery = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.subscription(user?.id ?? ''),
    queryFn: () => fetchSubscriptionStatus(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const createSubscriptionMutation = useMutation({
    mutationFn: async (paypalSubscriptionId: string) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          subscription_id: paypalSubscriptionId,
          paypal_subscription_id: paypalSubscriptionId,
          status: 'active',
          plan_type: 'standard',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch subscription
      queryClient.invalidateQueries({ queryKey: queryKeys.subscription(user?.id ?? '') });
    },
  });

  const hasFeatureAccess = (feature: string): boolean => {
    if (!query.data) return false;
    
    // Free trial users get all features
    if (query.data.is_trial_active) return true;
    
    // Subscribed users get all features
    if (query.data.is_subscription_active) return true;
    
    // Free users only get basic features
    const freeFeatures = ['basic_conversation', 'telegram_integration'];
    return freeFeatures.includes(feature);
  };

  return {
    subscription: query.data,
    isLoading: query.isLoading,
    error: query.error,
    createSubscription: createSubscriptionMutation.mutateAsync,
    hasFeatureAccess,
    isPremium: query.data?.is_subscription_active || query.data?.is_trial_active || false,
  };
};
