-- 4 Nov 2026 - Lovable security scan "Some access rules let everyone through" (critical, 3 tables).
-- All three were INSERT-only policies WITH CHECK (true): nothing could be READ through them, but anyone holding the
-- public anon key could write unlimited or forged rows by calling the REST API directly (the browser's zod rules in
-- src/lib/validations.ts are skipped by such calls).

-- 1. security_audit_log: no app code writes it (0 rows ever). The service role bypasses RLS, so the server keeps
--    writing; browsers can no longer forge audit entries. Admin SELECT policy (20251115192918) is untouched.
DROP POLICY IF EXISTS "System can insert audit logs" ON public.security_audit_log;

-- 2. feedback: public form on Index.tsx stays open, with the form's own rules enforced in the database.
DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.feedback;
CREATE POLICY "Anyone can submit valid feedback" ON public.feedback
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    char_length(btrim(message)) BETWEEN 1 AND 2000
    AND (email IS NULL OR (char_length(email) <= 255 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'))
  );

-- 3. whatsapp_waitlist: public form (WhatsAppWaitlistForm.tsx) stays open, same rules as waitlistSchema.
DROP POLICY IF EXISTS "Anyone can join the waitlist" ON public.whatsapp_waitlist;
CREATE POLICY "Anyone can join the waitlist with valid details" ON public.whatsapp_waitlist
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    char_length(email) <= 255 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND char_length(btrim(name)) BETWEEN 1 AND 100
    AND (phone IS NULL OR char_length(phone) <= 20)
  );
