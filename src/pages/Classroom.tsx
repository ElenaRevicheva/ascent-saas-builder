import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Mic, Square, Star, Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Pere + Titi's classroom (22 Oct 2026): the dashboard chat's voice loop (voice-to-text -> espaluz-chat -> generate-voice)
// in kids mode, with the heroes' clips as the avatar. 28 Oct 2026 (Elena: the picture must match what the line says, and
// a chain of clips "looks repetitive and simulated"): ONE picture per hero line, named by the tutor as "Pere [shot]: ...",
// else chosen from the lesson words, else that hero's talking clip. The same 25 clips and rules as the EspaLuz Telegram bot.
type Turn = { role: "user" | "assistant"; content: string };
type Line = { who: "pere" | "titi"; clip: string; chars: number; text: string };

const IDLE_CLIP = "/heroes/duo-hello.mp4";
const GREETING_CLIP = "/heroes/kids-greeting.mp4"; // the heroes' own voiced hello (the Telegram /kids clip) opens the class
const TALK = { pere: ["pere-talking-1", "pere-talking-2"], titi: ["titi-talking-1", "titi-talking-2"] };
const SHOT_CLIPS: Record<"pere" | "titi", Record<string, string>> = {
  pere: { hello: "pere-hello", counting: "pere-counting", thinking: "pere-thinking", clap: "pere-clap", listening: "pere-listening",
          breathing: "pere-breathing", sleepy: "pere-sleepy", goodbye: "duo-goodbye", highfive: "duo-highfive", peekaboo: "duo-peekaboo" },
  titi: { cheer: "titi-cheer", silly: "titi-silly", dance: "titi-dance", jump: "titi-crosscrawl", counting: "titi-counting-jumps",
          freeze: "titi-freeze", oops: "titi-oops", listening: "titi-listening", goodbye: "duo-goodbye", highfive: "duo-highfive",
          peekaboo: "duo-peekaboo", hello: "duo-hello" },
};
const SHOT_ALIASES: Record<string, string> = {
  count: "counting", counts: "counting", numbers: "counting", listen: "listening", think: "thinking", thinks: "thinking",
  breathe: "breathing", breath: "breathing", calm: "breathing", sleep: "sleepy", jumps: "jump", jumping: "jump", crosscrawl: "jump",
  "cross-crawl": "jump", simon: "jump", "high five": "highfive", "high-five": "highfive", wave: "hello", hi: "hello", bye: "goodbye",
  laugh: "silly", giggle: "silly", funny: "silly", mistake: "oops", statue: "freeze", applause: "clap", praise: "clap", happy: "cheer",
  excited: "cheer", cheering: "cheer", dancing: "dance", music: "dance", hide: "peekaboo", surprise: "peekaboo",
};
const recent: string[] = []; // clips just played go to the back of the line
// Twins: the same picture twice in a row gives way to its twin (own hero only), so every clip gets its turn (30 Oct 2026).
const SHOT_ALT: Record<string, string> = {
  "titi-cheer": "titi-cheer-2", "titi-cheer-2": "titi-cheer", "pere-hello": "duo-hello", "duo-hello": "pere-hello",
  "pere-talking-1": "pere-talking-2", "pere-talking-2": "pere-talking-1", "titi-talking-1": "titi-talking-2", "titi-talking-2": "titi-talking-1",
};

