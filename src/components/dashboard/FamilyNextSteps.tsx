import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bookmark, ArrowRight, MessagesSquare, GraduationCap, MessageCircle, Send, Smartphone, PartyPopper, NotebookPen, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { phrasesIn } from '../../../supabase/functions/_shared/phrases';

/*
 * "Your family's week with EspaLuz" - the family's ONE memory across every channel (Elena, 15 Nov 2026: "the app is the
 * brain... one memory across all channels, so the family starts belonging to a new Spanish-speaking country").
 * Replaces TelegramProgress, LearningModules and LearningAnalytics on the dashboard (files kept). Audit + what was
 * borrowed from her own CRM (aideazz.xyz/ops): cto-aipa docs/espaluz/DASHBOARD_PROGRESS_AUDIT_2026-11-15.md.
 *   1. LAST HEARD per channel (CRM: "checked N min ago") - the family sees every channel feeds one brain.
 *   2. TIMELINE, newest first, each line tagged by channel (CRM record history): talks on WhatsApp / Telegram / the app
 *      (from the bots' brain sync since 15 Nov), the classrooms, practice, celebrations, new notebook notes (counted,
 *      never quoted - a private note stays private), and next steps the family marked done.
 *   3. NEXT STEP with Done / Not now (CRM Did it / Skip), saved as `next_step` events: "not now" hides it 3 days,
 *      "done" 7 days and shows on the timeline.
 *   4. PHRASES TO KEEP from every channel - the same finder the brain's server runs (_shared/phrases.ts).
 * Fail-closed: only what is in the family's own records; nothing is estimated, scored or invented.
 */

type Phrase = { es: string; en: string; from: 'practice' | 'fix' | 'web' | 'whatsapp' | 'telegram' };
type Step = { key: string; text: string; action: string; go: () => void; icon: typeof ArrowRight };
type Row = {
  created_at: string; session_type: string; source: string | null; ev: string | null; ch: string | null; unit: string | null;
  label: string | null; scene: string | null; occasion: string | null; phrases: { es?: string; en?: string }[] | null;
  key: string | null; choice: string | null; ai: string | null; bot: string | null; phrase: string | null; fix: string | null;
  member: string | null;
};
type Line = { at: string; icon: typeof ArrowRight; text: string };

// A plain string keeps the client's column-type inference shallow (json paths make it recurse too deep).
const COLUMNS: string = 'created_at, session_type, source, ev:content->>event, ch:content->>channel, unit:content->>class_unit, ' +
  'label:content->>class_label, scene:content->>scene, occasion:content->>occasion, phrases:content->phrases, key:content->>key, ' +
  'choice:content->>choice, ai:content->>ai_response, bot:content->>bot_response, phrase:content->>phrase, fix:content->>fix, ' +
  'member:content->>family_member_id';
const SPANISH = /[¿¡áéíóúñ]|\b(el|la|los|las|por|para|que|puedes|dónde|cómo|quiero|tengo|necesito|gracias|favor|es|está|una?|mi|mis|se|vamos|no)\b/i;
const clean = (s: string) => s.replace(/\*+/g, '').replace(/\s+/g, ' ').trim();
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const SEEN_EVENTS = ['practice_session', 'celebration_video', 'family_fact', 'next_step'];

