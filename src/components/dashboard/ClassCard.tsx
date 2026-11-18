import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

/*
 * 18 Nov 2026 - "<child>'s class" on the dashboard. All three readers (EN/ES/RU) looked for the child's progress here and
 * found only a button. Elena: "ironclad - always actual, only the true state of things". So this card computes NOTHING:
 *  - the numbers come from espaluz-chat `classCard`, which runs the class's OWN rule (class days that count, the level
 *    chosen in the class on this device or the child's age) - the card and the next class can never disagree;
 *  - "last class" shows only what that class saved (its unit, the words it taught, the child's own last words);
 *  - it asks again every 45 s while the page is open and the moment the page comes back into view. (Realtime is listed
 *    too, but on 18 Nov the project's supabase_realtime publication held NO tables - the test proved a saved turn never
 *    arrived - so the timer is what keeps it current; the subscription costs nothing if realtime is ever switched on);
 *  - no class yet -> it says so; no child on the account -> no card.
 */
type CardData = {
  child: string | null;
  classDays?: number;
  next?: { unit: number; of: number; level: 'kinder' | 'first' | 'second'; theme: string; dayInUnit: number };
  last?: { at: string; label: string | null; turns: number; said: string | null; words: string[] } | null;
};

export const ClassCard = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [d, setD] = useState<CardData | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data: kids } = await supabase.from('family_members').select('name').eq('user_id', user.id).eq('role', 'child').eq('is_active', true)
      .order('created_at', { ascending: true }).limit(1);
    const child = kids?.[0]?.name ? String(kids[0].name) : '';
    if (!child) { setD({ child: null }); return; }
    // the level the parent chose inside the class on this device - the same key Classroom.tsx reads
    let level = '';
    try { level = localStorage.getItem(`espaluz-class-level-${child.toLowerCase()}`) || ''; } catch { /* private mode */ }
    const { data, error } = await supabase.functions.invoke('espaluz-chat', { body: { classCard: { child, ...(level ? { level } : {}) } } });
    if (!error && data) setD(data as CardData);
  }, [user]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel('class-card')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'learning_sessions', filter: `user_id=eq.${user.id}` },
        (payload) => { if (String(payload.new.session_type).startsWith('classroom')) load(); })
      .subscribe();
    const back = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', back);
    const tick = window.setInterval(() => { if (document.visibilityState === 'visible') load(); }, 45000);
    return () => { supabase.removeChannel(ch); document.removeEventListener('visibilitychange', back); window.clearInterval(tick); };
  }, [user, load]);

  if (!d?.child || !d.next) return null;
  const n = d.next;
  const lang = i18n.language || undefined;
  const levelName = t(`cc.level.${n.level}`);
  return (
    <Card className="border-border/50 shadow-magical">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-green-500/15 p-2"><GraduationCap className="h-6 w-6 text-green-700" /></div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-foreground">{t('cc.title', { name: d.child })}</h2>
            <p className="text-sm text-muted-foreground">{levelName} · {t('cc.unitOf', { unit: n.unit, of: n.of })} · {n.theme}</p>
          </div>
        </div>

        {d.last ? (
          <div className="rounded-xl bg-primary/5 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('cc.lastTitle')}</p>
            <p className="mt-1 text-sm text-foreground">
              {new Date(d.last.at).toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'long' })}
              {d.last.turns > 0 && <> · {t('cc.turns', { count: d.last.turns, name: d.child })}</>}
            </p>
            {d.last.said && <p className="mt-2 text-base text-foreground">{t('cc.said', { name: d.child })} <span className="font-medium">«{d.last.said}»</span></p>}
            {d.last.words.length > 0 && <p className="mt-1 text-sm text-muted-foreground">{t('cc.words')} {d.last.words.join(', ')}</p>}
          </div>
        ) : (
          <p className="text-sm text-foreground">{t('cc.noClass', { name: d.child })}</p>
        )}

        <div className="rounded-xl border border-border/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('cc.nextTitle')}</p>
          <p className="mt-1 text-sm text-foreground">
            {t('cc.unitOf', { unit: n.unit, of: n.of })} · {n.theme} · {t('cc.dayInUnit', { day: n.dayInUnit })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t('cc.how', { name: d.child })}</p>
        </div>

        <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => navigate('/classroom')}>{t('cc.open')}</Button>
      </CardContent>
    </Card>
  );
};
