-- 6 Nov 2026 (Elena: "free inside the same 14 days, not a new 14 days on top"). A family that comes from WhatsApp or Telegram
-- by the one-tap classroom link keeps the bot's trial end, stored in app_metadata (only the service role can write it).
-- Every other account keeps created_at + 14 days, exactly as before.
CREATE OR REPLACE FUNCTION public.get_user_subscription_status(user_uuid uuid)
 RETURNS TABLE(status text, plan_type text, trial_days_left integer, is_trial_active boolean, is_subscription_active boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  trial_until timestamptz;
BEGIN
  IF auth.uid() IS NOT NULL AND user_uuid IS DISTINCT FROM auth.uid()
     AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN;
  END IF;
  SELECT COALESCE((u.raw_app_meta_data->>'trial_until')::timestamptz, u.created_at + interval '14 days')
    INTO trial_until FROM auth.users u WHERE u.id = user_uuid;
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
$function$;
