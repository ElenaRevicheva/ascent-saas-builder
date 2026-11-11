import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Mic, Square, Star, Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FeatureGate } from "@/components/FeatureGate";
import { ReportReply } from "@/components/ReportReply";

// Мишка Медок & Лиса Алиса - the Russian classroom (11 Nov 2026, Elena: "a classroom for Russian, in parallel").
// SEPARATE from Pere & Titi on purpose: this page shares no code with Classroom.tsx, has its own art
// (public/classroom-ru), its own clips (public/heroes-ru) and its own server functions (kids-ru lesson, voice-ru voices).
// Read-only shared things: sign-in, the family list, the subscription gate, the parent-consent note.
// For a child of 6-8 who UNDERSTANDS Russian but does not speak it: every turn asks her to SAY something.
// Plan: cto-aipa docs/espaluz/RUSSIAN_CLASSROOM_PLAN_2026-11-11.md. Not linked anywhere yet - Elena opens /classroom-ru.

type Hero = "mishka" | "lisa";
type Turn = { role: "user" | "assistant"; content: string };
type Line = { who: Hero; ru: string; clip: string };

const CLIPS = "/heroes-ru";
const START = "(урок начинается)";
const HERO = {
  mishka: { name: "Мишка Медок", e: "🐻", bubble: "bg-amber-100", badge: "bg-amber-600", label: "text-amber-800" },
  lisa: { name: "Лиса Алиса", e: "🦊", bubble: "bg-orange-100", badge: "bg-orange-500", label: "text-orange-700" },
} as const;
const KID_FONT = '"Nunito", "Baloo 2", ui-rounded, "Segoe UI", system-ui, sans-serif';

/** One clip per hero line, chosen from what the line says (same idea as Pere & Titi, Russian words, own 8 clips). */
function clipFor(who: Hero, ru: string, firstOfLesson: boolean): string {
  const t = ru.toLowerCase();
  const has = (re: RegExp) => re.test(t);
  if (has(/до свидания|до завтра|до встречи|\bпока\b/)) return "duo-goodbye";
  if (firstOfLesson && has(/привет|здравствуй|здравствуйте/)) return "duo-hello";
  if (has(/молод(ец|чина)|умни(ца|чка)|отлично|браво|\bура\b|супер|здорово|целое предложение|правильно/)) return "fox-cheer";
  if (who === "mishka" && has(/подума|вспомн|\bхм+\b|интересно|как ты думаешь|угадай/)) return "bear-thinking";
  return who === "mishka" ? "bear-talking" : "fox-talking";
}

/** The free fallback voice: the phone's own Russian voice. Bear low and slow, fox high and quick. */
function browserSay(text: string, who: Hero): Promise<void> {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
  if (!synth) return Promise.resolve();
  return new Promise<void>((done) => {
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const ru = synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith("ru"));
    const v = ru.find((x) => /google|neural|natural|enhanced|premium|siri/i.test(x.name)) ?? ru[0];
    u.lang = v?.lang ?? "ru-RU";
    if (v) u.voice = v;
    u.rate = who === "mishka" ? 0.85 : 1.05;
    u.pitch = who === "mishka" ? 0.8 : 1.4;
    const safety = setTimeout(done, 30000);
    u.onend = u.onerror = () => { clearTimeout(safety); done(); };
    synth.speak(u);
  });
}
if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.getVoices();

function toAudioUrl(base64: string, mimeType = "audio/mpeg"): string {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
}

