import { useEffect, useRef, useState } from "react";

// 4 Nov 2026 (Elena: Alisa loved the music in another app, but "not toddler songs - she goes to colegio, grado
// primero"): the 🎵 Música mode of the classroom pad, built from the Cambridge Primary Music Stage 1-2 objectives
// (docs/espaluz/CLASSROOM_MUSIC_OPTIONS_2026-11-04.md in cto-aipa):
//  - 🥁 Ritmo de Titi ("making music": pulse, timing) - Titi plays a pattern, she copies it; the patterns grow. Every
//    sound is synthesised here with Web Audio: no recording, nothing to license.
//  - 🎻 ¿Qué escuchas? ("making sense of music": listening and responding by asking and answering questions) - short
//    excerpts of real classical music. Every recording is PUBLIC DOMAIN on Wikimedia Commons (US Air Force Band and
//    US Marine Band = US government works; Musopen = released to the public domain); sources in
//    public/kids/music/CREDITS.md. Never a popular children's song or a commercial recording.
// Nothing is stored. "✨ Contar a Pere y Titi" sends one sentence, like the paint pad's "✨ Listo".

type Sound = "tambor" | "palmas" | "maraca" | "campana";
const PADS: { id: Sound; emoji: string; es: string; en: string; colour: string }[] = [
  { id: "tambor", emoji: "🥁", es: "tambor", en: "drum", colour: "bg-orange-400" },
  { id: "palmas", emoji: "👏", es: "palmas", en: "clap", colour: "bg-pink-400" },
  { id: "maraca", emoji: "🪇", es: "maraca", en: "maraca", colour: "bg-lime-400" },
  { id: "campana", emoji: "🔔", es: "campana", en: "bell", colour: "bg-sky-400" },
];

type Piece = {
  id: string; emoji: string; es: string; en: string; by: string; band: string;
  fact: string; // the true answer, so Pere and Titi can talk about it correctly
  imagine: { es: string; en: string }[];
};
const PIECES: Piece[] = [
  { id: "abejorro", emoji: "🐝", es: "El vuelo del abejorro", en: "Flight of the Bumblebee", by: "Rimsky-Korsakov",
    band: "US Air Force Band", fact: "muy rápida, como un abejorro que vuela / very fast, like a flying bumblebee",
    imagine: [{ es: "una abeja", en: "a bee" }, { es: "un elefante", en: "an elephant" }, { es: "una tortuga", en: "a turtle" }] },
  { id: "invierno", emoji: "❄️", es: "El invierno", en: "Winter", by: "Vivaldi", band: "US Air Force Strings",
    fact: "los violines tiemblan como alguien con frío / the violins shiver like someone who is cold",
    imagine: [{ es: "frío y nieve", en: "cold and snow" }, { es: "una playa con sol", en: "a sunny beach" }, { es: "una fiesta", en: "a party" }] },
  { id: "radetzky", emoji: "👏", es: "Marcha Radetzky", en: "Radetzky March", by: "Johann Strauss I",
    band: "US Marine Band", fact: "una marcha con un pulso fijo; el público aplaude con el pulso / a march with a steady beat; audiences clap along",
    imagine: [{ es: "un desfile", en: "a parade" }, { es: "dormir", en: "sleeping" }, { es: "la lluvia", en: "the rain" }] },
  { id: "estrellas", emoji: "⭐", es: "Barras y estrellas", en: "The Stars and Stripes Forever", by: "John Philip Sousa",
    band: "US Marine Band", fact: "una marcha alegre de banda: tambores, trompetas y flautín / a happy band march: drums, trumpets and piccolo",
    imagine: [{ es: "un desfile", en: "a parade" }, { es: "un barco en el mar", en: "a ship at sea" }, { es: "un bosque de noche", en: "a forest at night" }] },
  { id: "danza", emoji: "💃", es: "Danza húngara n.º 1", en: "Hungarian Dance No. 1", by: "Brahms",
    band: "US Air Force Strolling Strings", fact: "una danza que cambia: a veces lenta, a veces rápida / a dance that changes: sometimes slow, sometimes fast",
    imagine: [{ es: "gente bailando", en: "people dancing" }, { es: "un robot", en: "a robot" }, { es: "un pez dormido", en: "a sleeping fish" }] },
  { id: "montana", emoji: "⛰️", es: "En la gruta del rey de la montaña", en: "In the Hall of the Mountain King", by: "Grieg",
    band: "Musopen Symphony", fact: "cada vez más rápida y más fuerte, hasta un gran final / faster and louder, up to a big finish",
    imagine: [{ es: "alguien que corre", en: "someone running" }, { es: "una siesta", en: "a nap" }, { es: "una flor", en: "a flower" }] },
  { id: "viento", emoji: "🌬️", es: "Que el viento sea suave", en: "May the Wind Be Gentle", by: "Mozart",
    band: "US Air Force Singing Sergeants", fact: "lenta y suave, con voces que cantan / slow and soft, with singing voices",
    imagine: [{ es: "un barco tranquilo", en: "a calm boat" }, { es: "una carrera", en: "a race" }, { es: "una tormenta", en: "a storm" }] },
];
const SPEED = [{ es: "rápida", en: "fast", e: "🐇" }, { es: "lenta", en: "slow", e: "🐢" }, { es: "cambia", en: "it changes", e: "🔀" }];
const VOLUME = [{ es: "fuerte", en: "loud", e: "🔊" }, { es: "suave", en: "soft", e: "🔈" }, { es: "cada vez más fuerte", en: "louder and louder", e: "📈" }];
const FEEL = [{ es: "alegría", en: "joy", e: "😄" }, { es: "calma", en: "calm", e: "😌" }, { es: "emoción", en: "excitement", e: "🤩" },
  { es: "un poco de miedo", en: "a little fear", e: "😮" }];