export const FamilyNextSteps = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [days, setDays] = useState<{ label: string; on: boolean }[]>([]);
  const [heard, setHeard] = useState<{ name: string; at: string | null }[]>([]);
  const [reload, setReload] = useState(0);

  const ago = useCallback((iso: string | null) => {
    if (!iso) return t('fw.notYet');
    const d = new Date(iso);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const that = new Date(d); that.setHours(0, 0, 0, 0);
    const n = Math.round((today.getTime() - that.getTime()) / 86400000);
    if (n <= 0) return `${t('fw.today')} ${d.toLocaleTimeString(i18n.language || undefined, { hour: '2-digit', minute: '2-digit' })}`;
    try { return new Intl.RelativeTimeFormat(i18n.language || 'en', { numeric: 'auto' }).format(-n, 'day'); } catch { return d.toLocaleDateString(); }
  }, [t, i18n.language]);

  const mark = async (key: string, choice: 'done' | 'later') => {
    if (!user) return;
    setSteps((s) => s.filter((x) => x.key !== key));
    await supabase.from('learning_sessions').insert({ user_id: user.id, session_type: 'analytics', source: 'web', content: { event: 'next_step', key, choice } });
    if (choice === 'done') setReload((n) => n + 1);
  };

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const since = new Date(); since.setHours(0, 0, 0, 0); since.setDate(since.getDate() - 30);
      const last = (q: any) => q.order('created_at', { ascending: false }).limit(1);
      const [{ data: rowsRaw, error }, { data: fam }, { data: notes }, wa, tg, app, appEv, cls] = await Promise.all([
        supabase.from('learning_sessions').select(COLUMNS).eq('user_id', user.id).gte('created_at', since.toISOString())
          .order('created_at', { ascending: false }).limit(1000),
        supabase.from('family_members').select('id, name, role').eq('user_id', user.id).eq('is_active', true),
        supabase.from('learning_sessions').select('content').eq('user_id', user.id).eq('session_type', 'analytics')
          .eq('content->>event', 'family_fact').order('created_at', { ascending: false }).limit(60),
        last(supabase.from('learning_sessions').select('created_at').eq('user_id', user.id).eq('source', 'whatsapp')),
        last(supabase.from('learning_sessions').select('created_at').eq('user_id', user.id).eq('source', 'telegram')),
        last(supabase.from('learning_sessions').select('created_at').eq('user_id', user.id).eq('source', 'web').eq('session_type', 'dashboard_chat')),
        last(supabase.from('learning_sessions').select('created_at').eq('user_id', user.id).eq('source', 'web').in('content->>event', ['practice_session', 'celebration_video'])),
        last(supabase.from('learning_sessions').select('created_at').eq('user_id', user.id).in('session_type', ['classroom', 'classroom_ru'])),
      ]);
      if (cancelled) return;
      if (error) throw error;
      const rows = ((rowsRaw ?? []) as unknown as Row[]).filter((r) => r.session_type !== 'analytics' || SEEN_EVENTS.includes(r.ev ?? ''));
      const members = (fam ?? []) as { id: string; name: string; role: string }[];
      const kids = members.filter((m) => m.role === 'child');
      const kidName = (id: string | null) => kids.find((k) => k.id === id)?.name ?? (kids.length === 1 ? kids[0].name : t('fw.yourChild'));
      const at = (r: { data: { created_at: string }[] | null }) => r.data?.[0]?.created_at ?? null;
      const newest = (...xs: (string | null)[]) => xs.filter(Boolean).sort().pop() ?? null;

      // 1. Last heard, per channel.
      setHeard([
        { name: 'WhatsApp', at: at(wa) }, { name: 'Telegram', at: at(tg) },
        { name: t('fw.chWebCap'), at: newest(at(app), at(appEv)) }, { name: t('fw.chClass'), at: at(cls) },
      ]);

      // 2. Timeline (7 days), one line per day per kind, newest first.
      const weekStart = new Date(); weekStart.setHours(0, 0, 0, 0); weekStart.setDate(weekStart.getDate() - 6);
      const week = rows.filter((r) => new Date(r.created_at) >= weekStart);
      const groups = new Map<string, { at: string; icon: typeof ArrowRight; make: (n: number, extra: Set<string>, p: number) => string; n: number; extra: Set<string>; p: number }>();
      const add = (r: Row, kind: string, icon: typeof ArrowRight, make: (n: number, extra: Set<string>, p: number) => string, extra?: string, p = 0) => {
        const k = `${dayKey(new Date(r.created_at))}|${kind}`;
        const g = groups.get(k) ?? { at: r.created_at, icon, make, n: 0, extra: new Set<string>(), p: 0 };
        g.n++; g.p += p; if (extra) g.extra.add(extra);
        if (r.created_at > g.at) g.at = r.created_at;
        groups.set(k, g);
      };
      const chat = (channel: string) => (n: number, _e: Set<string>, p: number) =>
        t('fw.tlChat', { channel, count: n }) + (p ? ` · ${t('fw.tlPhrases', { count: p })}` : '');
      for (const r of week) {
        if (r.session_type === 'conversation') {
          const ch = r.source === 'whatsapp' ? 'WhatsApp' : 'Telegram';
          add(r, `chat-${ch}`, ch === 'WhatsApp' ? MessageCircle : Send, chat(ch), undefined, Array.isArray(r.phrases) ? r.phrases.length : 0);
        } else if (r.session_type === 'dashboard_chat') {
          add(r, 'chat-web', Smartphone, chat(t('fw.chWeb')));
        } else if (r.session_type === 'classroom') {
          const name = kidName(r.member);
          const unit = r.label ? r.label.split(' · ').slice(0, 2).join(' · ') : r.unit ? `${t('fw.unit')} ${r.unit}` : '';
          add(r, `class-${name}`, GraduationCap, (_n, e) => t('fw.tlClass', { name }) + (e.size ? ` · ${[...e].join(', ')}` : ''), unit || undefined);
        } else if (r.session_type === 'classroom_ru') {
          const name = kidName(r.member);
          add(r, `classru-${name}`, GraduationCap, () => t('fw.tlClassRu', { name }));
        } else if (r.ev === 'practice_session') {
          add(r, `practice-${r.created_at}`, MessagesSquare, () => t('fw.tlPractice', { scene: r.scene ?? '' }));
        } else if (r.ev === 'celebration_video') {
          add(r, `celeb-${r.created_at}`, PartyPopper, () => t('fw.tlCeleb', { occasion: r.occasion ?? '' }));
        } else if (r.ev === 'family_fact') {
          add(r, 'notes', NotebookPen, (n) => t('fw.tlNotes', { count: n }));
        } else if (r.ev === 'next_step' && r.choice === 'done') {
          add(r, `done-${r.key}`, Check, () => t('fw.tlDone', { what: t(`fw.doneWhat.${String(r.key ?? '').split(':')[0]}`, { defaultValue: t('fw.doneWhat.step') }) }));
        }
      }
      setLines([...groups.values()].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 12).map((g) => ({ at: g.at, icon: g.icon, text: g.make(g.n, g.extra, g.p) })));
      const active = new Set(rows.filter((r) => r.ev !== 'next_step').map((r) => dayKey(new Date(r.created_at))));
      setDays(Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart); d.setDate(d.getDate() + i);
        return { label: d.toLocaleDateString(i18n.language || undefined, { weekday: 'narrow' }), on: active.has(dayKey(d)) };
      }));

      // 3. Phrases to keep, from every channel.
      const found: Phrase[] = [];
      for (const r of rows) {
        if (r.ev === 'practice_session') {
          const [es, en] = String(r.phrase ?? '').split(/\s+[-–]\s+/);
          if (es && SPANISH.test(es)) found.push({ es: clean(es), en: clean(en ?? ''), from: 'practice' });
          if (r.fix) found.push({ es: clean(String(r.fix)), en: '', from: 'fix' });
        } else if (r.session_type === 'conversation' && Array.isArray(r.phrases)) {
          const ch = r.source === 'whatsapp' ? 'whatsapp' : 'telegram';
          for (const p of r.phrases) if (p?.es) found.push({ es: String(p.es), en: String(p.en ?? ''), from: ch });
        } else if (r.session_type === 'dashboard_chat' || r.session_type === 'conversation') {
          const ch = r.session_type === 'dashboard_chat' ? 'web' : 'telegram';
          found.push(...phrasesIn(String(r.ai ?? r.bot ?? '')).map((p) => ({ ...p, from: ch as Phrase['from'] })));
        }
      }
      const seen = new Set<string>();
      setPhrases(found.filter((p) => { const k = p.es.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 8));

      // 4. Next steps - only true ones, minus what the family marked done (7 days) or not now (3 days).
      const hidden = new Set(rows.filter((r) => r.ev === 'next_step' && r.key && (
        (r.choice === 'later' && Date.now() - new Date(r.created_at).getTime() < 3 * 86400000) ||
        (r.choice === 'done' && Date.now() - new Date(r.created_at).getTime() < 7 * 86400000))).map((r) => String(r.key)));
      const today = new Date().toISOString().slice(0, 10);
      const coming = ((notes ?? []) as { content: any }[]).map((n) => n.content ?? {})
        .find((c) => c.until && String(c.until) >= today && !c.retired && !c.private && typeof c.fact === 'string');
      const practise = (scene: string) => window.dispatchEvent(new CustomEvent('espaluz:practice', { detail: { scene } }));
      const practised = rows.some((r) => r.ev === 'practice_session');
      const classRecently = rows.some((r) => (r.session_type === 'classroom' || r.session_type === 'classroom_ru') && Date.now() - new Date(r.created_at).getTime() < 3 * 86400000);
      const next: Step[] = [];
      if (coming) next.push({ key: `coming:${String(coming.fact).slice(0, 40)}`, icon: MessagesSquare, text: t('fw.stepComing', { fact: String(coming.fact) }), action: t('fw.practiseIt'), go: () => practise(String(coming.fact)) });
      else if (!practised) next.push({ key: 'rehearse', icon: MessagesSquare, text: t('fw.stepRehearse'), action: t('fw.practiseIt'), go: () => practise('') });
      if (kids.length && !classRecently) next.push({ key: 'class', icon: GraduationCap, text: t('fw.stepClass', { name: kids[0].name }), action: t('fw.openClass'), go: () => navigate('/classroom') });
      setSteps(next.filter((s) => !hidden.has(s.key)).slice(0, 2));
      setReady(true);
    })().catch((e) => { console.error('[family week]', e); if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, [user, t, i18n.language, navigate, reload]);

  if (!user || !ready) return null;
  return (
    <Card className="border-border/50 shadow-magical" style={{ background: 'var(--gradient-card)' }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bookmark className="h-5 w-5 text-[hsl(var(--espaluz-primary))]" />
          {t('fw.title')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t('fw.sub')}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-2" aria-label={t('fw.heardTitle')}>
          <span className="text-xs font-semibold text-foreground self-center">{t('fw.heardTitle')}</span>
          {heard.map((h) => (
            <span key={h.name} className={`rounded-full px-2.5 py-1 text-xs ${h.at ? 'bg-primary/10 text-foreground' : 'bg-muted text-muted-foreground'}`}>
              {h.name} · {ago(h.at)}
            </span>
          ))}
        </div>

        {steps.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">{t('fw.nextTitle')}</p>
            {steps.map((s) => (
              <div key={s.key} className="space-y-2 rounded-xl border border-border/60 bg-background/60 p-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden><s.icon className="h-4 w-4" /></span>
                  <p className="min-w-0 flex-1 text-sm text-foreground">{s.text}</p>
                </div>
                <div className="flex flex-wrap gap-2 sm:pl-12">
                  <Button size="sm" className="h-auto min-h-9 whitespace-normal" onClick={s.go}>{s.action}<ArrowRight className="ml-1 h-4 w-4 shrink-0" /></Button>
                  <Button size="sm" variant="outline" onClick={() => mark(s.key, 'done')}><Check className="mr-1 h-4 w-4" />{t('fw.done')}</Button>
                  <Button size="sm" variant="ghost" onClick={() => mark(s.key, 'later')}>{t('fw.later')}</Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">{t('fw.weekTitle')}</p>
            <div className="flex gap-1" aria-label={t('fw.daysLabel', { count: days.filter((d) => d.on).length })}>
              {days.map((d, i) => (
                <span key={i} className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] ${d.on ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{d.label}</span>
              ))}
            </div>
          </div>
          {lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('fw.tlEmpty')}</p>
          ) : (
            <ul className="space-y-1.5">
              {lines.map((l, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <l.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span className="min-w-0 flex-1 text-foreground">{l.text}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{ago(l.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">{t('fw.phrasesTitle')}</p>
          {phrases.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('fw.phrasesEmpty')}</p>
          ) : (
            <ul className="space-y-2">
              {phrases.slice(0, 2).map((p) => (
                <li key={p.es} className="rounded-lg bg-primary/5 p-2 text-sm">
                  <p className="font-medium text-foreground">{p.es}</p>
                  {p.en && <p className="text-xs text-muted-foreground">{p.en}</p>}
                  <p className="text-[11px] text-muted-foreground/80">{t(p.from === 'practice' ? 'fw.fromPractice' : p.from === 'fix' ? 'fw.fromFix' : 'fw.fromChannel', { channel: p.from === 'web' ? t('fw.chWeb') : p.from === 'whatsapp' ? 'WhatsApp' : 'Telegram' })}</p>
                </li>
              ))}
            </ul>
          )}
          {/* 18 Nov 2026: the full list (with EspaLuz's tip and the listen button) lives in "Phrases you've collected". */}
          {phrases.length > 2 && (
            <button type="button" className="text-sm font-semibold text-primary hover:underline"
              onClick={() => document.getElementById('phrases')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
              {t('fw.allPhrases', { count: phrases.length })} ↓
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