/** The lesson words that pick a picture when the tutor gave no tag (same list as the bot). */
function clipFromWords(who: "pere" | "titi", t: string, first: boolean, last: boolean): string | null {
  const has = (ws: string[]) => ws.some((w) => t.includes(w));
  if (first && has(["hola", "hello", "hi "])) return "duo-hello";
  if (last && has(["adiós", "adios", "bye", "hasta mañana", "see you"])) return "duo-goodbye";
  if (who === "pere" && has(["respira", "breath", "barriga", "belly", "calma", "calm"])) return "pere-breathing";
  if (who === "pere" && has(["noche", "night", "dormir", "sleep", "sueño"])) return "pere-sleepy";
  if (who === "titi" && has(["baila", "dance", "música", "music"])) return "titi-dance";
  if (who === "titi" && has(["rodilla", "knee", "salta", "jump", "simon"])) return "titi-crosscrawl";
  if (has(["muy bien", "bravo", "excelente", "great job", "well done", "perfecto"])) return first ? "duo-highfive" : who === "pere" ? "pere-clap" : "titi-cheer";
  if (has(["cuenta", "contar", "count", "uno, dos", "one, two"])) return who === "pere" ? "pere-counting" : "titi-counting-jumps";
  if (who === "titi" && has(["congela", "estatua", "freeze", "statue"])) return "titi-freeze";
  if (who === "titi" && has(["ups", "oops", "me equivoqu", "mistake"])) return "titi-oops";
  if (has(["dónde está", "donde esta", "where is", "escondid", "peekaboo", "cucú"])) return "duo-peekaboo";
  return null;
}

function pickClip(who: "pere" | "titi", text: string, shot: string | null, first: boolean, last: boolean): string {
  const tag = SHOT_ALIASES[shot ?? ""] ?? shot ?? "";
  let name = tag && tag !== "talk" ? SHOT_CLIPS[who][tag] ?? null : null;
  if (!name && tag !== "talk") name = clipFromWords(who, text.toLowerCase(), first, last);
  const alt = name ? SHOT_ALT[name] : undefined;
  if (name && alt && recent[recent.length - 1] === name && !alt.startsWith(who === "pere" ? "titi-" : "pere-")) name = alt; // never the other hero alone
  if (!name) {
    const age = new Map<string, number>();
    recent.forEach((n, i) => age.set(n, recent.length - 1 - i)); // 0 = most recent; a clip played twice keeps its newest age
    name = [...TALK[who]].sort(() => Math.random() - 0.5).sort((a, b) => (age.get(b) ?? 1e6) - (age.get(a) ?? 1e6))[0];
  }
  recent.push(name);
  while (recent.length > 12) recent.shift();
  return `/heroes/${name}.mp4`;
}

/** "Pere [counting]: ..." lines -> one picture each; unlabeled text goes to Pere. */
function heroLines(text: string): Line[] {
  const raw: { who: "pere" | "titi"; shot: string | null; text: string }[] = [];
  for (const line of text.split("\n")) {
    const m = line.trim().match(/^[^\w]*(pere|titi)\s*(?:\[\s*([a-z][a-z -]*?)\s*\])?\s*:\s*(.*)$/i);
    if (m) raw.push({ who: m[1].toLowerCase() as "pere" | "titi", shot: m[2]?.toLowerCase().trim() || null, text: m[3] });
    else if (raw.length && line.trim()) raw[raw.length - 1].text += " " + line.trim();
  }
  if (!raw.length) raw.push({ who: "pere", shot: null, text });
  return raw.map((r, i) => ({ who: r.who, clip: pickClip(r.who, r.text, r.shot, i === 0, i === raw.length - 1), chars: Math.max(r.text.length, 1), text: r.text }));
}

/** The tag is for the picture only; the child reads "Pere: ...". */
const stripShotTags = (text: string) => text.replace(/\b(pere|titi)\s*\[[^\]\n]*\]\s*:/gi, "$1:");

