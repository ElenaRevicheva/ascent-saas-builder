-- Fix WhatsApp waitlist security vulnerability
-- Create secure role-based access control system

-- 1. Create enum for user roles (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
    END IF;
END $$;

-- 2. Create user_roles table for proper role management
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'user',
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    assigned_by UUID REFERENCES auth.users(id),
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
SET search_path = ''
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
SET search_path = ''
AS $$
    SELECT public.has_role(auth.uid(), 'admin'::public.app_role)
$$;

-- 5. RLS policies for user_roles table
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can insert user roles" ON public.user_roles;
CREATE POLICY "Admins can insert user roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can update user roles" ON public.user_roles;
CREATE POLICY "Admins can update user roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can delete user roles" ON public.user_roles;
CREATE POLICY "Admins can delete user roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 6. Drop the insecure policy on whatsapp_waitlist
DROP POLICY IF EXISTS "Admins can view waitlist entries" ON public.whatsapp_waitlist;

-- 7. Create secure policy for whatsapp_waitlist using the new role system
CREATE POLICY "Only admins can view waitlist entries"
ON public.whatsapp_waitlist
FOR SELECT
TO authenticated
USING (public.is_current_user_admin());

-- 8. Add policies to allow admins to manage waitlist entries
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

-- 9. Create trigger to automatically assign 'user' role to new users
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user'::public.app_role)
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

-- 10. Update existing functions to set search_path for security
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;