import { useEffect, useRef, useState } from 'react';
import { markRoadPlayed, roadVoice, type RoadLesson } from '@/lib/roadLessons';

/*
 * 13 Nov 2026 - car mode step 3: hands-free road lesson (the Pimsleur idea, for a child) + "hear yourself".
 * Per line: the hero says it (saved voice, or the tablet's own voice) -> "your turn" while the tablet listens ->
 * her own voice plays back. No reading needed in a moving car. Her recordings live only in this tab's memory and are
 * never saved or sent. Without a microphone it simply leaves a quiet pause to repeat.
 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function sayWithTablet(text: string, lang: 'es' | 'ru') {
  return new Promise<void>((done) => {
    const s = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
    if (!s) return done();
    s.cancel();
    // A tablet without an installed Spanish/Russian voice never fires onend - a timer keeps the lesson moving.
    const t = setTimeout(() => { s.cancel(); done(); }, Math.max(3000, text.length * 90));
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'ru' ? 'ru-RU' : 'es-ES';
    u.rate = 0.9;
    u.onend = () => { clearTimeout(t); done(); }; u.onerror = () => { clearTimeout(t); done(); };
    s.speak(u);
  });
}

function playUrl(url: string, stop: React.MutableRefObject<boolean>) {
  return new Promise<void>((done) => {
    const a = new Audio(url);
    const t = setInterval(() => { if (stop.current) { a.pause(); clearInterval(t); done(); } }, 200);
    a.onended = () => { clearInterval(t); done(); }; a.onerror = () => { clearInterval(t); done(); };
    a.play().catch(() => { clearInterval(t); done(); });
  });
}

async function listen(ms: number, mic: MediaStream | null): Promise<string | null> {
  if (!mic || typeof MediaRecorder === 'undefined') { await sleep(ms); return null; }
  const rec = new MediaRecorder(mic);
  const parts: Blob[] = [];
  rec.ondataavailable = (e) => { if (e.data.size) parts.push(e.data); };
  const stopped = new Promise<void>((r) => { rec.onstop = () => r(); });
  rec.start();
  await sleep(ms);
  rec.stop();
  await stopped;
  return parts.length ? URL.createObjectURL(new Blob(parts, { type: rec.mimeType })) : null;
}

export default function RoadPlayer({ lesson, onDone }: { lesson: RoadLesson; onDone: () => void }) {
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<'hero' | 'turn' | 'you' | 'end'>('hero');
  const stop = useRef(false);

  useEffect(() => {
    stop.current = false;
    let mic: MediaStream | null = null;
    (async () => {
      // The microphone never holds up the lesson: no answer within 4 s (a permission prompt nobody tapped) = quiet pauses.
      mic = await Promise.race([navigator.mediaDevices?.getUserMedia({ audio: true }).catch(() => null) ?? Promise.resolve(null),
        sleep(4000).then(() => null)]);
      for (let n = 0; n < lesson.lines.length && !stop.current; n++) {
        const line = lesson.lines[n];
        setI(n); setPhase('hero');
        const url = await roadVoice(line.audio);
        if (url) { await playUrl(url, stop); URL.revokeObjectURL(url); } else await sayWithTablet(line.text, lesson.lang);
        if (stop.current) break;
        setPhase('turn');
        const mine = await listen(Math.min(7000, Math.max(2500, line.text.length * 60)), mic);
        if (stop.current) break;
        if (mine) { setPhase('you'); await playUrl(mine, stop); URL.revokeObjectURL(mine); }
        await sleep(600);
      }
      mic?.getTracks().forEach((t) => t.stop());
      if (!stop.current) { markRoadPlayed(lesson.id); setPhase('end'); }
    })();
    return () => { stop.current = true; window.speechSynthesis?.cancel(); };
  }, [lesson]);

  const line = lesson.lines[i];
  const label = { hero: '👂 Escucha · Listen', turn: '🗣️ ¡Tu turno! · Your turn!', you: '🎧 ¡Esa eres tú! · That was you!', end: '⭐ ¡Muy bien! · Well done!' }[phase];
  return (
    <div className="space-y-4 rounded-2xl border border-border p-4 text-center">
      <p className="text-2xl font-bold text-foreground">{label}</p>
      {phase !== 'end' && line && <p className="whitespace-pre-line text-lg text-muted-foreground">{line.text}</p>}
      <p className="text-xs text-muted-foreground">{Math.min(i + 1, lesson.lines.length)} / {lesson.lines.length}</p>
      <button type="button" onClick={() => { stop.current = true; onDone(); }}
        className="w-full rounded-2xl bg-foreground px-5 py-4 text-lg font-semibold text-background">
        {phase === 'end' ? '✅ Listo · Done' : '⏹ Parar · Stop'}
      </button>
    </div>
  );
}
