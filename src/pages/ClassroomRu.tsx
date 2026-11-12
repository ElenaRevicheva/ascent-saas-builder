import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Mic, Square, Star, Play, Camera } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FeatureGate } from "@/components/FeatureGate";
import { ReportReply } from "@/components/ReportReply";
import TracePadRu from "@/components/kids-ru/TracePadRu";
import { shrinkPhoto } from "@/lib/shrinkPhoto";

// Мишка Медок & Лиса Алиса - the Russian classroom (11 Nov 2026, Elena: "a classroom for Russian, in parallel").
// SEPARATE from Pere & Titi on purpose: this page shares no code with Classroom.tsx, has its own art
// (public/classroom-ru), its own clips (public/heroes-ru) and its own server functions (kids-ru lesson, voice-ru voices).
// Read-only shared things: sign-in, the family list, the subscription gate, the parent-consent note.
// 12 Nov 2026 (Elena: "adapted from Pere and Titi, bilingual exactly like them, Russian + English"): every line is
// Russian then English (both shown, both voiced), two ways in - a talk or a CLASS (12 units, Russian letters), and a
// parent report at the goodbye. Reachable from the dashboard map, step 3, on the website only (never in the Play app).
// Plan: cto-aipa docs/espaluz/RUSSIAN_CLASSROOM_PLAN_2026-11-11.md.
// 12 Nov 2026 (Elena: "the same paintings, music, all that stuff ... photos with explanations, the interface absolutely the
// same, just in English and Russian"): the same tools as Pere & Titi's page - 🎨 paint, ✏️ trace, 🎵 music, 🦊 program,
// 🎲 games (Russian copies in components/kids-ru), 📷 photo + 🖼️ gallery that the heroes explain, ⭐ stickers every 5 stars
// with Lisa's dance, and the 👧/👩/👨 "who is talking" switch. Not copied: EspaLuz's own clips (she speaks Spanish in them).

type Hero = "mishka" | "lisa";
type Who = "child" | "mama" | "papa";
type Turn = { role: "user" | "assistant"; content: string; who?: Who };
type Line = { who: Hero; ru: string; en: string; clip: string };
type Mode = "talk" | "class";

const CLIPS = "/heroes-ru";
const START = "(урок начинается)";
const HERO = {
  mishka: { name: "Мишка Медок", e: "🐻", bubble: "bg-amber-100", badge: "bg-amber-600", label: "text-amber-800" },
  lisa: { name: "Лиса Алиса", e: "🦊", bubble: "bg-orange-100", badge: "bg-orange-500", label: "text-orange-700" },
} as const;
const PARENT: Record<Exclude<Who, "child">, { e: string; name: string }> = { mama: { e: "👩", name: "Мама" }, papa: { e: "👨", name: "Папа" } };
// Every 5 stars: the next sticker of the Russian forest, named in Russian + English (two new words as the reward).
const STICKERS: { e: string; ru: string; en: string }[] = [
  { e: "🐻", ru: "медведь", en: "the bear" }, { e: "🦊", ru: "лиса", en: "the fox" }, { e: "🦔", ru: "ёжик", en: "the hedgehog" },
  { e: "🐿️", ru: "белка", en: "the squirrel" }, { e: "🐰", ru: "заяц", en: "the hare" }, { e: "🦉", ru: "сова", en: "the owl" },
  { e: "🐺", ru: "волк", en: "the wolf" }, { e: "🍄", ru: "гриб", en: "the mushroom" }, { e: "🌲", ru: "ёлка", en: "the fir tree" },
  { e: "🍯", ru: "мёд", en: "the honey" }, { e: "🪆", ru: "матрёшка", en: "the matryoshka doll" }, { e: "🫖", ru: "чайник", en: "the teapot" },
  { e: "🍓", ru: "земляника", en: "the wild strawberry" }, { e: "🦢", ru: "лебедь", en: "the swan" }, { e: "❄️", ru: "снежинка", en: "the snowflake" },
  { e: "🌻", ru: "подсолнух", en: "the sunflower" },
];
const stickerFor = (n: number) => STICKERS[(n - 1) % STICKERS.length];
// The pads' and the photo's own messages: a turn the child made with her hands, not her voice (still her star).
const ACTIVITY = /^(✏️|🎨|🎵|🦊|🎲|📷)/;
const KID_FONT = '"Nunito", "Baloo 2", ui-rounded, "Segoe UI", system-ui, sans-serif';

