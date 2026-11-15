import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessagesSquare, Mic, Square, Send, Loader2, Download, Video, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import helloPoster from '@/assets/heroes/hello-poster.jpg';
import helloChatEs from '@/assets/heroes/hello-chat-es.mp4';

// 15 Nov 2026 (Elena: "do that now"): FACE-TO-FACE PRACTICE, Practica-like. The family names a real moment ahead; EspaLuz
// plays the other person in Spanish (espaluz-chat `practice`), they answer by voice (voice-to-text, Spanish) or by typing.
// While she speaks, her own talking clip loops with the sound off and her usual voice (generate-voice 'es') plays - the
// classroom trick: no live lip-sync engine exists here, so nothing pretends to be one. After the last question she gives
// three tips, saved on the server; "tips as a video" makes ONE lip-synced Runway clip of exactly those saved tips
// (generate-video 'practice_tips', paid families, PRACTICE_MONTHLY_CAP a month).

type Line = { who: 'espaluz' | 'me'; text: string; en?: string; fix?: string };
type Tips = { well: string; fix: string; phrase: string; spoken: string; sessionId: string | null };

const toUrl = (b64: string, mime: string) =>
  URL.createObjectURL(new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], { type: mime }));

export const PracticeMoment = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [scene, setScene] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [turn, setTurn] = useState({ n: 0, of: 6, last: false });
  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [recording, setRecording] = useState(false);
  const [typed, setTyped] = useState('');
  const [note, setNote] = useState('');
  const [tips, setTips] = useState<Tips | null>(null);
  const [clipBusy, setClipBusy] = useState(false);
  const [clip, setClip] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const alive = useRef(true);
  const box = useRef<HTMLDivElement>(null);
  const started = lines.length > 0;

  // "Your next step" on the dashboard (FamilyNextSteps) opens practice here, with the coming moment filled in.
  useEffect(() => {
    const open = (e: Event) => {
      const scene = String((e as CustomEvent).detail?.scene ?? '').slice(0, 160);
      if (scene && !lines.length) setScene(scene);
      box.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => (document.getElementById('practice-scene') as HTMLInputElement | null)?.focus(), 600);
    };
    window.addEventListener('espaluz:practice', open);
    return () => window.removeEventListener('espaluz:practice', open);
  }, [lines.length]);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; audio.current?.pause(); rec.current?.stream.getTracks().forEach((x) => x.stop()); };
  }, []);

  const say = async (text: string) => {
    audio.current?.pause();
    setSpeaking(true);
    try {
      const { data } = await supabase.functions.invoke('generate-voice', { body: { text, voice: 'es', userId: user?.id } });
      const b64 = data?.audioContent || data?.audioBase64;
      if (!b64) throw new Error('no voice');
      const a = new Audio(toUrl(b64, data?.mimeType || 'audio/mpeg'));
      audio.current = a;
      await new Promise<void>((done) => { a.onended = () => done(); a.onerror = () => done(); a.play().catch(() => done()); });
    } catch {
      // The browser's own free voice, so a line is always heard.
      await new Promise<void>((done) => {
        try {
          const u = new SpeechSynthesisUtterance(text);
          u.lang = 'es-ES';
          u.onend = () => done();
          u.onerror = () => done();
          speechSynthesis.speak(u);
        } catch { done(); }
      });
    } finally {
      if (alive.current) setSpeaking(false);
    }
  };

  const ask = async (history: Line[], finish = false) => {
    setBusy(true);
    setNote('');
    try {
      const { data, error } = await supabase.functions.invoke('espaluz-chat', {
        body: { practice: { scene: scene.trim(), history: history.map((l) => ({ who: l.who, text: l.text })), finish } },
      });
      if (error || data?.error) throw new Error(String(data?.error ?? error?.message));
      if (data.done) {
        setTips({ well: data.well, fix: data.fix, phrase: data.phrase, spoken: data.spoken, sessionId: data.sessionId });
        setBusy(false);
        await say(String(data.spoken));
        return;
      }
      const next = [...history, { who: 'espaluz' as const, text: String(data.say), en: data.en, fix: data.fix }];
      setLines(next);
      setTurn({ n: data.turn, of: data.turns, last: !!data.last });
      setBusy(false);
      await say(String(data.say));
    } catch {
      setBusy(false);
      setNote(t('vm.prepFailed'));
    }
  };

  const answer = async (text: string) => {
    const said = text.trim();
    if (!said) return;
    setTyped('');
    const history = [...lines, { who: 'me' as const, text: said }];
    setLines(history);
    await ask(history, turn.last);
  };

  const toggleMic = async () => {
    if (recording) { rec.current?.stop(); setRecording(false); return; }
    audio.current?.pause();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      chunks.current = [];
      r.ondataavailable = (e) => chunks.current.push(e.data);
      r.onstop = async () => {
        stream.getTracks().forEach((x) => x.stop());
        const blob = new Blob(chunks.current, { type: r.mimeType || 'audio/webm' });
        const b64 = await new Promise<string>((ok) => { const f = new FileReader(); f.onloadend = () => ok(String(f.result).split(',')[1] ?? ''); f.readAsDataURL(blob); });
        setBusy(true);
        const { data } = await supabase.functions.invoke('voice-to-text', { body: { audio: b64, language: 'es' } });
        setBusy(false);
        if (data?.text) await answer(String(data.text));
        else setNote(data?.unavailable ? String(data.message) : t('vm.prepNotHeard'));
      };
      rec.current = r;
      r.start();
      setRecording(true);
    } catch {
      setNote(t('vm.prepNoMic'));
    }
  };

  const nextMonth = () => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth() + 1, 1).toLocaleDateString(i18n.language || 'en', { day: 'numeric', month: 'long' });
  };
  const tipsVideo = async () => {
    if (!tips?.sessionId) return;
    setClipBusy(true);
    setNote('');
    try {
      const { data, error } = await supabase.functions.invoke('generate-video', { body: { mode: 'practice_tips', sessionId: tips.sessionId } });
      if (error || !data?.real) {
        const r = String(data?.reason ?? '');
        setNote(r === 'not_paid' ? t('vm.prepNotPaid') : r === 'monthly_cap' ? t('vm.prepCap', { date: nextMonth() })
          : r === 'wallet_floor' ? t('vm.celebResting') : t('vm.celebFailed'));
        return;
      }
      for (let i = 0; i < 40 && alive.current; i++) {
        await new Promise((r) => setTimeout(r, 8000));
        const s = await supabase.functions.invoke('generate-video', { body: { mode: 'real_status', taskId: data.taskId, keep: 'practice' } });
        if (s.data?.status === 'done' && s.data.url) { setClip(String(s.data.url)); return; }
        if (s.data && s.data.real === false) break;
      }
      if (alive.current) setNote(t('vm.celebFailed'));
    } catch {
      setNote(t('vm.celebFailed'));
    } finally {
      if (alive.current) setClipBusy(false);
    }
  };

  const restart = () => {
    audio.current?.pause();
    setLines([]); setTips(null); setClip(null); setNote(''); setTurn({ n: 0, of: 6, last: false });
  };

  const canAnswer = started && !tips && !busy && !speaking;
  return (
    <div ref={box} className="space-y-3 rounded-xl border border-border/60 bg-background/60 p-3">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden><MessagesSquare className="h-4 w-4" /></span>
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{t('vm.prepTitle')}</p>
          <p className="text-sm text-muted-foreground">{t('vm.prepBody')}</p>
        </div>
      </div>

      {!started ? (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground" htmlFor="practice-scene">{t('vm.prepScene')}</label>
          <Input id="practice-scene" value={scene} maxLength={160} placeholder={t('vm.prepScenePh')} onChange={(e) => setScene(e.target.value)} />
          <Button type="button" className="h-auto min-h-10 w-full whitespace-normal" disabled={!scene.trim() || busy} onClick={() => ask([])}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" /> : <Mic className="mr-2 h-4 w-4 shrink-0" />}
            {t('vm.prepStart')}
          </Button>
          <p className="text-xs text-muted-foreground">{t('vm.prepHow')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-lg bg-muted">
            {speaking
              ? <video src={helloChatEs} poster={helloPoster} autoPlay loop muted playsInline className="h-48 w-full object-cover object-[50%_30%]" />
              : <img src={helloPoster} alt="" className="h-48 w-full object-cover object-[50%_30%]" />}
            <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-xs text-white">
              {tips ? t('vm.prepTipsTitle') : t('vm.prepTurn', { n: turn.n, of: turn.of })}
            </span>
          </div>

          <div className="max-h-72 space-y-2 overflow-y-auto">
            {lines.map((l, i) => l.who === 'espaluz' ? (
              <div key={i} className="rounded-lg bg-primary/5 p-2 text-sm">
                {l.fix && <p className="mb-1 rounded bg-amber-500/10 px-2 py-1 text-xs text-foreground">{l.fix}</p>}
                <p className="font-medium text-foreground">{l.text}</p>
                {l.en && <p className="text-xs text-muted-foreground">{l.en}</p>}
              </div>
            ) : (
              <p key={i} className="ml-auto w-fit max-w-[85%] rounded-lg bg-secondary px-2 py-1 text-sm text-secondary-foreground">{l.text}</p>
            ))}
            {busy && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t('vm.prepThinking')}</p>}
          </div>

          {tips ? (
            <div className="space-y-2 rounded-lg border border-border/60 p-3 text-sm">
              <p className="font-semibold text-foreground">{t('vm.prepTipsTitle')}</p>
              {tips.well && <p><span className="font-medium">{t('vm.prepWell')}</span> {tips.well}</p>}
              {tips.fix && <p><span className="font-medium">{t('vm.prepFix')}</span> {tips.fix}</p>}
              {tips.phrase && <p><span className="font-medium">{t('vm.prepPhrase')}</span> {tips.phrase}</p>}
              {clip ? (
                <div className="space-y-2">
                  <video src={clip} controls playsInline className="w-full max-h-80 rounded-lg bg-black object-contain" />
                  <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                    <a href={clip} download="espaluz-practice-tips.mp4" target="_blank" rel="noreferrer"><Download className="mr-2 h-4 w-4" />{t('vm.celebDownload')}</a>
                  </Button>
                </div>
              ) : tips.sessionId && (
                <Button type="button" variant="outline" className="h-auto min-h-10 w-full whitespace-normal" disabled={clipBusy} onClick={tipsVideo}>
                  {clipBusy ? <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" /> : <Video className="mr-2 h-4 w-4 shrink-0" />}
                  {clipBusy ? t('vm.celebWorking') : t('vm.prepTipsVideo')}
                </Button>
              )}
              <Button type="button" variant="ghost" size="sm" onClick={restart}><RotateCcw className="mr-2 h-4 w-4" />{t('vm.prepAgain')}</Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Button type="button" className="h-auto min-h-12 w-full whitespace-normal" variant={recording ? 'destructive' : 'default'} disabled={!canAnswer && !recording} onClick={toggleMic}>
                {recording ? <Square className="mr-2 h-4 w-4 shrink-0" /> : <Mic className="mr-2 h-4 w-4 shrink-0" />}
                {recording ? t('vm.prepStop') : t('vm.prepSpeak')}
              </Button>
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (canAnswer) answer(typed); }}>
                <Input value={typed} maxLength={400} placeholder={t('vm.prepType')} onChange={(e) => setTyped(e.target.value)} disabled={!canAnswer} />
                <Button type="submit" size="icon" variant="outline" disabled={!canAnswer || !typed.trim()} aria-label={t('vm.prepSend')}><Send className="h-4 w-4" /></Button>
              </form>
              {lines.some((l) => l.who === 'me') && (
                <Button type="button" variant="ghost" size="sm" disabled={!canAnswer} onClick={() => ask(lines, true)}>{t('vm.prepFinish')}</Button>
              )}
            </div>
          )}
        </div>
      )}
      {note && <p className="text-sm text-destructive">{note}</p>}
    </div>
  );
};
