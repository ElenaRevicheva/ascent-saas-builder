import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Mic, Square, Star, Play, Camera } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FeatureGate } from "@/components/FeatureGate";
import TracePad from "@/components/kids/TracePad";
import { shrinkPhoto } from "@/lib/shrinkPhoto";
import { ReportReply } from "@/components/ReportReply";
import { keepLine } from "@/lib/roadLessons";

// Pere + Titi's classroom (22 Oct 2026): the dashboard chat's voice loop (voice-to-text -> espaluz-chat -> generate-voice)
// in kids mode, with the heroes' clips as the avatar. 28 Oct 2026 (Elena: the picture must match what the line says, and
// a chain of clips "looks repetitive and simulated"): ONE picture per hero line, named by the tutor as "Pere [shot]: ...",
// else chosen from the lesson words, else that hero's talking clip. The same 25 clips and rules as the EspaLuz Telegram bot.
// 2 Nov 2026 (Elena: "kid, parent, Pere and Titi all together; they recognize when mother is talking and when Alisa is
// talking"): a user turn says who spoke. No voice biometrics - the speaker switch next to Habla decides, honestly.
type Who = "child" | "mama" | "papa";
type Turn = { role: "user" | "assistant"; content: string; who?: Who };
type Line = { who: "pere" | "titi"; clip: string; chars: number; text: string };

const IDLE_CLIP = "/heroes/duo-hello.mp4";
const DANCE_CLIP = "/heroes/titi-dance.mp4"; // every 5 stars Titi dances for the child (30 Oct 2026)
const today = () => new Date().toISOString().slice(0, 10);
const PARENT: Record<Exclude<Who, "child">, { e: string; name: string }> = { mama: { e: "👩", name: "Mamá" }, papa: { e: "👨", name: "Papá" } };
// 31 Oct 2026 (Elena: "stars and stickers, like Buddy"): every 5 stars earn the next sticker of Panama, named in both
// languages, so the reward is also two new words. Derived from the star count, so nothing extra is stored.
const STICKERS: { e: string; es: string; en: string }[] = [
  { e: "🦥", es: "el perezoso", en: "the sloth" }, { e: "🐒", es: "el mono tití", en: "the tamarin monkey" },
  { e: "🦜", es: "el tucán", en: "the toucan" }, { e: "🐸", es: "la rana dorada", en: "the golden frog" },
  { e: "🐢", es: "la tortuga marina", en: "the sea turtle" }, { e: "🦅", es: "el águila harpía", en: "the harpy eagle" },
  { e: "🚢", es: "el barco del Canal", en: "the Canal ship" }, { e: "🏖️", es: "la playa", en: "the beach" },
  { e: "🥭", es: "el mango", en: "the mango" }, { e: "🌺", es: "la flor", en: "the flower" },
  { e: "🦋", es: "la mariposa", en: "the butterfly" }, { e: "🐬", es: "el delfín", en: "the dolphin" },
  { e: "🌈", es: "el arcoíris", en: "the rainbow" }, { e: "🍍", es: "la piña", en: "the pineapple" },
  { e: "🐋", es: "la ballena", en: "the whale" }, { e: "🌋", es: "el volcán Barú", en: "the Barú volcano" },
];
const stickerFor = (n: number) => STICKERS[(n - 1) % STICKERS.length]; // n = 1st, 2nd... sticker

