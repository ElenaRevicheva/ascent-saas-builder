-- 1 Nov 2026 (cto-aipa docs/espaluz/ONE_PAYMENT_TRUTH_PLAN_2026-11-01.md, phase 4): the web reads paid status from the
-- ONE payment truth (Oracle espaluz_unified.subscribers, written only from verified PayPal / PágueloFácil events, mirrored
-- here by the payment-mirror function). Until today any logged-in user could INSERT or UPDATE their own row with
-- status 'active' - four browser screens did exactly that, 30 days at a time, without asking PayPal.

-- 1. A row the browser writes is a CLAIM ("I subscribed, here is my PayPal subscription id"), never a payment: it is
--    kept as 'pending_verification' until the truth confirms that subscription with PayPal (every 10 minutes).
CREATE OR REPLACE FUNCTION public.user_subscriptions_from_browser()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') = 'authenticated' THEN
    NEW.status := 'pending_verification';
    NEW.current_period_end := now();
    NEW.trial_end := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_subscriptions_from_browser ON public.user_subscriptions;
CREATE TRIGGER user_subscriptions_from_browser
  BEFORE INSERT ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.user_subscriptions_from_browser();

-- 2. The browser can no longer change a row at all (only the truth, through the service role, does).
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.user_subscriptions;

-- 3. One free trial everywhere: 14 days from when the web account was created (the old function said "7 days" forever
--    for anyone without a row). Paid = the truth's paid-until date, as before.
CREATE OR REPLACE FUNCTION public.get_user_subscription_status(user_uuid uuid)
RETURNS TABLE(status text, plan_type text, trial_days_left integer, is_trial_active boolean, is_subscription_active boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  trial_until timestamptz;
BEGIN
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
$function$;
