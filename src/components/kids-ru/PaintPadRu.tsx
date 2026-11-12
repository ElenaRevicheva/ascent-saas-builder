import { useCallback, useEffect, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

// 12 Nov 2026 (Elena: the Russian classroom must have everything Pere & Titi's has - paint, music, photos - the same
// interface, in Russian + English): a COPY of src/components/kids/PaintPad.tsx, texts in Russian + English. The original stays
// untouched (Pere & Titi's classroom is never changed by the Russian one). Logic is the same; only words and content differ.

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

// The coloring pages are the same line art as Pere & Titi's (public/kids/paint), named in Russian + English. Pere and
// Titi's own two pages are left out (they are not this classroom's heroes). `ru` completes "Мой рисунок: ..." (nominative),
// `place` is one true fact the heroes may tell.
type Page = { id: string; ru: string; en: string; label: string; place?: string };
const PAINT_SETS: { title: string; pages: Page[] }[] = [
  // 12 Nov 2026 (Elena: "Panama nature, Chiriquí should be changed to Russian; add matryoshkas, the Russian folk costume and
  // Russian food"): our own line art in public/kids-ru/paint (ids start with "ru-"). Each `place` is one true fact.
  { title: "Матрёшки и народный костюм / Matryoshkas and folk costume", pages: [
    { id: "ru-matryoshka", ru: "матрёшка", en: "a matryoshka doll", label: "🪆 Матрёшка",
      place: "деревянная кукла, внутри которой прячутся куклы поменьше / a wooden doll with smaller dolls hidden inside" },
    { id: "ru-matryoshki", ru: "три матрёшки", en: "three matryoshka dolls", label: "🪆 Три матрёшки / Three dolls",
      place: "большая, средняя и маленькая / big, middle and small" },
    { id: "ru-sarafan", ru: "девочка в сарафане и кокошнике", en: "a girl in a sarafan and kokoshnik", label: "👗 Сарафан / Sarafan",
      place: "сарафан и кокошник - старинный русский праздничный наряд / the sarafan and kokoshnik are an old Russian festive costume" },
    { id: "ru-kosovorotka", ru: "мальчик в косоворотке с балалайкой", en: "a boy in a kosovorotka shirt with a balalaika", label: "🎸 Косоворотка / Shirt",
      place: "у косоворотки ворот сбоку; у балалайки три струны / the kosovorotka opens at the side; the balalaika has three strings" },
    { id: "ru-kokoshnik", ru: "кокошник", en: "a kokoshnik headdress", label: "👑 Кокошник",
      place: "праздничный головной убор, его украшали бусинами / a festive headdress decorated with beads" },
  ] },
  { title: "Русская еда / Russian food", pages: [
    { id: "ru-bliny", ru: "блины с мёдом", en: "bliny pancakes with honey", label: "🥞 Блины / Bliny",
      place: "блины пекут на Масленицу, они круглые, как солнце / bliny are baked for Maslenitsa, round like the sun" },
    { id: "ru-samovar", ru: "самовар с баранками", en: "a samovar with bagels", label: "🫖 Самовар / Samovar",
      place: "в самоваре кипятят воду для чая / a samovar boils water for tea" },
    { id: "ru-pelmeni", ru: "пельмени", en: "pelmeni dumplings", label: "🥟 Пельмени / Pelmeni",
      place: "тесто, а внутри начинка / dough with a filling inside" },
    { id: "ru-karavai", ru: "каравай с солью", en: "a karavai loaf with salt", label: "🍞 Каравай / Loaf",
      place: "хлебом и солью встречают дорогих гостей / dear guests are welcomed with bread and salt" },
    { id: "ru-borshch", ru: "борщ со сметаной", en: "borscht with sour cream", label: "🥣 Борщ / Borscht",
      place: "борщ красный от свёклы / borscht is red because of beetroot" },
  ] },
  { title: "Русская природа / Russian nature", pages: [
    { id: "ru-polyana", ru: "полянка с ягодами, грибами и ёжиками", en: "a glade with berries, mushrooms and hedgehogs", label: "🦔 Полянка / Glade",
      place: "летом в русском лесу на полянках растут земляника и грибы / in summer, wild strawberries and mushrooms grow in Russian forest glades" },
    { id: "ru-bor", ru: "сосновый бор с еловыми шишками", en: "a pine forest with spruce cones", label: "🌲 Бор / Pine forest",
      place: "бор - это сосновый лес; еловые шишки длинные и висят вниз / a bor is a pine forest; spruce cones are long and hang down" },
    { id: "ru-bereza", ru: "берёзки", en: "birch trees", label: "🌳 Берёзки / Birches",
      place: "у берёзы белая кора с чёрными полосками / the birch has white bark with black stripes" },
    { id: "ru-medved", ru: "медведь с мёдом", en: "a bear with honey", label: "🐻 Медведь / Bear",
      place: "медведь спит всю зиму в берлоге / the bear sleeps all winter in its den" },
    { id: "ru-ezhik", ru: "ёжик", en: "a hedgehog", label: "🦔 Ёжик / Hedgehog",
      place: "ёжик сворачивается в колючий клубок / the hedgehog curls into a prickly ball" },
    { id: "ru-belka", ru: "белка", en: "a squirrel", label: "🐿️ Белка / Squirrel",
      place: "белка прячет орехи на зиму / the squirrel hides nuts for the winter" },
    { id: "ru-yolka", ru: "ёлка в снегу", en: "a fir tree in the snow", label: "🎄 Ёлка / Fir tree",
      place: "ёлка зелёная даже зимой / the fir tree stays green even in winter" },
    { id: "ru-griby", ru: "боровик и мухомор", en: "a porcini and a fly agaric", label: "🍄 Грибы / Mushrooms",
      place: "мухомор красный с белыми точками, его нельзя есть / the fly agaric is red with white dots and must never be eaten" },
  ] },
  { title: "Россия и сказки / Russia and fairy tales", pages: [
    { id: "ru-hram", ru: "храм с куполами", en: "a church with onion domes", label: "⛪ Купола / Domes",
      place: "купола похожи на луковицы / the domes look like onions" },
    { id: "ru-izba", ru: "изба", en: "a log house", label: "🏡 Изба / Log house",
      place: "деревянный дом из брёвен с резными окнами / a wooden house of logs with carved windows" },
    { id: "ru-zhar-ptitsa", ru: "Жар-птица", en: "the Firebird", label: "🔥 Жар-птица / Firebird",
      place: "птица из русской сказки, её перья светятся / a bird from a Russian fairy tale whose feathers glow" },
  ] },
  { title: "Сказка / Fantasy", pages: [
    { id: "unicornio", ru: "единорог", en: "a unicorn", label: "🦄 Единорог" },
    { id: "dinosaurio", ru: "динозавр", en: "a dinosaur", label: "🦕 Динозавр" },
    { id: "arcoiris", ru: "радуга", en: "a rainbow", label: "🌈 Радуга" },
    { id: "castillo", ru: "замок", en: "a castle", label: "🏰 Замок" },
  ] },
  { title: "Герои и приключения / Heroes and adventures", pages: [
    { id: "superheroe", ru: "супергерой", en: "a superhero", label: "🦸 Супергерой" },
    { id: "cohete", ru: "ракета", en: "a rocket", label: "🚀 Ракета" },
    { id: "robot", ru: "робот", en: "a robot", label: "🤖 Робот" },
    { id: "pirata", ru: "пиратский корабль", en: "a pirate ship", label: "🏴‍☠️ Корабль" },
    { id: "corona", ru: "корона и волшебная палочка", en: "a crown and a magic wand", label: "👑 Корона" },
  ] },
  { title: "Ещё единороги / More unicorns", pages: [
    { id: "unicornio-nube", ru: "единорог на облаке", en: "a unicorn on a cloud", label: "🦄 Облако / Cloud" },
    { id: "unicornio-arcoiris", ru: "единорог с радугой", en: "a unicorn with a rainbow", label: "🦄 Радуга / Rainbow" },
    { id: "unicornio-alas", ru: "единорог с крыльями", en: "a unicorn with wings", label: "🦄 Крылья / Wings" },
    { id: "unicornio-flores", ru: "единорог в саду", en: "a unicorn in the garden", label: "🦄 Сад / Garden" },
  ] },
  { title: "Фигуры / Shapes", pages: [
    { id: "figuras", ru: "фигуры: круг, квадрат, треугольник и другие", en: "the shapes: circle, square, triangle and more", label: "🔷 Фигуры / Shapes" },
    { id: "casa-figuras", ru: "домик из фигур", en: "a house made of shapes", label: "🏠 Домик / House" },
    { id: "tren-figuras", ru: "поезд из фигур", en: "a train made of shapes", label: "🚂 Поезд / Train" },
  ] },
  { title: "Лабиринты / Mazes", pages: [
    { id: "laberinto-facil", ru: "дорожка в лёгком лабиринте", en: "the path of the easy maze", label: "🌀 Лёгкий / Easy" },
    { id: "laberinto-medio", ru: "дорожка в среднем лабиринте", en: "the path of the medium maze", label: "🌀 Средний / Medium" },
    { id: "laberinto-dificil", ru: "дорожка в трудном лабиринте", en: "the path of the hard maze", label: "🌀 Трудный / Hard" },
  ] },
  { title: "По порядку: что сначала? / Step by step: what comes first?", pages: [
    { id: "secuencia-payaso", ru: "клоун собирается", en: "the clown getting ready", label: "🤡 Клоун / Clown",
      place: "(порядок: сначала штаны, потом ботинки, потом раскраска лица и в конце красный нос) / (order: first the pants, then the shoes, then the face paint and last the red nose)" },
    { id: "secuencia-manana", ru: "моё утро перед школой", en: "my school morning", label: "🎒 Утро / Morning",
      place: "(порядок: просыпаюсь, надеваю форму, завтракаю и беру рюкзак) / (order: I wake up, put on my uniform, have breakfast and take my backpack)" },
    { id: "secuencia-mariposa", ru: "жизнь бабочки", en: "the life of a butterfly", label: "🦋 Бабочка / Butterfly",
      place: "(порядок: яйца на листе, гусеница ест, куколка, бабочка) / (order: eggs on a leaf, the caterpillar eats, the chrysalis, the butterfly)" },
    { id: "secuencia-planta", ru: "как растёт семечко", en: "how a seed grows", label: "🌱 Семечко / Seed",
      place: "(порядок: сажаю семечко, поливаю, появляется росток, вырастает цветок) / (order: I plant the seed, I water it, a sprout comes out, a flower grows)" },
    { id: "secuencia-sandwich", ru: "как я делаю бутерброд", en: "how I make a sandwich", label: "🥪 Бутерброд / Sandwich",
      place: "(порядок: кусок хлеба, сыр, второй кусок, режу на треугольники) / (order: a slice of bread, cheese, another slice, I cut it into triangles)" },
  ] },
];
const pageSrc = (id: string) => (id.startsWith("ru-") ? `/kids-ru/paint/${id}.svg` : `/kids/paint/${id}.svg`);
const BLANK: Page = { id: "blank", ru: "мой собственный рисунок", en: "my own picture", label: "⬜ Свой / Free" };

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
  if (l < 0.15) return "чёрный / black";
  if (s < 0.15) return "серый / grey";
  if (h >= 15 && h < 45 && l < 0.45) return "коричневый / brown";
  if (h >= 15 && h < 45 && l > 0.65) return "бежевый / beige";
  if (h < 15 || h >= 345) return "красный / red";
  if (h < 45) return "оранжевый / orange";
  if (h < 68) return "жёлтый / yellow";
  if (h < 165) return "зелёный / green";
  if (h < 200) return "голубой / light blue";
  if (h < 255) return "синий / blue";
  if (h < 290) return "фиолетовый / purple";
  return "розовый / pink";
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

export default function PaintPadRu({ onPainted }: Props) {
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
    img.src = pageSrc(page.id);
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
        await navigator.share({ files: [file], title: "Мой рисунок / My painting" });
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
    onPainted(`🎨 Мой рисунок: ${page.ru}${placeEs ? ` (${placeEs})` : ""} / I painted ${page.en}${placeEn ? ` ${placeEn}` : ""}` +
      (top.length ? `. Цвета: ${es} / Colours: ${en}` : ""));
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
      aria-label="Цвет / Colour" />
  );
  const swatches = (cls: string) => SWATCHES.map((c) => (
    <button key={c} onClick={() => { setColour(c); if (tool === "eraser") setTool("brush"); }}
      className={`${cls} rounded-full border-4 shadow ${colour === c && tool !== "eraser" ? "border-slate-900 scale-110" : "border-white"}`}
      style={{ background: c }} aria-label={colourName(c) ?? "белый / white"} />
  ));
  return (
    <div className="flex flex-col gap-3">
      {/* What to paint: pick a set, then a page - or free paper. */}
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
              : <img src={pageSrc(p.id)} alt="" className="h-14 w-full object-contain" />}
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
          <img src={pageSrc(page.id)} alt={page.label}
            className="absolute inset-0 w-full h-full pointer-events-none select-none" draggable={false} />
        )}
      </div>

      {side && (
        <div className="shrink-0 flex flex-col items-center gap-3" aria-label="Цвета / Colours">
          {current}
          <div className="flex gap-2">
            <div {...strip(pickHue, true)} className="relative w-10 rounded-full shadow-inner cursor-pointer"
              aria-label="Радуга / Rainbow" style={{ touchAction: "none", background: `linear-gradient(to bottom, ${rainbow})` }}>
              <div className="absolute left-0 w-10 h-3 -mt-1.5 rounded-full border-4 border-white shadow" style={{ top: `${(hue / 359) * 100}%` }} />
            </div>
            <div {...strip(pickShade, true)} className="relative w-10 rounded-full shadow-inner cursor-pointer"
              aria-label="Темнее - светлее / Dark - light" style={{ touchAction: "none", background: `linear-gradient(to bottom, ${shades})` }}>
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
            aria-label="Радуга / Rainbow"
            style={{ touchAction: "none", background: `linear-gradient(to right, ${rainbow})` }}>
            <div className="absolute top-0 h-12 w-3 -ml-1.5 rounded-full border-4 border-white shadow" style={{ left: `${(hue / 359) * 100}%` }} />
          </div>
          <div {...strip(pickShade)} className="relative h-12 rounded-full shadow-inner cursor-pointer"
            aria-label="Темнее - светлее / Dark - light"
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
          <button key={s} onClick={() => { setSize(i); if (tool === "fill") setTool("brush"); }} aria-label={`Кисть ${i + 1} / Brush ${i + 1}`}
            className={`w-14 h-14 rounded-full grid place-items-center shadow ${size === i && tool !== "fill" ? "bg-sky-400" : "bg-sky-100"}`}>
            <span className="rounded-full bg-slate-900" style={{ width: Math.max(6, s * 0.8), height: Math.max(6, s * 0.8) }} />
          </button>
        ))}
        <button onClick={() => setTool("brush")} className={`${big} ${tool === "brush" ? "bg-sky-400 text-white" : "bg-sky-100"}`}>🖌️ Кисть</button>
        <button onClick={() => setTool("fill")} className={`${big} ${tool === "fill" ? "bg-sky-400 text-white" : "bg-sky-100"}`}>🪣 Заливка</button>
        <button onClick={() => setTool("eraser")} className={`${big} ${tool === "eraser" ? "bg-sky-400 text-white" : "bg-sky-100"}`}>🧽 Ластик</button>
        <button onClick={back} disabled={!undoCount} className={`${big} ${undoCount ? "bg-amber-100" : "bg-slate-100 opacity-50"}`}>↩️ Назад</button>
        {confirmClear ? (
          <span className="flex gap-2">
            <button onClick={blank} className={`${big} bg-red-500 text-white`}>🗑️ Всё? Да</button>
            <button onClick={() => setConfirmClear(false)} className={`${big} bg-slate-100`}>✖️ Нет</button>
          </span>
        ) : (
          <button onClick={() => setConfirmClear(true)} disabled={!painted} className={`${big} ${painted ? "bg-slate-100" : "bg-slate-100 opacity-50"}`}>🗑️ Очистить</button>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <button onClick={done} disabled={!painted || sent}
          className={`rounded-full px-8 py-4 text-2xl font-extrabold shadow-xl ${painted && !sent ? "bg-yellow-300 hover:bg-yellow-400" : "bg-slate-200 opacity-60"}`}>
          ✨ Готово! / Done!
        </button>
        <button onClick={save} disabled={!painted} className={`rounded-full px-6 py-4 text-xl font-bold shadow ${painted ? "bg-emerald-100 hover:bg-emerald-200" : "bg-slate-100 opacity-50"}`}>
          💾 Сохранить / Save
        </button>
        {canShare && (
          <button onClick={share} disabled={!painted} className={`rounded-full px-6 py-4 text-xl font-bold shadow ${painted ? "bg-violet-100 hover:bg-violet-200" : "bg-slate-100 opacity-50"}`}>
            📤 Поделиться / Share
          </button>
        )}
      </div>
    </div>
  );
}
