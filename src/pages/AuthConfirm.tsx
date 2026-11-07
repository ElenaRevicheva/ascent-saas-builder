import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { EmailOtpType } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

/**
 * 7 Nov 2026 — the sign-up confirmation link now points to app.espaluz.lat/auth/confirm instead of the Supabase host.
 * Elena's test mail went to Outlook Junk; a link whose host differs from the sender's brand is one of the signals spam
 * filters weigh. The email template sends ?token_hash=…&type=signup here; this page confirms it and opens the app.
 */
const AuthConfirm = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<'checking' | 'failed'>('checking');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token_hash = params.get('token_hash');
    const type = (params.get('type') || 'signup') as EmailOtpType;
    if (!token_hash) {
      setState('failed');
      return;
    }
    supabase.auth.verifyOtp({ token_hash, type }).then(({ error }) => {
      if (error) setState('failed');
      else navigate('/dashboard', { replace: true });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      {state === 'checking' ? (
        <p className="text-lg">Confirmando tu cuenta… / Confirming your account…</p>
      ) : (
        <div className="space-y-4 max-w-md">
          <p className="text-lg font-semibold">
            Este enlace ya se usó o caducó. / This link was already used or has expired.
          </p>
          <p className="text-sm text-muted-foreground">
            Entra con tu correo y contraseña; si tu cuenta ya está confirmada, entrarás directamente.
            / Sign in with your email and password; if your account is already confirmed, you will go straight in.
          </p>
          <Button onClick={() => navigate('/auth')}>Entrar / Sign in</Button>
        </div>
      )}
    </div>
  );
};

export default AuthConfirm;
