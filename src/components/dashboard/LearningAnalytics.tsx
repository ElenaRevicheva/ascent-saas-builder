import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Zap, BookOpen, MessageCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

/*
 * 8 Nov 2026 (Elena: "read the actual lessons... the parent's weekly overview", and "it must not duplicate the map").
 * The map and card 7 answer WHO is in it and WHAT EspaLuz knows, all-time. This block answers only THIS WEEK: which days
 * the family practised, what each child worked on (the classroom's real units), how the grown-ups talked, compared with
 * last week. It used to read the old lesson modules nobody used (0 lessons next to 429 real talks) and showed a
 * "weekly progress" of rows x 20 - both gone. No words count: the classroom does not record words yet (0 of 311 rows).
 * Same records and the same one-child rule as card 7 (a child often plays on the parent's profile).
 */

type Row = { created_at: string; session_type: string; source: string | null; member: string | null; unit: string | null; label: string | null };
type Member = { id: string; name: string; role: string };
type Week = {
  days: { key: string; label: string; active: boolean }[];
  streak: number;
  kids: { id: string; name: string; talks: number; days: number; lastWeek: number; units: string[] }[];
  grownUps: { channel: string; talks: number }[];
  grownUpsLastWeek: number;
  modulesDone: number;
  waUncounted: boolean;
};

// A plain string keeps the client's column-type inference shallow (json paths make it recurse too deep).
const ROW_COLUMNS: string = 'created_at, session_type, source, member:content->>family_member_id, unit:content->>class_unit, label:content->>class_label';
const PRACTICE = ['classroom', 'conversation', 'dashboard_chat', 'chat'];
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
// "Unit 4 · Los animales / Animals · Spanish: syllables…" → "Unit 4 · Los animales / Animals"
const unitName = (r: Row) => (r.label ? r.label.split(' · ').slice(0, 2).join(' · ') : r.unit ? `Unit ${r.unit}` : '');

