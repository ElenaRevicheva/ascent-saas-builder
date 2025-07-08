import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useReferralTracking = () => {
  useEffect(() => {
    // Check for referral code in URL on app load
    const urlParams = new URLSearchParams(window.location.search);
    const referralCode = urlParams.get('ref');
    
    if (referralCode) {
      // Store referral code in localStorage for later use during signup
      localStorage.setItem('referralCode', referralCode);
      
      // Track the click for analytics
      trackReferralClick(referralCode);
    }
  }, []);

  const trackReferralClick = async (referralCode: string) => {
    try {
      // This could be expanded to track referral clicks in analytics
      console.log('Referral click tracked:', referralCode);
    } catch (error) {
      console.error('Error tracking referral click:', error);
    }
  };

  const processReferralSignup = async (newUserId: string) => {
    try {
      const referralCode = localStorage.getItem('referralCode');
      if (!referralCode) return;

      // Update the referral record to mark conversion
      const { error } = await supabase
        .from('referrals')
        .update({
          referred_user_id: newUserId,
          converted_at: new Date().toISOString()
        })
        .eq('referral_code', referralCode)
        .is('referred_user_id', null); // Only update if not already converted

      if (error) throw error;

      // Create rewards for both referrer and referred user
      const { data: referral } = await supabase
        .from('referrals')
        .select('referrer_user_id, id')
        .eq('referral_code', referralCode)
        .single();

      if (referral) {
        // Create reward for referrer
        await supabase
          .from('referral_rewards')
          .insert({
            user_id: referral.referrer_user_id,
            referral_id: referral.id,
            reward_type: 'referrer',
            reward_description: 'Successful referral - 1 month free',
            reward_value: { type: 'subscription_credit', months: 1 }
          });

        // Create reward for referred user
        await supabase
          .from('referral_rewards')
          .insert({
            user_id: newUserId,
            referral_id: referral.id,
            reward_type: 'referred',
            reward_description: 'Welcome bonus - 1 month free',
            reward_value: { type: 'subscription_credit', months: 1 }
          });
      }

      // Clear the referral code from localStorage
      localStorage.removeItem('referralCode');
    } catch (error) {
      console.error('Error processing referral signup:', error);
    }
  };

  return { processReferralSignup };
};