/** One clip per hero line, chosen from what the line says (same idea as Pere & Titi, Russian words, own clips).
 *  11 Nov 2026 (Elena: "they are just together … make this classroom a little more interesting"): 7 more shots -
 *  the bear's reading corner and the fox's dance solo, honey, counting, high-five - and lines of the same kind
 *  ROTATE through their pool, so two lines in a row never repeat one picture.
 *  Cyrillic word edges: JS `\b` only knows Latin letters, so `\bпока\b` never matched; `w()` checks Russian letters. */
let clipTurn = 0;
const pick = (pool: string[]) => pool[clipTurn++ % pool.length];
const w = (word: string) => new RegExp(`(?<![а-яё])(${word})(?![а-яё])`);
function clipFor(who: Hero, ru: string, firstOfLesson: boolean): string {
  const t = ru.toLowerCase();
  const has = (re: RegExp) => re.test(t);
  if (has(/до свидания|до завтра|до встречи/) || has(w("пока"))) return "duo-goodbye";
  if (firstOfLesson && has(/привет|здравствуй|здравствуйте/)) return "duo-hello";
  if (has(/молод(ец|чина)|умни(ца|чка)|отлично|браво|супер|здорово|целое предложение|правильно/) || has(w("ура")))
    return pick(["fox-cheer", "duo-highfive", "fox-dance"]);
  if (has(w("мёд|мед[аоуе]?|медок|мёдом")) || has(/вкусн/)) return "bear-honey";
  if (has(/посчита|считать|считаем|сколько/) || has(w("раз|два|три|четыре|пять"))) return "fox-counting";
  if (has(/танц|пляс|потанцу/)) return "fox-dance";
  if (who === "mishka" && has(/сказк|книг|почита|читать|читаем|жили-были|жил-был/)) return "bear-reading";
  if (who === "mishka" && (has(/подума|вспомн|интересно|как ты думаешь|угадай/) || has(w("хм+")))) return "bear-thinking";
  return who === "mishka" ? pick(["bear-talking", "bear-talking-2", "bear-reading"]) : pick(["fox-talking", "fox-talking-2"]);
}

