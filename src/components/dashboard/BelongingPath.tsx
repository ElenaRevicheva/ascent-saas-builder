import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Compass, Check, CalendarDays, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { readFamilyProfile, PACK_COUNTRIES } from './FamilyProfileDialog';
import { loadCountryPack } from '@/data/countryLessons';
import { localizePack } from '@/data/packI18n';
import { momentsIn, nextDateOf, type Moment } from '../../../supabase/functions/_shared/moments';

/*
 * "Your first year in <country>" - the heart of the dashboard (Elena, 15 Nov 2026: "ChatGPT can teach Spanish. It cannot
 * walk your family through your first year in Panama, with checked facts, across all your chats, with your child's
 * classroom and your real dates. That's the product."). Plan: cto-aipa docs/espaluz/BELONGING_DASHBOARD_PLAN_2026-11-15.md.
 * Built only from what exists:
 *   - the moments are the country guide's own belonging_moments (checked guide, the same file the chat and bots use);
 *   - "talked about" = EspaLuz's reply on any channel touched the moment's words (the bots' turns carry the moment ids
 *     since 15 Nov; web chat replies are matched here with the same finder) - shown as talked about, never as lived;
 *   - "you lived it" = the family's own tap (event belonging_moment), and a date only when the guide gives one;
 *   - each moment opens the checked guide lines about it and three ways to act: ask EspaLuz, rehearse (practice card),
 *     make a celebration video (celebration card);
 *   - "Your first 30 days": checked everyday items from the same guide, ticked by the family (event first30).
 * Order follows what they miss most (questionnaire). Nothing is scored or invented.
 */

type Item = { id: string; text: string; es?: string; status?: string; sources?: string[] };
type Pack = { country: string; name: string; sections: Record<string, Item[]>; belonging_moments?: Moment[] };
type Seen = { channel: string; at: string };

