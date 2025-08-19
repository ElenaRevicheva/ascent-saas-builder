-- Fix WhatsApp waitlist RLS policy conflicts
-- Remove conflicting "Block all access" policy and ensure only admin-only policies exist

-- Drop the conflicting "Block all access" policy
DROP POLICY IF EXISTS "Block all access to waitlist entries" ON public.whatsapp_waitlist;

-- Ensure we have the admin role function (should already exist)
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$;

-- Drop any existing policies to start clean
DROP POLICY IF EXISTS "Only admins can view waitlist entries" ON public.whatsapp_waitlist;
DROP POLICY IF EXISTS "Admins can update waitlist entries" ON public.whatsapp_waitlist;
DROP POLICY IF EXISTS "Admins can delete waitlist entries" ON public.whatsapp_waitlist;
DROP POLICY IF EXISTS "Admins can insert waitlist entries" ON public.whatsapp_waitlist;

-- Create secure admin-only policies for whatsapp_waitlist
CREATE POLICY "Only admins can view waitlist entries"
ON public.whatsapp_waitlist
FOR SELECT
TO authenticated
USING (public.is_current_user_admin());

CREATE POLICY "Only admins can update waitlist entries"
ON public.whatsapp_waitlist
FOR UPDATE
TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Only admins can delete waitlist entries"
ON public.whatsapp_waitlist
FOR DELETE
TO authenticated
USING (public.is_current_user_admin());

CREATE POLICY "Only admins can insert waitlist entries"
ON public.whatsapp_waitlist
FOR INSERT
TO authenticated
WITH CHECK (public.is_current_user_admin());

-- Verify RLS is enabled
ALTER TABLE public.whatsapp_waitlist ENABLE ROW LEVEL SECURITY;