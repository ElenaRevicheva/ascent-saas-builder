import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

/*
 * 18 Nov 2026 - "Your plan this week" (Elena: "go plan step 1 - surgical, additive, no new engines").
 * Source of truth: cto-aipa docs/espaluz/USER_CATEGORIES_2026-11-18.md (Table 1) + WEEKLY_PLAN_RESEARCH_2026-11-18.md (Table 2).
 * Sits at the TOP of "Your family's week"; everything below it is unchanged. It computes nothing: espaluz-chat `weekPlan`
 * reads what the brain already saves (_shared/week_plan.ts - the same reader as /plan on WhatsApp and Telegram) and ticks
 * a step ONLY on real activity this week. Each step's button reuses what exists: the chat (espaluz:ask), the rehearsal
 * (espaluz:practice), the classroom, the lessons. Asks again every 45 s while visible and on return (realtime is off).
 */
type Step = { key: string; done: boolean; count?: number; target?: number; topic?: string; scene?: string };
type Plan = { weekStart: string; track: 'spanish' | 'english'; steps: Step[]; moments: { kind: string; text: string }[]; week: number };

const scrollTo = (sel: string) => document.querySelector(sel)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

export const WeeklyPlan = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<Plan | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.functions.invoke('espaluz-chat', { body: { weekPlan: { lang: (i18n.language || 'en').slice(0, 2) } } });
    if (!error && data?.steps) setPlan(data as Plan);
  }, [user, i18n.language]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const back = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', back);
    const tick = window.setInterval(() => { if (document.visibilityState === 'visible') load(); }, 45000);
    return () => { document.removeEventListener('visibilitychange', back); window.clearInterval(tick); };
  }, [load]);

  if (!plan) return null;
  const done = plan.steps.filter((s) => s.done).length;
  const ask = (text: string) => window.dispatchEvent(new CustomEvent('espaluz:ask', { detail: { text } }));
  const practise = (scene: string) => window.dispatchEvent(new CustomEvent('espaluz:practice', { detail: { scene } }));
  const act: Record<string, () => void> = {
    spanish_moment: () => scrollTo('#chat'),
    english_step: () => ask(t('wp.askEnglish', { topic: plan.steps.find((s) => s.topic)?.topic ?? '' })),
    english_week: () => ask(t('wp.askEnglish', { topic: plan.steps.find((s) => s.topic)?.topic ?? '' })),
    rehearse: () => practise(plan.steps.find((s) => s.key === 'rehearse')?.scene || ''),
    rehearse_en: () => practise(plan.steps.find((s) => s.topic)?.topic ?? ''),
    child_class: () => navigate('/classroom'),
    family_note: () => scrollTo('#chat'),
    belong: () => scrollTo('#lessons'),
  };
  const start = new Date(`${plan.weekStart}T12:00:00Z`);
  const end = new Date(start.getTime() + 6 * 86400000);
  const fmt = (d: Date) => d.toLocaleDateString(i18n.language || undefined, { day: 'numeric', month: 'short' });

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-2 text-base font-semibold text-foreground">
          <CalendarCheck className="h-5 w-5 text-primary" />{t('wp.title')}
        </p>
        <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-sm font-semibold text-primary">{t('wp.score', { done, of: plan.steps.length })}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {fmt(start)} – {fmt(end)}{plan.track === 'english' ? ` · ${t('wp.weekOf', { n: plan.week })}` : ''}
      </p>
      <ul className="mt-3 space-y-2">
        {plan.steps.map((s) => (
          <li key={s.key} className="flex items-start gap-3 rounded-lg bg-card/70 p-2.5">
            <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border ${s.done ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40'}`}>
              {s.done && <Check className="h-3.5 w-3.5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${s.done ? 'text-muted-foreground line-through decoration-primary/40' : 'text-foreground'}`}>
                {t(`wp.step.${s.key}`)}{s.target ? ` · ${s.count ?? 0}/${s.target}` : ''}
              </p>
              {(s.topic || s.scene) && <p className="text-xs text-muted-foreground">«{s.topic || s.scene}»</p>}
              <p className="text-xs text-muted-foreground">{t(`wp.how.${s.key}`)}</p>
            </div>
            {!s.done && <Button size="sm" variant="outline" className="shrink-0" onClick={act[s.key]}>{t('wp.go')}</Button>}
          </li>
        ))}
      </ul>
      {plan.moments.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('wp.moments')}</p>
          <ul className="mt-1 space-y-0.5">
            {plan.moments.map((m, k) => <li key={k} className="text-sm text-foreground">• {t(`wp.moment.${m.kind}`, { text: m.text })}</li>)}
          </ul>
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">{t('wp.note')}</p>
    </div>
  );
};
