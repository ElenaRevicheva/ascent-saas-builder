import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bookmark, ArrowRight, MessagesSquare, GraduationCap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

/*
 * 15 Nov 2026 (Elena: "keep only valuable stuff that truly shows fresh data and moves the user towards learning more").
 * Replaces TelegramProgress (score/streak/minutes/"words mastered" were formulas; phrases were always 0; Telegram only)
 * and LearningModules (a fixed 2025 list, Start buttons went to a missing page). Audit: cto-aipa
 * docs/espaluz/DASHBOARD_PROGRESS_AUDIT_2026-11-15.md. Both files stay in the repo.
 * Only what is really in the family's records: the phrase to keep and the fix from every PRACTICE, and the Spanish phrases
 * EspaLuz really gave them in the web chat and on Telegram ("¿Puedes repetir, por favor?" (Can you repeat, please?)).
 * "Your next step" names one true thing to do: an upcoming moment from the notebook -> practise it; no practice yet ->
 * rehearse; a child with no class for 3 days -> Pere & Titi. The weekly days/units live in LearningAnalytics and the
 * notebook in the family map (card 7) - not repeated here.
 */

type Phrase = { es: string; en: string; from: 'practice' | 'fix' | 'chat' };
type Step = { key: string; text: string; action: string; go: () => void; icon: typeof ArrowRight };