const MISS_FIRST: Record<string, string[]> = {
  People: ['local_friends'], Food: ['local_food'], Traditions: ['first_fiestas_patrias', 'first_carnival', 'mothers_day'],
  'The rhythm of life': ['dry_season', 'rainy_season'], 'My language': ['local_friends'],
};
const FIRST30 = ['greetings_and_courtesy', 'everyday_life', 'time', 'food_and_table'];
// A plain string keeps the client's column-type inference shallow (json paths make it recurse too deep).
const TALK_COLUMNS: string = 'created_at, session_type, source, moments:content->moments, ai:content->>ai_response';
const plain = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export const BelongingPath = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [pack, setPack] = useState<Pack | null | undefined>(undefined);
  // 15 Nov 2026: `pack` = the checked English guide (matching words and dates run on it); `shown` = the same guide in the
  // family's language (belonging/i18n), used only for what is displayed. A missing translation shows the English.
  const [shown, setShown] = useState<Pack | null>(null);
  const [order, setOrder] = useState<Moment[]>([]);
  const [lived, setLived] = useState<Set<string>>(new Set());
  const [talked, setTalked] = useState<Record<string, Seen>>({});
  const [done30, setDone30] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<string | null>(null);
  const [show30, setShow30] = useState(false);
  const [arrived, setArrived] = useState('');

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const profile = await readFamilyProfile(user.id);
      const c = String(profile?.country_now ?? '');
      if (!PACK_COUNTRIES.some(([k]) => k === c)) { if (!cancelled) setPack(null); return; }
      const pk = (await loadCountryPack(c)) as Pack | null;
      const moments = pk?.belonging_moments ?? [];
      const [{ data: events }, { data: talks }] = await Promise.all([
        supabase.from('learning_sessions').select('content').eq('user_id', user.id).eq('session_type', 'analytics')
          .in('content->>event', ['belonging_moment', 'first30']).limit(500),
        supabase.from('learning_sessions').select(TALK_COLUMNS)
          .eq('user_id', user.id).in('session_type', ['conversation', 'dashboard_chat']).order('created_at', { ascending: false }).limit(800),
      ]);
      if (cancelled) return;
      const ev = (events ?? []).map((e: { content: any }) => e.content ?? {});
      setLived(new Set(ev.filter((e) => e.event === 'belonging_moment').map((e) => String(e.id))));
      setDone30(new Set(ev.filter((e) => e.event === 'first30').map((e) => String(e.id))));
      const seen: Record<string, Seen> = {};
      for (const r of (talks ?? []) as unknown as { created_at: string; session_type: string; source: string | null; moments: string[] | null; ai: string | null }[]) {
        const ids = Array.isArray(r.moments) ? r.moments : r.session_type === 'dashboard_chat' ? momentsIn(String(r.ai ?? ''), moments) : [];
        const channel = r.session_type === 'dashboard_chat' ? t('fy.chApp') : r.source === 'whatsapp' ? 'WhatsApp' : 'Telegram';
        for (const id of ids) if (!seen[id]) seen[id] = { channel, at: r.created_at };
      }
      setTalked(seen);
      // Coming up first (by date), then what they miss most, then the guide's own order.
      const want = MISS_FIRST[String(profile?.miss_most ?? '')] ?? [];
      const score = (m: Moment) => { const d = nextDateOf(m); const days = d ? (d.getTime() - Date.now()) / 86400000 : 999;
        return (days <= 45 ? days : 100) + (want.includes(m.id) ? -50 : 0); };
      setOrder([...moments].sort((a, b) => score(a) - score(b)));
      setArrived(String(profile?.arrived ?? ''));
      setShown(pk ? ((await localizePack(pk as never, i18n.language)) as unknown as Pack) : null);
      setPack(pk);
    })().catch(() => { if (!cancelled) setPack(null); });
    return () => { cancelled = true; };
  }, [user, t]);

  const save = async (event: 'belonging_moment' | 'first30', id: string) => {
    if (!user) return;
    if (event === 'belonging_moment') setLived((s) => new Set(s).add(id)); else setDone30((s) => new Set(s).add(id));
    await supabase.from('learning_sessions').insert({ user_id: user.id, session_type: 'analytics', source: 'web', content: { event, id } });
  };
  const fire = (name: string, detail: Record<string, string>) => window.dispatchEvent(new CustomEvent(name, { detail }));

  if (!user || pack === undefined) return null;
  if (pack === null) {
    return (
      <Card className="border-border/50 shadow-magical" style={{ background: 'var(--gradient-card)' }}>
        <CardHeader><CardTitle className="flex items-center gap-2"><Compass className="h-5 w-5 text-[hsl(var(--espaluz-primary))]" />{t('fy.titleNoCountry')}</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">{t('fy.noCountry')}</p></CardContent>
      </Card>
    );
  }

  const fmt = (d: Date) => d.toLocaleDateString(i18n.language || undefined, { day: 'numeric', month: 'short' });
  const guideLines = (m: Moment): Item[] => {
    const words = (m.words ?? []).map(plain).filter((w) => w.length >= 4);
    const hits: Item[] = [];
    for (const [sec, items] of Object.entries(pack.sections)) for (const [i, it] of items.entries()) {
      if (it.status !== 'checked' || !words.some((w) => plain(`${it.text} ${it.es ?? ''}`).includes(w))) continue;
      hits.push(shown?.sections[sec]?.[i] ?? it);
    }
    return hits.slice(0, 3);
  };
  const labelOf = (m: Moment) => shown?.belonging_moments?.find((x) => x.id === m.id)?.label ?? m.label;
  const countryName = shown?.name ?? pack.name;
  const first30 = FIRST30.flatMap((k) => ((shown ?? pack).sections[k] ?? []).filter((it) => it.status === 'checked').slice(0, 2).map((it) => ({ ...it, key: `${k}:${it.id}` }))).slice(0, 8);
  const livedCount = order.filter((m) => lived.has(m.id)).length;

  return (
    <Card className="border-border/50 shadow-magical" style={{ background: 'var(--gradient-card)' }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Compass className="h-5 w-5 text-[hsl(var(--espaluz-primary))]" />
          {t('fy.title', { country: countryName })}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t('fy.sub', { country: countryName })}</p>
        <div className="flex items-center gap-3 pt-1">
          <Progress value={order.length ? (livedCount / order.length) * 100 : 0} className="h-2 flex-1 bg-muted" />
          <span className="text-xs text-muted-foreground">{t('fy.lived', { n: livedCount, of: order.length })}{arrived ? ` · ${t('fy.arrived', { when: arrived })}` : ''}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {order.map((m) => {
          const d = nextDateOf(m);
          const days = d ? Math.round((d.getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000) : null;
          const seen = talked[m.id];
          const isLived = lived.has(m.id);
          const isOpen = open === m.id;
          return (
            <div key={m.id} className="rounded-xl border border-border/60 bg-background/60 p-3">
              <button type="button" className="flex w-full items-start gap-3 text-left" onClick={() => setOpen(isOpen ? null : m.id)}>
                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isLived ? 'bg-emerald-500 text-white' : 'bg-primary/10 text-primary'}`} aria-hidden>
                  {isLived ? <Check className="h-4 w-4" /> : seen ? <MessageCircle className="h-4 w-4" /> : <CalendarDays className="h-4 w-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-foreground">{labelOf(m)}</span>
                  <span className="block text-xs text-muted-foreground">
                    {isLived ? t('fy.youLived') : d && days !== null && days <= 60 ? t('fy.coming', { date: fmt(d), count: days }) : d ? t('fy.on', { date: fmt(d) }) : t('fy.whenItComes')}
                    {seen ? ` · ${t('fy.talked', { channel: seen.channel, date: fmt(new Date(seen.at)) })}` : ''}
                  </span>
                </span>
                {isOpen ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
              </button>
              {isOpen && (
                <div className="mt-3 space-y-2 pl-11">
                  {guideLines(m).map((it) => (
                    <p key={it.id} className="text-sm text-foreground">{it.text}{it.es ? <span className="block text-xs text-primary">{it.es}</span> : null}</p>
                  ))}
                  {!guideLines(m).length && <p className="text-sm text-muted-foreground">{t('fy.askForMore')}</p>}
                  <p className="text-[11px] text-muted-foreground/80">{t('fy.checked', { country: countryName })}</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" onClick={() => fire('espaluz:ask', { text: t('fy.askText', { moment: labelOf(m), country: countryName }) })}>{t('fy.ask')}</Button>
                    <Button size="sm" variant="outline" onClick={() => fire('espaluz:practice', { scene: `${labelOf(m)} (${countryName})` })}>{t('fy.rehearse')}</Button>
                    <Button size="sm" variant="outline" onClick={() => fire('espaluz:celebrate', { occasion: labelOf(m) })}>{t('fy.celebrate')}</Button>
                    {!isLived && <Button size="sm" variant="ghost" onClick={() => save('belonging_moment', m.id)}><Check className="mr-1 h-4 w-4" />{t('fy.weLived')}</Button>}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div className="rounded-xl border border-dashed border-border/70 p-3">
          <button type="button" className="flex w-full items-center justify-between text-left" onClick={() => setShow30(!show30)}>
            <span className="font-semibold text-foreground">{t('fy.first30', { country: countryName })}</span>
            <span className="text-xs text-muted-foreground">{t('fy.doneOf', { n: first30.filter((x) => done30.has(x.key)).length, of: first30.length })}</span>
          </button>
          {show30 && (
            <ul className="mt-3 space-y-2">
              {first30.map((x) => (
                <li key={x.key} className="flex items-start gap-2 text-sm">
                  <button type="button" aria-label={t('fy.markDone')} onClick={() => !done30.has(x.key) && save('first30', x.key)}
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${done30.has(x.key) ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-border bg-background'}`}>
                    {done30.has(x.key) && <Check className="h-3 w-3" />}
                  </button>
                  <span className={done30.has(x.key) ? 'text-muted-foreground line-through' : 'text-foreground'}>{x.text}{x.es ? <span className="block text-xs text-primary no-underline">{x.es}</span> : null}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
