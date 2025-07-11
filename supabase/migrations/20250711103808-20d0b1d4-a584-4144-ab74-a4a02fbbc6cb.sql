-- Fix Supabase security warnings - check constraints first

-- 1. Update whatsapp_waitlist policy to allow admins to view entries
DROP POLICY IF EXISTS "Only authenticated users can view waitlist" ON public.whatsapp_waitlist;

CREATE POLICY "Admins can view waitlist entries"
ON public.whatsapp_waitlist 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND (full_name ILIKE '%admin%' OR learning_level = 'admin')
  )
);

-- 2. Add missing foreign key constraints (skip if they exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'family_members_user_id_fkey') THEN
    ALTER TABLE public.family_members 
    ADD CONSTRAINT family_members_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'bot_connection_codes_user_id_fkey') THEN
    ALTER TABLE public.bot_connection_codes 
    ADD CONSTRAINT bot_connection_codes_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'connected_bots_user_id_fkey') THEN
    ALTER TABLE public.connected_bots 
    ADD CONSTRAINT connected_bots_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'learning_sessions_user_id_fkey') THEN
    ALTER TABLE public.learning_sessions 
    ADD CONSTRAINT learning_sessions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'learning_streaks_user_id_fkey') THEN
    ALTER TABLE public.learning_streaks 
    ADD CONSTRAINT learning_streaks_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'usage_tracking_user_id_fkey') THEN
    ALTER TABLE public.usage_tracking 
    ADD CONSTRAINT usage_tracking_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'user_achievements_user_id_fkey') THEN
    ALTER TABLE public.user_achievements 
    ADD CONSTRAINT user_achievements_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'user_subscriptions_user_id_fkey') THEN
    ALTER TABLE public.user_subscriptions 
    ADD CONSTRAINT user_subscriptions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'referrals_referrer_user_id_fkey') THEN
    ALTER TABLE public.referrals 
    ADD CONSTRAINT referrals_referrer_user_id_fkey 
    FOREIGN KEY (referrer_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'referrals_referred_user_id_fkey') THEN
    ALTER TABLE public.referrals 
    ADD CONSTRAINT referrals_referred_user_id_fkey 
    FOREIGN KEY (referred_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'referral_rewards_user_id_fkey') THEN
    ALTER TABLE public.referral_rewards 
    ADD CONSTRAINT referral_rewards_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Add proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON public.family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_user_id ON public.learning_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);