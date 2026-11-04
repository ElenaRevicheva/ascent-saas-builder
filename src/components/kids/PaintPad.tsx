import { useCallback, useEffect, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

// 2 Nov 2026 (Elena: "Alisa wants to paint little paintings, not just trace. A rainbow palette with many colors, a truly
// colorful palette, picked with the pen. And examples of what to paint: Pere and Titi, flora and fauna of Metropolitan
// Natural Park in Panama"): the 🎨 Pintar mode of the tracing pad. Plain canvas, no library. She paints on the bottom
// layer; the coloring page's black outlines are an <img> on top, so they always stay visible, and the bucket stops at
// them. Any colour: a rainbow strip picks the hue, a second strip the shade (dark -> light), plus 16 ready swatches.
// Nothing is uploaded or stored: "✨ Listo" tells Pere and Titi in words what she painted and with which colours, and the
// picture can be saved to the tablet or shared from it.
const W = 800;
const H = 600;
const UNDO_STEPS = 20;
const SIZES = [6, 14, 26, 44]; // brush widths for a finger; a pen's pressure scales them
const SWATCHES = [
  "#e11d48", "#f97316", "#facc15", "#84cc16", "#16a34a", "#166534", "#38bdf8", "#2563eb",
  "#7c3aed", "#ec4899", "#f8d5b8", "#d4a373", "#8d5524", "#78350f", "#9ca3af", "#111827",
];

// The coloring pages (public/kids/paint), in three sets: Pere and Titi; the plants and animals of Parque Natural
// Metropolitano; and - 2 Nov 2026 (Elena: she and Alisa will live two years in Boquete) - Chiriquí, Volcán Barú and
// Boquete. `es` / `en` complete the sentence "Pinté ... / I painted ..." the heroes hear; `place` names where it lives,
// so the heroes can tell one true thing about that place.
type Page = { id: string; es: string; en: string; label: string; place?: string };
const PAINT_SETS: { title: string; pages: Page[] }[] = [
  { title: "Pere y Titi", pages: [
    { id: "pere", es: "a Pere el perezoso", en: "Pere the sloth", label: "🦥 Pere" },
    { id: "titi", es: "a Titi el tití", en: "Titi the tamarin", label: "🐒 Titi" },
  ] },
  { title: "Parque Natural Metropolitano (Ciudad de Panamá) / Metropolitan Natural Park (Panama City)", pages: [
    { id: "tucan", es: "un tucán", en: "a toucan", label: "Tucán / Toucan" },
    { id: "morpho", es: "una mariposa morfo azul", en: "a blue morpho butterfly", label: "Mariposa / Butterfly" },
    { id: "neque", es: "un ñeque", en: "an agouti", label: "Ñeque / Agouti" },
    { id: "coati", es: "un coatí", en: "a coati", label: "Coatí / Coati" },
    { id: "rana", es: "una rana de ojos rojos", en: "a red-eyed tree frog", label: "Rana / Frog" },
    { id: "heliconia", es: "una flor de heliconia", en: "a heliconia flower", label: "Heliconia" },
    { id: "guayacan", es: "un árbol de guayacán", en: "a guayacán tree", label: "Guayacán / Tree" },
    { id: "iguana", es: "una iguana", en: "an iguana", label: "Iguana" },
  ].map((p) => ({ ...p, place: "del Parque Natural Metropolitano / from the Metropolitan Natural Park" })) },
  { title: "Chiriquí: Volcán Barú y Boquete / Chiriquí: Barú Volcano and Boquete", pages: [
    { id: "baru", es: "el Volcán Barú", en: "Barú Volcano", label: "Volcán Barú" },
    { id: "quetzal", es: "un quetzal", en: "a quetzal", label: "Quetzal" },
    { id: "cafe", es: "una rama de café", en: "a coffee branch", label: "Café / Coffee" },
    { id: "colibri", es: "un colibrí", en: "a hummingbird", label: "Colibrí / Hummingbird" },
    { id: "cascada", es: "una cascada", en: "a waterfall", label: "Cascada / Waterfall" },
    { id: "fresa", es: "una fresa", en: "a strawberry", label: "Fresa / Strawberry" },
    { id: "orquidea", es: "una orquídea", en: "an orchid", label: "Orquídea / Orchid" },
    { id: "puente", es: "un puente colgante", en: "a hanging bridge", label: "Puente / Bridge" },
  ].map((p) => ({ ...p, place: "de Chiriquí, Volcán Barú y Boquete / from Chiriquí, Barú Volcano and Boquete" })) },
  // 3 Nov 2026 (Elena: "more examples - all the Panama flora and fauna, plus unicorns, dinosaurs, heroes"). Each `place`
  // is one true fact the heroes may tell. Heroes are our own generic ones: no studio's cartoon characters (copyright).
  { title: "Panamá: mar y selva / Panama: sea and rainforest", pages: [
    { id: "arpia", es: "un águila arpía", en: "a harpy eagle", label: "Águila arpía / Harpy eagle",
      place: "el ave nacional de Panamá, de la selva del Darién / Panama's national bird, from the Darién rainforest" },
    { id: "ranadorada", es: "una rana dorada", en: "a golden frog", label: "Rana dorada / Golden frog",
      place: "de El Valle de Antón / from El Valle de Antón" },
    { id: "tortuga", es: "una tortuga marina", en: "a sea turtle", label: "Tortuga / Turtle",
      place: "de las playas de Panamá / from Panama's beaches" },
    { id: "ballena", es: "una ballena jorobada", en: "a humpback whale", label: "Ballena / Whale",
      place: "de las Islas de las Perlas / from the Pearl Islands" },
    { id: "espiritusanto", es: "la flor del Espíritu Santo", en: "the Holy Ghost orchid", label: "Flor nacional / National flower",
      place: "la flor nacional de Panamá / Panama's national flower" },
  ] },
  { title: "Fantasía / Fantasy", pages: [
    { id: "unicornio", es: "un unicornio", en: "a unicorn", label: "🦄 Unicornio" },
    { id: "dinosaurio", es: "un dinosaurio", en: "a dinosaur", label: "🦕 Dinosaurio" },
    { id: "arcoiris", es: "un arcoíris", en: "a rainbow", label: "🌈 Arcoíris" },
    { id: "castillo", es: "un castillo", en: "a castle", label: "🏰 Castillo" },
  ] },
  { title: "Héroes y aventuras / Heroes and adventures", pages: [
    { id: "superheroe", es: "una superheroína", en: "a superhero", label: "🦸 Superhéroe" },
    { id: "cohete", es: "un cohete", en: "a rocket", label: "🚀 Cohete" },
    { id: "robot", es: "un robot", en: "a robot", label: "🤖 Robot" },
    { id: "pirata", es: "un barco pirata", en: "a pirate ship", label: "🏴‍☠️ Barco pirata" },
    { id: "corona", es: "una corona y una varita mágica", en: "a crown and a magic wand", label: "👑 Corona" },
  ] },
  // 4 Nov 2026 (Elena: Alisa wants more unicorns; plus shapes, mazes and step-by-step daily routines for 6-8 year olds,
  // in line with the Cambridge Primary themes - 2D shapes, life cycles, plants, daily routines, sequencing words). All
  // original line art from basic shapes (no studio characters). For a sequence `place` carries the right order, so the
  // heroes can talk about "primero / después / al final" with her.
  { title: "Más unicornios / More unicorns", pages: [
    { id: "unicornio-nube", es: "un unicornio en una nube", en: "a unicorn on a cloud", label: "🦄 En la nube / On a cloud" },
    { id: "unicornio-arcoiris", es: "un unicornio con arcoíris", en: "a unicorn with a rainbow", label: "🦄 Arcoíris / Rainbow" },
    { id: "unicornio-alas", es: "un unicornio con alas", en: "a unicorn with wings", label: "🦄 Con alas / Wings" },
    { id: "unicornio-flores", es: "un unicornio en el jardín", en: "a unicorn in the garden", label: "🦄 Jardín / Garden" },
  ] },
  { title: "Figuras / Shapes", pages: [
    { id: "figuras", es: "las figuras: círculo, cuadrado, triángulo y más", en: "the shapes: circle, square, triangle and more", label: "🔷 Figuras / Shapes" },
    { id: "casa-figuras", es: "una casa hecha de figuras", en: "a house made of shapes", label: "🏠 Casa de figuras" },
    { id: "tren-figuras", es: "un tren hecho de figuras", en: "a train made of shapes", label: "🚂 Tren de figuras" },
  ] },
  { title: "Laberintos / Mazes", pages: [
    { id: "laberinto-facil", es: "el camino del laberinto fácil", en: "the path of the easy maze", label: "🌀 Fácil / Easy" },
    { id: "laberinto-medio", es: "el camino del laberinto medio", en: "the path of the medium maze", label: "🌀 Medio / Medium" },
    { id: "laberinto-dificil", es: "el camino del laberinto difícil", en: "the path of the hard maze", label: "🌀 Difícil / Hard" },
  ] },
  { title: "Paso a paso: ¿qué va primero? / Step by step: what comes first?", pages: [
    { id: "secuencia-payaso", es: "los pasos del payaso que se prepara", en: "the steps of the clown getting ready", label: "🤡 Payaso / Clown",
      place: "(orden: primero los pantalones, después los zapatos, luego la cara pintada y al final la nariz roja) / (order: first the pants, then the shoes, then the face paint and last the red nose)" },
    { id: "secuencia-manana", es: "mi mañana de escuela", en: "my school morning", label: "🎒 Mi mañana / My morning",
      place: "(orden: me despierto a las 6:30, me pongo el uniforme, desayuno y llevo mi mochila) / (order: I wake up at 6:30, put on my uniform, have breakfast and take my backpack)" },
    { id: "secuencia-mariposa", es: "la vida de la mariposa", en: "the life of a butterfly", label: "🦋 Mariposa / Butterfly",
      place: "(orden: huevos en la hoja, la oruga come, la crisálida, la mariposa) / (order: eggs on a leaf, the caterpillar eats, the chrysalis, the butterfly)" },
    { id: "secuencia-planta", es: "cómo crece una semilla", en: "how a seed grows", label: "🌱 Semilla / Seed",
      place: "(orden: pongo la semilla, riego con agua, sale un brote, crece una flor) / (order: I plant the seed, I water it, a sprout comes out, a flower grows)" },
    { id: "secuencia-sandwich", es: "cómo preparo un sándwich", en: "how I make a sandwich", label: "🥪 Sándwich",
      place: "(orden: una rebanada de pan, queso y jamón, otra rebanada, lo corto en triángulos) / (order: a slice of bread, cheese and ham, another slice, I cut it into triangles)" },
  ] },
];
const BLANK: Page = { id: "blank", es: "mi propio dibujo", en: "my own picture", label: "⬜ Libre / Free" };

const hex2 = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0");
function hslToHex(h: number, s: number, l: number): string {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return 255 * (l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
  };
  return `#${hex2(f(0))}${hex2(f(8))}${hex2(f(4))}`;
}
const rgbOf = (hex: string): [number, number, number] =>
  [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];

/** The colour's name in both languages, so the heroes can say "you used yellow". */
function colourName(hex: string): string | null {
  const [r, g, b] = rgbOf(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) h = max === r ? 60 * (((g - b) / d) % 6) : max === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
  if (h < 0) h += 360;
  if (l > 0.93) return null; // white is the paper
  if (l < 0.15) return "negro / black";
  if (s < 0.15) return "gris / grey";
  if (h >= 15 && h < 45 && l < 0.45) return "marrón / brown";
  if (h >= 15 && h < 45 && l > 0.65) return "beige / beige";
  if (h < 15 || h >= 345) return "rojo / red";
  if (h < 45) return "naranja / orange";
  if (h < 68) return "amarillo / yellow";
  if (h < 165) return "verde / green";
  if (h < 200) return "celeste / light blue";
  if (h < 255) return "azul / blue";
  if (h < 290) return "morado / purple";
  return "rosado / pink";
}

/** Scanline flood fill on the paint layer: spreads over pixels like the one tapped, never across an outline. */
function floodFill(ctx: CanvasRenderingContext2D, wall: Uint8Array | null, x0: number, y0: number, hex: string): number {
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  const start = y0 * W + x0;
  if (wall?.[start]) return 0;
  const [sr, sg, sb] = [d[start * 4], d[start * 4 + 1], d[start * 4 + 2]];
  const [nr, ng, nb] = rgbOf(hex);
  if (Math.abs(sr - nr) + Math.abs(sg - ng) + Math.abs(sb - nb) < 6) return 0;
  const seen = new Uint8Array(W * H);
  const like = (i: number) => !seen[i] && !(wall && wall[i]) &&
    Math.abs(d[i * 4] - sr) + Math.abs(d[i * 4 + 1] - sg) + Math.abs(d[i * 4 + 2] - sb) <= 60;
  const stack = [start];
  let n = 0;
  while (stack.length) {
    let i = stack.pop() as number;
    const y = Math.floor(i / W);
    let x = i - y * W;
    while (x > 0 && like(i - 1)) { i--; x--; }
    let up = false;
    let down = false;
    while (x < W && like(i)) {
      seen[i] = 1;
      n++;
      if (y > 0) { if (like(i - W)) { if (!up) { stack.push(i - W); up = true; } } else up = false; }
      if (y < H - 1) { if (like(i + W)) { if (!down) { stack.push(i + W); down = true; } } else down = false; }
      i++;
      x++;
    }
  }
  // One pixel more all round, so no pale halo is left at the soft edge of her own brush lines.
  const grow = seen.slice();
  for (let i = 0; i < W * H; i++) {
    if (!seen[i]) continue;
    const x = i % W;
    for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) {
      if (j >= 0 && j < W * H && !(wall && wall[j])) grow[j] = 1;
    }
  }
  for (let i = 0; i < W * H; i++) {
    if (!grow[i]) continue;
    d[i * 4] = nr; d[i * 4 + 1] = ng; d[i * 4 + 2] = nb; d[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return n;
}

type Tool = "brush" | "fill" | "eraser";

interface Props {
  onPainted: (text: string) => void;
}

export default function PaintPad({ onPainted }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const wall = useRef<Uint8Array | null>(null); // 1 = a template outline is here (the bucket stops)
  const outline = useRef<HTMLImageElement | null>(null);
  const undo = useRef<ImageData[]>([]);
  const used = useRef<Map<string, number>>(new Map()); // colour name -> how much of it she painted
  const last = useRef<{ x: number; y: number } | null>(null);
  const [page, setPage] = useState<Page>(BLANK);
  const [setIdx, setSetIdx] = useState(0);
  const [hue, setHue] = useState(200);
  const [shade, setShade] = useState(50);
  const [colour, setColour] = useState("#2563eb");
  const [size, setSize] = useState(1);
  const [tool, setTool] = useState<Tool>("brush");
  const [undoCount, setUndoCount] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);
  const [painted, setPainted] = useState(false);
  const [sent, setSent] = useState(false);

  const blank = useCallback(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    undo.current = [];
    setUndoCount(0);
    used.current = new Map();
    setPainted(false);
    setSent(false);
    setConfirmClear(false);
  }, []);

  // A new page: clean paper, and the outline map the bucket respects.
  useEffect(() => {
    blank();
    wall.current = null;
    outline.current = null;
    if (page.id === "blank") return;
    let alive = true;
    const img = new Image();
    img.onload = () => {
      if (!alive) return;
      const off = document.createElement("canvas");
      off.width = W;
      off.height = H;
      const o = off.getContext("2d");
      if (!o) return;
      o.drawImage(img, 0, 0, W, H);
      const px = o.getImageData(0, 0, W, H).data;
      const m = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) m[i] = px[i * 4 + 3] > 40 ? 1 : 0;
      wall.current = m;
      outline.current = img;
    };
    img.src = `/kids/paint/${page.id}.svg`;
    return () => { alive = false; };
  }, [page, blank]);

  const remember = () => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    undo.current.push(ctx.getImageData(0, 0, W, H));
    if (undo.current.length > UNDO_STEPS) undo.current.shift();
    setUndoCount(undo.current.length);
  };
  const tally = (amount: number) => {
    if (tool === "eraser") return;
    const name = colourName(colour);
    if (!name) return;
    used.current.set(name, (used.current.get(name) ?? 0) + amount);
    setPainted(true);
    setSent(false);
  };

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
  };

  const width = (e: React.PointerEvent) =>
    // Same idea as the tracing pen (1 Nov): the Lenovo pen's pressure makes the line thinner or thicker.
    e.pointerType === "pen" ? SIZES[size] * (0.35 + 0.9 * (e.pressure || 0.5)) : SIZES[size];

  const dab = (ctx: CanvasRenderingContext2D, from: { x: number; y: number }, to: { x: number; y: number }, w: number) => {
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : colour;
    ctx.lineWidth = w;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x + 0.01, to.y);
    ctx.stroke();
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const p = point(e);
    setConfirmClear(false);
    if (tool === "fill") {
      if (page.id !== "blank" && !wall.current) return; // the outlines are still loading: the bucket would flood the page
      remember();
      const n = floodFill(ctx, wall.current, Math.floor(Math.min(W - 1, Math.max(0, p.x))), Math.floor(Math.min(H - 1, Math.max(0, p.y))), colour);
      if (n) tally(n / 40);
      else { undo.current.pop(); setUndoCount(undo.current.length); }
      return;
    }
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* a pointer the browser no longer tracks */ }
    remember();
    last.current = p;
    dab(ctx, p, p, width(e));
    tally(1);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!last.current) return;
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const p = point(e);
    dab(ctx, last.current, p, width(e));
    tally(Math.hypot(p.x - last.current.x, p.y - last.current.y) * SIZES[size] / 40);
    last.current = p;
  };

  const up = () => { last.current = null; };

  const back = () => {
    const ctx = canvas.current?.getContext("2d");
    const snap = undo.current.pop();
    if (ctx && snap) ctx.putImageData(snap, 0, 0);
    setUndoCount(undo.current.length);
  };

  // The rainbow strip picks the hue, the shade strip how dark or light it is; both follow a finger or pen dragged along.
  // A strip lies across under the canvas on a phone, and stands up beside it on a tablet (top = 0, bottom = 1).
  const strip = (pick: (f: number) => void, vertical = false) => {
    const at = (e: React.PointerEvent<HTMLDivElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      return Math.max(0, Math.min(1, vertical ? (e.clientY - r.top) / r.height : (e.clientX - r.left) / r.width));
    };
    return {
      onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* a pointer the browser no longer tracks */ }
        pick(at(e));
      },
      onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
        pick(at(e));
      },
    };
  };
  const pickHue = (f: number) => {
    const h = Math.round(f * 359);
    setHue(h);
    setColour(hslToHex(h, 90, shade));
    if (tool === "eraser") setTool("brush");
  };
  const pickShade = (f: number) => {
    const l = Math.round(6 + f * 88);
    setShade(l);
    setColour(hslToHex(hue, 90, l));
    if (tool === "eraser") setTool("brush");
  };

  /** Her picture as one PNG: the paint, then the outlines on top. */
  const picture = (): Promise<Blob | null> => {
    const out = document.createElement("canvas");
    out.width = W;
    out.height = H;
    const o = out.getContext("2d");
    if (!o || !canvas.current) return Promise.resolve(null);
    o.drawImage(canvas.current, 0, 0);
    if (outline.current) o.drawImage(outline.current, 0, 0, W, H);
    return new Promise((ok) => out.toBlob(ok, "image/png"));
  };
  const fileName = () => `espaluz-${page.id}-${new Date().toISOString().slice(0, 10)}.png`;
  const save = async () => {
    const blob = await picture();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName();
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };
  const share = async () => {
    const blob = await picture();
    if (!blob) return;
    const file = new File([blob], fileName(), { type: "image/png" });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Mi pintura / My painting" });
        return;
      }
    } catch { return; /* she closed the share sheet */ }
    await save(); // no share sheet on this device: keep it on the device instead
  };
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const done = () => {
    const top = [...used.current.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n]) => n);
    const es = top.map((n) => n.split(" / ")[0]).join(", ");
    const en = top.map((n) => n.split(" / ")[1]).join(", ");
    const [placeEs, placeEn] = (page.place ?? " / ").split(" / ");
    onPainted(`🎨 Pinté ${page.es}${placeEs ? ` ${placeEs}` : ""} / I painted ${page.en}${placeEn ? ` ${placeEn}` : ""}` +
      (top.length ? `. Colores: ${es} / Colours: ${en}` : ""));
    setSent(true);
  };

  const big = "rounded-2xl px-4 py-3 text-lg font-bold shadow min-h-[56px]";
  // 3 Nov 2026 (Elena: "the colours are down below; with the digital pen it is hard to reach them - put them on the
  // right or the left side"): on a tablet or laptop the palette is a column to the RIGHT of the canvas, so the pen goes
  // sideways to a colour and back instead of over the bottom of the picture. On a phone (< 768 px) it stays below.
  const side = !useIsMobile();
  const rainbow = "hsl(0,90%,50%), hsl(60,90%,50%), hsl(120,90%,45%), hsl(180,90%,45%), hsl(240,90%,55%), hsl(300,90%,50%), hsl(359,90%,50%)";
  const shades = `hsl(${hue},90%,6%), hsl(${hue},90%,50%), hsl(${hue},90%,94%)`;
  const current = (
    <div className={`shrink-0 ${side ? "w-14 h-14" : "w-16 h-16"} rounded-full border-4 border-white shadow-lg ring-2 ring-slate-300`}
      style={{ background: tool === "eraser" ? "repeating-conic-gradient(#e2e8f0 0 25%, #fff 0 50%) 50% / 16px 16px" : colour }}
      aria-label="Color / Colour" />
  );
  const swatches = (cls: string) => SWATCHES.map((c) => (
    <button key={c} onClick={() => { setColour(c); if (tool === "eraser") setTool("brush"); }}
      className={`${cls} rounded-full border-4 shadow ${colour === c && tool !== "eraser" ? "border-slate-900 scale-110" : "border-white"}`}
      style={{ background: c }} aria-label={colourName(c) ?? "blanco / white"} />
  ));
  return (
    <div className="flex flex-col gap-3">
      {/* What to paint: pick a set (Pere and Titi, the city park, Chiriquí), then a page - or free paper. */}
      <div className="flex flex-wrap gap-2">
        {PAINT_SETS.map((set, i) => (
          <button key={set.title} onClick={() => setSetIdx(i)}
            className={`rounded-2xl px-3 py-2 text-sm font-extrabold text-left min-h-[48px] max-w-[18rem]
              ${setIdx === i ? "bg-emerald-500 text-white" : "bg-emerald-50 hover:bg-emerald-100 text-emerald-900"}`}>
            {set.title}
          </button>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ touchAction: "pan-x" }}>
        {[BLANK, ...PAINT_SETS[setIdx].pages].map((p) => (
          <button key={p.id} onClick={() => setPage(p)} aria-label={p.label}
            className={`shrink-0 w-24 rounded-2xl border-4 bg-white p-1 text-xs font-bold leading-tight
              ${page.id === p.id ? "border-sky-500" : "border-slate-200"}`}>
            {p.id === "blank"
              ? <div className="h-14 grid place-items-center text-3xl">⬜</div>
              : <img src={`/kids/paint/${p.id}.svg`} alt="" className="h-14 w-full object-contain" />}
            <div className="mt-1">{p.label}</div>
          </button>
        ))}
      </div>

      <div className={side ? "flex gap-3 items-start" : "contents"}>
      <div className={`relative ${side ? "flex-1 min-w-0" : "w-full"}`} style={{ aspectRatio: `${W} / ${H}` }}>
        <canvas
          ref={canvas}
          width={W}
          height={H}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          className="absolute inset-0 w-full h-full rounded-2xl bg-white border-2 border-slate-200"
          style={{ touchAction: "none" }}
        />
        {page.id !== "blank" && (
          <img src={`/kids/paint/${page.id}.svg`} alt={page.label}
            className="absolute inset-0 w-full h-full pointer-events-none select-none" draggable={false} />
        )}
      </div>

      {side && (
        <div className="shrink-0 flex flex-col items-center gap-3" aria-label="Colores / Colours">
          {current}
          <div className="flex gap-2">
            <div {...strip(pickHue, true)} className="relative w-10 rounded-full shadow-inner cursor-pointer"
              aria-label="Arcoíris / Rainbow" style={{ touchAction: "none", background: `linear-gradient(to bottom, ${rainbow})` }}>
              <div className="absolute left-0 w-10 h-3 -mt-1.5 rounded-full border-4 border-white shadow" style={{ top: `${(hue / 359) * 100}%` }} />
            </div>
            <div {...strip(pickShade, true)} className="relative w-10 rounded-full shadow-inner cursor-pointer"
              aria-label="Oscuro - claro / Dark - light" style={{ touchAction: "none", background: `linear-gradient(to bottom, ${shades})` }}>
              <div className="absolute left-0 w-10 h-3 -mt-1.5 rounded-full border-4 border-white shadow" style={{ top: `${((shade - 6) / 88) * 100}%` }} />
            </div>
            <div className="grid grid-cols-2 gap-2">{swatches("w-10 h-10")}</div>
          </div>
        </div>
      )}
      </div>

      {/* The palette on a phone: any colour from the two strips, or a ready one. */}
      {!side && (<>
      <div className="flex items-center gap-3">
        {current}
        <div className="flex-1 flex flex-col gap-2">
          <div {...strip(pickHue)} className="relative h-12 rounded-full shadow-inner cursor-pointer"
            aria-label="Arcoíris / Rainbow"
            style={{ touchAction: "none", background: `linear-gradient(to right, ${rainbow})` }}>
            <div className="absolute top-0 h-12 w-3 -ml-1.5 rounded-full border-4 border-white shadow" style={{ left: `${(hue / 359) * 100}%` }} />
          </div>
          <div {...strip(pickShade)} className="relative h-12 rounded-full shadow-inner cursor-pointer"
            aria-label="Oscuro - claro / Dark - light"
            style={{ touchAction: "none", background: `linear-gradient(to right, ${shades})` }}>
            <div className="absolute top-0 h-12 w-3 -ml-1.5 rounded-full border-4 border-white shadow" style={{ left: `${((shade - 6) / 88) * 100}%` }} />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-8 gap-2">{swatches("h-12")}</div>
      </>)}

      {/* Tools: brush sizes, bucket, eraser, undo, clear. */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {SIZES.map((s, i) => (
          <button key={s} onClick={() => { setSize(i); if (tool === "fill") setTool("brush"); }} aria-label={`Pincel ${i + 1} / Brush ${i + 1}`}
            className={`w-14 h-14 rounded-full grid place-items-center shadow ${size === i && tool !== "fill" ? "bg-sky-400" : "bg-sky-100"}`}>
            <span className="rounded-full bg-slate-900" style={{ width: Math.max(6, s * 0.8), height: Math.max(6, s * 0.8) }} />
          </button>
        ))}
        <button onClick={() => setTool("brush")} className={`${big} ${tool === "brush" ? "bg-sky-400 text-white" : "bg-sky-100"}`}>🖌️ Pincel</button>
        <button onClick={() => setTool("fill")} className={`${big} ${tool === "fill" ? "bg-sky-400 text-white" : "bg-sky-100"}`}>🪣 Rellenar</button>
        <button onClick={() => setTool("eraser")} className={`${big} ${tool === "eraser" ? "bg-sky-400 text-white" : "bg-sky-100"}`}>🧽 Borrar</button>
        <button onClick={back} disabled={!undoCount} className={`${big} ${undoCount ? "bg-amber-100" : "bg-slate-100 opacity-50"}`}>↩️ Atrás</button>
        {confirmClear ? (
          <span className="flex gap-2">
            <button onClick={blank} className={`${big} bg-red-500 text-white`}>🗑️ ¿Todo? Sí</button>
            <button onClick={() => setConfirmClear(false)} className={`${big} bg-slate-100`}>✖️ No</button>
          </span>
        ) : (
          <button onClick={() => setConfirmClear(true)} disabled={!painted} className={`${big} ${painted ? "bg-slate-100" : "bg-slate-100 opacity-50"}`}>🗑️ Limpiar</button>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <button onClick={done} disabled={!painted || sent}
          className={`rounded-full px-8 py-4 text-2xl font-extrabold shadow-xl ${painted && !sent ? "bg-yellow-300 hover:bg-yellow-400" : "bg-slate-200 opacity-60"}`}>
          ✨ ¡Listo! / Done!
        </button>
        <button onClick={save} disabled={!painted} className={`rounded-full px-6 py-4 text-xl font-bold shadow ${painted ? "bg-emerald-100 hover:bg-emerald-200" : "bg-slate-100 opacity-50"}`}>
          💾 Guardar / Save
        </button>
        {canShare && (
          <button onClick={share} disabled={!painted} className={`rounded-full px-6 py-4 text-xl font-bold shadow ${painted ? "bg-violet-100 hover:bg-violet-200" : "bg-slate-100 opacity-50"}`}>
            📤 Compartir / Share
          </button>
        )}
      </div>
    </div>
  );
}
