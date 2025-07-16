-- Fix the ambiguous column reference in generate_connection_code function
CREATE OR REPLACE FUNCTION public.generate_connection_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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
$function$