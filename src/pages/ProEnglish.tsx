import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mic, Square, Send, Loader2, Video } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

/*
 * 20 Nov 2026 - EspaLuz PRO ENGLISH on the web: a SEPARATE layer for native Spanish speakers (Panama, Costa Rica, all LATAM)
 * learning professional English to earn - clients, remote jobs, business travel. Loora-style: speak or type, the coach fixes
 * the sentence, answers in English, scores pronunciation (Azure). ONE brain with WhatsApp and Telegram: espaluz-chat
 * `proEnglish` (supabase/functions/_shared/pro_english.ts), one memory for a signed-in family. Nothing else in the app
 * reads or changes this page. A paid family can see the coach say the last answer as a lip-synced clip (generate-video
 * 'pro_english', 2 a month included). Plan: cto-aipa docs/espaluz/PRO_ENGLISH_COACH_PLAN_2026-11-20.md
 */
type Line = { who: 'coach' | 'me'; text: string };
const WA = 'https://wa.me/50766623757?text=Pro%20English%20(proen-web)';
const TG = 'https://t.me/EspaLuzFamily_bot?start=proen-web';

// *bold* and _italic_ as the bots write them; everything else is plain text.
const rich = (t: string) => t.split('\n').map((line, i) => (
  <p key={i} className="min-h-[0.5rem]">
    {line.split(/(\*[^*]+\*|_[^_]+_)/g).map((part, j) => part.startsWith('*') && part.endsWith('*') && part.length > 2
      ? <strong key={j}>{part.slice(1, -1)}</strong>
      : part.startsWith('_') && part.endsWith('_') && part.length > 2 ? <em key={j}>{part.slice(1, -1)}</em> : part)}
  </p>
));

// Azure's pronunciation endpoint takes WAV, not the browser's webm: decode, resample to 16 kHz mono, write PCM16.
async function toWav16k(blob: Blob): Promise<string> {
  const ctx = new AudioContext();
  const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
  await ctx.close();
  const off = new OfflineAudioContext(1, Math.ceil(decoded.duration * 16000), 16000);
  const src = off.createBufferSource();
  src.buffer = decoded;
  src.connect(off.destination);
  src.start();
  const pcm = (await off.startRendering()).getChannelData(0);
  const buf = new ArrayBuffer(44 + pcm.length * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, k) => v.setUint8(o + k, c.charCodeAt(0)));
  str(0, 'RIFF'); v.setUint32(4, 36 + pcm.length * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 16000, true);
  v.setUint32(28, 32000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, pcm.length * 2, true);
  pcm.forEach((x, k) => v.setInt16(44 + k * 2, Math.max(-1, Math.min(1, x)) * 0x7fff, true));
  let bin = '';
  new Uint8Array(buf).forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin);
}

