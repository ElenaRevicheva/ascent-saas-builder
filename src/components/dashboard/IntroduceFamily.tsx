import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { grabFrames } from './CelebrationMoment';

/*
 * 17 Nov 2026 (Elena: "Add your family's video" only showed the clip back on the dashboard - "we need this button to serve
 * something really valuable"). "Introduce your family to EspaLuz": EspaLuz's niche is memory, and until now she learned the
 * family only from what they typed. Here she SEES them:
 *  - the clip or photo NEVER leaves the phone: the browser takes up to 3 small stills (the Celebrations grabber) and joins
 *    them into one picture;
 *  - espaluz-chat `familyLook` (the free photo readers) lists 3-5 things clearly visible and worth talking about - pets,
 *    hobbies, the home - never faces, bodies, names or ages;
 *  - the parent TICKS what is true; only ticked notes go into the family notebook (`familyLookSave`), the same notebook the
 *    web chat, WhatsApp and Telegram read. Nothing is saved without a tick.
 *  - only notes about what the family DOES or LOVES (a pet, a hobby, a shared meal); furniture and decoration are never noted.
 */
type Note = { fact: string; shown: string };

async function joinStills(frames: string[]): Promise<string> {
  const imgs = await Promise.all(frames.map((src) => new Promise<HTMLImageElement>((ok, bad) => {
    const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = src;
  })));
  const h = Math.min(...imgs.map((i) => i.naturalHeight));
  const widths = imgs.map((i) => Math.round(i.naturalWidth * (h / i.naturalHeight)));
  const c = document.createElement('canvas');
  c.width = widths.reduce((a, b) => a + b, 0); c.height = h;
  const g = c.getContext('2d')!;
  let x = 0;
  imgs.forEach((i, k) => { g.drawImage(i, x, 0, widths[k], h); x += widths[k]; });
  return c.toDataURL('image/jpeg', 0.75);
}

export const IntroduceFamily = () => {
  const { t, i18n } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<'idle' | 'looking' | 'pick' | 'saved'>('idle');
  const [notes, setNotes] = useState<Note[]>([]);
  const [ticked, setTicked] = useState<Set<number>>(new Set());
  const [msg, setMsg] = useState('');

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setMsg(''); setPhase('looking');
    try {
      const frames = await grabFrames(file);
      if (!frames.length) throw new Error('no frames');
      const image = frames.length > 1 ? await joinStills(frames) : frames[0];
      const { data, error } = await supabase.functions.invoke('espaluz-chat', { body: { familyLook: { image, lang: (i18n.language || 'en').slice(0, 2) } } });
      if (error) throw error;
      const got: Note[] = Array.isArray(data?.notes) ? data.notes : [];
      if (!got.length) { setMsg(t('fam.nothing')); setPhase('idle'); return; }
      setNotes(got); setTicked(new Set()); setPhase('pick');
    } catch {
      setMsg(t('fam.failed')); setPhase('idle');
    }
  };

  const save = async () => {
    const facts = notes.filter((_, k) => ticked.has(k)).map((n) => n.fact);
    if (!facts.length) { setPhase('idle'); setNotes([]); return; }
    try {
      const { data, error } = await supabase.functions.invoke('espaluz-chat', { body: { familyLookSave: { facts } } });
      if (error) throw error;
      setMsg(t('fam.saved', { count: Number(data?.saved ?? 0) })); setPhase('saved');
    } catch {
      setMsg(t('fam.failed'));
    }
  };

  return (
    <div className="space-y-3">
      <input ref={fileRef} type="file" accept="video/*,image/*" onChange={pick} className="hidden" />
      {phase !== 'pick' && (
        <Button onClick={() => fileRef.current?.click()} disabled={phase === 'looking'} variant="outline" className="w-full">
          <Users className="mr-2 h-4 w-4" />
          {phase === 'looking' ? t('fam.looking') : t('fam.button')}
        </Button>
      )}
      {phase === 'idle' && !msg && <p className="text-sm text-muted-foreground">{t('fam.how')}</p>}
      {phase === 'pick' && (
        <div className="rounded-xl border border-border/60 p-4">
          <p className="text-sm font-semibold text-foreground">{t('fam.noticed')}</p>
          <div className="mt-3 space-y-2">
            {notes.map((n, k) => {
              const on = ticked.has(k);
              return (
                <button key={k} type="button" onClick={() => { const s = new Set(ticked); if (on) s.delete(k); else s.add(k); setTicked(s); }}
                  className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left text-sm ${on ? 'border-primary bg-primary/10' : 'border-border/60'}`}>
                  <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border ${on ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40'}`}>
                    {on && <Check className="h-3.5 w-3.5" />}
                  </span>
                  <span>{n.shown}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={save} disabled={!ticked.size}>{t('fam.keep', { count: ticked.size })}</Button>
            <Button size="sm" variant="ghost" onClick={() => { setPhase('idle'); setNotes([]); }}>{t('fam.cancel')}</Button>
          </div>
        </div>
      )}
      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
    </div>
  );
};
