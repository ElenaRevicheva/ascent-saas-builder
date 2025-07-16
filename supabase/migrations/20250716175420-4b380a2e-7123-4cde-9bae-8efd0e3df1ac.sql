-- Enable the pgcrypto extension which provides gen_random_bytes function
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update the generate_referral_code function to use a more compatible approach
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a 8-character alphanumeric code using random() instead of gen_random_bytes
    code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    -- Remove special characters that might be confusing
    code := regexp_replace(code, '[^A-Z0-9]', '', 'g');
    -- Ensure it's exactly 8 characters by padding if needed
    WHILE length(code) < 8 LOOP
      code := code || upper(substring(md5(random()::text) from 1 for 1));
      code := regexp_replace(code, '[^A-Z0-9]', '', 'g');
    END LOOP;
    code := substring(code from 1 for 8);
    
    -- Check if this code already exists
    SELECT EXISTS(SELECT 1 FROM public.referrals WHERE referral_code = code) INTO exists;
    IF NOT exists THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$function$