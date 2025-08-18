-- Fix feedback table SELECT policy to allow admin access
-- This addresses the issue where feedback table has a SELECT policy that blocks all access

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Only authenticated users can view feedback" ON public.feedback;

-- Create new policy that allows admins to view feedback
CREATE POLICY "Admins can view all feedback" 
ON public.feedback 
FOR SELECT 
TO authenticated
USING (public.is_current_user_admin());

-- The INSERT policy "Anyone can submit feedback" remains unchanged and is correct
-- This allows public feedback submission while restricting viewing to admins only