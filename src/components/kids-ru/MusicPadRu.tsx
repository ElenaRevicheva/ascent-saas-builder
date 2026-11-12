import { useEffect, useRef, useState } from "react";

// 12 Nov 2026 (Elena: the Russian classroom must have everything Pere & Titi's has - paint, music, photos - the same
// interface, in Russian + English): a COPY of src/components/kids/MusicPad.tsx, texts in Russian + English. The original stays
// untouched (Pere & Titi's classroom is never changed by the Russian one). Logic is the same; only words and content differ.

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
  { id: "tambor", emoji: "🥁", es: "барабан", en: "drum", colour: "bg-orange-400" },
  { id: "palmas", emoji: "👏", es: "хлопок", en: "clap", colour: "bg-pink-400" },
  { id: "maraca", emoji: "🪇", es: "маракас", en: "maraca", colour: "bg-lime-400" },
  { id: "campana", emoji: "🔔", es: "колокольчик", en: "bell", colour: "bg-sky-400" },
];

type Piece = {
  id: string; emoji: string; es: string; en: string; by: string; band: string;
  fact: string; // the true answer, so Pere and Titi can talk about it correctly
  imagine: { es: string; en: string }[];
};
const PIECES: Piece[] = [ // the same public-domain recordings as Pere & Titi's (public/kids/music), names in Russian
  { id: "abejorro", emoji: "🐝", es: "Полёт шмеля", en: "Flight of the Bumblebee", by: "Римский-Корсаков / Rimsky-Korsakov",
    band: "US Air Force Band", fact: "очень быстрая, как летящий шмель / very fast, like a flying bumblebee",
    imagine: [{ es: "пчела", en: "a bee" }, { es: "слон", en: "an elephant" }, { es: "черепаха", en: "a turtle" }] },
  { id: "invierno", emoji: "❄️", es: "Зима", en: "Winter", by: "Вивальди / Vivaldi", band: "US Air Force Strings",
    fact: "скрипки дрожат, как будто им холодно / the violins shiver like someone who is cold",
    imagine: [{ es: "холод и снег", en: "cold and snow" }, { es: "пляж и солнце", en: "a sunny beach" }, { es: "праздник", en: "a party" }] },
  { id: "radetzky", emoji: "👏", es: "Марш Радецкого", en: "Radetzky March", by: "Иоганн Штраус / Johann Strauss I",
    band: "US Marine Band", fact: "марш с ровным пульсом; зрители хлопают в такт / a march with a steady beat; audiences clap along",
    imagine: [{ es: "парад", en: "a parade" }, { es: "сон", en: "sleeping" }, { es: "дождь", en: "the rain" }] },
  { id: "estrellas", emoji: "⭐", es: "Звёзды и полосы навсегда", en: "The Stars and Stripes Forever", by: "Сауза / John Philip Sousa",
    band: "US Marine Band", fact: "весёлый марш оркестра: барабаны, трубы и флейта-пикколо / a happy band march: drums, trumpets and piccolo",
    imagine: [{ es: "парад", en: "a parade" }, { es: "корабль в море", en: "a ship at sea" }, { es: "ночной лес", en: "a forest at night" }] },
  { id: "danza", emoji: "💃", es: "Венгерский танец № 1", en: "Hungarian Dance No. 1", by: "Брамс / Brahms",
    band: "US Air Force Strolling Strings", fact: "танец, который меняется: то медленный, то быстрый / a dance that changes: sometimes slow, sometimes fast",
    imagine: [{ es: "люди танцуют", en: "people dancing" }, { es: "робот", en: "a robot" }, { es: "спящая рыбка", en: "a sleeping fish" }] },
  { id: "montana", emoji: "⛰️", es: "В пещере горного короля", en: "In the Hall of the Mountain King", by: "Григ / Grieg",
    band: "Musopen Symphony", fact: "всё быстрее и громче, до большого финала / faster and louder, up to a big finish",
    imagine: [{ es: "кто-то бежит", en: "someone running" }, { es: "тихий час", en: "a nap" }, { es: "цветок", en: "a flower" }] },
  { id: "viento", emoji: "🌬️", es: "Пусть ветер будет нежным", en: "May the Wind Be Gentle", by: "Моцарт / Mozart",
    band: "US Air Force Singing Sergeants", fact: "медленная и нежная, поют голоса / slow and soft, with singing voices",
    imagine: [{ es: "тихая лодка", en: "a calm boat" }, { es: "гонка", en: "a race" }, { es: "буря", en: "a storm" }] },
];
const SPEED = [{ es: "быстрая", en: "fast", e: "🐇" }, { es: "медленная", en: "slow", e: "🐢" }, { es: "меняется", en: "it changes", e: "🔀" }];
const VOLUME = [{ es: "громкая", en: "loud", e: "🔊" }, { es: "тихая", en: "soft", e: "🔈" }, { es: "всё громче", en: "louder and louder", e: "📈" }];
const FEEL = [{ es: "радость", en: "joy", e: "😄" }, { es: "спокойствие", en: "calm", e: "😌" }, { es: "восторг", en: "excitement", e: "🤩" },
  { es: "немножко страшно", en: "a little fear", e: "😮" }];
