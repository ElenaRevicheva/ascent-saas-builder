-- Fix security vulnerabilities identified in the security scan

-- 1. Fix search_path for existing functions to prevent SQL injection
CREATE OR REPLACE FUNCTION public.generate_connection_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  generated_code text;
BEGIN
  -- Generate a 6-character alphanumeric code
  SELECT upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6)) INTO generated_code;
  
  -- Check if code already exists and regenerate if needed
  WHILE EXISTS (SELECT 1 FROM public.bot_connection_codes WHERE code = generated_code AND expires_at > now()) LOOP
    SELECT upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6)) INTO generated_code;
  END LOOP;
  
  RETURN generated_code;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a 8-character alphanumeric code using random() instead of gen_random_bytes
    code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    -- Remove special characters that might be confusing
    code := regexp_replace(code, '[^A-Z0-9]', '', 'g');
    -- Ensure it's exactly 8 characters by padding if needed
    WHILE length(code) < 8 LOOP
      code := code || upper(substring(md5(random()::text) from 1 for 1));
      code := regexp_replace(code, '[^A-Z0-9]', '', 'g');
    END LOOP;
    code := substring(code from 1 for 8);
    
    -- Check if this code already exists
    SELECT EXISTS(SELECT 1 FROM public.referrals WHERE referral_code = code) INTO exists;
    IF NOT exists THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.copy_avatar_file(from_user_id uuid, to_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if source file exists
  IF NOT EXISTS (
    SELECT 1 FROM storage.objects 
    WHERE bucket_id = 'avatars' 
    AND name = from_user_id::text || '/avatar.mp4'
  ) THEN
    RAISE EXCEPTION 'Source avatar file not found';
  END IF;

  -- Copy the storage object entry (excluding generated columns)
  INSERT INTO storage.objects (bucket_id, name, owner, metadata, created_at, updated_at, last_accessed_at, id)
  SELECT 
    bucket_id,
    to_user_id::text || '/avatar.mp4' as name,
    to_user_id as owner,
    metadata,
    now() as created_at,
    now() as updated_at,
    now() as last_accessed_at,
    gen_random_uuid() as id
  FROM storage.objects 
  WHERE bucket_id = 'avatars' 
  AND name = from_user_id::text || '/avatar.mp4'
  ON CONFLICT (bucket_id, name) DO UPDATE SET
    metadata = EXCLUDED.metadata,
    updated_at = now();

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.force_copy_avatar_content()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    source_id uuid := '5fa36928-3201-4c2f-bc27-c30b7a6d36c6';
    target_id uuid := '47ba0628-27a4-4cd8-9d10-38bc91baf8eb';
    source_metadata jsonb;
BEGIN
    -- Get the metadata from the source file
    SELECT metadata INTO source_metadata
    FROM storage.objects 
    WHERE bucket_id = 'avatars' 
    AND name = source_id::text || '/avatar.mp4';
    
    IF source_metadata IS NULL THEN
        RAISE EXCEPTION 'Source avatar file not found';
    END IF;
    
    -- Delete existing target file if it exists
    DELETE FROM storage.objects 
    WHERE bucket_id = 'avatars' 
    AND name = target_id::text || '/avatar.mp4';
    
    -- Insert new record for target file
    INSERT INTO storage.objects (
        bucket_id, 
        name, 
        owner, 
        metadata, 
        created_at, 
        updated_at, 
        last_accessed_at, 
        id
    ) VALUES (
        'avatars',
        target_id::text || '/avatar.mp4',
        target_id,
        source_metadata,
        now(),
        now(),
        now(),
        gen_random_uuid()
    );
    
    RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_subscription_status(user_uuid uuid)
RETURNS TABLE(status text, plan_type text, trial_days_left integer, is_trial_active boolean, is_subscription_active boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- 2. Create secure user roles system to fix whatsapp_waitlist vulnerability
CREATE TYPE IF NOT EXISTS public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    assigned_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create security definer function to check user roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
        AND role = _role
    )
$$;

-- 4. Create function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT public.has_role(auth.uid(), 'admin')
$$;

-- 5. RLS policies for user_roles table
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert user roles" ON public.user_roles;
CREATE POLICY "Admins can insert user roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update user roles" ON public.user_roles;
CREATE POLICY "Admins can update user roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete user roles" ON public.user_roles;
CREATE POLICY "Admins can delete user roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 6. Fix the vulnerable whatsapp_waitlist policies
DROP POLICY IF EXISTS "Admins can view waitlist entries" ON public.whatsapp_waitlist;
DROP POLICY IF EXISTS "Only admins can view waitlist entries" ON public.whatsapp_waitlist;

-- Create secure policy for whatsapp_waitlist using the new role system
CREATE POLICY "Only admins can view waitlist entries"
ON public.whatsapp_waitlist
FOR SELECT
TO authenticated
USING (public.is_current_user_admin());

-- Add policies to allow admins to manage waitlist entries
DROP POLICY IF EXISTS "Admins can update waitlist entries" ON public.whatsapp_waitlist;
CREATE POLICY "Admins can update waitlist entries"
ON public.whatsapp_waitlist
FOR UPDATE
TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can delete waitlist entries" ON public.whatsapp_waitlist;
CREATE POLICY "Admins can delete waitlist entries"
ON public.whatsapp_waitlist
FOR DELETE
TO authenticated
USING (public.is_current_user_admin());

-- 7. Create trigger to automatically assign 'user' role to new users
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created_assign_role
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();