export default function ProEnglish() {
  const { user, loading } = useAuth();
  const [lines, setLines] = useState<Line[]>([]);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [note, setNote] = useState('');
  const [clip, setClip] = useState<string | null>(null);
  const [clipBusy, setClipBusy] = useState(false);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const end = useRef<HTMLDivElement>(null);
  const alive = useRef(true);
  const coached = lines.some((l) => l.who === 'me');

  useEffect(() => () => { alive.current = false; rec.current?.stream.getTracks().forEach((x) => x.stop()); speechSynthesis.cancel(); }, []);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [lines, busy]);

  const speak = (text: string) => {
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      speechSynthesis.speak(u);
    } catch { /* the text is on screen */ }
  };

  const turn = async (body: Record<string, unknown>, shown?: string) => {
    setBusy(true);
    setNote('');
    if (shown) setLines((l) => [...l, { who: 'me', text: shown }]);
    try {
      const { data, error } = await supabase.functions.invoke('espaluz-chat', { body: { proEnglish: body } });
      if (error || !data?.text) throw new Error(String(error?.message ?? 'no answer'));
      if (!alive.current) return;
      setLines((l) => [...l, { who: 'coach', text: String(data.text) }]);
      if (data.speak) speak(String(data.speak));
    } catch {
      setNote('Sorry, I missed that - try again. / No te escuché, inténtalo otra vez.');
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  useEffect(() => { if (user && !lines.length) turn({ start: true }); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = () => { const t = typed.trim(); if (!t || busy) return; setTyped(''); turn({ said: t }, t); };

  const toggleMic = async () => {
    if (recording) { rec.current?.stop(); setRecording(false); return; }
    speechSynthesis.cancel();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      chunks.current = [];
      r.ondataavailable = (e) => chunks.current.push(e.data);
      r.onstop = async () => {
        stream.getTracks().forEach((x) => x.stop());
        setBusy(true);
        try {
          const wav = await toWav16k(new Blob(chunks.current, { type: r.mimeType || 'audio/webm' }));
          const { data } = await supabase.functions.invoke('voice-to-text', { body: { audio: wav, language: 'en' } });
          const said = String(data?.text ?? '').trim();
          if (!said) { setBusy(false); setNote("I couldn't hear the words - try again. / No entendí el audio."); return; }
          await turn({ said, audio: { b64: wav, mime: 'audio/wav' } }, `🎙️ ${said}`);
        } catch {
          setBusy(false);
          setNote("I couldn't hear the words - try again. / No entendí el audio.");
        }
      };
      rec.current = r;
      r.start();
      setRecording(true);
    } catch {
      setNote('Allow the microphone to speak, or type. / Permite el micrófono o escribe.');
    }
  };

  const seeIt = async () => {
    setClipBusy(true);
    setNote('');
    try {
      const { data, error } = await supabase.functions.invoke('generate-video', { body: { mode: 'pro_english' } });
      if (error || !data?.real) {
        const r = String(data?.reason ?? '');
        setNote(r === 'not_paid' ? '🎬 Los clips en video son parte del plan pagado: 2 al mes incluidos. / Video clips come with the paid plan: 2 a month included.'
          : r === 'monthly_cap' ? '🎬 Ya usaste tus 2 clips de este mes. / You used your 2 clips this month.'
          : r === 'wallet_floor' ? '🎬 Los clips están descansando hoy; vuelve mañana. / Clips are resting today; try tomorrow.'
          : '🎬 No pude hacer el clip esta vez. / I could not make the clip this time.');
        return;
      }
      for (let i = 0; i < 40 && alive.current; i++) {
        await new Promise((ok) => setTimeout(ok, 8000));
        // No `keep`: the keep-a-copy step only knows family clips (celebration/practice); the coach's clip is watched now.
        const s = await supabase.functions.invoke('generate-video', { body: { mode: 'real_status', taskId: data.taskId } });
        if (s.data?.status === 'done' && s.data?.url) { setClip(String(s.data.url)); return; }
        if (!s.data?.real) break;
      }
      setNote('🎬 No pude hacer el clip esta vez. / I could not make the clip this time.');
    } finally {
      if (alive.current) setClipBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-xl space-y-4">
        <header className="space-y-1 text-center">
          <h1 className="text-2xl font-bold text-foreground">🇺🇸 EspaLuz Pro English</h1>
          <p className="text-sm text-muted-foreground">Inglés profesional para clientes, trabajo remoto y viajes de negocios. Habla o escribe; tu coach corrige y responde en inglés.</p>
        </header>

        {!loading && !user && (
          <section className="space-y-3 rounded-2xl border border-border p-5 text-sm">
            <p className="text-foreground">✍️ Corrige tu frase · 💬 conversa en inglés · 🎙️ puntuación de pronunciación · 📈 progreso semanal</p>
            <p className="text-muted-foreground">Escenas reales: llamada con un cliente, cotizar un precio, atención al cliente, entrevista para trabajo remoto, small talk con inversionistas, viaje de negocios, email profesional.</p>
            <Link to="/auth" className="block w-full rounded-xl px-5 py-3 text-center font-semibold text-white" style={{ background: 'hsl(var(--espaluz-purple))' }}>
              Empieza gratis · 14 días, sin tarjeta
            </Link>
            <div className="flex gap-2">
              <a href={WA} className="flex-1 rounded-xl border border-border px-4 py-2 text-center font-medium">WhatsApp</a>
              <a href={TG} className="flex-1 rounded-xl border border-border px-4 py-2 text-center font-medium">Telegram</a>
            </div>
          </section>
        )}

        {user && (
          <>
            <section className="space-y-3 rounded-2xl border border-border p-4 text-sm">
              {lines.map((l, i) => (
                <div key={i} className={l.who === 'me' ? 'ml-8 rounded-xl bg-muted px-3 py-2 text-right' : 'mr-4 space-y-1 text-foreground'}>
                  {rich(l.text)}
                </div>
              ))}
              {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              <div ref={end} />
            </section>
            <div className="flex gap-2">
              <button type="button" onClick={toggleMic} disabled={busy && !recording} aria-label={recording ? 'Stop' : 'Speak'}
                className="rounded-xl px-4 text-white disabled:opacity-50" style={{ background: recording ? '#dc2626' : 'hsl(var(--espaluz-purple))' }}>
                {recording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              <input value={typed} onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Write in English (or Spanish)…" className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2" />
              <button type="button" onClick={send} disabled={busy || !typed.trim()} aria-label="Send" className="rounded-xl border border-border px-3 disabled:opacity-50">
                <Send className="h-5 w-5" />
              </button>
            </div>
            <p className="text-center text-xs text-muted-foreground">menu · libre · progreso · level · salir</p>
            {coached && (
              <button type="button" onClick={seeIt} disabled={clipBusy} className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm disabled:opacity-50">
                {clipBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
                Ver a EspaLuz decir la última respuesta · See it said (video)
              </button>
            )}
            {clip && <video src={clip} controls autoPlay playsInline className="w-full rounded-2xl" />}
          </>
        )}
        {note && <p className="text-center text-sm text-muted-foreground">{note}</p>}
      </div>
    </main>
  );
}
