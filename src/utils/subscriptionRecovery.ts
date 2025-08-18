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
    
    // Try multiple approaches to find the user
    let userId = null;
    let userLookupError = null;

    // Approach 1: Look up user by checking if we can find their profile
    // This assumes the user has already created an account and profile
    try {
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
      
      if (!listError && users) {
        const foundUser = users.find(u => u.email === userEmail);
        if (foundUser) {
          userId = foundUser.id;
          console.log('Found user via admin.listUsers:', userId);
        }
      } else {
        console.log('Admin listUsers not available, trying profile lookup');
      }
    } catch (error) {
      console.log('Auth admin not available, trying alternative lookup');
    }

    // Approach 2: If admin access isn't available, try to find user through existing subscriptions
    if (!userId) {
      try {
        const { data: existingSubs, error: subError } = await supabase
          .from('user_subscriptions')
          .select('user_id')
          .eq('paypal_subscription_id', paypalSubscriptionId)
          .limit(1);

        if (!subError && existingSubs && existingSubs.length > 0) {
          userId = existingSubs[0].user_id;
          console.log('Found user via existing subscription:', userId);
        }
      } catch (error) {
        console.log('Could not lookup via existing subscriptions');
      }
    }

    // Approach 3: Manual user ID input (for admin use)
    // If we still can't find the user, provide helpful error message
    if (!userId) {
      return { 
        success: false, 
        error: `Could not automatically find user with email: ${userEmail}. This could mean:
        1. The user hasn't created an account yet
        2. The email address is incorrect
        3. Database permissions don't allow user lookup
        
        Please verify:
        - The user has successfully created an account
        - The email address is exactly correct
        - Try using the user's UUID directly if known` 
      };
    }

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