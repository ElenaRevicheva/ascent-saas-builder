import { useCallback, useEffect, useMemo, useState } from 'react';
import { Heart, ArrowRight, CalendarDays, Lock, Phone, Send, Globe, Search, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerClose } from '@/components/ui/drawer';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

/*
 * 8 Nov 2026 (Elena): card 7 of the family map, "Your life in Panama, with EspaLuz". Not a list of notes: the proof that
 * EspaLuz knows each person in the family, walks into next week with them, and keeps their story in the new country.
 * Every line comes from stored records through espaluz-chat {memory:'story'} (no model writes any of it, so nothing is
 * invented). Shape from Elena's own Kanban (docs/espaluz/MEMORY_SHELVES_FROM_KANBAN_2026-11-08.md, in cto-aipa):
 * standing notes per person (Reglas), dated things ahead (Cita), and past moments kept as the family's wins (Gane) -
 * archived, never deleted. The card never grows: it shows people and counts; the panel holds the rest.
 */

type Note = { id: string; fact: string; source: string; at: string; until: string | null; isNew: boolean };
type Channel = { platform: string; since: string | null };
type Member = {
  id: string; name: string; role: string; age: number | null; interests: string[];
  talks: number; days: number; firstLesson: string | null; lastLesson: string | null; lastTheme: string | null;
  channels: Channel[]; webTalks: number; notes: Note[];
};
type Story = {
  ok: boolean; since: string | null; members: Member[]; otherNotes: Note[]; hiddenNotes: { id: string; by: string; at: string }[];
  comingUp: Note[]; story: { date: string; text: string; kind: string; id?: string }[]; unnamedChannels: Channel[];
  newThisWeek: number; remembered: number;
};

const COUNTRY = 'Panama';
const tint = 'hsl(var(--espaluz-purple))';
const day = (iso?: string | null) => (iso ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '');
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const where = (s: string) => (s === 'whatsapp' ? 'WhatsApp' : s === 'telegram' ? 'Telegram' : s === 'web' ? 'the web' : s || 'EspaLuz');
const channelIcon = (p: string) => (p === 'telegram' ? Send : p === 'whatsapp' ? Phone : Globe);

function personLine(m: Member): string {
  const bits: string[] = [];
  if (m.talks) bits.push(`${plural(m.talks, 'talk', 'talks')} with Pere & Titi on ${plural(m.days, 'day', 'days')}`);
  const on = m.channels.map((c) => where(c.platform));
  if (m.webTalks) on.push('the web');
  if (on.length) bits.push(`talks with EspaLuz on ${on.join(', ')}`);
  if (m.interests.length) bits.push(`loves ${m.interests.slice(0, 2).join(' and ')}`);
  return bits.join(' · ');
}

