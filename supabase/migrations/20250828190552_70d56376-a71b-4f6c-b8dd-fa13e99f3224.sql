-- Fix remaining functions with search path security issues
-- Use CASCADE to handle dependent policies

-- Fix has_role function - use CASCADE to drop dependent policies
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role) CASCADE;
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
DROP FUNCTION IF EXISTS public.is_current_user_admin() CASCADE;
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT public.has_role(auth.uid(), 'admin'::public.app_role)
$function$;

-- Recreate the RLS policies that were dropped with CASCADE
-- Recreate user_roles policies
CREATE POLICY "Admins can view all user roles" 
ON public.user_roles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert user roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update user roles" 
ON public.user_roles 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete user roles" 
ON public.user_roles 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Recreate whatsapp_waitlist policies if they were affected
CREATE POLICY "Admins can update waitlist entries" 
ON public.whatsapp_waitlist 
FOR UPDATE 
USING (is_current_user_admin())
WITH CHECK (is_current_user_admin());

CREATE POLICY "Admins can delete waitlist entries" 
ON public.whatsapp_waitlist 
FOR DELETE 
USING (is_current_user_admin());

-- Fix other functions that don't have policy dependencies
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