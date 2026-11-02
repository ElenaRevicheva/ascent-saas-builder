import { useCallback, useEffect, useRef, useState } from "react";
import PaintPad from "@/components/kids/PaintPad";

// 1 Nov 2026 (Elena: "she will be very happy if she can write something, especially on the tablet"): in a class, the
// child traces today's letter / syllable / word (sent by the kids brain for her unit) with her finger, in colour, like
// painting. When most of the shape is covered she has "written" it - Pere and Titi react and she earns a star. Nothing
// is stored: the drawing lives only on her screen. A scribble over the whole pad does not count.
const W = 900;
const H = 420;
const CELL = 6; // coverage is measured on a 6-px grid
const PEN = ["#f97316", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"];
const FONT = '"Comic Sans MS", "Chalkboard SE", "Nunito", "Trebuchet MS", sans-serif';

interface Props {
  targets: string[];
  onTraced: (text: string) => void;
  onClose: () => void;
  // 2 Nov 2026: the 🎨 Pintar mode (PaintPad) - "✨ Listo" sends what she painted to Pere and Titi.
  onPainted?: (text: string) => void;
  initialMode?: Mode;
}

// 1 Nov 2026 (Alisa, first test: "I want to trace numbers, not letters"): she chooses letters, numbers or - Elena,
// same day - short sentences. Sentences come in pairs with the same meaning, Spanish first and then English, so she
// writes one idea in both languages (Cambridge Pre A1 Starters themes: feelings, family, home, greetings). Each is
// under 20 characters so the heroes' "✏️ Tracé" turn still recognises it.
const NUMBERS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
const SENTENCES = ["Te quiero", "I love you", "Yo soy feliz", "I am happy", "Me gusta el sol", "I like the sun",
  "Buenos días", "Good morning", "Mi casa es bonita", "My home is nice"];
type Mode = "letters" | "numbers" | "sentences" | "paint";
const MODES: { mode: Mode; label: string }[] = [
  { mode: "letters", label: "🔤 Letras" }, { mode: "numbers", label: "🔢 Números" }, { mode: "sentences", label: "💬 Frases" },
  { mode: "paint", label: "🎨 Pintar" },
];

export default function TracePad({ targets: letters, onTraced, onClose, onPainted, initialMode = "letters" }: Props) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const targets = mode === "numbers" ? NUMBERS : mode === "sentences" ? SENTENCES : letters;
  const canvas = useRef<HTMLCanvasElement>(null);
  const mask = useRef<Uint8Array>(new Uint8Array(0)); // 1 = the letter is here
  const hit = useRef<Uint8Array>(new Uint8Array(0)); // 1 = her finger passed here
  const maskCells = useRef(1);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [hint, setHint] = useState("");
  const target = targets[index % targets.length] ?? "a";
  const colour = PEN[index % PEN.length];
  const gw = Math.ceil(W / CELL);
  const gh = Math.ceil(H / CELL);

  // Big for a letter, smaller for a word; a sentence shrinks until it fits the pad with a margin.
  const fontFor = (t: string, ctx: CanvasRenderingContext2D) => {
    let size = t.length <= 2 ? 300 : t.length <= 4 ? 210 : 140;
    ctx.font = `bold ${size}px ${FONT}`;
    while (ctx.measureText(t).width > W - 60 && size > 50) {
      size -= 6;
      ctx.font = `bold ${size}px ${FONT}`;
    }
    return ctx.font;
  };

  const reset = useCallback(() => {
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    // The shape to follow: big, soft grey, with a dotted outline.
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    const font = fontFor(target, ctx);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#e2e8f0";
    ctx.fillText(target, W / 2, H / 2 + 10);
    ctx.setLineDash([6, 8]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#94a3b8";
    ctx.strokeText(target, W / 2, H / 2 + 10);
    ctx.setLineDash([]);
    // Where the letter is, on the coverage grid.
    const off = document.createElement("canvas");
    off.width = W;
    off.height = H;
    const o = off.getContext("2d");
    if (!o) return;
    o.font = font;
    o.textAlign = "center";
    o.textBaseline = "middle";
    o.fillStyle = "#000";
    o.fillText(target, W / 2, H / 2 + 10);
    const px = o.getImageData(0, 0, W, H).data;
    const m = new Uint8Array(gw * gh);
    let n = 0;
    for (let gy = 0; gy < gh; gy++) {
      for (let gx = 0; gx < gw; gx++) {
        const x = Math.min(W - 1, gx * CELL + CELL / 2);
        const y = Math.min(H - 1, gy * CELL + CELL / 2);
        if (px[(y * W + x) * 4 + 3] > 0) { m[gy * gw + gx] = 1; n++; }
      }
    }
    mask.current = m;
    maskCells.current = Math.max(1, n);
    hit.current = new Uint8Array(gw * gh);
    setDone(false);
    setHint("");
  }, [target, gw, gh]);

  useEffect(() => { reset(); }, [reset, mode]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
  };

  const mark = (x: number, y: number) => {
    const rad = 3; // ~18 px around her fingertip
    const cx = Math.floor(x / CELL);
    const cy = Math.floor(y / CELL);
    for (let dy = -rad; dy <= rad; dy++) {
      for (let dx = -rad; dx <= rad; dx++) {
        const gx = cx + dx;
        const gy = cy + dy;
        if (gx >= 0 && gy >= 0 && gx < gw && gy < gh) hit.current[gy * gw + gx] = 1;
      }
    }
  };

  const check = () => {
    if (done) return;
    let inside = 0;
    let outside = 0;
    for (let i = 0; i < hit.current.length; i++) {
      if (!hit.current[i]) continue;
      if (mask.current[i]) inside++;
      else outside++;
    }
    const coverage = inside / maskCells.current;
    if (outside > maskCells.current * 3) { setHint("¡Sigue la letra gris! / Follow the grey letter!"); return; }
    if (coverage >= 0.6) {
      setDone(true);
      setHint("");
      onTraced(target);
    }
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    last.current = point(e);
    mark(last.current.x, last.current.y);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!last.current) return;
    const ctx = canvas.current?.getContext("2d");
    const p = point(e);
    if (ctx) {
      ctx.strokeStyle = colour;
      // 1 Nov 2026 (Elena, Lenovo Tab Pen: "the handwriting is very large, make it thin"): a pen draws a thin,
      // pressure-sensitive line like a real pencil; a finger gets a medium marker. Coverage (mark) is unchanged.
      // 22:15 UTC, after testing ("still not thin, impossible to use"): thinner again - pen 2-6 px, finger 10 px.
      // 22:50 UTC (Elena: "much better, just a little bit thicker"): pen 3-9 px.
      ctx.lineWidth = e.pointerType === "pen" ? 3 + 6 * (e.pressure || 0.5) : 10;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(last.current.x, last.current.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    const steps = Math.max(1, Math.ceil(Math.hypot(p.x - last.current.x, p.y - last.current.y) / CELL));
    for (let s = 1; s <= steps; s++) {
      mark(last.current.x + ((p.x - last.current.x) * s) / steps, last.current.y + ((p.y - last.current.y) * s) / steps);
    }
    last.current = p;
  };

  const up = () => {
    last.current = null;
    check();
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-white/95 rounded-3xl shadow-2xl p-4 border-4 border-amber-300">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="text-xl font-bold text-slate-700">
          {mode === "paint" ? "🎨 Pinta / Paint" : <>✏️ Traza / Trace: <span className="text-2xl">{target}</span></>}
        </div>
        <div className="flex gap-1">
          {MODES.map((m) => (
            <button key={m.mode} onClick={() => { setMode(m.mode); setIndex(0); }}
              className={`rounded-full px-3 py-2 text-base font-bold ${mode === m.mode ? "bg-sky-400 text-white" : "bg-sky-100 hover:bg-sky-200"}`}>
              {m.label}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="text-2xl px-3" aria-label="Cerrar / Close">✖️</button>
      </div>
      {mode === "paint" ? <PaintPad onPainted={(t) => onPainted?.(t)} /> : <>
      <canvas
        ref={canvas}
        width={W}
        height={H}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        className="w-full rounded-2xl bg-white border-2 border-slate-200"
        style={{ touchAction: "none" }}
      />
      {(done || hint) && (
        <div className={`text-center text-2xl font-bold mt-3 ${done ? "text-green-600" : "text-amber-600"}`}>
          {done ? `⭐ ¡Lo escribiste: "${target}"! ¡Ahora dilo! / You wrote it! Now say it!` : hint}
        </div>
      )}
      <div className="flex justify-center gap-4 mt-3">
        <button onClick={reset} className="rounded-full bg-slate-100 hover:bg-slate-200 px-6 py-3 text-xl font-bold">
          🧽 Borrar / Clear
        </button>
        {/* Elena: "one step at a time" - the next letter opens only after this one is traced. */}
        {done && (
          <button onClick={() => setIndex((i) => i + 1)} className="rounded-full bg-amber-400 hover:bg-amber-500 px-6 py-3 text-xl font-bold">
            ➡️ Otra / Next
          </button>
        )}
      </div>
      </>}
    </div>
  );
}
