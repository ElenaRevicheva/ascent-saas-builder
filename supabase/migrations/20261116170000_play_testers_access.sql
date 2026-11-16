-- 16 Nov 2026 (Elena: "sure, fix it all"). Two holes found with her second tester account (Velena, signed up Jul 2025):
-- 1. Google Play testers had no free access: joining the tester group gives the right to INSTALL, not to use. A tester
--    whose account is older than 14 days met "your journey is paused" on day one of a 14-day closed test.
-- 2. The web's 14 free days were not honoured by WhatsApp / Telegram (kids-memory family_paying counted paid plans only).
-- One list, read everywhere: an email on play_testers keeps the FREE period (same as the trial - paid-only extras such
-- as celebration videos stay paid) until access_until. The web shows it as trial days; the bots read the same answer
-- through kids-memory (fixed in the same change). Service role only: no policy, nobody can read or write it from the app.
CREATE TABLE IF NOT EXISTS public.play_testers (
  email text PRIMARY KEY CHECK (email = lower(email)),
  access_until timestamptz NOT NULL,
  note text,
  added_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.play_testers ENABLE ROW LEVEL SECURITY;

INSERT INTO public.play_testers (email, access_until, note) VALUES
  ('adamvelena@gmail.com', '2026-12-31T23:59:00Z', 'Elena second tester phone'),
  ('kiravelerevich@gmail.com', '2026-12-31T23:59:00Z', 'family tester'),
  ('marinakulaginabowen@gmail.com', '2026-12-31T23:59:00Z', 'tester group'),
  ('faculty6145550@gmail.com', '2026-12-31T23:59:00Z', 'tester group'),
  ('elena.revicheva2016@gmail.com', '2026-12-31T23:59:00Z', 'owner')
ON CONFLICT (email) DO UPDATE SET access_until = GREATEST(public.play_testers.access_until, EXCLUDED.access_until);

-- Same function as 20261106170000_one_trial_clock.sql; the only change: the free period also runs to a tester's
-- access_until when that is later.
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
  SELECT GREATEST(COALESCE((u.raw_app_meta_data->>'trial_until')::timestamptz, u.created_at + interval '14 days'),
                  (SELECT pt.access_until FROM public.play_testers pt WHERE pt.email = lower(u.email)))
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
