import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

/*
 * 8 Nov 2026 (Elena approved the 9 questions): "About your new life". Serious, never pushy: one question per screen,
 * tap answers, each says WHY, only the first is needed, the rest can be skipped and EspaLuz asks them later in
 * conversation (profileLine in espaluz-chat / profile_line in the bots). The same questions the Telegram bot already
 * asks at the start (country, family) plus the new ones. Saved as one more note in the family notebook -
 * learning_sessions {event:'family_profile'} like family_fact and family_link - so no new table, and kids-memory hands it
 * to WhatsApp and Telegram. Children stay in the family list (question 6 points there), so nothing is asked twice.
 */

export type FamilyProfile = {
  country_now?: string; country_from?: string; native_language?: string; moved_when?: string; household?: string;
  spanish_feel?: string; focus?: string[]; miss_most?: string;
};

// The 21 countries with a belonging pack (supabase/functions/_shared/belonging/<key>.json).
export const PACK_COUNTRIES: [string, string][] = [
  ['panama', 'Panama'], ['mexico', 'Mexico'], ['colombia', 'Colombia'], ['argentina', 'Argentina'], ['spain', 'Spain'],
  ['peru', 'Peru'], ['chile', 'Chile'], ['ecuador', 'Ecuador'], ['guatemala', 'Guatemala'], ['costa_rica', 'Costa Rica'],
  ['cuba', 'Cuba'], ['bolivia', 'Bolivia'], ['dominican_republic', 'Dominican Republic'], ['honduras', 'Honduras'],
  ['paraguay', 'Paraguay'], ['nicaragua', 'Nicaragua'], ['el_salvador', 'El Salvador'], ['uruguay', 'Uruguay'],
  ['puerto_rico', 'Puerto Rico'], ['venezuela', 'Venezuela'], ['equatorial_guinea', 'Equatorial Guinea'],
];

type Q = { key: keyof FamilyProfile | 'family'; ask: string; why: string; options?: string[]; multi?: boolean; free?: string };
const QUESTIONS: Q[] = [
  { key: 'country_now', ask: 'Where is home now?', why: 'So EspaLuz knows your holidays, your school calendar and your local customs.' },
  { key: 'country_from', ask: 'And where does your story begin?', why: 'So she can build bridges between the customs you grew up with and the new ones.', free: 'Your country of origin' },
  { key: 'native_language', ask: 'Which language does your heart speak?', why: 'So when Spanish gets too hard, she can explain a word in your language.',
    options: ['English', 'Russian', 'Ukrainian', 'Portuguese', 'French', 'German', 'Italian', 'Chinese', 'Arabic', 'Hindi'], free: 'Another language' },
  { key: 'moved_when', ask: 'How long have you been here?', why: 'The first months are about getting by; later it is about belonging. She meets you where you are.',
    options: ['Still planning the move', 'Less than 6 months', '6 to 12 months', '1 to 3 years', 'More than 3 years'] },
  { key: 'household', ask: 'Who is on this adventure with you?', why: 'So she talks to your real family, not a generic one.',
    options: ['Two parents with children', 'Single parent with children', 'A couple', 'Grandparents with grandchildren', 'On my own', 'Another family shape'] },
  { key: 'family', ask: 'Who are the little ones?', why: "So Pere & Titi know each child by name. Names and ages live in your family list." },
  { key: 'spanish_feel', ask: 'How does Spanish feel today?', why: 'So she pitches every answer at your level.',
    options: ["I'm just starting", 'I get by', "I'm comfortable"] },
  { key: 'focus', ask: 'What would make the biggest difference this month?', why: 'So she starts where it matters to you now. Choose any; change it when life changes.', multi: true,
    options: ["The children's school", 'Doctors and health', 'Work', 'Papers and offices', 'Friends and neighbours', 'Feeling at home', 'Speaking with confidence'] },
  { key: 'miss_most', ask: 'What do you miss most from home?', why: 'So she can help you find a piece of home here, and build new traditions.',
    options: ['People', 'Food', 'My language', 'Traditions', 'The rhythm of life', 'Nothing much'] },
];

export async function readFamilyProfile(userId: string): Promise<FamilyProfile | null> {
  const { data } = await supabase.from('learning_sessions').select('content').eq('user_id', userId)
    .eq('session_type', 'analytics').eq('content->>event', 'family_profile').order('created_at', { ascending: false }).limit(1);
  return (data?.[0]?.content as FamilyProfile | undefined) ?? null;
}

const chip = (on: boolean) => `rounded-full border px-3 py-1.5 text-sm ${on ? 'border-transparent text-white' : 'border-border bg-background text-foreground'}`;

