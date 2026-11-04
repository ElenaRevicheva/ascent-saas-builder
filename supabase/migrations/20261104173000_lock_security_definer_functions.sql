-- 4 Nov 2026 - Supabase advisor: 10 SECURITY DEFINER functions executable by anon (and PUBLIC) via /rest/v1/rpc.
-- SECURITY DEFINER runs with the owner's rights, so whoever may EXECUTE it acts as the owner.
-- Callers were mapped first (src/, supabase/functions/, pg_trigger, pg_policies). service_role keeps EXECUTE everywhere.

-- A. Trigger-only functions: fire on their own; nobody needs to call them through the API.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- B. Avatar maintenance, called by no app code. force_copy_avatar_content DELETES a storage object; both write
--    storage.objects for any user id. Server-only from now on.
REVOKE EXECUTE ON FUNCTION public.copy_avatar_file(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.force_copy_avatar_content() FROM PUBLIC, anon, authenticated;

-- C. Called by signed-in users only (ReferralSystem.tsx, ConnectBot.tsx, useSubscriptionQuery.ts).
REVOKE EXECUTE ON FUNCTION public.generate_connection_code() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_referral_code() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_subscription_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_connection_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_referral_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_subscription_status(uuid) TO authenticated;

-- C2. get_user_subscription_status answered for ANY user id. A signed-in user now gets only their own status
--     (admins and the server still get any). Body otherwise unchanged.
CREATE OR REPLACE FUNCTION public.get_user_subscription_status(user_uuid uuid)
RETURNS TABLE(status text, plan_type text, trial_days_left integer, is_trial_active boolean, is_subscription_active boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trial_until timestamptz;
BEGIN
  IF auth.uid() IS NOT NULL AND user_uuid IS DISTINCT FROM auth.uid()
     AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN;
  END IF;
  SELECT u.created_at + interval '14 days' INTO trial_until FROM auth.users u WHERE u.id = user_uuid;
  RETURN QUERY
  SELECT
    COALESCE(us.status, 'free_trial') AS status,
    COALESCE(us.plan_type, 'free_trial') AS plan_type,
    GREATEST(0, CEIL(EXTRACT(epoch FROM (GREATEST(trial_until, us.trial_end) - now())) / 86400))::integer AS trial_days_left,
    (GREATEST(trial_until, us.trial_end) > now()) AS is_trial_active,
    (us.status = 'active' AND us.current_period_end > now()) AS is_subscription_active
  FROM public.user_subscriptions us
  WHERE us.user_id = user_uuid
  ORDER BY us.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      'free_trial'::text,
      'free_trial'::text,
      GREATEST(0, CEIL(EXTRACT(epoch FROM (trial_until - now())) / 86400))::integer,
      COALESCE(trial_until > now(), false),
      false;
  END IF;
END;
$$;

-- D. has_role / is_current_user_admin stay executable: 11 access rules (profiles, user_roles, whatsapp_waitlist,
--    security_audit_log, role "public") call them, and the copy-avatar edge function calls has_role with the
--    user's token. Revoking would turn those rules into errors. They only answer yes/no about admin rights.
