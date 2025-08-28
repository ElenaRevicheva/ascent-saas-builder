-- Fix Security Issues: Function Search Path, Learning Content Protection, and Waitlist Data Protection

-- 1. Fix Function Search Path Security Issues
-- Update existing functions to have proper search_path set to prevent SQL injection

-- Update generate_connection_code function
DROP FUNCTION IF EXISTS public.generate_connection_code();
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

-- Update generate_referral_code function
DROP FUNCTION IF EXISTS public.generate_referral_code();
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

-- 2. Protect Learning Content from Competitors
-- Remove public access to learning_modules and restrict to authenticated users only
DROP POLICY IF EXISTS "Anyone can view learning modules" ON public.learning_modules;

-- Create new secure policy for learning modules
CREATE POLICY "Authenticated users can view active learning modules" 
ON public.learning_modules 
FOR SELECT 
TO authenticated
USING (is_active = true);

-- 3. Fix Waitlist Data Protection Issues
-- Remove conflicting policies on whatsapp_waitlist
DROP POLICY IF EXISTS "Block all access to waitlist entries" ON public.whatsapp_waitlist;
DROP POLICY IF EXISTS "Only admins can view waitlist entries" ON public.whatsapp_waitlist;

-- Create single, clear admin-only access policy for waitlist
CREATE POLICY "Only admins can view waitlist entries" 
ON public.whatsapp_waitlist 
FOR SELECT 
USING (is_current_user_admin());

-- 4. Add additional security for learning content
-- Create policy to allow content creators/admins to manage learning modules
CREATE POLICY "Admins can manage learning modules" 
ON public.learning_modules 
FOR ALL 
USING (is_current_user_admin()) 
WITH CHECK (is_current_user_admin());

-- 5. Add audit trail for sensitive operations
CREATE TABLE IF NOT EXISTS public.security_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id),
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id text,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs" 
ON public.security_audit_log 
FOR SELECT 
USING (is_current_user_admin());

-- System can insert audit logs
CREATE POLICY "System can insert audit logs" 
ON public.security_audit_log 
FOR INSERT 
WITH CHECK (true);