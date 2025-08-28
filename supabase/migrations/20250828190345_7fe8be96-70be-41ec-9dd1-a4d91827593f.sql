-- Fix remaining functions with search path security issues

-- Update all remaining security definer functions to have proper search_path

-- Fix has_role function
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
        AND role = _role
    )
$function$;

-- Fix is_current_user_admin function  
DROP FUNCTION IF EXISTS public.is_current_user_admin();
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT public.has_role(auth.uid(), 'admin'::public.app_role)
$function$;

-- Fix handle_new_user_role function
DROP FUNCTION IF EXISTS public.handle_new_user_role();
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN NEW;
END;
$function$;

-- Fix update_updated_at_column function
DROP FUNCTION IF EXISTS public.update_updated_at_column();
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

-- Fix handle_new_user function
DROP FUNCTION IF EXISTS public.handle_new_user();
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

-- Fix copy_avatar_file function
DROP FUNCTION IF EXISTS public.copy_avatar_file(uuid, uuid);
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

-- Fix force_copy_avatar_content function
DROP FUNCTION IF EXISTS public.force_copy_avatar_content();
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

-- Fix get_user_subscription_status function
DROP FUNCTION IF EXISTS public.get_user_subscription_status(uuid);
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