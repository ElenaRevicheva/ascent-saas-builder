// Utility to help recover failed subscription activations
import { supabase } from '@/integrations/supabase/client';

export interface PendingSubscriptionData {
  subscriptionId: string;
  email: string;
  fullName: string;
  planType: string;
}

/**
 * Manually activate a subscription for a user who experienced activation failure
 * This should be used by support to recover failed PayPal subscriptions
 */
export const manuallyActivateSubscription = async (
  userEmail: string, 
  paypalSubscriptionId: string, 
  planType: 'standard' | 'premium' = 'standard'
) => {
  try {
    console.log('Attempting manual subscription activation for:', userEmail, 'PayPal ID:', paypalSubscriptionId);
    
    // First, get the user by email
    const { data: users, error: userError } = await supabase
      .from('auth.users')
      .select('id')
      .eq('email', userEmail)
      .limit(1);

    if (userError) {
      console.error('Error finding user:', userError);
      return { success: false, error: 'User lookup failed: ' + userError.message };
    }

    if (!users || users.length === 0) {
      return { success: false, error: 'User not found with email: ' + userEmail };
    }

    const userId = users[0].id;

    // Check if subscription already exists
    const { data: existingSubscriptions, error: checkError } = await supabase
      .from('user_subscriptions')
      .select('id, status')
      .eq('user_id', userId)
      .eq('paypal_subscription_id', paypalSubscriptionId);

    if (checkError) {
      console.error('Error checking existing subscription:', checkError);
      return { success: false, error: 'Subscription check failed: ' + checkError.message };
    }

    if (existingSubscriptions && existingSubscriptions.length > 0) {
      return { success: false, error: 'Subscription already exists for this user and PayPal ID' };
    }

    // Create the subscription
    const { error: insertError } = await supabase
      .from('user_subscriptions')
      .insert([{
        user_id: userId,
        subscription_id: paypalSubscriptionId,
        paypal_subscription_id: paypalSubscriptionId,
        plan_type: planType,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      }]);

    if (insertError) {
      console.error('Error creating subscription:', insertError);
      return { success: false, error: 'Subscription creation failed: ' + insertError.message };
    }

    console.log('Subscription activated successfully for user:', userId, 'PayPal ID:', paypalSubscriptionId);
    return { success: true, message: 'Subscription activated successfully' };

  } catch (error: any) {
    console.error('Unexpected error in manual subscription activation:', error);
    return { success: false, error: 'Unexpected error: ' + error.message };
  }
};

/**
 * Get pending subscription data from localStorage (for debugging)
 */
export const getPendingSubscriptionData = (): PendingSubscriptionData | null => {
  try {
    const pendingData = localStorage.getItem('pending-subscription');
    return pendingData ? JSON.parse(pendingData) : null;
  } catch (error) {
    console.error('Error parsing pending subscription data:', error);
    return null;
  }
};

/**
 * Clear pending subscription data from localStorage
 */
export const clearPendingSubscriptionData = () => {
  localStorage.removeItem('pending-subscription');
};