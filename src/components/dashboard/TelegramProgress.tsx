import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MessageSquare, BookOpen, Clock, Trophy, RefreshCw, AlertCircle, ChevronDown, ChevronUp, Sparkles, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { phrasesIn } from '../../../supabase/functions/_shared/phrases';

/*
 * "Your Spanish journey" - the same block, layout and buttons as the old "Telegram Bot Learning Journey" (Elena, 15 Nov
 * 2026: "these features should be present, but serve the goals, not generic simulations"). What changed is what feeds it:
 * before, a score that stuck at 100, a "streak" that counted messages, "words mastered" picked at random, 0 phrases and an
 * invented "30 min" per message - and Telegram only. Now every number is measured from the family's own records, on every
 * channel (WhatsApp, Telegram, the app, the classroom; the bots send their turns to the brain since 15 Nov):
 *   conversations = messages less than 30 minutes apart on the same channel; time = first to last message of each;
 *   phrases = what EspaLuz really taught (the same finder as the brain's server); words = the Spanish words in those
 *   phrases plus the classroom's new words; the big number = days with EspaLuz this month, out of the days so far.
 * The old per-message analysis (TelegramLearningAnalysis) stays in the repo; an opened conversation now shows its phrases.
 */

type Row = { id: string; created_at: string; session_type: string; source: string | null; phrases: { es?: string; en?: string }[] | null;
  ai: string | null; bot: string | null; words: string[] | null };
type Channel = 'whatsapp' | 'telegram' | 'app' | 'classroom';
type Talk = { id: string; channel: Channel; start: string; end: string; turns: number; phrases: { es: string; en: string }[]; minutes: number };

const COLUMNS: string = 'id, created_at, session_type, source, phrases:content->phrases, ai:content->>ai_response, bot:content->>bot_response, words:content->new_words';
const GAP_MS = 30 * 60000;
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const channelOf = (r: Row): Channel => (r.session_type === 'classroom' || r.session_type === 'classroom_ru' ? 'classroom'
  : r.session_type === 'dashboard_chat' ? 'app' : r.source === 'whatsapp' ? 'whatsapp' : 'telegram');

