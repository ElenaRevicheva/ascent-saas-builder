import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { readFamilyProfile } from '@/components/dashboard/FamilyProfileDialog';

/*
 * 21 Nov 2026 (Elena: "each path we propose inside 5 paths, the user should be able to click, no matter he signed in or not,
 * and be delivered to exactly this path he chose - otherwise he will just leave"). The landing's web buttons for the four
 * family paths used to open the generic sign-up and then the generic dashboard; the path had to be found again in
 * "About your new life". Now /path/<key>:
 *   - signed out  -> sign up, and Auth / AuthConfirm bring them back HERE (AFTER_AUTH_PAGES);
 *   - signed in   -> the path is switched ON in the family profile (the same 'learn' answer the WhatsApp/Telegram buttons and
 *                    the profile dialog set - learning_sessions {event:'family_profile'}, read by the brain and both bots),
 *                    then the dashboard opens with a toast naming the path.
 * Pro English has its own page (/pro-english) and never comes here.
 */
export const PATH_LEARN: Record<string, string> = {
  expat: 'Spanish',
  nomads: 'Both Spanish and English',
  settle: 'I already speak Spanish - help us settle in, and practise English',
  russian: 'Both Spanish and English',
};

const PathStart = () => {
  const { key = '' } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const done = useRef(false);

  useEffect(() => {
    if (loading || done.current) return;
    const learn = PATH_LEARN[key];
    if (!learn) { done.current = true; navigate('/', { replace: true }); return; }
    if (!user) { done.current = true; navigate(`/auth?mode=signup&next=/path/${key}`, { replace: true }); return; }
    done.current = true;
    (async () => {
      if (key === 'russian' && !i18n.language?.startsWith('ru')) await i18n.changeLanguage('ru');
      const before = await readFamilyProfile(user.id).catch(() => null);
      if (before?.learn !== learn) {
        const { error } = await supabase.from('learning_sessions').insert({ user_id: user.id, session_type: 'analytics', source: 'web',
          content: { ...(before ?? {}), event: 'family_profile', learn, path_from: 'landing' } });
        if (error) console.error('[path] could not switch the path on', error);
      }
      toast.success(t('path.on', { path: t(`path.${key}.title`) }));
      navigate('/dashboard', { replace: true });
    })();
  }, [loading, user, key]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading" />
    </main>
  );
};

export default PathStart;