function toAudioUrl(base64: string): string {
  const bin = atob(base64.replace(/^data:audio\/[^;]+;base64,/, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" }));
}

const Classroom = () => {
  const { user, loading } = useAuth();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [reply, setReply] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [shot, setShot] = useState(0);
  const idle = () => { setLines([]); setShot(0); };
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [stars, setStars] = useState(0);
  const [greeting, setGreeting] = useState(false);
  const greetingDone = useRef<Promise<void> | null>(null);
  const greetingEnded = useRef<(() => void) | null>(null);
  const known = useRef<string[]>([]); // whole sentences the child said in earlier lessons (this browser) - the words come back and grow
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => { audio.current?.pause(); }, []);

  // Stars and known sentences survive a reload (Buddy.ai keeps the child's progress; 30 Oct 2026). Per parent account, this browser.
  useEffect(() => {
    if (!user?.id) return;
    try {
      setStars(Math.max(0, parseInt(localStorage.getItem(`classroom-stars-${user.id}`) ?? "0", 10) || 0));
      const k = JSON.parse(localStorage.getItem(`classroom-known-${user.id}`) ?? "[]");
      known.current = Array.isArray(k) ? k.filter((x) => typeof x === "string").slice(-20) : [];
    } catch { /* a bad entry just starts fresh */ }
  }, [user?.id]);
  useEffect(() => {
    if (user?.id) try { localStorage.setItem(`classroom-stars-${user.id}`, String(stars)); } catch { /* storage full or blocked */ }
  }, [stars, user?.id]);
  const remember = (said: string) => {
    if (said.trim().split(/\s+/).length < 4) return; // a whole sentence, not a word
    known.current = [...known.current.filter((s) => s !== said), said].slice(-20);
    if (user?.id) try { localStorage.setItem(`classroom-known-${user.id}`, JSON.stringify(known.current)); } catch { /* ignore */ }
  };

  const voiceFor = async (text: string, hero?: "pere" | "titi"): Promise<string | null> => {
    const { data, error } = await supabase.functions.invoke("generate-voice", { body: { text, voice: "es", userId: user?.id, hero } });
    const b64 = data?.audioContent || data?.audioBase64;
    return error || !b64 ? null : toAudioUrl(b64);
  };

  const play = (url: string, onTime?: (a: HTMLAudioElement) => void) =>
    new Promise<void>((done) => {
      audio.current?.pause();
      const a = new Audio(url);
      audio.current = a;
      if (onTime) a.ontimeupdate = () => onTime(a);
      a.onended = () => done();
      a.onerror = () => done();
      a.play().catch(() => done());
    });

  // 28 Oct 2026: Pere and Titi speak their own lines in their own voices (the Telegram bot's MiniMax voices, via
  // generate-voice `hero`), the picture of each line on screen while it is said. If any line has no hero voice,
  // the whole reply is read in the usual single voice and the pictures follow the words by their share of the time.
  const speak = async (text: string, spoken: Line[]) => {
    const urls = await Promise.all(spoken.map((l) => voiceFor(l.text, l.who)));
    if (spoken.length && urls.every((u): u is string => !!u)) {
      for (let i = 0; i < spoken.length; i++) {
        setShot(i);
        await play(urls[i]);
      }
      idle();
      return;
    }
    const whole = await voiceFor(text);
    if (!whole) { idle(); return; } // the words stay on screen even when the voice fails
    const total = spoken.reduce((n, l) => n + l.chars, 0);
    await play(whole, (a) => {
      if (!a.duration) return;
      let acc = 0;
      const i = spoken.findIndex((l) => (acc += l.chars) / total > a.currentTime / a.duration);
      setShot(Math.max(0, i === -1 ? spoken.length - 1 : i));
    });
    idle();
  };

  const talk = async (childSays: string, countsAsStar: boolean) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("espaluz-chat", {
        body: { message: childSays, isVoiceInput: true, kids: { history: turns.slice(-10), known: known.current } },
      });
      const text: string = data?.response || "";
      if (error || !text) throw new Error(data?.error || error?.message || "no answer");
      setTurns((t) => [...t, { role: "user", content: childSays }, { role: "assistant", content: text }]);
      setReply(stripShotTags(text));
      if (greetingDone.current) { await greetingDone.current; greetingDone.current = null; setGreeting(false); } // let the hello finish
      const spoken = heroLines(text);
      setLines(spoken);
      setShot(0);
      if (countsAsStar) setStars((s) => s + 1);
      await speak(stripShotTags(text), spoken);
    } catch (e) {
      toast.error("Pere y Titi no pudieron contestar. / Pere and Titi could not answer. Try again!");
      console.error("classroom talk failed", e);
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
        const { data, error } = await supabase.functions.invoke("voice-to-text", { body: { audio: b64 } }); // no language: she mixes ES/EN
        const heard = (data?.text || "").trim();
        if (error || !heard) {
          setBusy(false);
          toast.error("No te escuché bien. / I didn't hear you. Try again!");
          return;
        }
        remember(heard);
        await talk(heard, true);
      };
      recorder.current = r;
      r.start();
      setRecording(true);
      audio.current?.pause();
    } catch {
      toast.error("Necesitamos el micrófono. / We need the microphone.");
    }
  };

  const stopRecording = () => {
    recorder.current?.stop();
    setRecording(false);
  };

  if (!loading && !user) {
    return (
      <div className="min-h-screen bg-cover bg-center flex items-start justify-center p-4 pt-6 md:pt-10" style={{ backgroundImage: "url(/classroom/classroom-cover.jpg)" }}>
        <div className="bg-white/90 rounded-3xl px-8 py-5 max-w-md text-center shadow-xl">
          <h1 className="text-3xl font-bold mb-2">La clase de Pere y Titi</h1>
          <p className="text-lg mb-6">Pere and Titi's classroom. A parent signs in first.</p>
          <Button asChild size="lg"><Link to="/auth?next=/classroom">Entrar / Sign in</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cover bg-center flex flex-col items-center p-4 gap-4" style={{ backgroundImage: "url(/classroom/classroom-c.jpg)" }}>
      <div className="flex items-center gap-1 bg-white/85 rounded-full px-4 py-2 shadow min-h-[44px]" aria-label={`${stars} stars`}>
        {Array.from({ length: Math.max(stars, 1) }).map((_, i) => (
          <Star key={i} className={i < stars ? "w-7 h-7 fill-yellow-400 text-yellow-500" : "w-7 h-7 text-yellow-300"} />
        ))}
      </div>

      <video
        key={greeting ? GREETING_CLIP : `${lines[shot]?.clip ?? IDLE_CLIP}-${shot}`}
        src={greeting ? GREETING_CLIP : lines[shot]?.clip ?? IDLE_CLIP}
        autoPlay
        loop={!greeting}
        muted={!greeting}
        playsInline
        onEnded={() => greetingEnded.current?.()}
        onError={() => greetingEnded.current?.()}
        className="w-full max-w-[520px] aspect-square rounded-[2rem] shadow-2xl border-8 border-white/80 object-cover"
      />

      {reply && (
        <div className="w-full max-w-[640px] bg-white/92 rounded-3xl px-6 py-4 shadow-lg text-lg leading-relaxed whitespace-pre-line">
          {reply}
        </div>
      )}

      {turns.length === 0 ? (
        <Button size="lg" className="rounded-full text-2xl h-20 px-10 shadow-xl" disabled={busy || loading}
          onClick={() => {
            // Pere and Titi say hello at once, in their own voices, while the first lesson line is being written.
            greetingDone.current = new Promise<void>((done) => {
              const finish = () => { greetingEnded.current = null; done(); };
              greetingEnded.current = finish;
              setTimeout(finish, 25000);
            });
            setGreeting(true);
            talk("¡Hola Pere y Titi! Quiero empezar la clase. / Hello Pere and Titi! I want to start the class.", false);
          }}>
          <Play className="w-8 h-8 mr-2" /> ¡Empezar! / Start!
        </Button>
      ) : (
        <button
          onClick={recording ? stopRecording : startRecording}
          disabled={busy && !recording}
          className={`w-32 h-32 rounded-full shadow-2xl flex flex-col items-center justify-center text-white text-lg font-bold transition
            ${recording ? "bg-red-500 animate-pulse" : busy ? "bg-gray-400" : "bg-green-500 hover:bg-green-600"}`}
          aria-label={recording ? "Stop" : "Talk"}
        >
          {recording ? <Square className="w-12 h-12" /> : <Mic className="w-12 h-12" />}
          <span className="mt-1">{recording ? "Listo / Done" : busy ? "…" : "Habla / Talk"}</span>
        </button>
      )}
    </div>
  );
};

export default Classroom;