type Choice = { es: string; en: string; e?: string };

export default function MusicPad({ onDone }: { onDone: (text: string) => void }) {
  const [tab, setTab] = useState<"ritmo" | "escucha">("ritmo");
  const ctx = useRef<AudioContext | null>(null);
  const audio = () => (ctx.current ??= new (window.AudioContext || (window as any).webkitAudioContext)());

  // ---------- sounds, made here (no recordings) ----------
  const play = (s: Sound) => {
    const a = audio();
    const t = a.currentTime;
    const out = a.createGain();
    out.connect(a.destination);
    if (s === "tambor" || s === "campana") {
      const o = a.createOscillator();
      o.type = s === "tambor" ? "sine" : "triangle";
      o.frequency.setValueAtTime(s === "tambor" ? 150 : 1320, t);
      if (s === "tambor") o.frequency.exponentialRampToValueAtTime(55, t + 0.25);
      out.gain.setValueAtTime(0.9, t);
      out.gain.exponentialRampToValueAtTime(0.001, t + (s === "tambor" ? 0.35 : 0.8));
      o.connect(out);
      o.start(t);
      o.stop(t + 0.9);
      return;
    }
    const len = s === "palmas" ? 0.12 : 0.18;
    const buf = a.createBuffer(1, Math.floor(a.sampleRate * len), a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = a.createBufferSource();
    src.buffer = buf;
    const f = a.createBiquadFilter();
    f.type = s === "palmas" ? "bandpass" : "highpass";
    f.frequency.value = s === "palmas" ? 1500 : 5000;
    out.gain.setValueAtTime(s === "palmas" ? 1.2 : 0.6, t);
    src.connect(f);
    f.connect(out);
    src.start(t);
  };

  // ---------- 🥁 Ritmo de Titi ----------
  const [level, setLevel] = useState(1);
  const [pattern, setPattern] = useState<Sound[]>([]);
  const [typed, setTyped] = useState<Sound[]>([]);
  const [lit, setLit] = useState<Sound | null>(null);
  const [state, setState] = useState<"idle" | "listen" | "turn" | "ok" | "again">("idle");
  const [best, setBest] = useState(0);
  const timers = useRef<number[]>([]);
  useEffect(() => () => { timers.current.forEach(clearTimeout); ctx.current?.close(); }, []);

  const makePattern = (lv: number): Sound[] => {
    const kinds = PADS.slice(0, lv <= 2 ? 2 : lv <= 4 ? 3 : 4).map((p) => p.id);
    const len = Math.min(3 + Math.floor((lv - 1) / 2), 8); // 3,3,4,4,5,5,...
    return Array.from({ length: len }, () => kinds[Math.floor(Math.random() * kinds.length)]);
  };
  const listen = (p: Sound[]) => {
    timers.current.forEach(clearTimeout);
    setTyped([]);
    setState("listen");
    const beat = 520; // a steady pulse
    p.forEach((s, i) => {
      timers.current.push(window.setTimeout(() => { play(s); setLit(s); }, 400 + i * beat));
      timers.current.push(window.setTimeout(() => setLit(null), 400 + i * beat + 300));
    });
    timers.current.push(window.setTimeout(() => setState("turn"), 400 + p.length * beat));
  };
  const start = () => { const p = makePattern(level); setPattern(p); listen(p); };
  const tap = (s: Sound) => {
    play(s);
    setLit(s);
    window.setTimeout(() => setLit(null), 180);
    if (state !== "turn") return;
    const next = [...typed, s];
    setTyped(next);
    if (next[next.length - 1] !== pattern[next.length - 1]) { setState("again"); return; }
    if (next.length === pattern.length) {
      setState("ok");
      setBest((b) => Math.max(b, level));
      setLevel((l) => l + 1);
    }
  };

  // ---------- 🎻 ¿Qué escuchas? ----------
  const [piece, setPiece] = useState<Piece | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Choice | null>(null);
  const [volume, setVolume] = useState<Choice | null>(null);
  const [feel, setFeel] = useState<Choice | null>(null);
  const [imagine, setImagine] = useState<Choice | null>(null);
  const player = useRef<HTMLAudioElement | null>(null);
  const choose = (p: Piece) => {
    player.current?.pause();
    setPiece(p);
    setSpeed(null); setVolume(null); setFeel(null); setImagine(null);
    const el = new Audio(`/kids/music/${p.id}.mp3`);
    el.onended = () => setPlaying(false);
    player.current = el;
    el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };
  const toggle = () => {
    const el = player.current;
    if (!el) return;
    if (el.paused) el.play().then(() => setPlaying(true)).catch(() => {});
    else { el.pause(); setPlaying(false); }
  };
  useEffect(() => () => player.current?.pause(), []);
  useEffect(() => { if (tab !== "escucha") { player.current?.pause(); setPlaying(false); } }, [tab]);

  const tell = () => {
    if (tab === "ritmo") {
      if (!best) return;
      onDone(`🎵 Copié los ritmos de Titi hasta el nivel ${best} (tambor, palmas, maraca y campana) / ` +
        `I copied Titi's rhythms up to level ${best} (drum, clap, maraca and bell)`);
      return;
    }
    if (!piece) return;
    const parts = [speed && (speed.es === "cambia" ? "cambia de velocidad" : `es ${speed.es}`), volume && `suena ${volume.es}`, feel && `me da ${feel.es}`,
      imagine && `imagino ${imagine.es}`].filter(Boolean).join(", ");
    const partsEn = [speed && (speed.es === "cambia" ? "it changes speed" : `it is ${speed.en}`), volume && `it sounds ${volume.en}`, feel && `it gives me ${feel.en}`,
      imagine && `I imagine ${imagine.en}`].filter(Boolean).join(", ");
    const [factEs, factEn] = piece.fact.split(" / ");
    onDone(`🎵 Escuché "${piece.es}" de ${piece.by}${parts ? `: ${parts}` : ""} (la música es ${factEs}) / ` +
      `I listened to "${piece.en}" by ${piece.by}${partsEn ? `: ${partsEn}` : ""} (the music is ${factEn})`);
  };

  const chips = (title: string, list: Choice[], val: Choice | null, set: (c: Choice) => void) => (
    <div className="mt-2">
      <div className="text-base font-bold text-slate-600">{title}</div>
      <div className="flex flex-wrap gap-2 mt-1">
        {list.map((c) => (
          <button key={c.es} onClick={() => set(c)}
            className={`rounded-full px-3 py-2 text-base font-bold ${val?.es === c.es ? "bg-amber-400 text-white" : "bg-amber-100 hover:bg-amber-200"}`}>
            {c.e ? `${c.e} ` : ""}{c.es} / {c.en}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 p-3">
      <div className="flex gap-2 mb-3">
        <button onClick={() => setTab("ritmo")}
          className={`rounded-full px-4 py-2 text-lg font-bold ${tab === "ritmo" ? "bg-orange-400 text-white" : "bg-orange-100"}`}>
          🥁 Ritmo de Titi / Titi's rhythm
        </button>
        <button onClick={() => setTab("escucha")}
          className={`rounded-full px-4 py-2 text-lg font-bold ${tab === "escucha" ? "bg-violet-500 text-white" : "bg-violet-100"}`}>
          🎻 ¿Qué escuchas? / What do you hear?
        </button>
      </div>

      {tab === "ritmo" ? (
        <div>
          <div className="text-center text-xl font-bold text-slate-700 min-h-[2rem]">
            {state === "idle" && "Escucha el ritmo de Titi y cópialo / Listen to Titi's rhythm and copy it"}
            {state === "listen" && "👂 Escucha… / Listen…"}
            {state === "turn" && `👉 ¡Tu turno! ${typed.length} / ${pattern.length}`}
            {state === "ok" && `⭐ ¡Perfecto! Nivel ${level - 1} / Perfect! Level ${level - 1}`}
            {state === "again" && "¡Casi! Escucha otra vez / Almost! Listen again"}
          </div>
          <div className="grid grid-cols-4 gap-3 my-4">
            {PADS.map((p) => (
              <button key={p.id} onPointerDown={() => tap(p.id)}
                className={`${p.colour} rounded-3xl py-6 text-5xl shadow-md transition-transform ${lit === p.id ? "scale-110 ring-4 ring-yellow-300" : ""}`}
                style={{ touchAction: "manipulation" }}>
                {p.emoji}
                <div className="text-base font-bold text-white mt-1">{p.es} / {p.en}</div>
              </button>
            ))}
          </div>
          <div className="flex justify-center gap-3 flex-wrap">
            {(state === "idle" || state === "ok") && (
              <button onClick={start} className="rounded-full bg-orange-400 hover:bg-orange-500 text-white px-6 py-3 text-xl font-bold">
                ▶️ {state === "ok" ? `Nivel ${level} / Level ${level}` : "Empezar / Start"}
              </button>
            )}
            {(state === "again" || state === "turn") && (
              <button onClick={() => listen(pattern)} className="rounded-full bg-slate-100 hover:bg-slate-200 px-6 py-3 text-xl font-bold">
                🔁 Otra vez / Again
              </button>
            )}
          </div>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PIECES.map((p) => (
              <button key={p.id} onClick={() => choose(p)}
                className={`rounded-2xl p-2 text-left ${piece?.id === p.id ? "bg-violet-200 ring-2 ring-violet-400" : "bg-violet-50 hover:bg-violet-100"}`}>
                <div className="text-3xl">{p.emoji}</div>
                <div className="text-sm font-bold leading-tight">{p.es}</div>
                <div className="text-xs text-slate-500 leading-tight">{p.en} · {p.by}</div>
              </button>
            ))}
          </div>
          {piece && (
            <div className="mt-3">
              <button onClick={toggle} className="rounded-full bg-violet-500 hover:bg-violet-600 text-white px-5 py-2 text-lg font-bold">
                {playing ? "⏸️ Pausa / Pause" : "▶️ Escuchar / Listen"}
              </button>
              {chips("¿Rápida o lenta? / Fast or slow?", SPEED, speed, setSpeed)}
              {chips("¿Fuerte o suave? / Loud or soft?", VOLUME, volume, setVolume)}
              {chips("¿Qué sientes? / How does it make you feel?", FEEL, feel, setFeel)}
              {chips("¿Qué imaginas? / What do you imagine?", piece.imagine, imagine, setImagine)}
            </div>
          )}
          <div className="text-[10px] text-slate-400 mt-2">
            Grabaciones de dominio público / Public-domain recordings: US Air Force Band, US Marine Band, Musopen (Wikimedia Commons).
          </div>
        </div>
      )}

      <div className="flex justify-center mt-3">
        <button onClick={tell} disabled={tab === "ritmo" ? !best : !piece}
          className="rounded-full bg-green-500 disabled:bg-slate-200 disabled:text-slate-400 hover:bg-green-600 text-white px-6 py-3 text-xl font-bold">
          ✨ Contar a Pere y Titi / Tell Pere and Titi
        </button>
      </div>
    </div>
  );
}
