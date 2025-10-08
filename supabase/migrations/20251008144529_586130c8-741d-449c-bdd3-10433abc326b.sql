-- Add SELECT policy for whatsapp_waitlist to restrict viewing to admins only
-- This prevents competitors or malicious actors from harvesting customer contact information

CREATE POLICY "Admins can view waitlist entries"
ON public.whatsapp_waitlist
FOR SELECT
USING (is_current_user_admin());