/** The free fallback voice: the phone's own voices, Russian then English. Bear low and slow, fox high and quick. */
async function browserSay(text: string, who: Hero, en = ""): Promise<void> {
  await sayIn(text, who, "ru");
  if (en) await sayIn(en, who, "en");
}
function sayIn(text: string, who: Hero, lang: "ru" | "en"): Promise<void> {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
  if (!synth) return Promise.resolve();
  return new Promise<void>((done) => {
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const ofLang = synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith(lang));
    const v = ofLang.find((x) => /google|neural|natural|enhanced|premium|siri/i.test(x.name)) ?? ofLang[0];
    u.lang = v?.lang ?? (lang === "ru" ? "ru-RU" : "en-US");
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
  const [learned, setLearned] = useState<string[]>([]); // new Russian words the heroes taught in this lesson
  const [mode, setMode] = useState<Mode>("talk");
  const [unit, setUnit] = useState<{ n: number; theme: string; trace: string[] } | null>(null);
  const [mission, setMission] = useState("");
  const [turnNo, setTurnNo] = useState(0);
  const [childName, setChildName] = useState("");
  const [who, setWho] = useState<Who>("child");
  const [heardWho, setHeardWho] = useState<Who>("child");
  const [pad, setPad] = useState<null | "trace" | "paint">(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [reward, setReward] = useState(0); // >0 = Lisa's star dance on screen
  const photoInput = useRef<HTMLInputElement | null>(null);
  const galleryInput = useRef<HTMLInputElement | null>(null);
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
    // Like Pere & Titi: the stars are her saved answers (any device), so the tablet and the laptop show the same count.
    supabase.from("learning_sessions").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).eq("session_type", "classroom_ru").neq("content->>user_message", "")
      .or("content->>speaker.is.null,content->>speaker.neq.parent")
      .then(({ count, error }) => { if (!error && typeof count === "number") setStars((s) => Math.max(s, count)); });
  }, [user?.id]);
  useEffect(() => {
    if (user?.id) try { localStorage.setItem(`classroom-ru-stars-${user.id}`, String(stars)); } catch { /* ignore */ }
  }, [stars, user?.id]);

  const giveConsent = async () => {
    if (!user?.id || !consentTicked) return;
    const { error } = await supabase.from("learning_sessions").insert({ user_id: user.id, session_type: "analytics", source: "web",
      content: { event: "parent_consent", version: "2026-11-09", agreed_at: new Date().toISOString() } });
    if (error) { toast.error("Не получилось сохранить. Попробуйте ещё раз. / Could not save. Please try again."); return; }
    setConsent(true);
  };

  const voiceFor = async (line: Line): Promise<string | null> => {
    const { data, error } = await supabase.functions.invoke("voice-ru", { body: { text: line.ru, en: line.en, who: line.who } });
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
      else await browserSay(spoken[i].ru, spoken[i].who, spoken[i].en);
      if (hush.current) break;
    }
    setSpeaking(false);
    setShot(-1);
  };

  const nameOf = (w: Who) => (w === "child" ? childName || "Ты" : PARENT[w].name);

  /** Every 5 stars: Lisa's dance fills the screen and the new sticker is said in Russian and English. */
  const celebrate = async (n: number) => {
    setReward(n);
    const st = stickerFor(Math.floor(n / 5));
    await Promise.all([browserSay(`${n} звёзд! Новая наклейка: ${st.ru}.`, "lisa", `${n} stars! Your new sticker: ${st.en}.`),
      new Promise((r) => setTimeout(r, 5500))]);
    setReward(0);
  };

  const talk = async (childSays: string | null, as: Mode = mode, image?: string, speaker: Who = "child") => {
    setBusy(true);
    if (!image) setPhoto(null);
    const parent = speaker !== "child";
    if (childSays) { setHeard(childSays); setHeardWho(speaker); }
    const asked: Turn[] = [...history, { role: "user", content: childSays ?? START, who: speaker }];
    try {
      const { data, error } = await supabase.functions.invoke("kids-ru", { body: {
        history: asked.slice(-16).map(({ role, content }) => ({ role, content })), childName, turn: turnNo, mode: as,
        image, speaker: parent ? "parent" : "child", speaker_name: nameOf(speaker) } });
      if (error || !Array.isArray(data?.lines)) {
        const status = (error as { context?: { status?: number } } | null)?.context?.status;
        toast.error(status === 402 ? "Класс открыт во время пробного периода или по подписке. / The class is open during the free trial or with a subscription."
          : "Мишка и Лиса отдыхают. Попробуй ещё раз! / Mishka and Lisa are resting. Try again!");
        return;
      }
      const first = history.length === 0;
      const spoken: Line[] = data.lines.map((l: { who: Hero; ru: string; en?: string }, i: number) =>
        ({ who: l.who, ru: l.ru, en: l.en ?? "", clip: clipFor(l.who, l.ru, first && i === 0) }));
      // A photo turn comes back as "📷 (фото: ...)", so the next turns still know what she showed.
      const said0 = typeof data.userMessage === "string" && data.userMessage ? data.userMessage : childSays;
      if (said0 && said0 !== childSays) setHeard(said0);
      if (said0) asked[asked.length - 1] = { ...asked[asked.length - 1], content: said0 };
      setHistory([...asked, { role: "assistant", content: spoken.map((l) => `${HERO[l.who].name}: ${l.ru} / ${l.en}`).join("\n") }]);
      setLines(spoken);
      setTurnNo((t) => t + 1);
      if (as === "class" && data.unit) setUnit({ n: data.unit, theme: data.unitTheme ?? "", trace: Array.isArray(data.trace) ? data.trace : [] });
      if (typeof data.mission === "string" && data.mission) setMission(data.mission);
      if (Array.isArray(data.new_words)) setLearned((w) => [...w, ...data.new_words.filter((x: string) => !w.includes(x))].slice(-30));
      const said: string[] = Array.isArray(data.said_ru) ? data.said_ru : [];
      const star = Boolean(childSays) && !parent && (said.length > 0 || ACTIVITY.test(childSays ?? ""));
      if (star) setStars((s) => s + 1);
      if (childSays && !parent && said.length) setSaidToday((w) => [...w, ...said.filter((x) => !w.includes(x))].slice(-30));
      await speak(spoken);
      if (star && (stars + 1) % 5 === 0 && !hush.current) await celebrate(stars + 1);
    } catch (e) {
      console.error("classroom-ru talk failed", e);
      toast.error("Мишка и Лиса не смогли ответить. Попробуй ещё раз! / They could not answer. Try again!");
    } finally {
      setBusy(false);
    }
  };

  const showPhoto = async (file: File | undefined) => {
    if (!file) return;
    try {
      const { b64, url } = await shrinkPhoto(file);
      setPhoto(url);
      await talk("📷 Посмотри на моё фото! / Look at my photo!", mode, b64);
    } catch {
      toast.error("Не получилось открыть фото. / I could not open the photo.");
    } finally {
      if (photoInput.current) photoInput.current.value = "";
      if (galleryInput.current) galleryInput.current.value = "";
    }
  };

  const startRecording = async () => {
    const speaker = who; // the switch at the moment the mic is pressed names this turn's speaker
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
        // 12 Nov 2026: bilingual class - she may answer in Russian or English (or Spanish), so no language is forced.
        const { data, error } = await supabase.functions.invoke("voice-to-text", { body: { audio: b64, speaker: speaker === "child" ? "child" : "parent" } });
        const text = (data?.text || "").trim();
        if (data?.unavailable) { setBusy(false); toast.error(data.message || "Мишка и Лиса отдыхают. / They are resting.", { duration: 15000 }); return; }
        if (error || !text) { setBusy(false); toast.error("Я тебя не расслышал. Скажи ещё раз! / I did not hear you. Say it again!"); return; }
        await talk(text, mode, undefined, speaker);
      };
      recorder.current = r;
      r.start();
      setRecording(true);
      hush.current = true; // one tap silences the heroes and she speaks
      audio.current?.pause();
      window.speechSynthesis?.cancel();
    } catch {
      toast.error("Нужен микрофон. / We need the microphone.");
    }
  };
  const stopRecording = () => { recorder.current?.stop(); setRecording(false); };

  const bg = { backgroundImage: "url(/classroom-ru/classroom.jpg)" };
  if (!loading && !user) {
    return (
      <div className="min-h-screen bg-cover bg-center flex items-start justify-center p-4 pt-6 md:pt-10" style={bg}>
        <div className="bg-white/90 rounded-3xl px-8 py-5 max-w-md text-center shadow-xl" style={{ fontFamily: KID_FONT }}>
          <h1 className="text-3xl font-bold mb-2">Мишка Медок и Лиса Алиса</h1>
          <p className="text-lg mb-6">Русский класс. Сначала входит мама или папа. · A parent signs in first.</p>
          <Button asChild size="lg"><Link to="/auth?next=/classroom-ru">Войти / Sign in</Link></Button>
        </div>
      </div>
    );
  }
  if (user && consent === null) return <div className="min-h-screen bg-cover bg-center" style={bg} />;
  if (user && consent === false) {
    return (
      <div className="min-h-screen bg-cover bg-center flex items-start justify-center p-4 pt-6 md:pt-10" style={bg}>
        <div className="bg-white/95 rounded-3xl px-6 py-5 max-w-lg shadow-xl space-y-3 text-slate-800">
          <h1 className="text-2xl font-bold text-center">Перед первым уроком · Before the first lesson</h1>
          <p className="text-sm">Это класс для детей, рядом с которыми есть взрослый. То, что говорит ребёнок, отправляется в сервисы ИИ,
            чтобы Мишка и Лиса могли ответить. Без рекламы, без публичного профиля.</p>
          <p className="text-sm">This class is for children with an adult nearby. What the child says is sent to AI services so Mishka and Lisa
            can answer. No ads, no public profile.{" "}
            <a className="underline" href="mailto:aipa@aideazz.xyz">aipa@aideazz.xyz</a> ·{" "}
            <Link className="underline" to="/privacy-policy">Privacy</Link></p>
          <label className="flex items-start gap-3 rounded-xl border border-slate-300 bg-white p-3 cursor-pointer">
            <input type="checkbox" className="mt-1 h-5 w-5" checked={consentTicked} onChange={(e) => setConsentTicked(e.target.checked)} />
            <span className="text-sm font-semibold">Я мама, папа или опекун этого ребёнка и согласен(на). ·
              I am this child's mother, father or guardian and I agree.</span>
          </label>
          <Button size="lg" className="w-full" disabled={!consentTicked} onClick={giveConsent}>Начать / Start</Button>
        </div>
      </div>
    );
  }

  const now = shot >= 0 ? lines[shot] : null;
  const clip = reward ? "fox-dance" : recording || (!speaking && history.length)
    ? (lastWho === "mishka" ? "bear-listening" : "fox-listening")
    : now?.clip ?? "duo-hello";
  const stickers = Math.floor(stars / 5);

  return (
    <div className="min-h-screen bg-cover bg-center flex flex-col items-center p-4 gap-4" style={{ ...bg, fontFamily: KID_FONT }}>
      <div className="flex flex-wrap items-center justify-center gap-2 bg-white/85 rounded-full px-5 py-2 shadow max-w-full"
        aria-label={`${stars} stars, ${stickers} stickers`}>
        <span className="text-lg font-extrabold text-slate-800">Мишка Медок и Лиса Алиса</span>
        <span className="h-6 w-px bg-slate-300" />
        <Star className="w-6 h-6 fill-yellow-400 text-yellow-500" />
        <span className="text-2xl font-extrabold text-slate-900">{stars}</span>
        {stickers > 0 && <span className="mx-1 h-6 w-px bg-slate-300" />}
        {Array.from({ length: stickers }, (_, i) => i + 1).slice(-10).map((n) => (
          <span key={n} title={`${stickerFor(n).ru} / ${stickerFor(n).en}`} className="text-3xl leading-none">{stickerFor(n).e}</span>
        ))}
        {stickers > 10 && <span className="text-lg font-bold text-slate-600">+{stickers - 10}</span>}
      </div>

      {mode === "class" && unit && (
        <div className="bg-white/90 rounded-3xl px-5 py-2 shadow text-center">
          <div className="text-sm font-extrabold text-amber-800">Урок {unit.n} · Class {unit.n}: {unit.theme}</div>
          {unit.trace.length > 0 && <div className="text-3xl font-extrabold tracking-widest text-slate-900">{unit.trace.slice(0, 3).join("   ")}</div>}
        </div>
      )}

      <video key={`${clip}-${shot}`} src={`${CLIPS}/${clip}.mp4`} poster="/classroom-ru/cover.jpg"
        autoPlay loop muted playsInline
        className="w-full max-w-[720px] aspect-video rounded-[2rem] shadow-2xl border-8 border-white/80 object-cover" />

      {reward > 0 && (
        <div className="rounded-full bg-yellow-300 border-4 border-white shadow-2xl px-8 py-3 text-2xl font-extrabold text-slate-900 animate-bounce text-center">
          🌟 {reward} звёзд! Новая наклейка: <span className="text-4xl align-middle">{stickerFor(Math.floor(reward / 5)).e}</span>{" "}
          {stickerFor(Math.floor(reward / 5)).ru} / {stickerFor(Math.floor(reward / 5)).en}
        </div>
      )}

      {photo && (
        <img src={photo} alt="Фото ребёнка / The child's photo"
          className="max-h-48 max-w-[80%] rounded-2xl border-4 border-white shadow-xl object-contain" />
      )}

      {heard && (
        <div className="w-full max-w-[680px] flex items-start gap-3 justify-center">
          <div className={`shrink-0 w-14 h-14 rounded-full grid place-items-center text-3xl shadow-lg border-4 border-white
            ${heardWho === "child" ? "bg-pink-400" : heardWho === "mama" ? "bg-violet-400" : "bg-sky-500"}`}>
            {heardWho === "child" ? "👧" : PARENT[heardWho].e}
          </div>
          <div className={`rounded-[1.75rem] px-5 py-3 shadow-xl border-4 border-white max-w-[85%]
            ${heardWho === "child" ? "bg-pink-100" : heardWho === "mama" ? "bg-violet-100" : "bg-sky-100"}`}>
            <div className={`text-sm font-extrabold uppercase tracking-wide
              ${heardWho === "child" ? "text-pink-600" : heardWho === "mama" ? "text-violet-700" : "text-sky-700"}`}>{nameOf(heardWho)}</div>
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
                {l.en && <div className="text-lg leading-snug text-slate-600 mt-1">{l.en}</div>}
              </div>
            </div>
          ))}
          <div className="flex justify-end -mt-1">
            <ReportReply text={lines.map((l) => `${HERO[l.who].name}: ${l.ru} / ${l.en}`).join("\n")} where="classroom" />
          </div>
        </div>
      )}

      {saidToday.length > 0 && (
        <div className="w-full max-w-[680px] bg-white/90 rounded-3xl px-5 py-3 shadow-xl">
          <div className="text-sm font-extrabold text-emerald-700">Сегодня ты сказал(а) по-русски · Today you said in Russian</div>
          <div className="flex flex-wrap gap-2 mt-2">
            {saidToday.map((w) => <span key={w} className="rounded-full bg-emerald-100 px-3 py-1 text-lg font-bold text-emerald-900">{w}</span>)}
          </div>
        </div>
      )}

      {mission && (
        <div className="w-full max-w-[680px] bg-white/95 rounded-3xl px-5 py-4 shadow-xl border-4 border-amber-200">
          <div className="text-sm font-extrabold uppercase tracking-wide text-amber-700">Для родителей · For parents</div>
          <div className="mt-1 text-base text-slate-800">
            {unit ? <>Урок · Class {unit.n}: <b>{unit.theme}</b><br /></> : <>Разговор · Talk<br /></>}
            Сказала по-русски · Said in Russian: <b>{saidToday.length ? saidToday.join(", ") : "—"}</b><br />
            Новые слова · New words: <b>{learned.length ? learned.join(", ") : "—"}</b><br />
            Задание · Mission: <b>{mission}</b>
          </div>
        </div>
      )}

      {history.length === 0 ? (
        <div className="flex flex-wrap justify-center gap-4">
          <Button size="lg" className="rounded-full text-2xl h-20 px-10 shadow-xl" disabled={busy || loading} onClick={() => { setMode("talk"); talk(null, "talk"); }}>
            <Play className="w-8 h-8 mr-2" /> Поговорим! / Let's talk!
          </Button>
          <Button size="lg" variant="secondary" className="rounded-full text-2xl h-20 px-10 shadow-xl bg-amber-100 hover:bg-amber-200 text-amber-900"
            disabled={busy || loading} onClick={() => { setMode("class"); talk(null, "class"); }}>
            📖 Урок! / Class!
          </Button>
        </div>
      ) : (
        <>
        {pad && (
          <TracePadRu
            key={pad}
            initialMode={pad === "paint" ? "paint" : "letters"}
            targets={unit?.trace.length ? unit.trace : ["А", "О", "У", "М", "С"]}
            onClose={() => setPad(null)}
            onTraced={(text) => { if (!busy) talk(`✏️ Написано: «${text}» / I traced "${text}"`); }}
            onPainted={(text) => { if (!busy) talk(text); }}
          />
        )}
        <div className="flex flex-wrap items-center justify-center gap-6">
          <button onClick={() => setPad((p) => (p === "paint" ? null : "paint"))} disabled={recording}
            className={`w-20 h-20 rounded-full shadow-2xl flex flex-col items-center justify-center text-white text-sm font-bold transition
              ${recording ? "bg-gray-400" : "bg-fuchsia-500 hover:bg-fuchsia-600"}`} aria-label="Paint">
            <span className="text-3xl leading-none">🎨</span>
            <span className="mt-0.5">Рисовать</span>
          </button>
          {mode === "class" && (unit?.trace.length ?? 0) > 0 && (
            <button onClick={() => setPad((p) => (p === "trace" ? null : "trace"))} disabled={recording}
              className={`w-20 h-20 rounded-full shadow-2xl flex flex-col items-center justify-center text-white text-sm font-bold transition
                ${recording ? "bg-gray-400" : "bg-amber-500 hover:bg-amber-600"}`} aria-label="Trace">
              <span className="text-3xl leading-none">✏️</span>
              <span className="mt-0.5">Писать</span>
            </button>
          )}
          {/* Фото opens the camera straight away and the photo goes to Mishka and Lisa at once; 🖼️ keeps the gallery. */}
          <input ref={photoInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => showPhoto(e.target.files?.[0])} />
          <input ref={galleryInput} type="file" accept="image/*" className="hidden" onChange={(e) => showPhoto(e.target.files?.[0])} />
          <button onClick={() => galleryInput.current?.click()} disabled={busy || recording}
            className={`w-12 h-12 rounded-full shadow-xl flex items-center justify-center text-2xl transition
              ${busy || recording ? "bg-gray-300" : "bg-sky-100 hover:bg-sky-200"}`} aria-label="Gallery">🖼️</button>
          <button onClick={() => photoInput.current?.click()} disabled={busy || recording}
            className={`w-20 h-20 rounded-full shadow-2xl flex flex-col items-center justify-center text-white text-sm font-bold transition
              ${busy || recording ? "bg-gray-400" : "bg-sky-500 hover:bg-sky-600"}`} aria-label="Photo">
            <Camera className="w-8 h-8" />
            <span className="mt-0.5">Фото</span>
          </button>
          <button
            onClick={recording ? stopRecording : startRecording}
            disabled={busy && !recording && !speaking}
            className={`w-32 h-32 rounded-full shadow-2xl flex flex-col items-center justify-center text-white text-lg font-bold transition
              ${recording ? "bg-red-500 animate-pulse" : busy && !speaking ? "bg-gray-400"
                : who === "child" ? "bg-green-500 hover:bg-green-600" : "bg-violet-500 hover:bg-violet-600"}`}
            aria-label={recording ? "Готово / Done" : `Говори / Talk - ${nameOf(who)}`}
          >
            {recording ? <Square className="w-12 h-12" /> : <Mic className="w-12 h-12" />}
            <span className="mt-1 text-center leading-tight px-2">
              {recording ? "Готово! / Done" : busy && !speaking ? "…" : who === "child" ? "Говори! / Talk" : `Говорит ${nameOf(who)}`}
            </span>
          </button>
          {/* Who talks next: tap a face before the mic; a parent's words never count as the child's stars or words. */}
          <div className="flex flex-col gap-2 bg-white/85 rounded-3xl p-2 shadow-xl" role="radiogroup" aria-label="Кто говорит? / Who is talking?">
            {(["child", "mama", "papa"] as Who[]).map((w) => (
              <button key={w} role="radio" aria-checked={who === w} disabled={recording} onClick={() => setWho(w)}
                className={`flex items-center gap-2 rounded-full pl-1 pr-4 min-h-[56px] text-lg font-extrabold transition
                  ${who === w ? (w === "child" ? "bg-pink-400 text-white ring-4 ring-pink-200" : "bg-violet-500 text-white ring-4 ring-violet-200")
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
                <span className="w-12 h-12 rounded-full bg-white/90 grid place-items-center text-3xl">{w === "child" ? "👧" : PARENT[w].e}</span>
                {nameOf(w)}
              </button>
            ))}
          </div>
        </div>
        </>
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