export const FamilyProfileDialog = ({ open, onOpenChange, onSaved, onOpenFamily }: {
  open: boolean; onOpenChange: (o: boolean) => void; onSaved?: (p: FamilyProfile) => void; onOpenFamily?: () => void;
}) => {
  const { user } = useAuth();
  const [p, setP] = useState<FamilyProfile>({});
  const [kids, setKids] = useState<string[]>([]);
  const [i, setI] = useState(0);
  const [typed, setTyped] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setI(0);
    readFamilyProfile(user.id).then((got) => { const { event: _e, ...rest } = (got ?? {}) as FamilyProfile & { event?: string }; setP(rest); });
    supabase.from('family_members').select('name, age, role').eq('user_id', user.id).eq('is_active', true)
      .then(({ data }) => setKids((data ?? []).filter((m) => m.role === 'child').map((m) => `${m.name}${m.age ? `, ${m.age}` : ''}`)));
  }, [open, user]);

  const q = QUESTIONS[i];
  useEffect(() => {
    const v = q && q.key !== 'family' ? p[q.key] : '';
    setTyped(typeof v === 'string' && q?.free && !(q.options ?? []).includes(v) ? v : '');
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (final: FamilyProfile) => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('learning_sessions').insert({ user_id: user.id, session_type: 'analytics', source: 'web',
      content: { event: 'family_profile', ...final } });
    setSaving(false);
    if (error) { toast.error('Could not save. Please try again.'); return; }
    toast.success('Thank you. EspaLuz will use this on the web, WhatsApp and Telegram.');
    onSaved?.(final);
    onOpenChange(false);
  };

  const withTyped = (): FamilyProfile => (q?.free && typed.trim() && q.key !== 'family' ? { ...p, [q.key]: typed.trim().slice(0, 60) } : p);
  const next = () => {
    const cur = withTyped();
    setP(cur);
    if (i === 0 && !cur.country_now) { toast.error('Please choose where home is now'); return; }
    if (i < QUESTIONS.length - 1) setI(i + 1); else save(cur);
  };
  const pick = (v: string) => {
    if (!q || q.key === 'family') return;
    if (q.multi) {
      const list = (p.focus ?? []);
      setP({ ...p, focus: list.includes(v) ? list.filter((x) => x !== v) : [...list, v] });
    } else { setP({ ...p, [q.key]: v }); setTyped(''); }
  };
  const tint = 'hsl(var(--espaluz-purple))';

  return (
    // Closing half-way never loses answers: once "home now" is chosen, what was answered is kept.
    <Dialog open={open} onOpenChange={(o) => { if (!o && !saving && withTyped().country_now) { save(withTyped()); return; } onOpenChange(o); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>About your new life</DialogTitle>
          <DialogDescription>Question {i + 1} of {QUESTIONS.length} · only your family sees this, and you can change it any time.</DialogDescription>
        </DialogHeader>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full" style={{ width: `${((i + 1) / QUESTIONS.length) * 100}%`, background: tint }} />
        </div>
        {q && (
          <div className="space-y-3">
            <p className="text-lg font-semibold text-foreground">{q.ask}</p>
            <p className="text-sm text-muted-foreground">{q.why}</p>

            {q.key === 'country_now' && (
              <div className="flex flex-wrap gap-2">
                {PACK_COUNTRIES.map(([k, n]) => (
                  <button key={k} type="button" onClick={() => setP({ ...p, country_now: k })} className={chip(p.country_now === k)}
                    style={p.country_now === k ? { background: tint } : undefined}>{n}</button>
                ))}
              </div>
            )}

            {q.key === 'family' && (
              <div className="rounded-xl border border-border bg-background p-3 text-sm">
                {kids.length ? <p className="text-foreground">Children in your family list: {kids.join(' · ')}</p>
                  : <p className="text-muted-foreground">No children in your family list yet.</p>}
                <button type="button" className="mt-2 font-semibold text-primary hover:underline"
                  onClick={() => { onOpenChange(false); onOpenFamily?.(); }}>Open your family list →</button>
              </div>
            )}

            {q.options && q.key !== 'country_now' && (
              <div className="flex flex-wrap gap-2">
                {q.options.map((o) => {
                  const on = q.multi ? (p.focus ?? []).includes(o) : q.key !== 'family' && p[q.key] === o;
                  return <button key={o} type="button" onClick={() => pick(o)} className={chip(on)} style={on ? { background: tint } : undefined}>{o}</button>;
                })}
              </div>
            )}

            {q.free && (
              <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={q.free}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
            )}

            <div className="flex items-center justify-between pt-2">
              <button type="button" disabled={i === 0} onClick={() => setI(i - 1)} className="text-sm text-muted-foreground disabled:opacity-40">← Back</button>
              <div className="flex items-center gap-3">
                {i > 0 && i < QUESTIONS.length - 1 && (
                  <button type="button" onClick={() => setI(i + 1)} className="text-sm text-muted-foreground hover:underline">Skip for now</button>
                )}
                <button type="button" disabled={saving} onClick={next}
                  className="rounded-full px-5 py-2 text-sm font-semibold text-white disabled:opacity-60" style={{ background: tint }}>
                  {i < QUESTIONS.length - 1 ? 'Next' : saving ? 'Saving…' : 'Done'}
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
