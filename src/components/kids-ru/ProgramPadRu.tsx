import { useEffect, useRef, useState } from "react";

// 12 Nov 2026 (Elena: the Russian classroom must have everything Pere & Titi's has - paint, music, photos - the same
// interface, in Russian + English): a COPY of src/components/kids/ProgramPad.tsx, texts in Russian + English. The original stays
// untouched (Pere & Titi's classroom is never changed by the Russian one). Logic is the same; only words and content differ.
// Here Lisa the fox 🦊 walks to the berries 🍓; "Скажи Лисе" understands Russian and English words.

// 4 Nov 2026 (Elena: "adapt the best programs for 6-8 ... plus vibe coding for 6-8"): 🐒 Programa a Titi.
// Cambridge Primary Computing Stage 1 vocabulary - algorithm (a set of instructions), sequence, error (debugging) -
// the same idea as unplugged floor-robot games in UK and international schools; our own game, code and art.
//  - 🧩 Bloques: she builds the program with arrow blocks, presses ▶️ and Titi walks it to the banana.
//  - 🐞 Arregla: a ready program has ONE wrong block; she finds and fixes it (debugging).
//  - 🗣️ Dile a Titi ("vibe coding" for a 6-year-old): she SAYS or types what Titi should do in Spanish or English
//    ("dos a la derecha y uno abajo" / "go right two times then down") and sees her words turn into blocks - words
//    become code, then the code runs. The parser is plain code here (no AI call): numbers 1-10 and four directions.
// Nothing is stored; "✨ Contar a Pere y Titi" sends one sentence like the other pads.

type Dir = "R" | "L" | "U" | "D";
const ARROW: Record<Dir, string> = { R: "➡️", L: "⬅️", U: "⬆️", D: "⬇️" };
const STEP: Record<Dir, [number, number]> = { R: [1, 0], L: [-1, 0], U: [0, -1], D: [0, 1] };
type Level = { size: number; start: [number, number]; goal: [number, number]; rocks: [number, number][] };
const LEVELS: Level[] = [
  { size: 4, start: [0, 0], goal: [3, 0], rocks: [] },
  { size: 4, start: [0, 0], goal: [2, 2], rocks: [[1, 0]] },
  { size: 5, start: [0, 4], goal: [4, 0], rocks: [[1, 3], [3, 1]] },
  { size: 5, start: [0, 0], goal: [4, 4], rocks: [[1, 1], [2, 2], [3, 3]] },
  { size: 6, start: [0, 5], goal: [5, 0], rocks: [[0, 2], [2, 4], [3, 1], [4, 3]] },
  { size: 6, start: [2, 2], goal: [5, 5], rocks: [[3, 2], [2, 4], [4, 4], [5, 3]] },
];

// Shortest path (BFS) - used to make the "fix the bug" programs and to check a level can be solved.
function solve(l: Level): Dir[] {
  const key = (x: number, y: number) => `${x},${y}`;
  const rock = new Set(l.rocks.map(([x, y]) => key(x, y)));
  const prev = new Map<string, [string, Dir]>();
  const q: [number, number][] = [l.start];
  const seen = new Set([key(...l.start)]);
  while (q.length) {
    const [x, y] = q.shift()!;
    if (x === l.goal[0] && y === l.goal[1]) break;
    for (const d of ["R", "D", "L", "U"] as Dir[]) {
      const nx = x + STEP[d][0], ny = y + STEP[d][1], k = key(nx, ny);
      if (nx < 0 || ny < 0 || nx >= l.size || ny >= l.size || rock.has(k) || seen.has(k)) continue;
      seen.add(k); prev.set(k, [key(x, y), d]); q.push([nx, ny]);
    }
  }
  const path: Dir[] = [];
  let k = key(...l.goal);
  while (prev.has(k)) { const [p, d] = prev.get(k)!; path.unshift(d); k = p; }
  return path;
}

// "два направо и один вниз", "направо 2, потом вниз", "right 2 then down" -> R R D
const NUM: Record<string, number> = { один: 1, одна: 1, one: 1, два: 2, две: 2, two: 2, три: 3, three: 3, четыре: 4, four: 4,
  пять: 5, five: 5, шесть: 6, six: 6, семь: 7, seven: 7, восемь: 8, eight: 8, девять: 9, nine: 9, десять: 10, ten: 10 };
const DIRW: [RegExp, Dir][] = [[/^(направо|вправо|право|right)$/, "R"], [/^(налево|влево|лево|left)$/, "L"],
  [/^(вверх|наверх|up)$/, "U"], [/^(вниз|down)$/, "D"]];
