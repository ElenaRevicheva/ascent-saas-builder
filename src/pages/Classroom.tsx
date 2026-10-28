import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Mic, Square, Star, Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Pere + Titi's classroom (22 Oct 2026): the dashboard chat's voice loop (voice-to-text -> espaluz-chat -> generate-voice)
// in kids mode, with the heroes' clips as the avatar. 28 Oct 2026: the SAME 25 clips and the same playlist rule as the
// EspaLuz Telegram bot (hero_shot_list): a lead clip that fits the words, then talking and action shots alternating,
// the least recently played action shot first, so one turn after another looks different.
type Turn = { role: "user" | "assistant"; content: string };

const IDLE_CLIP = "/heroes/duo-hello.mp4";
const TALK = ["pere-talking-1", "pere-talking-2", "titi-talking-1", "titi-talking-2"];
const ACT = [
  "pere-hello", "pere-breathing", "pere-sleepy", "pere-counting", "pere-thinking", "pere-clap", "pere-listening",
  "titi-cheer", "titi-cheer-2", "titi-silly", "titi-crosscrawl", "titi-dance", "titi-counting-jumps", "titi-freeze",
  "titi-oops", "titi-listening", "duo-highfive", "duo-peekaboo",
];
const recent: string[] = []; // action shots just played go to the back of the line (one child, one line)

const shuffled = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

function heroShots(text: string): string[] {
  const t = text.toLowerCase();
  const has = (ws: string[]) => ws.some((w) => t.includes(w));
  const one = (ns: string[]) => [ns[Math.floor(Math.random() * ns.length)]];
  let lead: string[] = [];
  if (has(["adiós", "adios", "bye", "hasta mañana", "see you"])) lead = ["duo-goodbye"];
  else if (has(["respira", "breath", "barriga", "belly", "calma", "calm"])) lead = ["pere-breathing"];
  else if (has(["noche", "night", "dormir", "sleep", "sueño"])) lead = ["pere-sleepy"];
  else if (has(["baila", "dance", "música", "music"])) lead = ["titi-dance"];
  else if (has(["rodilla", "knee", "salta", "jump", "simon"])) lead = ["titi-crosscrawl"];
  else if (has(["muy bien", "bravo", "excelente", "great job", "well done", "perfecto"])) lead = one(["duo-highfive", "pere-clap"]);
  else if (has(["cuenta", "contar", "count", "uno, dos", "one, two"])) lead = one(["pere-counting", "titi-counting-jumps"]);
  else if (has(["congela", "estatua", "freeze", "statue"])) lead = ["titi-freeze"];
  else if (has(["ups", "oops", "me equivoqu", "mistake", "error"])) lead = ["titi-oops"];
  else if (has(["dónde está", "donde esta", "where is", "escondid", "peekaboo", "cucú"])) lead = ["duo-peekaboo"];
  else if (has(["repite", "repeat", "dime", "tell me", "escucha", "listen"])) lead = one(["pere-listening", "titi-listening"]);
  else if (has(["piensa", "adivina", "think", "guess"])) lead = ["pere-thinking"];
  // least recently played first; the lead counts as just played so it is not shown twice in one turn
  const seen = [...recent, ...lead];
  const age = new Map(seen.map((n, i) => [n, seen.length - 1 - i])); // 0 = most recent
  const act = shuffled(ACT).sort((a, b) => (age.get(b) ?? 1e6) - (age.get(a) ?? 1e6));
  const talk = shuffled(TALK);
  const mix = act.flatMap((a, i) => [talk[i % talk.length], a]);
  recent.push(...lead, ...act.slice(0, 2)); // the first two action shots are the ones a 10–20 s line actually reaches
  while (recent.length > 12) recent.shift();
  return [...lead, ...mix].map((n) => `/heroes/${n}.mp4`);
}

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
  const [playlist, setPlaylist] = useState<string[]>([IDLE_CLIP]);
  const [shot, setShot] = useState(0);
  const idle = () => { setPlaylist([IDLE_CLIP]); setShot(0); };
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [stars, setStars] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => { audio.current?.pause(); }, []);

  const speak = async (text: string) => {
    const { data, error } = await supabase.functions.invoke("generate-voice", { body: { text, voice: "es", userId: user?.id } });
    const b64 = data?.audioContent || data?.audioBase64;
    if (error || !b64) { idle(); return; } // the words stay on screen even when the voice fails
    audio.current?.pause();
    const a = new Audio(toAudioUrl(b64));
    audio.current = a;
    a.onended = idle;
    await a.play().catch(() => undefined);
  };

  const talk = async (childSays: string, countsAsStar: boolean) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("espaluz-chat", {
        body: { message: childSays, isVoiceInput: true, kids: { history: turns.slice(-10) } },
      });
      const text: string = data?.response || "";
      if (error || !text) throw new Error(data?.error || error?.message || "no answer");
      setTurns((t) => [...t, { role: "user", content: childSays }, { role: "assistant", content: text }]);
      setReply(text);
      setPlaylist(heroShots(text));
      setShot(0);
      if (countsAsStar) setStars((s) => s + 1);
      await speak(text);
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
        key={`${playlist[shot]}-${shot}`}
        src={playlist[shot]}
        autoPlay
        loop={playlist.length === 1}
        onEnded={() => setShot((i) => (i + 1) % playlist.length)}
        muted
        playsInline
        className="w-full max-w-[520px] aspect-square rounded-[2rem] shadow-2xl border-8 border-white/80 object-cover"
      />

      {reply && (
        <div className="w-full max-w-[640px] bg-white/92 rounded-3xl px-6 py-4 shadow-lg text-lg leading-relaxed whitespace-pre-line">
          {reply}
        </div>
      )}

      {turns.length === 0 ? (
        <Button size="lg" className="rounded-full text-2xl h-20 px-10 shadow-xl" disabled={busy || loading}
          onClick={() => talk("¡Hola Pere y Titi! Quiero empezar la clase. / Hello Pere and Titi! I want to start the class.", false)}>
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
