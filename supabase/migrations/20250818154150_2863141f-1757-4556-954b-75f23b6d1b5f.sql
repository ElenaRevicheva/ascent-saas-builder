-- Fix WhatsApp waitlist security vulnerability by replacing insecure policy

-- Drop the vulnerable policy that checks profile fields (exploitable)
DROP POLICY IF EXISTS "Admins can view waitlist entries" ON public.whatsapp_waitlist;

-- Create a policy that completely blocks access for now (secure)
CREATE POLICY "Block all access to waitlist entries"
ON public.whatsapp_waitlist
FOR SELECT
TO authenticated
USING (false);

-- Note: To grant admin access, you'll need to:
-- 1. Create a user_roles table with proper role management
-- 2. Create security definer functions 
-- 3. Replace this policy with one that uses the role system