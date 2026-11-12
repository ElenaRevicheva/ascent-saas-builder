import { useMemo, useState } from "react";

// 12 Nov 2026 (Elena: the Russian classroom must have everything Pere & Titi's has - paint, music, photos - the same
// interface, in Russian + English): a COPY of src/components/kids/GamesPad.tsx, texts in Russian + English. The original stays
// untouched (Pere & Titi's classroom is never changed by the Russian one). Logic is the same; only words and content differ.
// Numbers: ten-frame, pairs, the clock in Russian, Russian rouble coins. Sounds: a Russian word is said and she picks
// its picture, or the letter it starts with (the English word is shown under it).

// 4 Nov 2026 (Elena: "adapt the best programs for 6-8"): 🎲 Juegos, two short-round games, our own content.
//  - 🔢 Números: the Singapore-maths way (concrete -> pictorial -> abstract) on Cambridge Primary Maths Stage 1 goals:
//    a ten-frame (how many? how many more make 10?), number pairs to 10 and 20, the clock to the hour and half hour,
//    and Panama's coins (1, 5, 10, 25 and 50 centésimos de balboa, used side by side with US cents).
//  - 🔤 Sounds (English): hear a word and pick its picture, then pick the sound it starts with - early phonics as in
//    England's Key Stage 1 / Letters and Sounds (we use only the method; the word list is ours). The word is spoken by
//    the device's own English voice.
// A round is 5 questions. "✨ Contar a Pere y Titi" sends what she played and how many she got right.

type Q = { kind: string; prompt: string; visual: JSX.Element | null; options: string[]; answer: string; say?: string };
const rnd = (n: number) => Math.floor(Math.random() * n);
const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);
const opts = (answer: number, lo: number, hi: number) => {
  const s = new Set([answer]);
  while (s.size < 3) s.add(Math.max(lo, Math.min(hi, answer + rnd(5) - 2)));
  return shuffle([...s].map(String));
};