export const LearningAnalytics = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [week, setWeek] = useState<Week | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      since.setDate(since.getDate() - 13);
      const rows: Row[] = [];
      for (let p = 0; p < 3; p++) {
        const { data, error } = await supabase.from('learning_sessions')
          .select(ROW_COLUMNS)
          .eq('user_id', user.id).in('session_type', PRACTICE).gte('created_at', since.toISOString())
          .order('created_at', { ascending: false }).range(p * 1000, p * 1000 + 999);
        if (error) throw error;
        rows.push(...((data ?? []) as unknown as Row[]));
        if (!data || data.length < 1000) break;
      }
      const [{ data: fam }, { count: modulesDone }, { data: bots }] = await Promise.all([
        supabase.from('family_members').select('id, name, role').eq('user_id', user.id).eq('is_active', true).order('created_at'),
        supabase.from('user_module_progress').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_completed', true),
        supabase.from('connected_bots').select('platform, is_active').eq('user_id', user.id),
      ]);
      if (cancelled) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - 6);
      const inWeek = (r: Row) => new Date(r.created_at) >= weekStart;
      const active = new Set(rows.map((r) => dayKey(new Date(r.created_at))));

      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return { key: dayKey(d), label: d.toLocaleDateString(undefined, { weekday: 'short' }), active: active.has(dayKey(d)) };
      });
      // Practised days in a row, ending today (or yesterday, so the morning does not reset it).
      let streak = 0;
      const cursor = new Date(today);
      if (!active.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
      while (active.has(dayKey(cursor)) && streak < 14) { streak++; cursor.setDate(cursor.getDate() - 1); }

      const members = ((fam ?? []) as Member[]);
      const kidsList = members.filter((m) => m.role === 'child');
      const kidIds = new Set(kidsList.map((k) => k.id));
      const classroom = rows.filter((r) => r.session_type === 'classroom');
      const kids = kidsList.map((k) => {
        const mine = classroom.filter((r) => r.member === k.id || (kidsList.length === 1 && !kidIds.has(r.member ?? '')));
        const now = mine.filter(inWeek);
        const units: string[] = [];
        for (const r of now) { const u = unitName(r); if (u && !units.includes(u)) units.push(u); }
        return { id: k.id, name: k.name, talks: now.length, days: new Set(now.map((r) => dayKey(new Date(r.created_at)))).size,
          lastWeek: mine.length - now.length, units };
      });

      const talk = rows.filter((r) => r.session_type !== 'classroom');
      const channel = (r: Row) => (r.session_type === 'conversation' ? (r.source === 'whatsapp' ? 'WhatsApp' : 'Telegram') : 'the web');
      const counts = new Map<string, number>();
      for (const r of talk.filter(inWeek)) counts.set(channel(r), (counts.get(channel(r)) ?? 0) + 1);
      setWeek({
        days, streak, kids,
        grownUps: [...counts.entries()].map(([c, n]) => ({ channel: c, talks: n })).sort((a, b) => b.talks - a.talks),
        grownUpsLastWeek: talk.filter((r) => !inWeek(r)).length,
        modulesDone: modulesDone ?? 0,
        // Grown-up WhatsApp talks are kept on the bot's own server, not in these records: say so instead of showing 0.
        waUncounted: !counts.has('WhatsApp') && (bots ?? []).some((b: { platform: string; is_active: boolean | null }) => b.platform === 'whatsapp' && b.is_active !== false),
      });
    })().catch((e) => { console.error('[journey]', e); if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [user]);

  const compare = (now: number, before: number) =>
    before === 0 ? (now ? 'new this week' : '') : now > before ? `up from ${before} last week` : now < before ? `${before} last week` : 'same as last week';

  return (
    <Card className="border-border/50 shadow-magical" style={{ background: 'var(--gradient-card)' }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-[hsl(var(--espaluz-primary))]" />
          {t('learningAnalysis.yourLearningJourney')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">This week, the last 7 days</p>
      </CardHeader>

      <CardContent className="space-y-5">
        {!week && !failed && <div className="h-16 animate-pulse rounded-lg bg-muted" />}
        {failed && <p className="text-sm text-muted-foreground">Could not load this week right now. Please try again later.</p>}

        {week && (
          <>
            <div>
              <div className="flex flex-wrap gap-2" aria-label="Days practised this week">
                {week.days.map((d) => (
                  <div key={d.key} className="flex flex-col items-center gap-1">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold"
                      style={d.active
                        ? { background: 'hsl(var(--espaluz-purple))', color: 'white' }
                        : { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}>
                      {d.active ? '✓' : ''}
                    </span>
                    <span className="text-xs text-muted-foreground">{d.label}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-foreground">
                <Zap className="h-4 w-4 text-yellow-500" aria-hidden />
                Practised {week.days.filter((d) => d.active).length} of the last 7 days
                {week.streak > 1 ? ` · ${week.streak >= 14 ? '14+' : week.streak} days in a row` : ''}
              </p>
            </div>

            {week.kids.map((k) => (
              <div key={k.id} className="rounded-xl border border-border bg-background/50 p-4">
                <p className="flex items-center gap-1.5 text-base font-semibold text-foreground">
                  <BookOpen className="h-4 w-4 text-[hsl(var(--espaluz-primary))]" aria-hidden /> {k.name} in Pere &amp; Titi's classroom
                </p>
                {k.talks ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      {plural(k.talks, 'talk', 'talks')} on {plural(k.days, 'day', 'days')}{compare(k.talks, k.lastWeek) ? ` · ${compare(k.talks, k.lastWeek)}` : ''}
                    </p>
                    {k.units.length > 0 && (
                      <>
                        <p className="mt-2 text-sm text-foreground">Worked on this week:</p>
                        <ul className="mt-1 flex flex-wrap gap-2">
                          {k.units.slice(0, 8).map((u) => (
                            <li key={u} className="rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground">{u}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No class this week yet{k.lastWeek ? ` (${plural(k.lastWeek, 'talk', 'talks')} last week)` : ''}. Pere and Titi are waiting.
                  </p>
                )}
              </div>
            ))}

            <div className="rounded-xl border border-border bg-background/50 p-4">
              <p className="flex items-center gap-1.5 text-base font-semibold text-foreground">
                <MessageCircle className="h-4 w-4 text-[hsl(var(--espaluz-primary))]" aria-hidden /> Grown-ups with EspaLuz
              </p>
              <p className="text-sm text-muted-foreground">
                {week.grownUps.length
                  ? `${week.grownUps.map((g) => `${plural(g.talks, 'talk', 'talks')} on ${g.channel}`).join(' · ')}${
                    compare(week.grownUps.reduce((s, g) => s + g.talks, 0), week.grownUpsLastWeek) ? ` · ${compare(week.grownUps.reduce((s, g) => s + g.talks, 0), week.grownUpsLastWeek)}` : ''}`
                  : 'No talks recorded this week. Ask EspaLuz about the school, the doctor or the shop - here, on WhatsApp or Telegram.'}
              </p>
              {week.waUncounted && (
                <p className="mt-1 text-xs text-muted-foreground">Talks on WhatsApp are not counted here yet.</p>
              )}
              {week.modulesDone > 0 && (
                <p className="mt-1 text-sm text-muted-foreground">Spanish modules finished: {week.modulesDone}</p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