export function parseWords(text: string): Dir[] {
  // No NFD here: it would split й and ё into two letters. A comma or full stop starts a new instruction.
  const words = text.toLowerCase().replace(/ё/g, "е").match(/[a-zа-я]+|\d+|[,.;]/g) ?? [];
  const out: Dir[] = [];
  let n: number | null = null;
  let afterDir = false;
  for (const w of words) {
    const num = /^\d+$/.test(w) ? Math.min(10, parseInt(w, 10)) : NUM[w];
    // a number right after a direction belongs to it ("sube 2", "right two times"); otherwise to the next one ("dos a la derecha")
    if (num && afterDir && out.length) { const last = out[out.length - 1]; for (let i = 1; i < num; i++) out.push(last); afterDir = false; continue; }
    if (num) { n = num; afterDir = false; continue; }
    const d = DIRW.find(([re]) => re.test(w))?.[1];
    if (d) { for (let i = 0; i < (n ?? 1); i++) out.push(d); n = null; afterDir = true; continue; }
    afterDir = false;
  }
  return out.slice(0, 30);
}

export default function ProgramPadRu({ onDone }: { onDone: (text: string) => void }) {
  const [tab, setTab] = useState<"bloques" | "arregla" | "dile">("bloques");
  const [li, setLi] = useState(0);
  const level = LEVELS[li % LEVELS.length];
  const [prog, setProg] = useState<Dir[]>([]);
  const [pos, setPos] = useState<[number, number]>(level.start);
  const [msg, setMsg] = useState("");
  const [running, setRunning] = useState(false);
  const [wins, setWins] = useState<{ level: number; prog: Dir[]; how: string }[]>([]);
  const [said, setSaid] = useState("");
  const [listening, setListening] = useState(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const bugProgram = (l: Level): Dir[] => {
    const p = solve(l);
    if (!p.length) return p;
    const i = Math.floor(p.length / 2);
    const wrong: Record<Dir, Dir> = { R: "D", D: "R", L: "U", U: "L" };
    const b = [...p];
    b[i] = wrong[b[i]];
    return b;
  };
  const reset = (t = tab, l = level) => {
    timers.current.forEach(clearTimeout);
    setRunning(false);
    setPos(l.start);
    setMsg("");
    setProg(t === "arregla" ? bugProgram(l) : []);
    setSaid("");
  };
  useEffect(() => { reset(tab, level); }, [tab, li]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = (p: Dir[] = prog) => {
    if (!p.length || running) return;
    timers.current.forEach(clearTimeout);
    setRunning(true);
    setMsg("");
    let [x, y] = level.start;
    setPos([x, y]);
    const rock = new Set(level.rocks.map(([a, b]) => `${a},${b}`));
    p.forEach((d, i) => {
      timers.current.push(window.setTimeout(() => {
        const nx = x + STEP[d][0], ny = y + STEP[d][1];
        if (nx < 0 || ny < 0 || nx >= level.size || ny >= level.size || rock.has(`${nx},${ny}`)) {
          setMsg(`🐞 Ошибка в блоке ${i + 1}! Лиса врезалась. / Bug in block ${i + 1}! Lisa bumps.`);
          setRunning(false);
          timers.current.forEach(clearTimeout);
          return;
        }
        x = nx; y = ny;
        setPos([x, y]);
        if (i === p.length - 1) {
          setRunning(false);
          if (x === level.goal[0] && y === level.goal[1]) {
            setMsg(`🍓 Лиса дошла до ягод за ${p.length} шагов! / Lisa reached the berries in ${p.length} steps!`);
            setWins((w) => [...w, { level: li + 1, prog: p, how: tab }]);
          } else setMsg(tab === "arregla" ? "Лиса не дошла. Какой блок неправильный? / Not there. Which block is wrong?"
            : "Лиса ещё не дошла. Какого блока не хватает? / Not there yet. Which block is missing?");
        }
      }, 450 * (i + 1)));
    });
  };

  const fixAt = (i: number) => {
    if (running) return;
    const order: Dir[] = ["R", "D", "L", "U"];
    setProg((p) => p.map((d, j) => (j === i ? order[(order.indexOf(d) + 1) % 4] : d)));
  };

  const fromWords = (text: string) => {
    setSaid(text);
    const p = parseWords(text);
    setProg(p);
    setMsg(p.length ? "" : "Лиса не поняла. Попробуй: \"два направо и один вниз\" / Try: \"right two, down one\"");
  };
  const listen = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setMsg("Этот браузер не слышит. Напиши ниже. / This browser can't listen - type it below."); return; }
    const r = new SR();
    r.lang = "ru-RU";
    r.interimResults = false;
    r.onresult = (e: any) => fromWords(String(e.results?.[0]?.[0]?.transcript ?? ""));
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    setListening(true);
    r.start();
  };

  const tell = () => {
    if (!wins.length) return;
    const best = wins.reduce((a, b) => (b.level > a.level ? b : a));
    const how = best.how === "dile" ? "словами, говоря ей, что делать / by telling her in words what to do"
      : best.how === "arregla" ? "исправляя ошибку в программе / by fixing the bug in the program"
      : "блоками со стрелками / with arrow blocks";
    const [es, en] = how.split(" / ");
    onDone(`🦊 Я программирую Лису, уровень ${best.level}, ${es}: ${best.prog.map((d) => ARROW[d]).join("")} ` +
      `(${best.prog.length} шагов) / I programmed Lisa up to level ${best.level} ${en} (${best.prog.length} steps)`);
  };

  const cell = 64;
  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 p-3">
      <div className="flex flex-wrap gap-2 mb-3">
        {([["bloques", "🧩 Блоки / Blocks"], ["arregla", "🐞 Исправь / Fix it"], ["dile", "🗣️ Скажи Лисе / Tell Lisa"]] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-lg font-bold ${tab === t ? "bg-emerald-500 text-white" : "bg-emerald-100"}`}>{label}</button>
        ))}
        <span className="ml-auto self-center text-lg font-bold text-slate-600">Уровень / Level {li + 1}</span>
      </div>
      <div className="text-center text-base font-semibold text-slate-600 mb-2">
        {tab === "bloques" && "Приведи Лису 🦊 к ягодам 🍓 и не врежься в камни 🪨 / Take Lisa to the berries without hitting the rocks"}
        {tab === "arregla" && "В этой программе ОДНА ошибка. Нажми на неправильный блок. / This program has ONE bug. Tap the wrong block to change it."}
        {tab === "dile" && "Скажи Лисе словами: \"два направо и один вниз\" / Tell Lisa in words: \"right two, down one\""}
      </div>
      <div className="flex justify-center">
        <div className="grid gap-1 bg-emerald-50 p-2 rounded-2xl" style={{ gridTemplateColumns: `repeat(${level.size}, ${cell}px)` }}>
          {Array.from({ length: level.size * level.size }, (_, i) => {
            const x = i % level.size, y = Math.floor(i / level.size);
            const isT = pos[0] === x && pos[1] === y;
            const isG = level.goal[0] === x && level.goal[1] === y;
            const isR = level.rocks.some(([a, b]) => a === x && b === y);
            return (
              <div key={i} className="rounded-xl bg-white border border-emerald-200 flex items-center justify-center text-4xl"
                style={{ width: cell, height: cell }}>
                {isT ? "🦊" : isG ? "🍓" : isR ? "🪨" : ""}
              </div>
            );
          })}
        </div>
      </div>

      {tab === "dile" && (
        <div className="flex flex-wrap gap-2 justify-center mt-3">
          <button onClick={listen} className={`rounded-full px-4 py-2 text-lg font-bold ${listening ? "bg-red-400 text-white" : "bg-sky-100"}`}>
            {listening ? "👂 Слушаю… / Listening…" : "🎤 Сказать / Speak"}
          </button>
          <input value={said} onChange={(e) => fromWords(e.target.value)} placeholder="два направо и один вниз"
            className="rounded-full border-2 border-sky-200 px-4 py-2 text-lg w-80 max-w-full" />
        </div>
      )}

      <div className="mt-3 min-h-[3.5rem] flex flex-wrap justify-center gap-1 items-center">
        {prog.length ? prog.map((d, i) => (
          <button key={i} onClick={() => (tab === "arregla" ? fixAt(i) : setProg((p) => p.filter((_, j) => j !== i)))}
            className="rounded-lg bg-amber-100 hover:bg-amber-200 text-3xl w-12 h-12" title="нажми / tap">{ARROW[d]}</button>
        )) : <span className="text-slate-400 text-lg">{tab === "dile" ? "Здесь появится программа / The program appears here" : "Программа пустая / Empty program"}</span>}
      </div>

      {tab === "bloques" && (
        <div className="flex justify-center gap-2 mt-2">
          {(["U", "D", "L", "R"] as Dir[]).map((d) => (
            <button key={d} onClick={() => setProg((p) => (p.length < 30 ? [...p, d] : p))}
              className="rounded-2xl bg-emerald-400 hover:bg-emerald-500 text-4xl w-16 h-16">{ARROW[d]}</button>
          ))}
        </div>
      )}

      <div className="text-center text-xl font-bold mt-2 min-h-[2rem] text-slate-700">{msg}</div>
      <div className="flex flex-wrap justify-center gap-3 mt-2">
        <button onClick={() => run()} disabled={!prog.length || running}
          className="rounded-full bg-emerald-500 disabled:bg-slate-200 text-white px-6 py-3 text-xl font-bold">▶️ Запуск / Run</button>
        <button onClick={() => reset()} className="rounded-full bg-slate-100 hover:bg-slate-200 px-6 py-3 text-xl font-bold">🧽 Стереть / Clear</button>
        {msg.startsWith("🍓") && (
          <button onClick={() => setLi((i) => i + 1)} className="rounded-full bg-amber-400 hover:bg-amber-500 px-6 py-3 text-xl font-bold">➡️ Новый уровень / Next level</button>
        )}
        <button onClick={tell} disabled={!wins.length}
          className="rounded-full bg-green-500 disabled:bg-slate-200 disabled:text-slate-400 text-white px-6 py-3 text-xl font-bold">✨ Рассказать Мишке и Лисе</button>
      </div>
      <div className="text-xs text-slate-400 text-center mt-2">
        Программа - это список команд по порядку: алгоритм. / A program is a list of instructions in order: an algorithm.
      </div>
    </div>
  );
}
