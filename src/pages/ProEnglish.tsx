import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mic, Square, Send, Loader2, Video, PenLine, MessagesSquare, AudioLines, TrendingUp, Volume2, ArrowLeft, LogOut, PlayCircle, X } from 'lucide-react';
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
type Line = { who: 'coach' | 'me'; text: string; worst?: { word: string; score: number; hint?: string }[] };
// The practice loop's state per weak word: the first score (from the turn) and the latest try.
type Drill = { first: number; last?: number; busy?: 'listening' | 'scoring'; miss?: boolean };
const WA = 'https://wa.me/50766623757?text=Pro%20English%20(proen-web)';
const TG = 'https://t.me/EspaLuzFamily_bot?start=proen-web';

// *bold* and _italic_ as the bots write them; everything else is plain text.
// 21 Nov 2026 (Elena): the coach's emojis belong in WhatsApp/Telegram chats; on the web they look generic and toyish, so the
// page shows the same brain text without them (the bots keep theirs).
const noEmoji = (t: string) => t.replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}]️?‍?/gu, '').replace(/^[ \t]+/gm, '');
const rich = (t: string) => noEmoji(t).split('\n').map((line, i) => (
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
  const navigate = useNavigate();
  const [lines, setLines] = useState<Line[]>([]);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [note, setNote] = useState('');
  const [clip, setClip] = useState<string | null>(null);
  const [clipBusy, setClipBusy] = useState(false);
  const [drills, setDrills] = useState<Record<string, Drill>>({});
  // 21 Nov 2026 (Elena): on the FIRST visit EspaLuz herself greets the person - lip-synced, natural speech, like the other
  // paths - and names the premium live session. ONE pre-rendered clip for everyone (Runway Characters, the live EspaLuz
  // avatar, coach voice Ava; 2 credits once) in public/pro-english/. She is a valued guest: open on the first visit only,
  // then a small "watch again" link. Source + text: ascent creatives/pro-english-welcome/.
  const [welcomeOpen, setWelcomeOpen] = useState<boolean>(() => {
    try { return localStorage.getItem('espaluz_proen_welcome_seen') !== '1'; } catch { return true; }
  });
  const closeWelcome = () => { setWelcomeOpen(false); try { localStorage.setItem('espaluz_proen_welcome_seen', '1'); } catch { /* private mode */ } };

  // 21 Nov 2026: the practice loop (Loora / Elsa style) for each weak word the coach names: hear it, say it, see the score move.
  // Same mic + WAV code as a voice turn; the try is scored by the same Azure assessment (espaluz-chat proEnglish.drill).
  const sayIt = async (word: string, first: number) => {
    const put = (d: Partial<Drill>) => setDrills((all) => ({ ...all, [word]: { first, ...all[word], ...d } }));
    player.current?.pause();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      const parts: Blob[] = [];
      r.ondataavailable = (e) => parts.push(e.data);
      r.onstop = async () => {
        stream.getTracks().forEach((x) => x.stop());
        put({ busy: 'scoring', miss: false });
        try {
          const wav = await toWav16k(new Blob(parts, { type: r.mimeType || 'audio/webm' }));
          const { data } = await supabase.functions.invoke('espaluz-chat', { body: { proEnglish: { drill: { word, audio: { b64: wav, mime: 'audio/wav' } } } } });
          const score = typeof data?.score === 'number' ? data.score : null;
          put(score === null ? { busy: undefined, miss: true } : { busy: undefined, last: score });
        } catch { put({ busy: undefined, miss: true }); }
      };
      put({ busy: 'listening', miss: false });
      r.start();
      setTimeout(() => { if (r.state === 'recording') r.stop(); }, 2500);
    } catch {
      setNote('Allow the microphone to practise. / Permite el micrófono para practicar.');
    }
  };
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const end = useRef<HTMLDivElement>(null);
  const alive = useRef(true);
  const coached = lines.some((l) => l.who === 'me');

  useEffect(() => () => { alive.current = false; rec.current?.stream.getTracks().forEach((x) => x.stop()); speechSynthesis.cancel(); player.current?.pause(); }, []);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [lines, busy]);

  // 21 Nov 2026 (Elena: "woman of more or less 35 years old - coach style, not man"): the coach spoke with the browser's
  // default voice - a man on Windows Chrome. Now she speaks in her own Azure coach voice (generate-voice hero 'coach');
  // the device voice is only the last fallback, and then a woman's voice is chosen when the device has one.
  const player = useRef<HTMLAudioElement | null>(null);
  const deviceVoice = (text: string) => {
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      const en = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'));
      const woman = en.find((v) => /ava|jenny|aria|zira|samantha|female|woman|google us english/i.test(v.name));
      if (woman) u.voice = woman;
      speechSynthesis.speak(u);
    } catch { /* the text is on screen */ }
  };
  // rate < 1 = the practice loop's "slowly" (the browser keeps the pitch). Each word's voice is fetched once, then replayed.
  const voiceCache = useRef<Record<string, string>>({});
  const speak = async (text: string, rate = 1) => {
    try {
      player.current?.pause();
      speechSynthesis.cancel();
      let src = voiceCache.current[text];
      if (!src) {
        const { data, error } = await supabase.functions.invoke('generate-voice', { body: { text, voice: 'en', hero: 'coach' } });
        if (error || !data?.audioContent) throw new Error('no voice');
        src = `data:${data.mimeType || 'audio/mpeg'};base64,${data.audioContent}`;
        if (text.length < 60) voiceCache.current[text] = src;
      }
      if (!alive.current) return;
      const a = new Audio(src);
      a.playbackRate = rate;
      player.current = a;
      await a.play();
    } catch {
      if (alive.current) deviceVoice(text);
    }
  };

  const turn = async (body: Record<string, unknown>, shown?: string) => {
    setBusy(true);
    setNote('');
    if (shown) setLines((l) => [...l, { who: 'me', text: shown }]);
    try {
      const { data, error } = await supabase.functions.invoke('espaluz-chat', { body: { proEnglish: body } });
      if (error || !data?.text) throw new Error(String(error?.message ?? 'no answer'));
      if (!alive.current) return;
      const worst = Array.isArray(data.pron?.worst) ? data.pron.worst as { word: string; score: number; hint?: string }[] : [];
      setLines((l) => [...l, { who: 'coach', text: String(data.text), worst }]);
      if (data.speak) speak(String(data.speak));
    } catch {
      setNote('Sorry, I missed that - try again. / No te escuché, inténtalo otra vez.');
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  // 21 Nov 2026 (Elena: "I exit and come back - the dashboard is empty"): the coach always remembered (one brain, one state),
  // but the page started blank. Now it first shows the recent practice from EVERY channel - read straight from the same
  // learning_sessions rows the brain writes (turns + word drills; WhatsApp/Telegram lines are marked) - then the welcome.
  const loadRecent = async (uid: string): Promise<Line[]> => {
    const { data } = await supabase.from('learning_sessions').select('content, created_at').eq('user_id', uid)
      .eq('session_type', 'analytics').in('content->>event', ['pro_english_turn', 'pro_english_drill'])
      .order('created_at', { ascending: false }).limit(12);
    const via = (p?: string) => (p === 'whatsapp' ? ' (WhatsApp)' : p === 'telegram' ? ' (Telegram)' : '');
    const out: Line[] = [];
    for (const r of [...(data ?? [])].reverse()) {
      const c = (r.content ?? {}) as Record<string, any>;
      if (c.event === 'pro_english_drill' && c.platform !== 'web') continue; // a chat drill is already shown by its turn row
      if (c.event === 'pro_english_drill' && c.word) { out.push({ who: 'coach', text: `*${c.word}*: ${c.score}/100${via(c.platform)}` }); continue; }
      if (c.drill?.word) { out.push({ who: 'coach', text: `*${c.drill.word}*: ${c.drill.before} → ${c.drill.after}${via(c.platform)}` }); continue; }
      if (!c.said || !c.reply) continue;
      out.push({ who: 'me', text: `${c.said}${via(c.platform)}` });
      out.push({ who: 'coach', text: [c.better ? `Better: ${c.better}` : '', c.reply, c.pron?.score ? `Pronunciation *${c.pron.score}/100*` : ''].filter(Boolean).join('\n\n'),
        worst: Array.isArray(c.pron?.worst) ? c.pron.worst : [] });
    }
    return out;
  };
  useEffect(() => {
    if (!user || lines.length) return;
    (async () => {
      const recent = await loadRecent(user.id).catch(() => []);
      if (!alive.current) return;
      if (recent.length) setLines([...recent, { who: 'coach', text: '— Earlier practice above · today below —' }]);
      turn({ start: true });
    })();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // A door you can close and open again: Exit tells the coach you are leaving (the same "exit" the chat uses), then back to the dashboard.
  const leave = async () => {
    player.current?.pause();
    speechSynthesis.cancel();
    try { await supabase.functions.invoke('espaluz-chat', { body: { proEnglish: { said: 'exit' } } }); } catch { /* leaving anyway */ }
    navigate('/dashboard');
  };

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
        setNote(r === 'not_paid' ? 'Los clips en video son parte del plan pagado: 2 al mes incluidos. / Video clips come with the paid plan: 2 a month included.'
          : r === 'monthly_cap' ? 'Ya usaste tus 2 clips de este mes. / You used your 2 clips this month.'
          : r === 'wallet_floor' ? 'Los clips están descansando hoy; vuelve mañana. / Clips are resting today; try tomorrow.'
          : 'No pude hacer el clip esta vez. / I could not make the clip this time.');
        return;
      }
      for (let i = 0; i < 40 && alive.current; i++) {
        await new Promise((ok) => setTimeout(ok, 8000));
        // No `keep`: the keep-a-copy step only knows family clips (celebration/practice); the coach's clip is watched now.
        const s = await supabase.functions.invoke('generate-video', { body: { mode: 'real_status', taskId: data.taskId } });
        if (s.data?.status === 'done' && s.data?.url) { setClip(String(s.data.url)); return; }
        if (!s.data?.real) break;
      }
      setNote('No pude hacer el clip esta vez. / I could not make the clip this time.');
    } finally {
      if (alive.current) setClipBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-xl space-y-4">
        {user && (
          <nav className="flex items-center justify-between text-sm">
            <Link to="/dashboard" className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 font-medium">
              <ArrowLeft className="h-4 w-4" aria-hidden />Dashboard
            </Link>
            <button type="button" onClick={leave} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 font-medium">
              <LogOut className="h-4 w-4" aria-hidden />Exit coach
            </button>
          </nav>
        )}
        <header className="space-y-1 text-center">
          <h1 className="text-2xl font-bold text-foreground">EspaLuz Pro English</h1>
          <p className="text-sm text-muted-foreground">Professional English for clients, remote jobs and business trips. Speak or write in English - or in Spanish when you're stuck - and your coach answers in English.</p>
          <p className="text-xs text-muted-foreground">Para hispanohablantes: inglés de inmersión, el español solo cuando te trabas.</p>
        </header>

        {welcomeOpen ? (
          <section className="space-y-2 rounded-2xl border border-border p-3">
            <video src="/pro-english/welcome.mp4" poster="/pro-english/welcome-poster.jpg" controls playsInline preload="metadata"
              onPlay={() => { player.current?.pause(); speechSynthesis.cancel(); }} onEnded={closeWelcome}
              className="w-full rounded-xl" aria-label="EspaLuz welcomes you to Pro English" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><PlayCircle className="h-3.5 w-3.5" aria-hidden />Meet your coach - 19 s</span>
              <button type="button" onClick={closeWelcome} className="inline-flex items-center gap-1 underline"><X className="h-3.5 w-3.5" aria-hidden />Close</button>
            </div>
          </section>
        ) : (
          <button type="button" onClick={() => setWelcomeOpen(true)} className="mx-auto flex items-center gap-1 text-xs text-muted-foreground underline">
            <PlayCircle className="h-3.5 w-3.5" aria-hidden />Watch EspaLuz's welcome again
          </button>
        )}

        {!loading && !user && (
          <section className="space-y-3 rounded-2xl border border-border p-5 text-sm">
            <ul className="grid grid-cols-2 gap-2 text-foreground">
              {([[PenLine, 'Your sentence, corrected'], [MessagesSquare, 'Real conversations in English'],
                 [AudioLines, 'Pronunciation score'], [TrendingUp, 'Weekly progress']] as const).map(([Icon, label]) => (
                <li key={label} className="flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0" style={{ color: 'hsl(var(--espaluz-purple))' }} aria-hidden />{label}
                </li>
              ))}
            </ul>
            <p className="font-medium text-foreground">Included in the 14 free days and in the $11 EspaLuz plan - no separate plan. / Incluido en los 14 días gratis y en el plan de $11.</p>
            <p className="text-muted-foreground">Real work scenes: a call with a new client, quoting a price, customer service, a remote job interview, small talk with investors, a business trip, a professional email. Or bring any topic that matters to you professionally - your own job, your field, a client, a meeting you have tomorrow - and the coach works on it with you. / O trae cualquier tema importante para tu trabajo.</p>
            <Link to="/auth?mode=signup&next=/pro-english" className="block w-full rounded-xl px-5 py-3 text-center font-semibold text-white" style={{ background: 'hsl(var(--espaluz-purple))' }}>
              Start free · 14 days, no card
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
                  {l.who === 'coach' && !!l.worst?.length && (
                    <div className="mt-2 space-y-2 rounded-xl border border-border bg-muted/40 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Practise these words</p>
                      {l.worst.map(({ word, score, hint }) => {
                        const d = drills[word];
                        const now = d?.last;
                        return (
                          <div key={word} className="flex flex-wrap items-center gap-2">
                            <span className="min-w-[6rem] font-semibold">{word}</span>
                            <button type="button" onClick={() => speak(word)} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs">
                              <Volume2 className="h-3.5 w-3.5" aria-hidden />Listen
                            </button>
                            <button type="button" onClick={() => speak(word, 0.7)} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs">
                              <Volume2 className="h-3.5 w-3.5" aria-hidden />Slowly
                            </button>
                            <button type="button" onClick={() => sayIt(word, score)} disabled={!!d?.busy}
                              className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-white disabled:opacity-60"
                              style={{ background: d?.busy === 'listening' ? '#dc2626' : 'hsl(var(--espaluz-purple))' }}>
                              {d?.busy === 'scoring' ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Mic className="h-3.5 w-3.5" aria-hidden />}
                              {d?.busy === 'listening' ? 'Listening…' : now === undefined ? 'Say it' : 'Again'}
                            </button>
                            <span className="text-xs text-muted-foreground">
                              {score}{now !== undefined && <> → <strong className={now > score ? 'text-emerald-700' : 'text-foreground'}>{now}</strong>{now >= 80 ? ' ✓' : ''}</>}
                              {d?.miss && ' · I could not hear it, try again'}
                            </span>
                            {hint && <p className="w-full pl-1 text-xs text-muted-foreground">Focus on {hint}.</p>}
                          </div>
                        );
                      })}
                    </div>
                  )}
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
            <p className="text-center text-xs text-muted-foreground">Your own work topic · menu · progress · level · exit</p>
            {coached && (
              <button type="button" onClick={seeIt} disabled={clipBusy} className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm disabled:opacity-50">
                {clipBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
                See EspaLuz say the last answer (video · 2 a month in the paid plan)
              </button>
            )}
            {clip && <video src={clip} controls autoPlay playsInline className="w-full rounded-2xl" />}
            {/* 20 Nov 2026 (Elena): a full live session with lips matching every word is PREMIUM and has no price yet - by
                request, to the address the site already publishes. Competitors include animated tutors in a ~$10-15/month plan;
                live lip-synced avatars cost us roughly $0.35-3 a minute (cto-aipa docs/espaluz/PRO_ENGLISH_COACH_PLAN_2026-11-20.md). */}
            <p className="rounded-xl bg-muted/50 px-3 py-2 text-center text-xs text-muted-foreground">
              Premium: a full live session with EspaLuz on video, her lips moving with every word - by request.{' '}
              <a href="mailto:aipa@aideazz.xyz?subject=EspaLuz%20Pro%20English%20-%20premium%20video%20session" className="font-medium underline">Write to us</a>
            </p>
          </>
        )}
        {note && <p className="text-center text-sm text-muted-foreground">{note}</p>}
      </div>
    </main>
  );
}