export const TelegramProgress = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [talks, setTalks] = useState<Talk[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [links, setLinks] = useState<string | null>(null);
  // 17 Nov 2026 (Elena: "not just November 17, November 15 - the phrases collected, and EspaLuz's advice what to practise
  // with them, something that leads further"). The tip comes from espaluz-chat `phraseTip` (free models, once a day per set
  // of phrases, dropped if it does not name one of them). Conversations stay, folded under the phrases.
  const [tip, setTip] = useState<{ tip: string; practise: string } | null>(null);
  const [tipState, setTipState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [allPhrases, setAllPhrases] = useState(false);
  const [showTalks, setShowTalks] = useState(false);

  const load = useCallback(async (showLoading = true) => {
    if (!user) return;
    if (showLoading) setLoading(true);
    try {
      const since = new Date(Date.now() - 90 * 86400000).toISOString();
      const { data, error } = await supabase.from('learning_sessions').select(COLUMNS).eq('user_id', user.id)
        .in('session_type', ['conversation', 'dashboard_chat', 'classroom', 'classroom_ru']).gte('created_at', since)
        .order('created_at', { ascending: true }).limit(2000);
      if (error) throw error;
      const list = (data ?? []) as unknown as Row[];
      // Conversations: messages on the same channel less than 30 minutes apart.
      const open = new Map<Channel, Talk>();
      const out: Talk[] = [];
      for (const r of list) {
        const ch = channelOf(r);
        const found = Array.isArray(r.phrases) ? r.phrases.filter((p) => p?.es).map((p) => ({ es: String(p.es), en: String(p.en ?? '') }))
          : ch === 'classroom' ? [] : phrasesIn(String(r.ai ?? r.bot ?? ''));
        const cur = open.get(ch);
        if (cur && new Date(r.created_at).getTime() - new Date(cur.end).getTime() < GAP_MS) {
          cur.end = r.created_at; cur.turns++;
          for (const p of found) if (!cur.phrases.some((x) => x.es.toLowerCase() === p.es.toLowerCase())) cur.phrases.push(p);
        } else {
          const t2: Talk = { id: r.id, channel: ch, start: r.created_at, end: r.created_at, turns: 1, phrases: found, minutes: 0 };
          open.set(ch, t2); out.push(t2);
        }
      }
      for (const x of out) x.minutes = Math.max(1, Math.round((new Date(x.end).getTime() - new Date(x.start).getTime()) / 60000) + 1);
      setRows(list);
      setTalks(out.reverse());
      setLastRefresh(new Date());
    } catch (e) {
      console.error('[journey]', e);
      if (showLoading) toast.error(t('jr.loadFailed'));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [user, t]);

  useEffect(() => { load(); }, [load]);

  // A new turn on any channel shows up without a reload.
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('journey-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'learning_sessions', filter: `user_id=eq.${user.id}` },
        (payload) => { if (['conversation', 'dashboard_chat', 'classroom', 'classroom_ru'].includes(String(payload.new.session_type))) load(false); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, load]);

  const checkBotConnection = async () => {
    if (!user) return;
    const { data, error } = await supabase.from('connected_bots').select('platform, is_active, last_activity').eq('user_id', user.id);
    if (error) { toast.error(t('jr.checkFailed')); return; }
    const has = (p: string) => (data ?? []).find((b: { platform: string; is_active: boolean | null }) => b.platform === p && b.is_active !== false);
    const line = ['whatsapp', 'telegram'].map((p) => `${p === 'whatsapp' ? 'WhatsApp' : 'Telegram'}: ${has(p) ? t('jr.connected') : t('jr.notConnected')}`).join(' · ');
    setLinks(line);
    toast.success(line);
  };

  // Newest first, each phrase once, with where and when it was taught.
  const collected: { es: string; en: string; channel: Channel; at: string }[] = [];
  for (const x of talks) for (const p of x.phrases)
    if (!collected.some((c) => c.es.toLowerCase() === p.es.toLowerCase())) collected.push({ ...p, channel: x.channel, at: x.start });
  const tipKey = collected.slice(0, 8).map((c) => c.es).join('|');
  useEffect(() => {
    if (!user || !tipKey) return;
    let gone = false;
    setTipState('loading');
    supabase.functions.invoke('espaluz-chat', { body: { phraseTip: { lang: (i18n.language || 'en').slice(0, 2),
      phrases: tipKey.split('|').map((es) => ({ es, en: collected.find((c) => c.es === es)?.en ?? '' })) } } })
      .then(({ data }) => { if (!gone) setTip(data?.tip ? { tip: String(data.tip), practise: String(data.practise ?? '') } : null); })
      .catch(() => { if (!gone) setTip(null); })
      .finally(() => { if (!gone) setTipState('done'); });
    return () => { gone = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tipKey, i18n.language]);
  const practise = () => window.dispatchEvent(new CustomEvent('espaluz:ask', { detail: { text: tip?.practise || t('jr.practiseText', { phrases: collected.slice(0, 2).map((c) => c.es).join(', ') }) } }));

  const label = (ch: Channel) => (ch === 'whatsapp' ? 'WhatsApp' : ch === 'telegram' ? 'Telegram' : ch === 'app' ? t('jr.chApp') : t('jr.chClass'));

  if (loading) {
    return (
      <Card className="border-border/50 shadow-magical" style={{ background: 'var(--gradient-card)' }}>
        <CardContent className="p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--espaluz-primary))] mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  // Measured numbers only.
  const phraseSet = new Map<string, { es: string; en: string }>();
  for (const x of talks) for (const p of x.phrases) phraseSet.set(p.es.toLowerCase(), p);
  const words = new Set<string>();
  for (const p of phraseSet.values()) for (const w of p.es.toLowerCase().match(/[a-záéíóúñü]{3,}/g) ?? []) words.add(w);
  for (const r of rows) if (Array.isArray(r.words)) for (const w of r.words) if (/^[a-záéíóúñü]{3,}$/i.test(String(w))) words.add(String(w).toLowerCase());
  const totalMinutes = talks.reduce((s, x) => s + x.minutes, 0);
  const avg = talks.length ? Math.round(totalMinutes / talks.length) : 0;
  const days = new Set(rows.map((r) => dayKey(new Date(r.created_at))));
  let streak = 0;
  const cursor = new Date(); cursor.setHours(0, 0, 0, 0);
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor)) && streak < 60) { streak++; cursor.setDate(cursor.getDate() - 1); }
  const today = new Date();
  const monthDays = [...days].filter((d) => d.startsWith(dayKey(today).slice(0, 7))).length;
  const monthPct = Math.round((monthDays / today.getDate()) * 100);

  return (
    <div className="space-y-6">
      <Card className="border-border/50 shadow-magical bg-gradient-to-br from-[hsl(var(--espaluz-primary))]/5 to-purple-500/5">
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-[hsl(var(--espaluz-primary))]/20 rounded-lg">
                <MessageSquare className="h-6 w-6 text-[hsl(var(--espaluz-primary))]" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{t('jr.title')}</h2>
                <p className="text-sm text-muted-foreground font-normal">{t('jr.sub')}</p>
              </div>
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-3xl font-bold text-[hsl(var(--espaluz-primary))]">{monthDays}<span className="text-base font-medium text-muted-foreground">/{today.getDate()}</span></div>
                <div className="text-xs text-muted-foreground">{t('jr.daysMonth')}</div>
                <Progress value={monthPct} className="w-16 h-2 mt-1" />
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="outline" size="sm" onClick={() => { load(true); }} className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />{t('jr.refresh')}
                </Button>
                <Button variant="outline" size="sm" onClick={checkBotConnection} className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />{t('jr.checkBot')}
                </Button>
              </div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            {t('jr.updated', { time: lastRefresh.toLocaleTimeString(i18n.language || undefined), count: talks.length })}
            {links && <span> · {links}</span>}
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <div className="text-center p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-xl border border-blue-500/20">
              <div className="flex items-center justify-center mb-2">
                <MessageSquare className="h-5 w-5 text-blue-500 mr-2" />
                <div className="text-2xl font-bold text-blue-600">{talks.length}</div>
              </div>
              <div className="text-sm text-muted-foreground">{t('jr.talks')}</div>
              {streak > 0 && <div className="text-xs text-blue-600 mt-1">{t('jr.streak', { count: streak })}</div>}
            </div>

            <div className="text-center p-4 bg-gradient-to-br from-[hsl(var(--espaluz-primary))]/10 to-[hsl(var(--espaluz-primary))]/5 rounded-xl border border-[hsl(var(--espaluz-primary))]/20">
              <div className="flex items-center justify-center mb-2">
                <BookOpen className="h-5 w-5 text-[hsl(var(--espaluz-primary))] mr-2" />
                <div className="text-2xl font-bold text-[hsl(var(--espaluz-primary))]">{phraseSet.size}</div>
              </div>
              <div className="text-sm text-muted-foreground">{t('jr.phrases')}</div>
              <div className="text-xs text-[hsl(var(--espaluz-primary))] mt-1">{t('jr.phrasesNote')}</div>
            </div>

            <div className="text-center p-4 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 rounded-xl border border-yellow-500/20">
              <div className="flex items-center justify-center mb-2">
                <Trophy className="h-5 w-5 text-yellow-600 mr-2" />
                <div className="text-2xl font-bold text-yellow-600">{words.size}</div>
              </div>
              <div className="text-sm text-muted-foreground">{t('jr.words')}</div>
              <div className="text-xs text-yellow-600 mt-1">{t('jr.wordsNote')}</div>
            </div>

            <div className="text-center p-4 bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-xl border border-green-500/20">
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-5 w-5 text-green-600 mr-2" />
                <div className="text-2xl font-bold text-green-600">{totalMinutes}m</div>
              </div>
              <div className="text-sm text-muted-foreground">{t('jr.time')}</div>
              <div className="text-xs text-green-600 mt-1">{t('jr.timeNote', { avg })}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {talks.length > 0 && (
        <Card className="border-border/50 shadow-magical">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[hsl(var(--espaluz-primary))]" />
              {collected.length ? t('jr.collectedTitle', { count: collected.length }) : t('jr.listTitle', { count: talks.length })}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{collected.length ? t('jr.collectedSub') : t('jr.listSub')}</p>
          </CardHeader>
          {collected.length > 0 && (
            <CardContent className="space-y-4 pt-0">
              {tipState === 'loading' && <p className="text-sm text-muted-foreground">{t('jr.tipLoading')}</p>}
              {tip && (
                <div className="rounded-xl border border-[hsl(var(--espaluz-primary))]/30 bg-[hsl(var(--espaluz-primary))]/5 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-[hsl(var(--espaluz-primary))]"><Sparkles className="h-4 w-4" />{t('jr.tipTitle')}</p>
                  <p className="mt-2 text-base leading-relaxed text-foreground">{tip.tip}</p>
                  <Button size="sm" className="mt-3" onClick={practise}>{t('jr.practise')}</Button>
                </div>
              )}
              <div className="space-y-2">
                {(allPhrases ? collected : collected.slice(0, 6)).map((c) => (
                  <div key={c.es} className="rounded-lg bg-primary/5 p-3">
                    {/* 17 Nov 2026 (readers: "let me hear how to say it"): the browser's own Spanish voice, as in the lessons. */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-foreground">{c.es}</p>
                      <button type="button" aria-label={t('jr.listen')} className="shrink-0 rounded-full p-1.5 text-[hsl(var(--espaluz-primary))] hover:bg-primary/10"
                        onClick={() => { try { const u = new SpeechSynthesisUtterance(c.es); u.lang = 'es-ES'; u.rate = 0.85; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch { /* no voice on this device */ } }}>
                        <Volume2 className="h-4 w-4" />
                      </button>
                    </div>
                    {c.en && <p className="text-sm text-muted-foreground">{c.en}</p>}
                    <p className="mt-1 text-xs text-muted-foreground/80">{label(c.channel)} · {new Date(c.at).toLocaleDateString(i18n.language || undefined, { month: 'short', day: 'numeric' })}</p>
                  </div>
                ))}
                {collected.length > 6 && (
                  <Button variant="ghost" size="sm" onClick={() => setAllPhrases(!allPhrases)}>{allPhrases ? t('jr.fewerPhrases') : t('jr.allPhrases', { count: collected.length })}</Button>
                )}
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={() => setShowTalks(!showTalks)}>
                {showTalks ? t('jr.hideTalks') : t('jr.showTalks', { count: talks.length })}
              </Button>
            </CardContent>
          )}
          {(showTalks || !collected.length) && (
          <CardContent className="space-y-3">
            {talks.slice(0, 8).map((x) => {
              const open = expanded.has(x.id);
              const toggle = () => { const n = new Set(expanded); if (open) n.delete(x.id); else n.add(x.id); setExpanded(n); };
              return (
                <Collapsible key={x.id} open={open} onOpenChange={toggle}>
                  <Card className="border border-border/30 hover:border-[hsl(var(--espaluz-primary))]/40 transition-colors">
                    <CollapsibleTrigger asChild>
                      <CardContent className="p-4 cursor-pointer">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-2 h-2 shrink-0 bg-green-500 rounded-full"></div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium">
                                {new Date(x.start).toLocaleDateString(i18n.language || undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {t('jr.talkLine', { minutes: x.minutes, count: x.turns })}{x.phrases.length ? ` · ${t('jr.talkPhrases', { count: x.phrases.length })}` : ''}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className="text-xs">{label(x.channel)}</Badge>
                            {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                          </div>
                        </div>
                        {!open && x.phrases[0] && (
                          <div className="mt-2 text-xs text-muted-foreground p-2 bg-muted/30 rounded border-l-2 border-[hsl(var(--espaluz-primary))]/30">
                            {x.phrases[0].es}{x.phrases[0].en ? ` - ${x.phrases[0].en}` : ''}
                          </div>
                        )}
                      </CardContent>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-4 pb-4 border-t border-border/30 space-y-2 pt-3">
                        {x.phrases.length ? x.phrases.map((p) => (
                          <div key={p.es} className="rounded-lg bg-primary/5 p-2 text-sm">
                            <p className="font-medium text-foreground">{p.es}</p>
                            {p.en && <p className="text-xs text-muted-foreground">{p.en}</p>}
                          </div>
                        )) : <p className="text-sm text-muted-foreground">{x.channel === 'classroom' ? t('jr.classNote') : t('jr.noPhrases')}</p>}
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </CardContent>
          )}
        </Card>
      )}
    </div>
  );
};