type Choice = { es: string; en: string; e?: string };

export default function MusicPadRu({ onDone }: { onDone: (text: string) => void }) {
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
      onDone(`🎵 Ритмы Лисы: пройден уровень ${best} (барабан, хлопок, маракас и колокольчик) / ` +
        `I copied Lisa's rhythms up to level ${best} (drum, clap, maraca and bell)`);
      return;
    }
    if (!piece) return;
    const parts = [speed && (speed.es === "меняется" ? "скорость меняется" : `она ${speed.es}`), volume && `звучит ${volume.es === "всё громче" ? "всё громче" : volume.es}`, feel && `чувствую: ${feel.es}`,
      imagine && `представляю: ${imagine.es}`].filter(Boolean).join(", ");
    const partsEn = [speed && (speed.es === "меняется" ? "it changes speed" : `it is ${speed.en}`), volume && `it sounds ${volume.en}`, feel && `it gives me ${feel.en}`,
      imagine && `I imagine ${imagine.en}`].filter(Boolean).join(", ");
    const [factEs, factEn] = piece.fact.split(" / ");
    onDone(`🎵 Слушаем «${piece.es}», ${piece.by}${parts ? `: ${parts}` : ""} (музыка ${factEs}) / ` +
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
          🥁 Ритм Лисы / Lisa's rhythm
        </button>
        <button onClick={() => setTab("escucha")}
          className={`rounded-full px-4 py-2 text-lg font-bold ${tab === "escucha" ? "bg-violet-500 text-white" : "bg-violet-100"}`}>
          🎻 Что ты слышишь? / What do you hear?
        </button>
      </div>

      {tab === "ritmo" ? (
        <div>
          <div className="text-center text-xl font-bold text-slate-700 min-h-[2rem]">
            {state === "idle" && "Послушай ритм Лисы и повтори / Listen to Lisa's rhythm and copy it"}
            {state === "listen" && "👂 Слушай… / Listen…"}
            {state === "turn" && `👉 Твоя очередь! / Your turn! ${typed.length} / ${pattern.length}`}
            {state === "ok" && `⭐ Отлично! Уровень ${level - 1} / Perfect! Level ${level - 1}`}
            {state === "again" && "Почти! Послушай ещё раз / Almost! Listen again"}
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
                ▶️ {state === "ok" ? `Уровень ${level} / Level ${level}` : "Начать / Start"}
              </button>
            )}
            {(state === "again" || state === "turn") && (
              <button onClick={() => listen(pattern)} className="rounded-full bg-slate-100 hover:bg-slate-200 px-6 py-3 text-xl font-bold">
                🔁 Ещё раз / Again
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
                {playing ? "⏸️ Пауза / Pause" : "▶️ Слушать / Listen"}
              </button>
              {chips("Быстрая или медленная? / Fast or slow?", SPEED, speed, setSpeed)}
              {chips("Громкая или тихая? / Loud or soft?", VOLUME, volume, setVolume)}
              {chips("Что ты чувствуешь? / How does it make you feel?", FEEL, feel, setFeel)}
              {chips("Что ты представляешь? / What do you imagine?", piece.imagine, imagine, setImagine)}
            </div>
          )}
          <div className="text-[10px] text-slate-400 mt-2">
            Записи в общественном достоянии / Public-domain recordings: US Air Force Band, US Marine Band, Musopen (Wikimedia Commons).
          </div>
        </div>
      )}

      <div className="flex justify-center mt-3">
        <button onClick={tell} disabled={tab === "ritmo" ? !best : !piece}
          className="rounded-full bg-green-500 disabled:bg-slate-200 disabled:text-slate-400 hover:bg-green-600 text-white px-6 py-3 text-xl font-bold">
          ✨ Рассказать Мишке и Лисе / Tell Mishka and Lisa
        </button>
      </div>
    </div>
  );
}