// "open-wave" = only the wide shot: she waves with Pere and Titi, no words (Elena, 7 Nov: sometimes her face, sometimes this).
const WELCOME_BACK = ["open-wave", "open-back", "open-wave", "open-back-2", "open-back-3", "open-back-4"];
// 6 Nov 2026 (Elena: "mentora amiga", never noisy): EspaLuz in pre-made clips, wide scene with Pere and Titi cutting to an
// exact-lips close-up. She opens and closes the lesson, suggests one feature at most, and calms a child who says she is
// upset. No child's name is in any clip, nothing is generated live, and one tap on Habla silences her.
const TIPS = ["paint", "photo", "trace", "program"] as const;
// Twin of KIDS_QUIET in espaluz-chat: a child who asked for less talk gets no extra visit.
const ASKED_QUIET = /(paro|parar|paren|para|paran) de hablar|no hablen|que no hable|hablan? (mucho|tanto|demasiado)|c[aá]llate|c[aá]llense|silencio|stop talking|be quiet|talk(ing)? too much/i;
const UPSET = /\b(estoy|me siento)\s+(muy\s+)?(triste|enojad[oa]|enfadad[oa]|brav[oa]|molest[oa]|asustad[oa])\b|\btengo\s+(mucho\s+)?miedo\b|\b(quiero llorar|estoy llorando)\b|\bi(?:'?m| am| feel)\s+(so |very |really )?(sad|upset|angry|mad|scared|afraid)\b|\bi want to cry\b/i;
// A possible real harm never gets a soothing clip: it stays with the lesson brain and needs its own parent alert.
const HURT = /me (pega|peg[oó]|golpe|hace daño|hizo daño|lastim|toca|toc[oó])|me duele|no quiero vivir|quiero morir|hits? me|hurts? me|touched me|want to die/i;
// 6 Nov 2026 (Elena: "when the kid is not very glad with Pere and Titi... she may come in and do something about the
// friendship again, reconnects everybody"; "annoyed... wants to quit... sad, annoyed, bored"). Built from Alisa's real words:
// "no quiero escuchar", "no paran de hablar", "que no hablen".
const WANTS_TO_QUIT = /\b(quiero (parar|salir|irme|terminar|acabar|dejar)|me quiero ir|ya no quiero|no quiero (seguir|jugar|estudiar|m[aá]s|la clase|continuar)|i want to (stop|quit|leave|go)|i don'?t want to (play|continue|do this)|no more)\b/i;
const ANNOYED = /(paro|parar|paren|para|paran) de hablar|no hablen|que no hable|hablan? (mucho|tanto|demasiado)|c[aá]llate|c[aá]llense|no quiero (escuchar|hablar)|me (molesta|molestan|fastidia|fastidian)|\b(basta|pesad[oa]s?|stop talking|be quiet|talk(ing)? too much|annoying|you'?re annoying|leave me alone)\b/i;
const BORED = /aburr|\b(bored|boring)\b/i;
const reactionClip = (said: string): string | null => {
  if (HURT.test(said)) return null;
  if (WANTS_TO_QUIT.test(said)) return "quit";
  if (ANNOYED.test(said)) return "annoyed";
  if (BORED.test(said)) return "bored";
  if (UPSET.test(said)) return Math.random() < 0.5 ? "calm-1" : "calm-2";
  return null;
};
const SAYS_BYE = /\[\s*goodbye\s*\]|adi[oó]s|hasta (luego|mañana|pronto)|\bgoodbye\b|\bsee you\b/i;

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
// 30 Oct 2026 (Elena: "are you sure images are rotated? we have 25"): the twin swap fired only on back-to-back repeats
// (bot log: 14 of 25 clips in 34 lines, two clips 9x each). Now a clip seen in the last 6 gives way to the least-recently
// seen look-alike that fits the same kind of line (own hero or both). Same table as the bot's HERO_SHOT_FAMILY.
const SHOT_FAMILY: Record<string, string[]> = {
  "pere-hello": ["duo-hello", "pere-talking-1", "pere-talking-2"], "duo-hello": ["pere-hello", "duo-highfive"],
  "titi-cheer": ["titi-cheer-2", "titi-dance", "titi-silly"], "titi-cheer-2": ["titi-cheer", "titi-dance", "titi-silly"],
  "pere-clap": ["duo-highfive", "pere-talking-2"], "duo-highfive": ["pere-clap", "titi-cheer-2"],
  "pere-talking-1": ["pere-talking-2", "pere-thinking", "pere-listening"], "pere-talking-2": ["pere-talking-1", "pere-thinking", "pere-listening"],
  "titi-talking-1": ["titi-talking-2", "titi-listening", "titi-silly"], "titi-talking-2": ["titi-talking-1", "titi-listening", "titi-silly"],
  "pere-listening": ["pere-thinking", "pere-talking-2"], "pere-thinking": ["pere-listening", "pere-talking-1"],
  "titi-listening": ["titi-talking-1", "titi-talking-2"],
  "titi-crosscrawl": ["titi-counting-jumps", "titi-dance", "titi-freeze"], "titi-dance": ["titi-crosscrawl", "titi-cheer-2"],
  "titi-counting-jumps": ["titi-crosscrawl"], "pere-counting": ["pere-thinking"],
  "titi-silly": ["titi-oops", "titi-cheer"], "titi-oops": ["titi-silly"], "titi-freeze": ["titi-crosscrawl"],
  "pere-breathing": ["pere-sleepy"], "pere-sleepy": ["pere-breathing"], "duo-peekaboo": ["titi-silly"],
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
  const age = new Map<string, number>();
  recent.forEach((n, i) => age.set(n, recent.length - 1 - i)); // 0 = most recent; a clip played twice keeps its newest age
  if (name && SHOT_FAMILY[name] && (age.get(name) ?? 1e6) < 6) {
    name = [name, ...SHOT_FAMILY[name]].reduce((best, c) => ((age.get(c) ?? 1e6) > (age.get(best) ?? 1e6) ? c : best));
  }
  if (!name) {
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
    const prev = raw[raw.length - 1];
    // 30 Oct 2026: "Pere: es" then "Pere: en" on the next line is ONE sentence pair, not two turns (8 lines -> 8 voice
    // requests at once -> Replicate throttled every one -> silence). Join it to the line it translates.
    if (m && prev && prev.who === m[1].toLowerCase() && !prev.text.includes(" / ")) prev.text += " / " + m[3].trim();
    else if (m) raw.push({ who: m[1].toLowerCase() as "pere" | "titi", shot: m[2]?.toLowerCase().trim() || null, text: m[3] });
    else if (raw.length && line.trim()) raw[raw.length - 1].text += " " + line.trim();
  }
  if (!raw.length) raw.push({ who: "pere", shot: null, text });
  return raw.map((r, i) => ({ who: r.who, clip: pickClip(r.who, r.text, r.shot, i === 0, i === raw.length - 1), chars: Math.max(r.text.length, 1), text: r.text }));
}

/** The tag is for the picture only; the child reads "Pere: ...". */
const stripShotTags = (text: string) => text.replace(/\b(pere|titi)\s*\[[^\]\n]*\]\s*:/gi, "$1:");

/** A round, chunky face made for children's reading (loaded in index.html); system fonts if it is blocked. */
const KID_FONT = '"Baloo 2", "Nunito", ui-rounded, "Segoe UI", system-ui, sans-serif';

type Bubble = { who: "pere" | "titi" | "ask"; es: string; en: string };

/** The reply as speech bubbles: "Pere: es / en" -> Pere's bubble; an unnamed question -> the yellow question card. */
function bubbles(reply: string): Bubble[] {
  const out: Bubble[] = [];
  let last: Bubble["who"] = "pere";
  for (const raw of reply.split("\n")) {
    const line = raw.replace(/\*\*/g, "").trim();
    if (!line || /^\[VIDEO SCRIPT/i.test(line)) continue;
    const m = line.match(/^(pere|titi)\s*:\s*(.*)$/i);
    const who: Bubble["who"] = m ? (m[1].toLowerCase() as "pere" | "titi") : line.includes("?") ? "ask" : last;
    const body = m ? m[2] : line;
    const cut = body.indexOf(" / ");
    const es = (cut >= 0 ? body.slice(0, cut) : body).trim();
    const en = cut >= 0 ? body.slice(cut + 3).trim() : "";
    if (!es) continue;
    const prev = out[out.length - 1];
    if (m && prev && prev.who === who && !prev.en && cut < 0) { prev.en = es; continue; } // "Pere: es" + "Pere: en" = one bubble
    if (!m && prev && prev.who === who && who !== "ask") { prev.es += ` ${es}`; prev.en = [prev.en, en].filter(Boolean).join(" "); continue; }
    out.push({ who, es, en });
    if (who !== "ask") last = who;
  }
  return out;
}

/** The free fallback voice (30 Oct 2026): the browser's own speech, Spanish half in a Spanish voice, English half in an
 *  English one; Pere low and slow, Titi high and quick. Used only when the hero voice could not be made. */
// 1 Nov 2026 (Elena: "go free" - the Replicate hero voices cost ~$0.40-0.80 a lesson): the free voice is now the
// default, so it picks the device's best voice instead of its first one: a Latin American Spanish voice for Panama
// (es-US / es-MX / es-419, then any es), and the most natural-sounding engine the device has (Google, Neural,
// Natural, Enhanced, Premium). Nothing leaves the device.
const NICE_VOICE = /google|neural|natural|enhanced|premium|siri/i;
function pickVoice(lang: "es" | "en"): SpeechSynthesisVoice | undefined {
  const all = typeof window !== "undefined" ? window.speechSynthesis?.getVoices() ?? [] : [];
  const prefer = lang === "es" ? ["es-US", "es-MX", "es-419", "es-PA", "es-CO", "es-ES"] : ["en-US", "en-GB"];
  const ofLang = all.filter((v) => v.lang.replace("_", "-").toLowerCase().startsWith(lang));
  const rank = (v: SpeechSynthesisVoice) => {
    const at = prefer.findIndex((p) => v.lang.replace("_", "-").toLowerCase() === p.toLowerCase());
    return (NICE_VOICE.test(v.name) ? 0 : 100) + (at < 0 ? prefer.length : at) + (v.localService ? 0 : 1);
  };
  return [...ofLang].sort((a, b) => rank(a) - rank(b))[0];
}
// Some browsers (Chrome on Android) list their voices only after a moment.
if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.getVoices();

function browserSay(text: string, who: "pere" | "titi"): Promise<void> {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
  if (!synth) return Promise.resolve();
  const parts = text.split(" / ").map((p) => p.trim()).filter(Boolean);
  return new Promise<void>((done) => {
    synth.cancel();
    let left = parts.length;
    if (!left) return done();
    const safety = setTimeout(done, 30000);
    parts.forEach((p, i) => {
      const u = new SpeechSynthesisUtterance(p);
      const es = i === 0 && parts.length > 1 ? true : /[¿¡ñáéíóú]/i.test(p);
      const v = pickVoice(es ? "es" : "en");
      u.lang = v?.lang ?? (es ? "es-US" : "en-US");
      if (v) u.voice = v;
      u.rate = who === "pere" ? 0.85 : 1.05;
      u.pitch = who === "pere" ? 0.8 : 1.5;
      u.onend = u.onerror = () => { if (--left === 0) { clearTimeout(safety); done(); } };
      synth.speak(u);
    });
  });
}

function toAudioUrl(base64: string, mimeType = "audio/mpeg"): string {
  const bin = atob(base64.replace(/^data:audio\/[^;]+;base64,/, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: mimeType })); // 1 Nov 2026: the free Gemini voice is WAV
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
  const [reward, setReward] = useState(0); // >0 = Titi's star dance on screen (the star count it celebrates)
  const [photo, setPhoto] = useState<string | null>(null); // the photo she is showing, on screen for that turn only
  const photoInput = useRef<HTMLInputElement | null>(null);
  const galleryInput = useRef<HTMLInputElement | null>(null);
  const mission = useRef<{ text: string; day: string } | null>(null); // last lesson's mission, asked about the next day
  const greetingDone = useRef<Promise<void> | null>(null);
  const greetingEnded = useRef<(() => void) | null>(null);
  const known = useRef<string[]>([]); // whole sentences the child said in earlier lessons (this browser) - the words come back and grow
  // 2 Nov 2026: who talks next (child by default; stays until switched), the child's name from the family on this
  // account (else "Peque"), and the last thing someone said, shown as a bubble with that person's face.
  const [who, setWho] = useState<Who>("child");
  const [childName, setChildName] = useState("Peque");
  const [said, setSaid] = useState<{ who: Who; text: string } | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    supabase.from("family_members").select("name, role, age").eq("user_id", user.id).eq("is_active", true)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        const kid = (data ?? []).find((m) => m.role === "child" || (typeof m.age === "number" && m.age <= 12));
        if (kid?.name?.trim()) setChildName(kid.name.trim().split(/\s+/)[0]);
      });
  }, [user?.id]);
  const nameOf = (w: Who) => (w === "child" ? childName : PARENT[w].name);
  // 31 Oct 2026 (Elena: "every time I press Empezar, Pere explains again that he speaks despacito"): the recorded
  // introduction plays only for a child who has never had a lesson on this account (any device). After that the class
  // opens with the heroes' short hello, which brings back something she told them last time.
  // 9 Nov 2026 (Elena: "obtain the explicit 'I'm the parent and I agree' tick before the first lesson"; Google Play Families
  // policy + COPPA/GDPR for a child's words and voice): one note in the family notebook (learning_sessions, event
  // parent_consent), read once per visit. null = still reading; no note = the parent screen comes before any lesson.
  const [consent, setConsent] = useState<boolean | null>(null);
  const [consentTicked, setConsentTicked] = useState(false);
  useEffect(() => {
    if (!user?.id) return;
    supabase.from("learning_sessions").select("id").eq("user_id", user.id).eq("session_type", "analytics")
      .eq("content->>event", "parent_consent").limit(1)
      .then(({ data, error }) => setConsent(error ? false : (data ?? []).length > 0));
  }, [user?.id]);
  const giveConsent = async () => {
    if (!user?.id || !consentTicked) return;
    const { error } = await supabase.from("learning_sessions").insert({ user_id: user.id, session_type: "analytics", source: "web",
      content: { event: "parent_consent", version: "2026-11-09", agreed_at: new Date().toISOString() } });
    if (error) { toast.error("No se pudo guardar. Inténtalo otra vez. / Could not save. Please try again."); return; }
    setConsent(true);
  };
  const [metBefore, setMetBefore] = useState(false);
  useEffect(() => {
    if (!user?.id) return;
    supabase.from("learning_sessions").select("id").eq("user_id", user.id).eq("session_type", "classroom").limit(1)
      .then(({ data }) => setMetBefore(Boolean(data?.length)));
  }, [user?.id]);
  const [mentora, setMentora] = useState<string | null>(null); // the EspaLuz clip on screen, with sound
  const mentoraEnded = useRef<(() => void) | null>(null);
  const screen = useRef<HTMLVideoElement | null>(null);
  const skipHeroes = useRef(false); // Habla during her clip: she stops and the heroes do not start talking over the child
  const visits = useRef({ tip: false, close: false, reactions: new Set<string>() });
  const usedFeatures = useRef<Set<string>>(new Set());
  const padOpen = useRef(false);
  // 7 Nov 2026 (Elena: the same "Titi asked about you five times" at every Start is annoying; she should be a surprise
  // and a motivation): a welcome-back clip at most once a day, on about half of the days, never the same line twice in a
  // row. The first-ever hello is unchanged.
  const openingClip = (): string | null => {
    if (!metBefore) return "open-first";
    const key = `classroom-mentora-open-${user?.id}`;
    const today = new Date().toDateString();
    let last: { day?: string; clip?: string } = {};
    try { last = JSON.parse(localStorage.getItem(key) ?? "{}") ?? {}; } catch { /* old value or blocked storage */ }
    if (last.day === today) return null;
    const choices = WELCOME_BACK.filter((c) => c !== last.clip);
    const clip = Math.random() < 0.5 ? choices[Math.floor(Math.random() * choices.length)] : null;
    try { localStorage.setItem(key, JSON.stringify({ day: today, clip: clip ?? last.clip })); } catch { /* ignore */ }
    return clip;
  };
  const mentoraSay = (clip: string) => new Promise<void>((done) => {
    const finish = () => { clearTimeout(safety); mentoraEnded.current = null; setMentora(null); done(); };
    const safety = setTimeout(finish, 30000);
    mentoraEnded.current = finish;
    setMentora(clip);
  });
  // A browser that refuses sound without a fresh tap skips the clip: the lesson never waits for it.
  useEffect(() => {
    if (!mentora && !greeting) return;
    // 6 Nov 2026: a clip plays on the device, so the server cannot see it. One row with the clip's name, never the child's words.
    const logClip = (outcome: string) => {
      if (mentora && user?.id) supabase.from("learning_sessions").insert({ user_id: user.id, session_type: "analytics", source: "web",
        content: { event: "classroom_clip", clip: mentora, outcome } }).then(({ error }) => { if (error) console.error("clip log", error.message); });
    };
    screen.current?.play().then(() => logClip("played")).catch(() => { logClip("skipped"); (mentoraEnded.current ?? greetingEnded.current)?.(); });
  }, [mentora, greeting]);
  const nextTip = () => {
    const key = `classroom-mentora-tip-${user?.id}`;
    let last = -1;
    try { last = parseInt(localStorage.getItem(key) ?? "-1", 10); } catch { /* blocked storage starts from the first tip */ }
    for (let i = 1; i <= TIPS.length; i++) {
      const at = (last + i) % TIPS.length;
      const tip = TIPS[at];
      if (usedFeatures.current.has(tip) || (tip === "trace" && !(classMode.current && traceTargets.length))) continue;
      try { localStorage.setItem(key, String(at)); } catch { /* ignore */ }
      return tip;
    }
    return null;
  };
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => { audio.current?.pause(); }, []);

  // Stars and known sentences survive a reload (Buddy.ai keeps the child's progress; 30 Oct 2026). Per parent account, this browser.
  useEffect(() => {
    if (!user?.id) return;
    // 31 Oct 2026: stars were kept per browser, so the tablet and the laptop showed different counts. Every answer she
    // gives is a saved classroom turn; the stars are those turns (the "start" button is not one), on any device.
    supabase.from("learning_sessions").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).eq("session_type", "classroom")
      .not("content->>user_message", "ilike", "%quiero empezar la clase%")
      .or("content->>speaker.is.null,content->>speaker.neq.parent") // 2 Nov 2026: a parent's turn earns no star
      .then(({ count, error }) => { if (!error && typeof count === "number") setStars((s) => Math.max(s, count)); });
    try {
      setStars((s) => Math.max(s, parseInt(localStorage.getItem(`classroom-stars-${user.id}`) ?? "0", 10) || 0));
      const k = JSON.parse(localStorage.getItem(`classroom-known-${user.id}`) ?? "[]");
      known.current = Array.isArray(k) ? k.filter((x) => typeof x === "string").slice(-20) : [];
      const m = JSON.parse(localStorage.getItem(`classroom-mission-${user.id}`) ?? "null");
      mission.current = m && typeof m.text === "string" ? m : null;
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
    return error || !b64 ? null : toAudioUrl(b64, data?.mimeType || "audio/mpeg");
  };

  const play = (url: string, onTime?: (a: HTMLAudioElement) => void) =>
    new Promise<void>((done) => {
      audio.current?.pause();
      const a = new Audio(url);
      audio.current = a;
      if (onTime) a.ontimeupdate = () => onTime(a);
      a.onended = () => done();
      a.onpause = () => done(); // she pressed Habla while a hero was speaking
      a.onerror = () => done();
      a.play().catch(() => done());
    });

  // 28 Oct 2026: Pere and Titi speak their own lines in their own voices (the Telegram bot's MiniMax voices, via
  // generate-voice `hero`), the picture of each line on screen while it is said. If any line has no hero voice,
  // the whole reply is read in the usual single voice and the pictures follow the words by their share of the time.
  // 30 Oct 2026: one voice request at a time, the next fetched while this line plays. Replicate allows a burst of 1
  // while its balance is under $5, and the old Promise.all sent every line at once -> all throttled -> OpenAI (no
  // credits) -> silence. A line without a hero voice is read by the browser's own free voice, so the child always hears it.
  // 1 Nov 2026 (Alisa's first tracing test: "they do not give her a chance to speak"): Habla works while the heroes
  // talk - one tap silences them and she speaks.
  const hush = useRef(false);
  const [speaking, setSpeaking] = useState(false);
  const roadId = useRef(`es-${Date.now()}`); // 13 Nov 2026 car mode: this lesson's lines travel to /road (lib/roadLessons)
  const speak = async (_text: string, spoken: Line[]) => {
    hush.current = false;
    setSpeaking(true);
    let next = spoken.length ? voiceFor(spoken[0].text, spoken[0].who) : null;
    for (let i = 0; i < spoken.length; i++) {
      const url = await next;
      if (hush.current) break;
      next = i + 1 < spoken.length ? voiceFor(spoken[i + 1].text, spoken[i + 1].who) : null;
      setShot(i);
      void keepLine(roadId.current, "es", { text: spoken[i].text, who: spoken[i].who }, url);
      if (url) await play(url);
      else await browserSay(spoken[i].text, spoken[i].who);
      if (hush.current) break;
    }
    setSpeaking(false);
    idle();
  };

  /** The goodbye's mission is kept for the next lesson's hello; once asked about, it is cleared. */
  const saveMission = (text: string, firstTurn: boolean) => {
    if (!user?.id) return;
    let m = mission.current;
    if (firstTurn && m && m.day !== today()) m = null;
    const line = text.split("\n").find((l) => /misi[oó]n|mission/i.test(l));
    if (line) {
      const q = line.match(/["“«]([^"”»]{5,120})["”»]/);
      m = { text: (q ? q[1] : stripShotTags(line).replace(/^.*?:\s*/, "")).slice(0, 160), day: today() };
    }
    mission.current = m;
    try { localStorage.setItem(`classroom-mission-${user.id}`, JSON.stringify(m)); } catch { /* ignore */ }
  };

  /** Every 5 stars: Titi's dance clip fills the screen and both heroes cheer (the reward is a hero moment, not a number). */
  const celebrate = async (n: number) => {
    setReward(n);
    const s = stickerFor(Math.floor(n / 5));
    await Promise.all([
      browserSay(`¡${n} estrellas! Tu nuevo sticker: ${s.es}. / ${n} stars! Your new sticker: ${s.en}.`, "titi"),
      new Promise((r) => setTimeout(r, 5500)),
    ]);
    setReward(0);
  };

  // 1 Nov 2026 (Elena: "also classes, like regular kids of 6-7"): "¡Clase!" runs the first-grade class path (the kids
  // brain's CLASS mode); "¡Empezar!" stays the free conversation.
  const classMode = useRef(false);
  // 1 Nov 2026: in a class the brain sends the unit's letters / syllables / words to trace on the tablet pad.
  const [traceTargets, setTraceTargets] = useState<string[]>([]);
  // 2 Nov 2026 (Elena: "Alisa wants to paint little paintings"): the same pad opens on tracing or on 🎨 painting.
  const [pad, setPad] = useState<null | "trace" | "paint">(null);
  useEffect(() => {
    padOpen.current = pad !== null;
    if (pad) usedFeatures.current.add(pad === "paint" ? "paint" : "trace");
  }, [pad]);

  const talk = async (childSays: string, countsAsStar: boolean, image?: string, speaker: Who = "child") => {
    setBusy(true);
    if (!image) setPhoto(null);
    const parent = speaker !== "child";
    if (!/quiero empezar la clase/i.test(childSays)) setSaid({ who: speaker, text: childSays });
    try {
      const { data, error } = await supabase.functions.invoke("espaluz-chat", {
        // 30 Oct 2026: the lesson step comes from the turn count (no guessing, no re-greeting); yesterday's mission is
        // asked about in today's hello.
        // 2 Nov 2026: the history goes as plain {role, content}; who said each turn rides beside it (`speakers`), and
        // the lesson step counts only the child's turns - a parent's comment does not move the lesson on.
        body: { message: childSays, isVoiceInput: true, kids: {
          history: turns.slice(-10).map(({ role, content }) => ({ role, content })), known: known.current, image,
          turn: turns.filter((t) => t.role === "user" && (t.who ?? "child") === "child").length,
          speaker: parent ? "parent" : "child", speaker_name: nameOf(speaker), child_name: childName,
          speakers: turns.slice(-10).map((t) => (t.role === "user"
            ? { speaker: (t.who ?? "child") === "child" ? "child" : "parent", name: nameOf(t.who ?? "child") } : null)),
          mission: turns.length === 0 && mission.current && mission.current.day !== today() ? mission.current.text : undefined,
          ...(classMode.current ? { mode: "class" } : {}),
        } },
      });
      const text: string = data?.response || "";
      if (error || !text) throw new Error(data?.error || error?.message || "no answer");
      // A photo turn comes back as "📷 (foto: ...)", so the next turns still know what she showed.
      const heard: string = typeof data?.userMessage === "string" && data.userMessage ? data.userMessage : childSays;
      if (heard !== childSays) setSaid({ who: speaker, text: heard });
      setTurns((t) => [...t, { role: "user", content: heard, who: speaker }, { role: "assistant", content: text }]);
      if (classMode.current && Array.isArray(data?.trace) && data.trace.length) setTraceTargets(data.trace);
      setReply(stripShotTags(text));
      if (greetingDone.current) { await greetingDone.current; greetingDone.current = null; setGreeting(false); } // let the hello finish
      const spoken = heroLines(text);
      setLines(spoken);
      setShot(0);
      if (countsAsStar && !parent) setStars((s) => s + 1);
      saveMission(text, turns.length === 0);
      const askedQuiet = [...turns.filter((t) => t.role === "user").map((t) => t.content), heard].some((w) => ASKED_QUIET.test(w));
      // She comes when the child is annoyed, bored, sad or wants to stop: each feeling once a lesson, two visits at most.
      const reaction = parent ? null : reactionClip(heard);
      const kind = reaction?.replace(/-\d$/, "");
      if (reaction && kind && !visits.current.reactions.has(kind) && (visits.current.reactions.size < 2 || kind === "quit")) {
        visits.current.reactions.add(kind);
        if (kind === "quit") visits.current.close = true; // her goodbye is already in this clip
        await mentoraSay(reaction);
      }
      if (skipHeroes.current) { skipHeroes.current = false; return; }
      await speak(stripShotTags(text), spoken);
      if (countsAsStar && !parent && (stars + 1) % 5 === 0 && !hush.current) await celebrate(stars + 1);
      const childTurns = turns.filter((t) => t.role === "user" && (t.who ?? "child") === "child").length + (parent ? 0 : 1);
      if (!hush.current && !askedQuiet) {
        if (!visits.current.close && childTurns >= 2 && SAYS_BYE.test(text)) {
          visits.current.close = true;
          await mentoraSay("close");
        } else if (!parent && !image && !padOpen.current && !visits.current.tip && childTurns >= 4 && !reaction && !HURT.test(heard) && visits.current.reactions.size === 0) {
          const tip = nextTip();
          visits.current.tip = true;
          if (tip) await mentoraSay(tip);
        }
        skipHeroes.current = false;
      }
    } catch (e) {
      toast.error("Pere y Titi no pudieron contestar. / Pere and Titi could not answer. Try again!");
      console.error("classroom talk failed", e);
    } finally {
      setBusy(false);
    }
  };

  const startRecording = async () => {
    const speaker = who; // the switch at the moment Habla is pressed names this turn's speaker
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
        // No language: she mixes ES/EN. `speaker` (2 Nov 2026): a parent's turn gets an adult hint, not "a 6-year-old girl".
        const { data, error } = await supabase.functions.invoke("voice-to-text", {
          body: { audio: b64, speaker: speaker === "child" ? "child" : "parent" } });
        const heard = (data?.text || "").trim();
        // 4 Nov 2026: every listening service is out - say so, with when to come back, instead of blaming the child.
        if (data?.unavailable) {
          setBusy(false);
          toast.error(data.message || "Pere y Titi están descansando. / Pere and Titi are resting.", { duration: 15000 });
          return;
        }
        if (error || !heard) {
          setBusy(false);
          toast.error("No te escuché bien. / I didn't hear you. Try again!");
          return;
        }
        if (speaker === "child") remember(heard); // a parent's words never become the child's known sentences
        await talk(heard, speaker === "child", undefined, speaker);
      };
      recorder.current = r;
      r.start();
      setRecording(true);
      hush.current = true;
      audio.current?.pause();
      window.speechSynthesis?.cancel();
      if (mentoraEnded.current) { skipHeroes.current = true; mentoraEnded.current(); }
    } catch {
      toast.error("Necesitamos el micrófono. / We need the microphone.");
    }
  };

  const stopRecording = () => {
    recorder.current?.stop();
    setRecording(false);
  };

  const showPhoto = async (file: File | undefined) => {
    if (!file) return;
    try {
      const { b64, url } = await shrinkPhoto(file);
      setPhoto(url);
      usedFeatures.current.add("photo");
      await talk("📷 ¡Mira mi foto! / Look at my photo!", true, b64);
    } catch {
      toast.error("No pude abrir la foto. / I could not open the photo.");
    } finally {
      if (photoInput.current) photoInput.current.value = "";
      if (galleryInput.current) galleryInput.current.value = "";
    }
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

  // Nothing of the classroom shows (so nothing can be said or sent) until the parent note has been read.
  if (user && consent === null) {
    return <div className="min-h-screen bg-cover bg-center" style={{ backgroundImage: "url(/classroom/classroom-cover.jpg)" }} />;
  }
  if (user && consent === false) {
    return (
      <div className="min-h-screen bg-cover bg-center flex items-start justify-center p-4 pt-6 md:pt-10" style={{ backgroundImage: "url(/classroom/classroom-cover.jpg)" }}>
        <div className="bg-white/95 rounded-3xl px-6 py-5 max-w-lg shadow-xl space-y-3 text-slate-800">
          <h1 className="text-2xl font-bold text-center">Antes de la primera clase · Before the first lesson</h1>
          <p className="text-sm font-semibold text-center">Para mamá o papá · For the parent</p>
          <p className="text-sm">La clase de Pere y Titi es para niños con un adulto cerca. Lo que tu hijo dice, dibuja o muestra en una foto
            se envía a servicios de IA para crear las respuestas de Pere y Titi, y se guarda para que lo veas en tu informe.</p>
          <p className="text-sm">Pere and Titi's classroom is for children with a grown-up nearby. What your child says, draws or shows in a photo
            is sent to AI services to make Pere and Titi's replies, and kept so you can see the lesson in your report.</p>
          <p className="text-sm">Sin anuncios, sin perfil público, nadie más lo ve. Puedes pedir verlo o borrarlo cuando quieras. ·
            No ads, no public profile, nobody else sees it. You can ask to see or delete it at any time:{" "}
            <a className="underline" href="mailto:aipa@aideazz.xyz">aipa@aideazz.xyz</a> ·{" "}
            <Link className="underline" to="/privacy-policy">Privacidad / Privacy</Link></p>
          <label className="flex items-start gap-3 rounded-xl border border-slate-300 bg-white p-3 cursor-pointer">
            <input type="checkbox" className="mt-1 h-5 w-5" checked={consentTicked} onChange={(e) => setConsentTicked(e.target.checked)} />
            <span className="text-sm font-semibold">Soy la madre, el padre o el tutor de este niño y estoy de acuerdo. ·
              I am this child's parent or guardian and I agree.</span>
          </label>
          <Button size="lg" className="w-full" disabled={!consentTicked} onClick={giveConsent}>Empezar la clase / Start the classroom</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cover bg-center flex flex-col items-center p-4 gap-4" style={{ backgroundImage: "url(/classroom/classroom-c.jpg)" }}>
      <div className="flex flex-wrap items-center justify-center gap-2 bg-white/85 rounded-full px-4 py-2 shadow min-h-[44px] max-w-full"
        aria-label={`${stars} stars, ${Math.floor(stars / 5)} stickers`} style={{ fontFamily: KID_FONT }}>
        <Star className="w-7 h-7 fill-yellow-400 text-yellow-500" />
        <span className="text-2xl font-extrabold text-slate-900">{stars}</span>
        {Math.floor(stars / 5) > 0 && <span className="mx-1 h-7 w-px bg-slate-300" />}
        {Array.from({ length: Math.floor(stars / 5) }, (_, i) => i + 1).slice(-10).map((n) => (
          <span key={n} title={`${stickerFor(n).es} / ${stickerFor(n).en}`} className="text-3xl leading-none">{stickerFor(n).e}</span>
        ))}
        {Math.floor(stars / 5) > 10 && <span className="text-lg font-bold text-slate-600">+{Math.floor(stars / 5) - 10}</span>}
      </div>

      <video
        ref={screen}
        key={mentora ? `mentora-${mentora}` : reward ? `dance-${reward}` : greeting ? GREETING_CLIP : `${lines[shot]?.clip ?? IDLE_CLIP}-${shot}`}
        src={mentora ? `/mentora/${mentora}.mp4` : reward ? DANCE_CLIP : greeting ? GREETING_CLIP : lines[shot]?.clip ?? IDLE_CLIP}
        autoPlay
        loop={!greeting && !mentora}
        muted={!greeting && !mentora}
        playsInline
        onEnded={() => (mentoraEnded.current ?? greetingEnded.current)?.()}
        onError={() => (mentoraEnded.current ?? greetingEnded.current)?.()}
        className={`w-full rounded-[2rem] shadow-2xl border-8 border-white/80 object-cover ${mentora ? "max-w-[720px] aspect-[1088/704]" : "max-w-[520px] aspect-square"}`}
      />

      {reward > 0 && (
        <div className="rounded-full bg-yellow-300 border-4 border-white shadow-2xl px-8 py-3 text-2xl font-extrabold text-slate-900 animate-bounce"
          style={{ fontFamily: KID_FONT }}>
          🌟 ¡{reward} estrellas! Nuevo sticker: <span className="text-4xl align-middle">{stickerFor(Math.floor(reward / 5)).e}</span>{" "}
          {stickerFor(Math.floor(reward / 5)).es} / {stickerFor(Math.floor(reward / 5)).en}
        </div>
      )}

      {photo && (
        <img src={photo} alt="La foto de la niña / The child's photo"
          className="max-h-48 max-w-[80%] rounded-2xl border-4 border-white shadow-xl object-contain" />
      )}

      {said && (
        // 2 Nov 2026: what was just said, with the face and name of who said it (the child, Mamá or Papá).
        <div className="w-full max-w-[680px] flex items-start gap-3 justify-center" style={{ fontFamily: KID_FONT }}>
          <div className={`shrink-0 w-14 h-14 rounded-full grid place-items-center text-3xl shadow-lg border-4 border-white
            ${said.who === "child" ? "bg-pink-400" : said.who === "mama" ? "bg-violet-400" : "bg-sky-500"}`}>
            {said.who === "child" ? "👧" : PARENT[said.who].e}
          </div>
          <div className={`rounded-[1.75rem] px-5 py-3 shadow-xl border-4 border-white max-w-[85%]
            ${said.who === "child" ? "bg-pink-100" : said.who === "mama" ? "bg-violet-100" : "bg-sky-100"}`}>
            <div className={`text-sm font-extrabold uppercase tracking-wide
              ${said.who === "child" ? "text-pink-600" : said.who === "mama" ? "text-violet-700" : "text-sky-700"}`}>{nameOf(said.who)}</div>
            <div className="text-xl font-bold leading-snug text-slate-900">{said.text}</div>
          </div>
        </div>
      )}

      {reply && (
        // 30 Oct 2026 (Elena: "words are black and not visible, not juicy for kids"): `bg-white/92` is not a Tailwind
        // step, so the box had NO background. Now each hero speaks in his own colour bubble, Spanish big, English under it.
        <div className="w-full max-w-[680px] flex flex-col gap-3" style={{ fontFamily: KID_FONT }}>
          {bubbles(reply).map((b, i) => {
            const now = lines[shot]?.who === b.who && lines[shot]?.text.includes(b.es.slice(0, 12));
            return (
              <div key={i} className={`flex items-start gap-3 ${b.who === "titi" ? "flex-row-reverse text-right" : ""}`}>
                {b.who !== "ask" && (
                  <div className={`shrink-0 w-14 h-14 rounded-full grid place-items-center text-3xl shadow-lg border-4 border-white
                    ${b.who === "titi" ? "bg-orange-400" : "bg-lime-500"}`}>{b.who === "titi" ? "🐒" : "🦥"}</div>
                )}
                <div className={`flex-1 rounded-[1.75rem] px-5 py-3 shadow-xl border-4 border-white transition-transform duration-300
                  ${b.who === "titi" ? "bg-orange-100" : b.who === "ask" ? "bg-yellow-200 text-center" : "bg-lime-100"}
                  ${now ? "scale-[1.03] ring-4 ring-yellow-300" : ""}`}>
                  {b.who !== "ask" && (
                    <div className={`text-sm font-extrabold uppercase tracking-wide ${b.who === "titi" ? "text-orange-600" : "text-lime-700"}`}>
                      {b.who === "titi" ? "Titi" : "Pere"}
                    </div>
                  )}
                  <div className="text-2xl font-bold leading-snug text-slate-900">{b.es}</div>
                  {b.en && <div className="text-lg font-semibold leading-snug text-slate-600 mt-1">{b.en}</div>}
                </div>
              </div>
            );
          })}
          {/* 7 Nov 2026 (Google Play stage A): a quiet report link for the grown-up, under the heroes' lines. */}
          <div className="flex justify-end -mt-1">
            <ReportReply text={reply} where="classroom" />
          </div>
        </div>
      )}

      {turns.length === 0 ? (
        <div className="flex flex-wrap items-center justify-center gap-4">
        <Button size="lg" className="rounded-full text-2xl h-20 px-10 shadow-xl" disabled={busy || loading}
          onClick={() => {
            classMode.current = false;
            // 6 Nov 2026: EspaLuz opens the lesson while the first line is written.
            // First lesson ever: then Pere and Titi introduce themselves in their own voices.
            const opening = openingClip();
            greetingDone.current = (opening ? mentoraSay(opening) : Promise.resolve()).then(() => {
              if (metBefore || skipHeroes.current) return;
              return new Promise<void>((done) => {
                const finish = () => { greetingEnded.current = null; done(); };
                greetingEnded.current = finish;
                setTimeout(finish, 25000);
                setGreeting(true);
              });
            });
            talk("¡Hola Pere y Titi! Quiero empezar la clase. / Hello Pere and Titi! I want to start the class.", false);
          }}>
          <Play className="w-8 h-8 mr-2" /> ¡Empezar! / Start!
        </Button>
        <Button size="lg" variant="secondary" className="rounded-full text-2xl h-20 px-10 shadow-xl" disabled={busy || loading}
          onClick={() => {
            classMode.current = true;
            const opening = openingClip();
            greetingDone.current = opening ? mentoraSay(opening) : Promise.resolve();
            talk("¡Hola Pere y Titi! Quiero empezar la clase. / Hello Pere and Titi! I want to start the class.", false);
          }}>
          📚 ¡Clase! / Class!
        </Button>
        </div>
      ) : (
        <>
        {pad && (
          <TracePad
            key={pad}
            initialMode={pad === "paint" ? "paint" : "letters"}
            targets={traceTargets.length ? traceTargets : ["a", "e", "i", "o", "u"]}
            onClose={() => setPad(null)}
            onTraced={(text) => { if (!busy) talk(`✏️ Tracé "${text}" / I traced "${text}"`, true); }}
            onPainted={(text) => { if (!busy) talk(text, true); }}
          />
        )}
        <div className="flex flex-wrap items-center justify-center gap-6">
        {/* 2 Nov 2026: painting is open in every lesson, not only in a class. */}
        <button
          onClick={() => setPad((p) => (p === "paint" ? null : "paint"))}
          disabled={recording}
          className={`w-20 h-20 rounded-full shadow-2xl flex flex-col items-center justify-center text-white text-sm font-bold transition
            ${recording ? "bg-gray-400" : "bg-fuchsia-500 hover:bg-fuchsia-600"}`}
          aria-label="Paint"
        >
          <span className="text-3xl leading-none">🎨</span>
          <span className="mt-0.5">Pintar</span>
        </button>
        {classMode.current && traceTargets.length > 0 && (
          <button
            onClick={() => setPad((p) => (p === "trace" ? null : "trace"))}
            disabled={recording}
            className={`w-20 h-20 rounded-full shadow-2xl flex flex-col items-center justify-center text-white text-sm font-bold transition
              ${recording ? "bg-gray-400" : "bg-amber-500 hover:bg-amber-600"}`}
            aria-label="Trace"
          >
            <span className="text-3xl leading-none">✏️</span>
            <span className="mt-0.5">Trazar</span>
          </button>
        )}
        {/* 1 Nov 2026 (Elena: "use the camera to make photos and send them at once, not just attach images"): Foto opens
            the tablet's camera straight away (capture); the photo goes to Pere and Titi the moment she takes it. The
            small 🖼️ button keeps the gallery for a picture she already has. */}
        <input ref={photoInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => showPhoto(e.target.files?.[0])} />
        <input ref={galleryInput} type="file" accept="image/*" className="hidden" onChange={(e) => showPhoto(e.target.files?.[0])} />
        <button
          onClick={() => galleryInput.current?.click()}
          disabled={busy || recording}
          className={`w-12 h-12 rounded-full shadow-xl flex items-center justify-center text-2xl transition
            ${busy || recording ? "bg-gray-300" : "bg-sky-100 hover:bg-sky-200"}`}
          aria-label="Gallery"
        >
          🖼️
        </button>
        <button
          onClick={() => photoInput.current?.click()}
          disabled={busy || recording}
          className={`w-20 h-20 rounded-full shadow-2xl flex flex-col items-center justify-center text-white text-sm font-bold transition
            ${busy || recording ? "bg-gray-400" : "bg-sky-500 hover:bg-sky-600"}`}
          aria-label="Photo"
        >
          <Camera className="w-8 h-8" />
          <span className="mt-0.5">Foto</span>
        </button>
        <button
          onClick={recording ? stopRecording : startRecording}
          disabled={busy && !recording && !speaking && !mentora}
          className={`w-32 h-32 rounded-full shadow-2xl flex flex-col items-center justify-center text-white text-lg font-bold transition
            ${recording ? "bg-red-500 animate-pulse" : busy && !speaking && !mentora ? "bg-gray-400"
              : who === "child" ? "bg-green-500 hover:bg-green-600" : "bg-violet-500 hover:bg-violet-600"}`}
          aria-label={recording ? "Stop" : `Talk - ${nameOf(who)}`}
        >
          {recording ? <Square className="w-12 h-12" /> : <Mic className="w-12 h-12" />}
          <span className="mt-1 text-center leading-tight px-2">
            {recording ? "Listo / Done" : busy && !speaking && !mentora ? "…" : who === "child" ? "Habla / Talk" : `Habla ${nameOf(who)}`}
          </span>
        </button>
        {/* 2 Nov 2026 (Elena: "they recognize when mother is talking and when Alisa is talking"): who talks next. Tap a
            face before Habla; it stays until someone else is chosen. Pere and Titi answer a parent as a grown-up and
            bring them into the game; a parent's words never count as the child's sentences or stars. */}
        <div className="flex flex-col gap-2 bg-white/85 rounded-3xl p-2 shadow-xl" role="radiogroup" aria-label="¿Quién habla? / Who is talking?"
          style={{ fontFamily: KID_FONT }}>
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

// 1 Nov 2026 (payment truth phase 4): the classroom is the part families pay for - open during the 14-day free trial,
// then for families the one payment truth marks paid (PayPal or PágueloFácil, mirrored from Oracle every 10 minutes).
const PaidClassroom = () => (
  <FeatureGate feature="kids_classroom">
    <Classroom />
  </FeatureGate>
);

export default PaidClassroom;
