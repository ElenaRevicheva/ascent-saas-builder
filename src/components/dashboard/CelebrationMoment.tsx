import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PartyPopper, ImagePlus, Download, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

// 14 Nov 2026 (Elena: "let us do celebrations"): "Send EspaLuz your family's moment". The clip or photo is NEVER uploaded:
// the browser takes up to 3 small still pictures from it, and only those go to generate-video (mode 'celebrate'), which
// reads them with the free photo readers, writes a wish from them + the occasion + the family list, and makes ONE
// lip-synced EspaLuz clip (Runway, same pipeline as the talking videos). The finished clip is kept in the family's folder.
// Paid families only, one a month (server-side CELEBRATION_MONTHLY_CAP); the page only shows what the server answers.

const MAX_SIDE = 512;

function shrink(src: CanvasImageSource, w: number, h: number): string {
  const k = Math.min(1, MAX_SIDE / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * k);
  c.height = Math.round(h * k);
  c.getContext('2d')!.drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.7);
}

export async function grabFrames(file: File): Promise<string[]> {
  const url = URL.createObjectURL(file);
  try {
    if (file.type.startsWith('image/')) {
      const img = new Image();
      await new Promise((ok, bad) => { img.onload = ok; img.onerror = bad; img.src = url; });
      return [shrink(img, img.naturalWidth, img.naturalHeight)];
    }
    const v = document.createElement('video');
    v.muted = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.src = url;
    await new Promise((ok, bad) => { v.onloadeddata = ok; v.onerror = bad; setTimeout(() => bad(new Error('timeout')), 15000); });
    const d = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 1;
    const out: string[] = [];
    for (const at of [0.2, 0.5, 0.8]) {
      await new Promise((ok) => { v.onseeked = ok; v.currentTime = Math.min(d * at, Math.max(0, d - 0.1)); setTimeout(ok, 4000); });
      if (v.videoWidth) out.push(shrink(v, v.videoWidth, v.videoHeight));
    }
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}

type Phase = 'idle' | 'working' | 'done';

export const CelebrationMoment = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [occasion, setOccasion] = useState('');
  const [frames, setFrames] = useState<string[]>([]);
  const [reading, setReading] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [note, setNote] = useState('');
  const [clip, setClip] = useState<string | null>(null);
  const [wish, setWish] = useState('');
  const alive = useRef(true);
  const box = useRef<HTMLDivElement>(null);
  // 15 Nov 2026: "Make a celebration video" on a first-year moment (BelongingPath) fills the occasion here.
  useEffect(() => {
    const go = (e: Event) => {
      const o = String((e as CustomEvent).detail?.occasion ?? '').slice(0, 140);
      if (o) setOccasion(o);
      box.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    window.addEventListener('espaluz:celebrate', go);
    return () => window.removeEventListener('espaluz:celebrate', go);
  }, []);

  // The family's last celebration, if they have one.
  useEffect(() => {
    alive.current = true;
    if (user) {
      supabase.storage.from('avatars').list(user.id, { sortBy: { column: 'created_at', order: 'desc' }, search: 'celebration-' })
        .then(({ data }) => {
          const last = (data ?? []).find((f) => /^celebration-.*\.mp4$/.test(f.name));
          if (last && alive.current) setClip(supabase.storage.from('avatars').getPublicUrl(`${user.id}/${last.name}`).data.publicUrl);
        }, () => undefined);
    }
    return () => { alive.current = false; };
  }, [user]);

  const nextMonth = () => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth() + 1, 1).toLocaleDateString(i18n.language || 'en', { day: 'numeric', month: 'long' });
  };
  const explain = (reason: string) => {
    if (reason === 'not_paid') return t('vm.celebNotPaid');
    if (reason === 'monthly_cap') return t('vm.celebCap', { date: nextMonth() });
    if (reason === 'wallet_floor') return t('vm.celebResting');
    return t('vm.celebFailed');
  };

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setNote('');
    setReading(true);
    try {
      const got = await grabFrames(file);
      if (!got.length) throw new Error('no frames');
      setFrames(got);
    } catch {
      setFrames([]);
      setNote(t('vm.celebBadFile'));
    } finally {
      setReading(false);
    }
  };

  const make = async () => {
    if (!frames.length || !occasion.trim()) return;
    setNote('');
    setPhase('working');
    try {
      const { data, error } = await supabase.functions.invoke('generate-video', {
        body: { mode: 'celebrate', occasion: occasion.trim(), frames },
      });
      if (error || !data?.real) { setPhase('idle'); setNote(explain(String(data?.reason ?? 'failed'))); return; }
      setWish(String(data.wish ?? ''));
      const taskId = String(data.taskId);
      for (let i = 0; i < 40 && alive.current; i++) {
        await new Promise((r) => setTimeout(r, 8000));
        const s = await supabase.functions.invoke('generate-video', { body: { mode: 'real_status', taskId, keep: true } });
        if (s.data?.status === 'done' && s.data.url) { setClip(String(s.data.url)); setPhase('done'); setFrames([]); return; }
        if (s.data && s.data.real === false) break;
      }
      if (alive.current) { setPhase('idle'); setNote(t('vm.celebFailed')); }
    } catch {
      setPhase('idle');
      setNote(t('vm.celebFailed'));
    }
  };

  return (
    <div ref={box} className="space-y-3 rounded-xl border border-border/60 bg-background/60 p-3">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden><PartyPopper className="h-4 w-4" /></span>
        <div className="min-w-0">
          {/* 19 Nov 2026 (strict feature readers, all 6: "it lets me fill everything, THEN says it's locked"): say it upfront. */}
          <p className="font-semibold text-foreground">{t('vm.celebTitle')} <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 align-middle text-xs font-medium text-primary">{t('vm.celebBadge')}</span></p>
          <p className="text-sm text-muted-foreground">{t('vm.celebBody')}</p>
        </div>
      </div>

      {clip && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">{t('vm.celebDone')}</p>
          <video key={clip} src={clip} controls playsInline className="w-full max-h-80 rounded-lg bg-black object-contain" />
          {wish && <p className="text-sm text-muted-foreground whitespace-pre-line">{wish}</p>}
          <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
            <a href={clip} download="espaluz-celebration.mp4" target="_blank" rel="noreferrer"><Download className="mr-2 h-4 w-4" />{t('vm.celebDownload')}</a>
          </Button>
        </div>
      )}

      {phase === 'working' ? (
        <p className="flex items-center gap-2 text-sm text-foreground"><Loader2 className="h-4 w-4 shrink-0 animate-spin" />{t('vm.celebWorking')}</p>
      ) : (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground" htmlFor="celebration-occasion">{t('vm.celebOccasion')}</label>
          <Input id="celebration-occasion" value={occasion} maxLength={140} placeholder={t('vm.celebOccasionPh')} onChange={(e) => setOccasion(e.target.value)} />
          {frames.length > 0 && (
            <div className="flex gap-2">
              {frames.map((f, i) => <img key={i} src={f} alt="" className="h-16 w-16 rounded-md object-cover" />)}
            </div>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" className="h-auto min-h-10 whitespace-normal sm:flex-1" disabled={reading} onClick={() => fileRef.current?.click()}>
              {reading ? <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4 shrink-0" />}
              {frames.length ? t('vm.celebRepick') : t('vm.celebPick')}
            </Button>
            <Button type="button" className="h-auto min-h-10 whitespace-normal sm:flex-1" disabled={!frames.length || !occasion.trim() || reading} onClick={make}>
              {t('vm.celebMake')}
            </Button>
          </div>
          <input ref={fileRef} type="file" accept="video/*,image/*" className="hidden" onChange={pick} />
          {note && <p className="text-sm text-destructive">{note}</p>}
          {note === t('vm.celebNotPaid') && (
            <Link to="/#pricing" className="inline-flex text-sm font-semibold text-primary underline-offset-2 hover:underline">{t('vm.celebSeePlan')}</Link>
          )}
          <p className="text-xs text-muted-foreground">{t('vm.celebPrivacy')}</p>
        </div>
      )}
    </div>
  );
};