function TenFrame({ n, of = 10 }: { n: number; of?: number }) {
  return (
    <div className="flex flex-col gap-2 items-center">
      {Array.from({ length: of / 10 }, (_, f) => (
        <div key={f} className="grid grid-cols-5 gap-1 bg-amber-100 p-2 rounded-xl">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="w-11 h-11 rounded-lg bg-white border-2 border-amber-300 flex items-center justify-center text-2xl">
              {f * 10 + i < n ? "🔴" : ""}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
function Clock({ h, m }: { h: number; m: number }) {
  const ha = ((h % 12) + m / 60) * 30, ma = m * 6;
  const hand = (a: number, len: number, w: number) => (
    <line x1="100" y1="100" x2={100 + len * Math.sin((a * Math.PI) / 180)} y2={100 - len * Math.cos((a * Math.PI) / 180)}
      stroke="#111" strokeWidth={w} strokeLinecap="round" />
  );
  return (
    <svg viewBox="0 0 200 200" width="190" height="190">
      <circle cx="100" cy="100" r="92" fill="#fff" stroke="#111" strokeWidth="6" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = ((i + 1) * 30 * Math.PI) / 180;
        return <text key={i} x={100 + 72 * Math.sin(a)} y={100 - 72 * Math.cos(a) + 7} textAnchor="middle" fontSize="20" fontWeight="bold">{i + 1}</text>;
      })}
      {hand(ha, 45, 8)}{hand(ma, 70, 5)}<circle cx="100" cy="100" r="6" />
    </svg>
  );
}
const COINS = [1, 2, 5, 10];
const Coin = ({ c }: { c: number }) => (
  <div className={`rounded-full border-4 flex items-center justify-center font-bold ${c === 1 ? "bg-orange-200 border-orange-400" : "bg-slate-100 border-slate-400"}`}
    style={{ width: 40 + c * 2, height: 40 + c * 2, fontSize: 14 }}>{c} ₽</div>
);

const hoursWord = (h: number) => (h === 1 ? "час" : h >= 2 && h <= 4 ? "часа" : "часов");
const hourEs = (h: number, m: number) => `${h} ${hoursWord(h)}${m === 0 ? " ровно" : " 30 минут"}`;
const hourEn = (h: number, m: number) => (m === 0 ? `${h} o'clock` : `half past ${h}`);

function numberQ(): Q {
  const k = rnd(5);
  if (k === 0) { const n = 3 + rnd(8); return { kind: "diez", prompt: "Сколько здесь? / How many?", visual: <TenFrame n={n} />, options: opts(n, 1, 10), answer: String(n) }; }
  if (k === 1) { const n = 2 + rnd(8); return { kind: "diez", prompt: "Сколько не хватает до 10? / How many more make 10?", visual: <TenFrame n={n} />, options: opts(10 - n, 0, 10), answer: String(10 - n) }; }
  if (k === 2) {
    const total = rnd(2) ? 10 : 20; const a = 1 + rnd(total - 1);
    return { kind: "parejas", prompt: `${a} + ? = ${total}`, visual: <div className="text-6xl font-bold text-sky-600">{a} + ❓ = {total}</div>, options: opts(total - a, 0, total), answer: String(total - a) };
  }
  if (k === 3) {
    const h = 1 + rnd(12), m = rnd(2) ? 0 : 30;
    const right = `${hourEs(h, m)} / ${hourEn(h, m)}`;
    const others = shuffle([`${hourEs(h % 12 + 1, m)} / ${hourEn(h % 12 + 1, m)}`, `${hourEs(h, 30 - m)} / ${hourEn(h, 30 - m)}`]);
    return { kind: "reloj", prompt: "Который час? / What time is it?", visual: <Clock h={h} m={m} />, options: shuffle([right, ...others]), answer: right };
  }
  const coins = Array.from({ length: 2 + rnd(2) }, () => COINS[rnd(COINS.length)]).sort((a, b) => b - a);
  const sum = coins.reduce((a, b) => a + b, 0);
  const o = new Set([sum]); while (o.size < 3) o.add(Math.max(1, sum + [2, -2, 5, -5, 1, -1][rnd(6)]));
  return { kind: "monedas", prompt: "Сколько здесь денег? / How much money?",
    visual: <div className="flex gap-2 items-center">{coins.map((c, i) => <Coin key={i} c={c} />)}</div>,
    options: shuffle([...o].map((v) => `${v} ₽`)), answer: `${sum} ₽` };
}

const WORDS: { w: string; e: string; en: string }[] = [
  { w: "кот", e: "🐱", en: "cat" }, { w: "дом", e: "🏠", en: "house" }, { w: "сыр", e: "🧀", en: "cheese" }, { w: "кит", e: "🐋", en: "whale" },
  { w: "жук", e: "🪲", en: "beetle" }, { w: "мяч", e: "⚽", en: "ball" }, { w: "лиса", e: "🦊", en: "fox" }, { w: "слон", e: "🐘", en: "elephant" },
  { w: "сова", e: "🦉", en: "owl" }, { w: "утка", e: "🦆", en: "duck" }, { w: "рыба", e: "🐟", en: "fish" }, { w: "луна", e: "🌙", en: "moon" },
  { w: "гриб", e: "🍄", en: "mushroom" }, { w: "банан", e: "🍌", en: "banana" }, { w: "нос", e: "👃", en: "nose" }, { w: "торт", e: "🎂", en: "cake" },
  { w: "зонт", e: "☂️", en: "umbrella" }, { w: "поезд", e: "🚂", en: "train" }, { w: "мишка", e: "🐻", en: "bear" }, { w: "ёжик", e: "🦔", en: "hedgehog" },
];
function soundQ(): Q {
  const pick = shuffle(WORDS).slice(0, 3);
  const t = pick[0];
  if (rnd(2)) return { kind: "palabra", prompt: "🔊 Послушай и нажми на картинку / Listen and tap the picture", visual: null, options: shuffle(pick.map((p) => p.e)), answer: t.e, say: t.w };
  const first = t.w[0].toUpperCase();
  const letters = new Set([first]); while (letters.size < 3) letters.add("БВГДКЛМНПРСТ"[rnd(12)]);
  return { kind: "sonido", prompt: `С какой буквы начинается? / What letter does it start with? (${t.en})`,
    visual: <div className="text-7xl">{t.e}</div>, options: shuffle([...letters]), answer: first, say: t.w };
}

const speak = (text: string) => {
  const s = window.speechSynthesis;
  if (!s) return;
  s.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ru-RU";
  u.rate = 0.8;
  const v = s.getVoices().find((x) => x.lang.startsWith("ru"));
  if (v) u.voice = v;
  s.speak(u);
};

export default function GamesPadRu({ onDone }: { onDone: (text: string) => void }) {
  const [tab, setTab] = useState<"numeros" | "sonidos">("numeros");
  const [round, setRound] = useState(0);
  const questions = useMemo(() => Array.from({ length: 5 }, () => (tab === "numeros" ? numberQ() : soundQ())), [tab, round]);
  const [i, setI] = useState(0);
  const [right, setRight] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [played, setPlayed] = useState<{ tab: string; right: number; of: number }[]>([]);
  const q = questions[Math.min(i, 4)];
  const done = i >= 5;

  const newRound = (t = tab) => { setTab(t); setRound((r) => r + 1); setI(0); setRight(0); setPicked(null); };
  const choose = (o: string) => {
    if (picked) return;
    setPicked(o);
    const ok = o === q.answer;
    if (ok) setRight((r) => r + 1);
    if (q.say && ok) speak(q.say);
    window.setTimeout(() => {
      setPicked(null);
      setI((n) => {
        const next = n + 1;
        if (next === 5) setPlayed((p) => [...p, { tab, right: right + (ok ? 1 : 0), of: 5 }]);
        return next;
      });
    }, ok ? 900 : 1600);
  };

  const tell = () => {
    if (!played.length) return;
    const last = played[played.length - 1];
    const es = last.tab === "numeros" ? "числа (десяток, пары, часы и рубли)" : "русские звуки и буквы";
    const en = last.tab === "numeros" ? "numbers (ten-frame, number pairs, the clock and rouble coins)" : "Russian sounds and letters";
    onDone(`🎲 Игра «${es}»: правильно ${last.right} из ${last.of} / I played ${en} and got ${last.right} out of ${last.of} right`);
  };

  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 p-3">
      <div className="flex flex-wrap gap-2 mb-3">
        <button onClick={() => newRound("numeros")} className={`rounded-full px-4 py-2 text-lg font-bold ${tab === "numeros" ? "bg-sky-500 text-white" : "bg-sky-100"}`}>🔢 Числа / Numbers</button>
        <button onClick={() => newRound("sonidos")} className={`rounded-full px-4 py-2 text-lg font-bold ${tab === "sonidos" ? "bg-rose-500 text-white" : "bg-rose-100"}`}>🔤 Звуки / Sounds</button>
        <span className="ml-auto self-center text-lg font-bold text-slate-600">⭐ {right} · {Math.min(i + 1, 5)}/5</span>
      </div>
      {!done ? (
        <div className="flex flex-col items-center gap-3">
          <div className="text-2xl font-bold text-slate-700 text-center">{q.prompt}</div>
          {q.say && <button onClick={() => speak(q.say!)} className="rounded-full bg-rose-100 hover:bg-rose-200 px-5 py-2 text-xl font-bold">🔊 Слушать / Listen</button>}
          {q.visual}
          <div className="flex flex-wrap justify-center gap-3 mt-1">
            {q.options.map((o) => (
              <button key={o} onClick={() => choose(o)}
                className={`rounded-2xl px-5 py-3 font-bold border-4 ${o.length <= 3 ? "text-4xl min-w-[5rem]" : "text-lg"} ${
                  picked && o === q.answer ? "bg-green-300 border-green-500" : picked === o ? "bg-red-200 border-red-400" : "bg-white border-slate-200 hover:bg-slate-50"}`}>
                {o}
              </button>
            ))}
          </div>
          <div className="min-h-[2rem] text-xl font-bold">{picked ? (picked === q.answer ? "⭐ Молодец! / Well done!" : `Правильно / It was: ${q.answer}`) : ""}</div>
        </div>
      ) : (
        <div className="text-center py-6">
          <div className="text-3xl font-bold">⭐ {right} / 5</div>
          <button onClick={() => newRound()} className="mt-4 rounded-full bg-amber-400 hover:bg-amber-500 px-6 py-3 text-xl font-bold">🔁 Ещё раунд / Another round</button>
        </div>
      )}
      <div className="flex justify-center mt-3">
        <button onClick={tell} disabled={!played.length}
          className="rounded-full bg-green-500 disabled:bg-slate-200 disabled:text-slate-400 text-white px-6 py-3 text-xl font-bold">✨ Рассказать Мишке и Лисе</button>
      </div>
    </div>
  );
}