const ClassroomRu = () => {
  const { user, loading } = useAuth();
  const [history, setHistory] = useState<Turn[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [shot, setShot] = useState(-1); // the line being said; -1 = nobody is talking
  const [lastWho, setLastWho] = useState<Hero>("mishka");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [heard, setHeard] = useState("");
  const [stars, setStars] = useState(0);
  const [saidToday, setSaidToday] = useState<string[]>([]); // Russian words she herself said in this lesson
  const [childName, setChildName] = useState("");
  const [consent, setConsent] = useState<boolean | null>(null);
  const [consentTicked, setConsentTicked] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const audio = useRef<HTMLAudioElement | null>(null);
  const hush = useRef(false);

  useEffect(() => () => { audio.current?.pause(); window.speechSynthesis?.cancel(); }, []);

  useEffect(() => {
    if (!user?.id) return;
    supabase.from("family_members").select("name, role, age").eq("user_id", user.id).eq("is_active", true)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        const kid = (data ?? []).find((m) => m.role === "child" || (typeof m.age === "number" && m.age <= 12));
        if (kid?.name?.trim()) setChildName(kid.name.trim().split(/\s+/)[0]);
      });
    // The same parent note as Pere & Titi's classroom (one consent per family, read here, never changed).
    supabase.from("learning_sessions").select("id").eq("user_id", user.id).eq("session_type", "analytics")
      .eq("content->>event", "parent_consent").limit(1)
      .then(({ data, error }) => setConsent(error ? false : (data ?? []).length > 0));
    try { setStars(parseInt(localStorage.getItem(`classroom-ru-stars-${user.id}`) ?? "0", 10) || 0); } catch { /* blocked storage */ }
  }, [user?.id]);
  useEffect(() => {
    if (user?.id) try { localStorage.setItem(`classroom-ru-stars-${user.id}`, String(stars)); } catch { /* ignore */ }
  }, [stars, user?.id]);

  const giveConsent = async () => {
    if (!user?.id || !consentTicked) return;
    const { error } = await supabase.from("learning_sessions").insert({ user_id: user.id, session_type: "analytics", source: "web",
      content: { event: "parent_consent", version: "2026-11-09", agreed_at: new Date().toISOString() } });
    if (error) { toast.error("Не получилось сохранить. Попробуйте ещё раз. / No se pudo guardar."); return; }
    setConsent(true);
  };

  const voiceFor = async (line: Line): Promise<string | null> => {
    const { data, error } = await supabase.functions.invoke("voice-ru", { body: { text: line.ru, who: line.who } });
    return error || !data?.audioContent ? null : toAudioUrl(data.audioContent, data.mimeType || "audio/mpeg");
  };

  const play = (url: string) => new Promise<void>((done) => {
    audio.current?.pause();
    const a = new Audio(url);
    audio.current = a;
    a.onended = a.onpause = a.onerror = () => done();
    a.play().catch(() => done());
  });

  /** One voice request at a time, the next fetched while this line plays; a line without a voice is read by the phone. */
  const speak = async (spoken: Line[]) => {
    hush.current = false;
    setSpeaking(true);
    let next = spoken.length ? voiceFor(spoken[0]) : null;
    for (let i = 0; i < spoken.length; i++) {
      const url = await next;
      if (hush.current) break;
      next = i + 1 < spoken.length ? voiceFor(spoken[i + 1]) : null;
      setShot(i);
      setLastWho(spoken[i].who);
      if (url) await play(url);
      else await browserSay(spoken[i].ru, spoken[i].who);
      if (hush.current) break;
    }
    setSpeaking(false);
    setShot(-1);
  };

  const talk = async (childSays: string | null) => {
    setBusy(true);
    const asked: Turn[] = [...history, { role: "user", content: childSays ?? START }];
    try {
      const { data, error } = await supabase.functions.invoke("kids-ru", { body: { history: asked.slice(-16), childName } });
      if (error || !Array.isArray(data?.lines)) {
        const status = (error as { context?: { status?: number } } | null)?.context?.status;
        toast.error(status === 402 ? "Класс открыт во время пробного периода или по подписке. / La clase está abierta con la prueba o la suscripción."
          : "Мишка и Лиса отдыхают. Попробуй ещё раз! / Mishka y Lisa descansan. ¡Inténtalo otra vez!");
        return;
      }
      const first = history.length === 0;
      const spoken: Line[] = data.lines.map((l: { who: Hero; ru: string }, i: number) =>
        ({ who: l.who, ru: l.ru, clip: clipFor(l.who, l.ru, first && i === 0) }));
      setHistory([...asked, { role: "assistant", content: spoken.map((l) => `${HERO[l.who].name}: ${l.ru}`).join("\n") }]);
      setLines(spoken);
      const said: string[] = Array.isArray(data.said_ru) ? data.said_ru : [];
      if (childSays && said.length) {
        setStars((s) => s + 1);
        setSaidToday((w) => [...w, ...said.filter((x) => !w.includes(x))].slice(-30));
      }
      await speak(spoken);
    } catch (e) {
      console.error("classroom-ru talk failed", e);
      toast.error("Мишка и Лиса не смогли ответить. Попробуй ещё раз! / No pudieron contestar.");
    } finally {
      setBusy(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      chunks.current = [];
      r.ondataavailable = (e) => chunks.current.push(e.data);
      r.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        const b64 = await new Promise<string>((ok) => {
          const fr = new FileReader();
          fr.onloadend = () => ok(String(fr.result).split(",")[1] || "");
          fr.readAsDataURL(blob);
        });
        setBusy(true);
        // Russian hint: the lesson asks her to answer in Russian; a Spanish answer is still transcribed and recast.
        const { data, error } = await supabase.functions.invoke("voice-to-text", { body: { audio: b64, language: "ru", speaker: "child" } });
        const text = (data?.text || "").trim();
        if (data?.unavailable) { setBusy(false); toast.error(data.message || "Мишка и Лиса отдыхают. / Están descansando.", { duration: 15000 }); return; }
        if (error || !text) { setBusy(false); toast.error("Я тебя не расслышал. Скажи ещё раз! / No te escuché bien."); return; }
        setHeard(text);
        await talk(text);
      };
      recorder.current = r;
      r.start();
      setRecording(true);
      hush.current = true; // one tap silences the heroes and she speaks
      audio.current?.pause();
      window.speechSynthesis?.cancel();
    } catch {
      toast.error("Нужен микрофон. / Necesitamos el micrófono.");
    }
  };
  const stopRecording = () => { recorder.current?.stop(); setRecording(false); };

  const bg = { backgroundImage: "url(/classroom-ru/classroom.jpg)" };
  if (!loading && !user) {
    return (
      <div className="min-h-screen bg-cover bg-center flex items-start justify-center p-4 pt-6 md:pt-10" style={bg}>
        <div className="bg-white/90 rounded-3xl px-8 py-5 max-w-md text-center shadow-xl" style={{ fontFamily: KID_FONT }}>
          <h1 className="text-3xl font-bold mb-2">Мишка Медок и Лиса Алиса</h1>
          <p className="text-lg mb-6">Русский класс. Сначала входит мама или папа. · Primero entra mamá o papá.</p>
          <Button asChild size="lg"><Link to="/auth?next=/classroom-ru">Войти / Entrar</Link></Button>
        </div>
      </div>
    );
  }
  if (user && consent === null) return <div className="min-h-screen bg-cover bg-center" style={bg} />;
  if (user && consent === false) {
    return (
      <div className="min-h-screen bg-cover bg-center flex items-start justify-center p-4 pt-6 md:pt-10" style={bg}>
        <div className="bg-white/95 rounded-3xl px-6 py-5 max-w-lg shadow-xl space-y-3 text-slate-800">
          <h1 className="text-2xl font-bold text-center">Перед первым уроком · Antes de la primera clase</h1>
          <p className="text-sm">Это класс для детей, рядом с которыми есть взрослый. То, что говорит ребёнок, отправляется в сервисы ИИ,
            чтобы Мишка и Лиса могли ответить. Без рекламы, без публичного профиля.</p>
          <p className="text-sm">Esta clase es para niños con un adulto cerca. Lo que dice el niño se envía a servicios de IA para crear las
            respuestas. Sin anuncios, sin perfil público.{" "}
            <a className="underline" href="mailto:aipa@aideazz.xyz">aipa@aideazz.xyz</a> ·{" "}
            <Link className="underline" to="/privacy-policy">Privacidad</Link></p>
          <label className="flex items-start gap-3 rounded-xl border border-slate-300 bg-white p-3 cursor-pointer">
            <input type="checkbox" className="mt-1 h-5 w-5" checked={consentTicked} onChange={(e) => setConsentTicked(e.target.checked)} />
            <span className="text-sm font-semibold">Я мама, папа или опекун этого ребёнка и согласен(на). ·
              Soy la madre, el padre o el tutor de este niño y estoy de acuerdo.</span>
          </label>
          <Button size="lg" className="w-full" disabled={!consentTicked} onClick={giveConsent}>Начать / Empezar</Button>
        </div>
      </div>
    );
  }

  const now = shot >= 0 ? lines[shot] : null;
  const clip = recording || (!speaking && history.length)
    ? (lastWho === "mishka" ? "bear-listening" : "fox-listening")
    : now?.clip ?? "duo-hello";

  return (
    <div className="min-h-screen bg-cover bg-center flex flex-col items-center p-4 gap-4" style={{ ...bg, fontFamily: KID_FONT }}>
      <div className="flex items-center gap-3 bg-white/85 rounded-full px-5 py-2 shadow" aria-label={`${stars} stars`}>
        <span className="text-lg font-extrabold text-slate-800">Мишка Медок и Лиса Алиса</span>
        <span className="h-6 w-px bg-slate-300" />
        <Star className="w-6 h-6 fill-yellow-400 text-yellow-500" />
        <span className="text-2xl font-extrabold text-slate-900">{stars}</span>
      </div>

      <video key={`${clip}-${shot}`} src={`${CLIPS}/${clip}.mp4`} poster="/classroom-ru/cover.jpg"
        autoPlay loop muted playsInline
        className="w-full max-w-[720px] aspect-video rounded-[2rem] shadow-2xl border-8 border-white/80 object-cover" />

      {heard && (
        <div className="w-full max-w-[680px] flex items-start gap-3 justify-center">
          <div className="shrink-0 w-14 h-14 rounded-full grid place-items-center text-3xl shadow-lg border-4 border-white bg-pink-400">👧</div>
          <div className="rounded-[1.75rem] px-5 py-3 shadow-xl border-4 border-white bg-pink-100 max-w-[85%]">
            <div className="text-sm font-extrabold uppercase tracking-wide text-pink-600">{childName || "Ты"}</div>
            <div className="text-xl font-bold leading-snug text-slate-900">{heard}</div>
          </div>
        </div>
      )}

      {lines.length > 0 && (
        <div className="w-full max-w-[680px] flex flex-col gap-3">
          {lines.map((l, i) => (
            <div key={i} className={`flex items-start gap-3 ${l.who === "lisa" ? "flex-row-reverse text-right" : ""}`}>
              <div className={`shrink-0 w-14 h-14 rounded-full grid place-items-center text-3xl shadow-lg border-4 border-white ${HERO[l.who].badge}`}>
                {HERO[l.who].e}
              </div>
              <div className={`flex-1 rounded-[1.75rem] px-5 py-3 shadow-xl border-4 border-white transition-transform duration-300
                ${HERO[l.who].bubble} ${i === shot ? "scale-[1.03] ring-4 ring-yellow-300" : ""}`}>
                <div className={`text-sm font-extrabold uppercase tracking-wide ${HERO[l.who].label}`}>{HERO[l.who].name}</div>
                <div className="text-2xl font-bold leading-snug text-slate-900">{l.ru}</div>
              </div>
            </div>
          ))}
          <div className="flex justify-end -mt-1">
            <ReportReply text={lines.map((l) => `${HERO[l.who].name}: ${l.ru}`).join("\n")} where="classroom" />
          </div>
        </div>
      )}

      {saidToday.length > 0 && (
        <div className="w-full max-w-[680px] bg-white/90 rounded-3xl px-5 py-3 shadow-xl">
          <div className="text-sm font-extrabold text-emerald-700">Сегодня ты сказал(а) по-русски · Hoy dijiste en ruso</div>
          <div className="flex flex-wrap gap-2 mt-2">
            {saidToday.map((w) => <span key={w} className="rounded-full bg-emerald-100 px-3 py-1 text-lg font-bold text-emerald-900">{w}</span>)}
          </div>
        </div>
      )}

      {history.length === 0 ? (
        <Button size="lg" className="rounded-full text-2xl h-20 px-10 shadow-xl" disabled={busy || loading} onClick={() => talk(null)}>
          <Play className="w-8 h-8 mr-2" /> Начать! / ¡Empezar!
        </Button>
      ) : (
        <button
          onClick={recording ? stopRecording : startRecording}
          disabled={busy && !recording && !speaking}
          className={`w-32 h-32 rounded-full shadow-2xl flex flex-col items-center justify-center text-white text-lg font-bold transition
            ${recording ? "bg-red-500 animate-pulse" : busy && !speaking ? "bg-gray-400" : "bg-green-500 hover:bg-green-600"}`}
          aria-label={recording ? "Готово" : "Говори"}
        >
          {recording ? <Square className="w-12 h-12" /> : <Mic className="w-12 h-12" />}
          <span className="mt-1">{recording ? "Готово!" : busy && !speaking ? "…" : "Говори!"}</span>
        </button>
      )}
    </div>
  );
};

// Same gate as Pere & Titi's classroom: open during the free trial, then for paying families (kids-ru checks it again on the server).
const PaidClassroomRu = () => (
  <FeatureGate feature="kids_classroom">
    <ClassroomRu />
  </FeatureGate>
);

export default PaidClassroomRu;
