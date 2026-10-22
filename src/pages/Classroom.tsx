import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Mic, Square, Star, Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Pere + Titi's classroom (22 Oct 2026): the dashboard chat's voice loop (voice-to-text -> espaluz-chat -> generate-voice)
// in kids mode, with the heroes' clips as the avatar. Clip choice follows the EspaLuz Telegram bot's alisa_hero_clip().
type Turn = { role: "user" | "assistant"; content: string };

const IDLE_CLIP = "/heroes/duo-hello.mp4";

function heroClip(text: string): string {
  const t = text.toLowerCase();
  const pick = (names: string[]) => `/heroes/${names[Math.floor(Math.random() * names.length)]}.mp4`;
  if (["respira", "breath", "barriga", "belly", "calma", "calm"].some((w) => t.includes(w))) return pick(["pere-breathing"]);
  if (["rodilla", "knee", "salta", "jump", "simon"].some((w) => t.includes(w))) return pick(["titi-crosscrawl", "titi-cheer"]);
  if (["adiós", "adios", "bye", "hasta mañana", "see you"].some((w) => t.includes(w))) return pick(["duo-goodbye"]);
  if (["noche", "night", "dormir", "sleep", "sueño"].some((w) => t.includes(w))) return pick(["pere-sleepy"]);
  return pick(["duo-hello", "pere-hello", "titi-cheer", "titi-silly"]);
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
  const [clip, setClip] = useState(IDLE_CLIP);
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
    if (error || !b64) return; // the words stay on screen even when the voice fails
    audio.current?.pause();
    const a = new Audio(toAudioUrl(b64));
    audio.current = a;
    a.onended = () => setClip(IDLE_CLIP);
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
      setClip(heroClip(text));
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
        key={clip}
        src={clip}
        autoPlay
        loop
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