// Phrases EspaLuz wrote with their English, in the shapes her replies really use (tested on 10 real replies, 15 Nov):
// “X” (English) · "X" [pronunciation] - English · X [pronunciation] - English · - X – English. Pronunciation in
// brackets is never shown as the English.
const SPANISH = /[¿¡áéíóúñ]|\b(el|la|los|las|por|para|que|puedes|dónde|cómo|quiero|tengo|necesito|gracias|favor|es|está|una?|mi|mis|se|vamos|no)\b/i;
const ENGLISH = /\b(the|is|are|you|your|my|i|it|to|of|we|can|what|where|how|this|please|do|need|he|she|go|let's|time|name|in|at|with|a)\b/i;
const PRON = /[A-Z]{2,}-|‑|\b[A-Z]{3,}\b.*-|[ɲ]/;
const clean = (s: string) => s.replace(/\*+/g, '').replace(/^[\s"“”'-]+|[\s"“”']+$/g, '').replace(/\s+/g, ' ').trim();
function phrasesIn(text: string): Phrase[] {
  const out: Phrase[] = [];
  const add = (es: string, en?: string) => {
    es = clean(es.includes(': ') ? es.slice(es.lastIndexOf(': ') + 2) : es);
    en = clean(en ?? '').replace(/^[(\s]+|[)\s]+$/g, '').replace(/([?!]).*$/, '$1');
    if (es.length < 4 || es.length > 90 || !SPANISH.test(es) || es.includes('…')) return;
    if (en && (PRON.test(en) || !ENGLISH.test(en) || SPANISH.test(en.replace(/\b(a|no|is)\b/g, '')) && !ENGLISH.test(en))) en = '';
    out.push({ es, en, from: 'chat' });
  };
  const body = text.replace(/\[VIDEO SCRIPT START\][\s\S]*?(\[VIDEO SCRIPT END\]|$)/g, '');
  // "X" (English) / **“X”** (English) / "X" [pron] - English / "X" (pron) – note
  for (const m of body.matchAll(/\*{0,2}[“"]([^”"\n]{4,90})[”"]\*{0,2}\s*(?:\[[^\]\n]{2,90}\]\s*[-–]\s*([^.\n(–]{3,90})|\(([^)\n]{3,90})\))/g)) add(m[1], m[2] ?? m[3]);
  // X [pron] - English  (line start or after ": ")
  for (const m of body.matchAll(/(?:^|\n|:\s)\s*(¿?¡?[A-Za-zÁÉÍÓÚÑáéíóúñ][^\[\n“"]{2,80}?)\s*\[[^\]\n]{3,90}\]\s*[-–]\s*([^.\n(]{3,90})/g)) add(m[1], m[2]);
  // - Spanish – English (bullets)
  for (const m of body.matchAll(/(?:^|\n)\s*-\s+(¿?¡?[^\n“"–]{3,80}?)\s+[–-]\s+([A-Z][^\n(.]{3,90})/g)) add(m[1], m[2]);
  const seen = new Set<string>();
  return out.filter((p) => { const k = p.es.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
}

export const FamilyNextSteps = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [phrases, setPhrases] = useState<Phrase[] | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const since = new Date(Date.now() - 60 * 86400000).toISOString();
      const [{ data: rows }, { data: notes }, { data: fam }, { data: classes }, { count: practised }] = await Promise.all([
        supabase.from('learning_sessions').select('created_at, session_type, content').eq('user_id', user.id)
          .in('session_type', ['dashboard_chat', 'conversation', 'analytics']).gte('created_at', since)
          .order('created_at', { ascending: false }).limit(300),
        supabase.from('learning_sessions').select('content').eq('user_id', user.id).eq('session_type', 'analytics')
          .eq('content->>event', 'family_fact').order('created_at', { ascending: false }).limit(60),
        supabase.from('family_members').select('name, role').eq('user_id', user.id).eq('is_active', true),
        supabase.from('learning_sessions').select('created_at').eq('user_id', user.id).in('session_type', ['classroom', 'classroom_ru'])
          .gte('created_at', new Date(Date.now() - 3 * 86400000).toISOString()).limit(1),
        supabase.from('learning_sessions').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
          .eq('session_type', 'analytics').eq('content->>event', 'practice_session'),
      ]);
      if (cancelled) return;

      const found: Phrase[] = [];
      for (const r of (rows ?? []) as { session_type: string; content: any }[]) {
        const c = r.content ?? {};
        if (r.session_type === 'analytics') {
          if (c.event !== 'practice_session') continue;
          const [es, en] = String(c.phrase ?? '').split(/\s+[-–]\s+/);
          if (es && SPANISH.test(es)) found.push({ es: clean(es), en: clean(en ?? ''), from: 'practice' });
          if (c.fix) found.push({ es: clean(String(c.fix)), en: '', from: 'fix' });
        } else {
          found.push(...phrasesIn(String(c.ai_response ?? c.bot_response ?? '')));
        }
      }
      const seen = new Set<string>();
      const unique = found.filter((p) => { const k = p.es.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
      setPhrases(unique.slice(0, 8));

      // One true next step at a time, at most two.
      const today = new Date().toISOString().slice(0, 10);
      const coming = ((notes ?? []) as { content: any }[]).map((n) => n.content ?? {})
        .find((c) => c.until && String(c.until) >= today && !c.retired && !c.private && typeof c.fact === 'string');
      const practise = (scene: string) => window.dispatchEvent(new CustomEvent('espaluz:practice', { detail: { scene } }));
      const next: Step[] = [];
      if (coming) next.push({ key: 'coming', icon: MessagesSquare, text: t('fw.stepComing', { fact: String(coming.fact) }),
        action: t('fw.practiseIt'), go: () => practise(String(coming.fact)) });
      else if (!practised) next.push({ key: 'rehearse', icon: MessagesSquare, text: t('fw.stepRehearse'), action: t('fw.practiseIt'), go: () => practise('') });
      const child = ((fam ?? []) as { name: string; role: string }[]).find((m) => m.role === 'child');
      if (child && !(classes ?? []).length) next.push({ key: 'class', icon: GraduationCap, text: t('fw.stepClass', { name: child.name }),
        action: t('fw.openClass'), go: () => navigate('/classroom') });
      setSteps(next.slice(0, 2));
    })().catch(() => { if (!cancelled) setPhrases([]); });
    return () => { cancelled = true; };
  }, [user, t, navigate]);

  if (!user || phrases === null) return null;
  return (
    <Card className="border-border/50 shadow-magical" style={{ background: 'var(--gradient-card)' }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bookmark className="h-5 w-5 text-[hsl(var(--espaluz-primary))]" />
          {t('fw.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {steps.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">{t('fw.nextTitle')}</p>
            {steps.map((s) => (
              <div key={s.key} className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background/60 p-3 sm:flex-row sm:items-center">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden><s.icon className="h-4 w-4" /></span>
                <p className="min-w-0 flex-1 text-sm text-foreground">{s.text}</p>
                <Button size="sm" className="h-auto min-h-9 whitespace-normal" onClick={s.go}>{s.action}<ArrowRight className="ml-1 h-4 w-4 shrink-0" /></Button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">{t('fw.phrasesTitle')}</p>
          {phrases.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('fw.phrasesEmpty')}</p>
          ) : (
            <ul className="space-y-2">
              {phrases.map((p) => (
                <li key={p.es} className="rounded-lg bg-primary/5 p-2 text-sm">
                  <p className="font-medium text-foreground">{p.es}</p>
                  {p.en && <p className="text-xs text-muted-foreground">{p.en}</p>}
                  <p className="text-[11px] text-muted-foreground/80">{t(p.from === 'practice' ? 'fw.fromPractice' : p.from === 'fix' ? 'fw.fromFix' : 'fw.fromChat')}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