export const OurStoryCard = ({ index, onDone }: { index: number; onDone?: (done: boolean) => void }) => {
  const { user } = useAuth();
  const [story, setStory] = useState<Story | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [forgotten, setForgotten] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('espaluz-chat', { body: { memory: 'story' } });
    if (error || !data?.ok) { setFailed(true); return; }
    setStory(data as Story);
  }, []);

  useEffect(() => { if (user) load().catch(() => setFailed(true)); }, [user, load]);

  const done = !!story && story.members.length > 0 && (story.remembered > 0 || story.members.some((m) => m.talks > 0));
  useEffect(() => { if (story) onDone?.(done); }, [story, done, onDone]);

  const toggle = async (id: string) => {
    setBusy(id);
    const mode = forgotten[id] ? 'restore' : 'forget';
    const { data, error } = await supabase.functions.invoke('espaluz-chat', { body: { memory: mode, id } });
    setBusy(null);
    if (!error && data?.ok) setForgotten((f) => ({ ...f, [id]: mode === 'forget' }));
  };

  const people = story?.members ?? [];
  const next = story?.comingUp[0];
  const moments = useMemo(() => story?.story ?? [], [story]);
  const found = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? moments.filter((s) => s.text.toLowerCase().includes(q)) : moments;
  }, [moments, query]);

  const NoteRow = ({ n }: { n: Note }) => {
    const gone = !!forgotten[n.id];
    return (
      <li className="flex items-start gap-2 rounded-xl border border-border bg-background px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className={`text-sm ${gone ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{n.fact}</p>
          <p className="text-xs text-muted-foreground">
            {gone ? 'Forgotten on every channel' : `Told on ${where(n.source)} · ${day(n.at)}${n.until ? ` · for ${day(n.until)}` : ''}`}
            {n.isNew && !gone ? ' · new this week' : ''}
          </p>
        </div>
        <button type="button" disabled={busy === n.id} onClick={() => toggle(n.id)}
          className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50">
          {gone ? 'Undo' : 'Forget'}
        </button>
      </li>
    );
  };

  return (
    <li className="flex flex-col rounded-2xl border border-border p-4 sm:col-span-2 lg:col-span-3"
      style={{ background: done ? 'hsl(var(--background))' : 'hsl(var(--card))' }}>
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white" style={{ background: tint }}>
          <Heart className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{index} · Everyone</p>
          <h3 className="text-lg leading-tight text-foreground">Your life in {COUNTRY}, with EspaLuz</h3>
          {story?.since && <p className="text-sm text-muted-foreground">Together since {day(story.since)}</p>}
        </div>
        {done ? (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-white" style={{ background: 'hsl(var(--espaluz-green))' }}>
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Done
          </span>
        ) : story ? <span className="rounded-full bg-accent px-2 py-1 text-xs font-semibold text-accent-foreground">Next</span> : null}
      </div>

      {!story && !failed && <p className="mt-2 text-sm text-muted-foreground">Checking what EspaLuz knows…</p>}
      {failed && <p className="mt-2 text-sm text-muted-foreground">Could not open your family's story right now. Please try again later.</p>}

      {story && (
        <>
          {people.length === 0 || !done ? (
            <p className="mt-2 text-sm text-muted-foreground">
              EspaLuz is just getting to know you. Add your family, and tell her about your days on WhatsApp, Telegram or in the chat here: she will remember, and you will see it here.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {people.slice(0, 4).map((m) => (
                <li key={m.id} className="flex items-start gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: tint }}>
                    {m.name.slice(0, 1).toUpperCase()}
                  </span>
                  <p className="text-sm text-foreground">
                    <span className="font-semibold">{m.name}</span>{m.age ? `, ${m.age}` : ''}
                    {personLine(m) && <span className="text-muted-foreground"> — {personLine(m)}</span>}
                    {/* The notes themselves stay inside the panel: the card face can be seen by anyone near the screen. */}
                    {m.notes.length > 0 && <span className="text-muted-foreground"> · EspaLuz remembers {plural(m.notes.length, 'thing', 'things')}</span>}
                  </p>
                </li>
              ))}
              {people.length > 4 && <li className="text-sm text-muted-foreground">and {people.length - 4} more</li>}
            </ul>
          )}
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {next && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-foreground">
                <CalendarDays className="h-4 w-4" aria-hidden /> Coming up: {plural(story.comingUp.length, 'thing', 'things')}, next {day(next.until)}
              </span>
            )}
            {moments.length > 0 && (
              <span className="rounded-full border border-border bg-background px-3 py-1 text-foreground">Our story: {plural(moments.length, 'moment', 'moments')}</span>
            )}
            {story.newThisWeek > 0 && (
              <span className="rounded-full border border-border bg-background px-3 py-1 text-foreground">{story.newThisWeek} new this week</span>
            )}
          </div>
          <div className="mt-3">
            <button type="button" onClick={() => setOpen(true)}>
              <span className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold text-white" style={{ background: tint }}>
                Open our story <ArrowRight className="h-4 w-4" aria-hidden />
              </span>
            </button>
          </div>

          <Drawer open={open} onOpenChange={(o) => { setOpen(o); if (!o && Object.keys(forgotten).length) load(); }}>
            <DrawerContent className="max-h-[88vh]">
              <div className="mx-auto w-full max-w-2xl overflow-y-auto px-4 pb-6">
                <DrawerHeader className="px-0 text-left">
                  <DrawerTitle>Your life in {COUNTRY}, with EspaLuz</DrawerTitle>
                  <DrawerDescription>
                    What EspaLuz knows about your family, from every channel. Only your family sees this. “Forget” stops EspaLuz using a family note on WhatsApp, Telegram and the web.
                  </DrawerDescription>
                </DrawerHeader>
                <Tabs defaultValue="people">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="people">Each of you</TabsTrigger>
                    <TabsTrigger value="next">Coming up</TabsTrigger>
                    <TabsTrigger value="story">Our story</TabsTrigger>
                  </TabsList>

                  <TabsContent value="people" className="space-y-5 pt-3">
                    {people.map((m) => (
                      <section key={m.id}>
                        <h4 className="text-base font-semibold text-foreground">{m.name}{m.age ? `, ${m.age}` : ''}</h4>
                        {personLine(m) && <p className="text-sm text-muted-foreground">{personLine(m)}</p>}
                        {m.lastTheme && <p className="text-sm text-muted-foreground">Last class: {m.lastTheme}</p>}
                        {m.channels.length > 0 && (
                          <p className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {m.channels.map((c) => { const I = channelIcon(c.platform); return (
                              <span key={c.platform} className="inline-flex items-center gap-1"><I className="h-3.5 w-3.5" aria-hidden />{where(c.platform)} since {day(c.since)}</span>
                            ); })}
                          </p>
                        )}
                        {m.notes.length > 0
                          ? <ul className="mt-2 space-y-2">{m.notes.map((n) => <NoteRow key={n.id} n={n} />)}</ul>
                          : <p className="mt-1 text-sm text-muted-foreground">No notes about {m.name} yet.</p>}
                      </section>
                    ))}
                    {(story.otherNotes.length > 0 || story.unnamedChannels.length > 0) && (
                      <section>
                        <h4 className="text-base font-semibold text-foreground">The whole family</h4>
                        {story.unnamedChannels.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Also connected: {story.unnamedChannels.map((c) => `${where(c.platform)} since ${day(c.since)}`).join(', ')}
                          </p>
                        )}
                        <ul className="mt-2 space-y-2">{story.otherNotes.map((n) => <NoteRow key={n.id} n={n} />)}</ul>
                      </section>
                    )}
                    {story.hiddenNotes.length > 0 && (
                      <section className="rounded-xl border border-border bg-muted/40 p-3">
                        <p className="flex items-center gap-1.5 text-sm text-foreground"><Lock className="h-4 w-4" aria-hidden />
                          {plural(story.hiddenNotes.length, 'private note', 'private notes')} — kept only for the person who said {story.hiddenNotes.length === 1 ? 'it' : 'them'}
                          {[...new Set(story.hiddenNotes.map((h) => h.by).filter(Boolean))].length ? ` (${[...new Set(story.hiddenNotes.map((h) => h.by).filter(Boolean))].join(', ')})` : ''}.
                        </p>
                      </section>
                    )}
                  </TabsContent>

                  <TabsContent value="next" className="pt-3">
                    {story.comingUp.length
                      ? <ul className="space-y-2">{story.comingUp.map((n) => <NoteRow key={n.id} n={n} />)}</ul>
                      : <p className="text-sm text-muted-foreground">Nothing with a date yet. Tell EspaLuz about an appointment, a school day or a trip, and she will help you get ready for it.</p>}
                  </TabsContent>

                  <TabsContent value="story" className="pt-3">
                    {moments.length > 6 && (
                      <label className="mb-3 flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5">
                        <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
                        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your story"
                          className="w-full bg-transparent text-sm text-foreground outline-none" />
                      </label>
                    )}
                    {found.length ? (
                      <ol className="space-y-2 border-l-2 border-border pl-4">
                        {found.map((s, i) => (
                          <li key={`${s.date}-${i}`}>
                            <p className="text-xs font-semibold text-muted-foreground">{day(s.date)}</p>
                            <p className="text-sm text-foreground">{s.text}</p>
                          </li>
                        ))}
                      </ol>
                    ) : <p className="text-sm text-muted-foreground">Your story with EspaLuz starts with your first talk.</p>}
                  </TabsContent>
                </Tabs>
                <DrawerClose asChild>
                  <button type="button" className="mt-5 w-full rounded-full border border-border py-2 text-sm font-semibold text-foreground">Close</button>
                </DrawerClose>
              </div>
            </DrawerContent>
          </Drawer>
        </>
      )}
    </li>
  );
};
