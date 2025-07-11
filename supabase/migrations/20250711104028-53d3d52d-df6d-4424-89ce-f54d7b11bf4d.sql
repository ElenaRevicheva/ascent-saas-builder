-- Fix Function Search Path Mutable warnings

-- Update generate_referral_code function
CREATE OR REPLACE FUNCTION public.generate_referral_code()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a 8-character alphanumeric code
    code := upper(substring(encode(gen_random_bytes(6), 'base64') from 1 for 8));
    -- Remove special characters that might be confusing
    code := regexp_replace(code, '[^A-Z0-9]', '', 'g');
    -- Ensure it's exactly 8 characters
    IF length(code) >= 8 THEN
      code := substring(code from 1 for 8);
      -- Check if this code already exists
      SELECT EXISTS(SELECT 1 FROM public.referrals WHERE referral_code = code) INTO exists;
      IF NOT exists THEN
        RETURN code;
      END IF;
    END IF;
  END LOOP;
END;
$function$;

-- Update update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$function$;

-- Update generate_connection_code function
CREATE OR REPLACE FUNCTION public.generate_connection_code()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  code text;
BEGIN
  -- Generate a 6-character alphanumeric code
  SELECT upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6)) INTO code;
  
  -- Check if code already exists and regenerate if needed
  WHILE EXISTS (SELECT 1 FROM public.bot_connection_codes WHERE code = code AND expires_at > now()) LOOP
    SELECT upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6)) INTO code;
  END LOOP;
  
  RETURN code;
END;
$function$;

-- Update get_user_subscription_status function
CREATE OR REPLACE FUNCTION public.get_user_subscription_status(user_uuid uuid)
 RETURNS TABLE(status text, plan_type text, trial_days_left integer, is_trial_active boolean, is_subscription_active boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(us.status, 'free_trial') as status,
    COALESCE(us.plan_type, 'free_trial') as plan_type,
    CASE 
      WHEN us.trial_end IS NOT NULL AND us.trial_end > now() 
      THEN EXTRACT(days FROM (us.trial_end - now()))::INTEGER
      ELSE 0
    END as trial_days_left,
    CASE 
      WHEN us.trial_end IS NOT NULL AND us.trial_end > now() 
      THEN true 
      ELSE false 
    END as is_trial_active,
    CASE 
      WHEN us.status = 'active' AND us.current_period_end > now() 
      THEN true 
      ELSE false 
    END as is_subscription_active
  FROM public.user_subscriptions us
  WHERE us.user_id = user_uuid
  ORDER BY us.created_at DESC
  LIMIT 1;
  
  -- If no subscription found, return trial status
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      'free_trial'::TEXT as status,
      'free_trial'::TEXT as plan_type,
      7 as trial_days_left,
      true as is_trial_active,
      false as is_subscription_active;
  END IF;
END;
$function$;