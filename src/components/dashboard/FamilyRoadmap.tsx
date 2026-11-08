import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Users, Smile, MessageCircle, Phone, Send, Gift, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { OurStoryCard } from './OurStoryCard';

/*
 * 4 Nov 2026 (Elena): the roadmap stays visible for every family - trial or paying - and ticks the steps it has
 * really done, because it shows how the pieces work together: the kids classroom, the parent's web chat,
 * WhatsApp and Telegram, one family. Every tick comes from the family's own rows (RLS: own data only):
 *   family_members · learning_sessions (session_type) · connected_bots · referrals.
 * Colors: approved violet + sun palette tokens only (src/index.css, --espaluz-*).
 */

type StepState = { done: boolean; fact: string };
type Facts = {
  family: StepState; classroom: StepState; webChat: StepState;
  whatsapp: StepState; telegram: StepState; invite: StepState;
};

const WHATSAPP_URL = 'https://wa.me/50766623757';
const TELEGRAM_URL = 'https://t.me/EspaLuzFamily_bot';

const day = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function scrollToSelector(selector: string, openAddMember = false) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (openAddMember) {
    setTimeout(() => {
      const btn = [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('Add Member'));
      btn?.click();
    }, 500);
  }
}

export const FamilyRoadmap = () => {
  const { user } = useAuth();
  const [facts, setFacts] = useState<Facts | null>(null);
  // Polish (4 Nov): when every step is done the map stays visible as ONE slim row; 'Show map' opens it.
  const [expanded, setExpanded] = useState(false);
  // 8 Nov 2026: card 7 (OurStoryCard) reports whether EspaLuz already knows this family; it counts like the six steps.
  const [storyDone, setStoryDone] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const uid = user.id;
      const count = async (q: any) => {
        const { count: n } = await q;
        return n ?? 0;
      };
      const [members, kidsWeb, kidsWa, chats, bots, invites] = await Promise.all([
        supabase.from('family_members').select('role').eq('user_id', uid).eq('is_active', true),
        count(supabase.from('learning_sessions').select('id', { count: 'exact', head: true })
          .eq('user_id', uid).eq('session_type', 'classroom').eq('source', 'web')),
        count(supabase.from('learning_sessions').select('id', { count: 'exact', head: true })
          .eq('user_id', uid).eq('session_type', 'classroom').eq('source', 'whatsapp')),
        count(supabase.from('learning_sessions').select('id', { count: 'exact', head: true })
          .eq('user_id', uid).in('session_type', ['dashboard_chat', 'chat'])),
        supabase.from('connected_bots').select('platform, connected_at, is_active').eq('user_id', uid),
        count(supabase.from('referrals').select('id', { count: 'exact', head: true }).eq('referrer_user_id', uid)),
      ]);
      if (cancelled) return;

      const memberRows = (members.data ?? []) as { role: string | null }[];
      const kids = memberRows.filter((m) => (m.role ?? '').toLowerCase() === 'child').length;
      const botRows = (bots.data ?? []) as { platform: string; connected_at: string | null; is_active: boolean | null }[];
      const bot = (p: string) => botRows.find((b) => b.platform?.toLowerCase() === p && b.is_active !== false);
      const wa = bot('whatsapp');
      const tg = bot('telegram');
      const lessons = kidsWeb + kidsWa;

      setFacts({
        family: {
          done: memberRows.length > 0,
          fact: memberRows.length
            ? `${plural(memberRows.length, 'member', 'members')}${kids ? ` · ${plural(kids, 'child', 'children')}` : ''}`
            : 'Add yourself and your child',
        },
        classroom: {
          done: lessons > 0,
          fact: lessons
            ? `${plural(lessons, 'lesson', 'lessons')}${kidsWa ? ` · web ${kidsWeb} · WhatsApp ${kidsWa}` : ''}`
            : 'Pere and Titi are waiting',
        },
        webChat: {
          done: chats > 0,
          fact: chats ? plural(chats, 'conversation', 'conversations') : 'Doctor, school notes, offices',
        },
        whatsapp: { done: !!wa, fact: wa ? `Connected ${day(wa.connected_at)}` : 'Lessons and help in WhatsApp' },
        telegram: { done: !!tg, fact: tg ? `Connected ${day(tg.connected_at)}` : 'Lessons and help in Telegram' },
        invite: {
          done: invites > 0,
          fact: invites ? plural(invites, 'invite sent', 'invites sent') : 'You both get a month free',
        },
      });
    })().catch((e) => console.error('[roadmap]', e));
    return () => {
      cancelled = true;
    };
  }, [user]);

  type Step = {
    key: keyof Facts; title: string; who: string; color: string; icon: typeof Users;
    action: string; to?: string; href?: string; onClick?: () => void;
  };

  const steps: Step[] = [
    { key: 'family', title: 'Your family', who: 'Everyone', color: '--espaluz-pink', icon: Users,
      action: 'Family members', onClick: () => scrollToSelector('[data-family-members]', !facts?.family.done) },
    { key: 'classroom', title: "Pere & Titi's classroom", who: 'Kids 6-7', color: '--espaluz-yellow', icon: Smile,
      action: 'Open the classroom', to: '/classroom' },
    { key: 'webChat', title: 'Your Spanish, here on the web', who: 'Parents', color: '--espaluz-purple', icon: MessageCircle,
      action: 'Open the chat', onClick: () => scrollToSelector('#chat') },
    { key: 'whatsapp', title: 'EspaLuz on WhatsApp', who: 'Kids + parents', color: '--espaluz-green', icon: Phone,
      action: facts?.whatsapp.done ? 'Open WhatsApp' : 'Connect', ...(facts?.whatsapp.done ? { href: WHATSAPP_URL } : { to: '/connect-bot' }) },
    { key: 'telegram', title: 'EspaLuz on Telegram', who: 'Kids + parents', color: '--espaluz-sky', icon: Send,
      action: facts?.telegram.done ? 'Open Telegram' : 'Connect', ...(facts?.telegram.done ? { href: TELEGRAM_URL } : { to: '/connect-bot' }) },
    { key: 'invite', title: 'Invite your family', who: 'Everyone', color: '--espaluz-orange', icon: Gift,
      action: 'Invite', onClick: () => scrollToSelector('[data-referrals]') },
  ];

  const total = steps.length + 1;
  const doneCount = facts ? steps.filter((s) => facts[s.key].done).length + (storyDone ? 1 : 0) : 0;
  const allDone = !!facts && doneCount === total;

  if (allDone && !expanded) {
    return (
      <section id="roadmap" aria-label="Your EspaLuz map" className="rounded-3xl border border-border bg-card px-5 py-4"
        style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg text-foreground">Your EspaLuz map</h2>
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-white"
            style={{ background: 'hsl(var(--espaluz-green))' }}>
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> All {total} set up
          </span>
          <ul className="flex flex-1 flex-wrap items-center gap-2">
            {steps.map((s) => {
              const Icon = s.icon;
              return (
                <li key={s.key} title={s.title}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full text-white" style={{ background: `hsl(var(${s.color}))` }}>
                    <Icon className="h-3 w-3" aria-hidden />
                  </span>
                  {facts?.[s.key].fact}
                </li>
              );
            })}
          </ul>
          <button type="button" onClick={() => setExpanded(true)} className="text-sm font-semibold text-primary hover:underline">
            Show map
          </button>
        </div>
        <ul className="mt-4 grid gap-4">
          <OurStoryCard index={total} onDone={setStoryDone} />
        </ul>
      </section>
    );
  }

  return (
    <section id="roadmap" aria-labelledby="roadmap-title" className="rounded-3xl border border-border bg-card p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="roadmap-title" className="text-2xl text-foreground">Your EspaLuz map</h2>
          <p className="text-muted-foreground">
            One family, one memory: the classroom, your chat, WhatsApp and Telegram.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm font-semibold text-foreground" aria-live="polite">
            {facts ? `${doneCount} of ${total} done` : 'Checking…'}
          </p>
          {allDone && (
            <button type="button" onClick={() => setExpanded(false)} className="text-sm font-semibold text-primary hover:underline">
              Make it small
            </button>
          )}
        </div>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar"
        aria-valuemin={0} aria-valuemax={total} aria-valuenow={doneCount}>
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(doneCount / total) * 100}%` }} />
      </div>

      <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((s, i) => {
          const f = facts?.[s.key];
          const Icon = s.icon;
          const tint = `hsl(var(${s.color}))`;
          const button = (
            <span className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold text-white"
              style={{ background: tint }}>
              {s.action}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </span>
          );
          return (
            <li key={s.key} className="flex flex-col rounded-2xl border border-border p-4"
              style={{ background: f?.done ? 'hsl(var(--background))' : 'hsl(var(--card))' }}>
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white" style={{ background: tint }}>
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{i + 1} · {s.who}</p>
                  <h3 className="text-lg leading-tight text-foreground">{s.title}</h3>
                </div>
                {f?.done ? (
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-white"
                    style={{ background: 'hsl(var(--espaluz-green))' }}>
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Done
                  </span>
                ) : f ? (
                  <span className="rounded-full bg-accent px-2 py-1 text-xs font-semibold text-accent-foreground">Next</span>
                ) : null}
              </div>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{f?.fact ?? ' '}</p>
              <div className="mt-3">
                {s.to ? (
                  <Link to={s.to}>{button}</Link>
                ) : s.href ? (
                  <a href={s.href} target="_blank" rel="noopener noreferrer">{button}</a>
                ) : (
                  <button type="button" onClick={s.onClick}>{button}</button>
                )}
              </div>
            </li>
          );
        })}
        <OurStoryCard index={total} onDone={setStoryDone} />
      </ol>
    </section>
  );
};
