# Usage: python scripts/gen_pages.py public/kids/paint   (rewrites only the 15 pages it owns)
"""Generate original coloring pages for the EspaLuz classroom paint pad (4 Nov 2026).
All line art is drawn here from basic shapes - no copied characters (copyright-safe).
Writes into ascent-saas-builder/public/kids/paint/."""
import os, random, re, sys

OUT = sys.argv[1]
FONT = "Comic Sans MS, Chalkboard SE, Nunito, Trebuchet MS, sans-serif"
HEAD = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">\n<title>{t}</title>\n'
G = '<g fill="none" stroke="#111" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">\n'


def text(x, y, s, size=22, anchor="middle"):
    s = s.replace("&", "&amp;")
    return (f'<text x="{x}" y="{y}" font-family="{FONT}" font-size="{size}" font-weight="bold" fill="#111" '
            f'text-anchor="{anchor}">{s}</text>\n')


def save(name, title, body, labels=""):
    with open(os.path.join(OUT, name + ".svg"), "w", encoding="utf-8", newline="\n") as f:
        f.write(HEAD.format(t=title) + G + body + "</g>\n" + labels + "</svg>\n")


def star(cx, cy, r, r2=None):
    import math
    r2 = r2 or r * 0.45
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        rr = r if i % 2 == 0 else r2
        pts.append(f"{cx + rr * math.cos(a):.0f} {cy + rr * math.sin(a):.0f}")
    return f'<path d="M {" L ".join(pts)} Z"/>\n'


def heart(cx, cy, s):
    return (f'<path d="M {cx} {cy + s} C {cx - 2*s} {cy - s*0.2}, {cx - s} {cy - 1.4*s}, {cx} {cy - 0.5*s} '
            f'C {cx + s} {cy - 1.4*s}, {cx + 2*s} {cy - s*0.2}, {cx} {cy + s} Z"/>\n')


def flower(cx, cy, r=16, stem=60):
    b = f'<path d="M {cx} {cy + r} L {cx} {cy + r + stem}"/>\n'
    b += f'<path d="M {cx} {cy + r + stem*0.6} C {cx + 25} {cy + r + stem*0.3}, {cx + 35} {cy + r + stem*0.5}, {cx} {cy + r + stem*0.7}"/>\n'
    for dx, dy in [(0, -1), (1, 0), (0, 1), (-1, 0), (0.7, -0.7), (-0.7, -0.7), (0.7, 0.7), (-0.7, 0.7)][:6 if r < 14 else 8]:
        b += f'<circle cx="{cx + dx*r*1.3:.0f}" cy="{cy + dy*r*1.3:.0f}" r="{r*0.75:.0f}"/>\n'
    b += f'<circle cx="{cx}" cy="{cy}" r="{r*0.7:.0f}"/>\n'
    return b


def cloud(x, y, w):
    h = w * 0.35
    return (f'<path d="M {x} {y} C {x - w*0.15} {y - h}, {x + w*0.2} {y - h*1.6}, {x + w*0.35} {y - h*0.9} '
            f'C {x + w*0.45} {y - h*2}, {x + w*0.8} {y - h*1.6}, {x + w*0.8} {y - h*0.8} '
            f'C {x + w*1.05} {y - h*0.9}, {x + w*1.1} {y}, {x + w*0.9} {y} Z"/>\n')


# ---------- unicorns: the existing original unicorn, placed in new scenes ----------
src = open(os.path.join(OUT, "unicornio.svg"), encoding="utf-8").read()
inner = src.split(G.strip(), 1)[1].rsplit("</g>", 1)[0] if G.strip() in src else None
if inner is None:
    m = re.search(r"<g[^>]*>(.*)</g>", src, re.S)
    inner = m.group(1)
uni = "\n".join(l for l in inner.splitlines() if not l.strip().startswith("<rect"))  # without the ground bar

# 1) on a cloud at night
b = f'<g transform="translate(70 0) scale(0.85)">{uni}</g>\n'
b += ('<path d="M 130 530 C 95 495, 140 455, 185 468 C 205 440, 265 440, 280 462 C 310 440, 370 442, 385 464 '
      'C 415 440, 480 442, 495 464 C 525 442, 590 448, 595 470 C 650 470, 660 525, 625 535 C 500 545, 250 545, 130 530 Z"/>\n')
b += '<path d="M 110 120 A 55 55 0 1 0 170 60 A 42 42 0 1 1 110 120 Z"/>\n'  # moon
b += star(300, 70, 24) + star(720, 300, 20) + star(80, 300, 18) + star(420, 40, 14) + star(740, 80, 16)
save("unicornio-nube", "Unicornio en una nube / Unicorn on a cloud", b)

# 2) with a rainbow and hearts
b = f'<g transform="translate(120 40) scale(0.85)">{uni}</g>\n'
for r in (140, 112, 84):
    b += f'<path d="M {170 - r} 250 A {r} {r} 0 0 1 {170 + r} 250"/>\n'
b += cloud(10, 262, 110) + cloud(255, 262, 110)
b += heart(80, 470, 22) + heart(720, 420, 18) + heart(690, 520, 14)
b += '<path d="M 60 560 L 740 560"/>\n'
save("unicornio-arcoiris", "Unicornio con arcoíris / Unicorn with a rainbow", b)

# 3) with wings
b = uni + '<rect x="100" y="530" width="600" height="30" rx="15"/>\n'
b += ('<path d="M 330 300 C 300 230, 250 180, 180 160 C 200 190, 190 200, 165 205 C 195 225, 190 240, 160 250 '
      'C 200 265, 205 280, 185 300 C 230 305, 280 310, 330 300 Z"/>\n')
b += '<path d="M 300 290 C 270 260, 235 230, 200 215"/>\n<path d="M 305 300 C 270 285, 230 268, 195 262"/>\n'
b += star(90, 90, 22) + star(720, 360, 18) + star(380, 60, 16)
save("unicornio-alas", "Unicornio con alas / Unicorn with wings", b)

# 4) in a flower garden with a butterfly
b = uni + '<rect x="100" y="530" width="600" height="30" rx="15"/>\n'
b += flower(150, 430, 16, 70) + flower(220, 470, 12, 40) + flower(640, 440, 16, 64) + flower(720, 470, 12, 40)
b += ('<path d="M 160 120 C 120 80, 90 110, 110 140 C 90 165, 130 185, 160 150 Z"/>'
      '<path d="M 170 120 C 210 80, 240 110, 220 140 C 240 165, 200 185, 170 150 Z"/>'
      '<path d="M 165 110 L 165 160"/><path d="M 165 110 C 160 95, 150 90, 145 92"/><path d="M 165 110 C 170 95, 180 90, 185 92"/>\n')
b += heart(700, 120, 18)
save("unicornio-flores", "Unicornio en el jardín / Unicorn in the garden", b)

# ---------- shapes ----------
SH = [("círculo", "circle"), ("cuadrado", "square"), ("triángulo", "triangle"), ("rectángulo", "rectangle"),
      ("óvalo", "oval"), ("rombo", "diamond"), ("estrella", "star"), ("corazón", "heart"),
      ("pentágono", "pentagon"), ("hexágono", "hexagon")]


def shape(name, cx, cy, s):
    import math
    if name == "círculo": return f'<circle cx="{cx}" cy="{cy}" r="{s}"/>\n'
    if name == "cuadrado": return f'<rect x="{cx - s}" y="{cy - s}" width="{2*s}" height="{2*s}"/>\n'
    if name == "triángulo": return f'<path d="M {cx} {cy - s} L {cx + s*1.1:.0f} {cy + s} L {cx - s*1.1:.0f} {cy + s} Z"/>\n'
    if name == "rectángulo": return f'<rect x="{cx - s*1.4:.0f}" y="{cy - s*0.8:.0f}" width="{s*2.8:.0f}" height="{s*1.6:.0f}"/>\n'
    if name == "óvalo": return f'<ellipse cx="{cx}" cy="{cy}" rx="{s*1.3:.0f}" ry="{s*0.85:.0f}"/>\n'
    if name == "rombo": return f'<path d="M {cx} {cy - s} L {cx + s*0.8:.0f} {cy} L {cx} {cy + s} L {cx - s*0.8:.0f} {cy} Z"/>\n'
    if name == "estrella": return star(cx, cy + 4, s * 1.1)
    if name == "corazón": return heart(cx, cy, s * 0.75)
    n = 5 if name == "pentágono" else 6
    pts = [f"{cx + s*math.cos(-math.pi/2 + i*2*math.pi/n):.0f} {cy + s*math.sin(-math.pi/2 + i*2*math.pi/n):.0f}" for i in range(n)]
    return f'<path d="M {" L ".join(pts)} Z"/>\n'


b, lab = "", text(400, 40, "Las figuras / Shapes", 28)
for i, (es, en) in enumerate(SH):
    cx, cy = 85 + (i % 5) * 157, 155 + (i // 5) * 250
    b += shape(es, cx, cy, 55)
    lab += text(cx, cy + 95, es, 20) + text(cx, cy + 118, en, 18)
save("figuras", "Las figuras / Shapes", b, lab)

# a house made of shapes
b = '<rect x="250" y="290" width="300" height="230"/>\n'                       # square-ish body
b += '<path d="M 225 295 L 400 150 L 575 295 Z"/>\n'                             # triangle roof
b += '<rect x="370" y="400" width="70" height="120"/>\n<circle cx="425" cy="465" r="6"/>\n'  # door
b += '<rect x="280" y="330" width="65" height="65"/>\n<rect x="465" y="330" width="65" height="65"/>\n'
b += '<circle cx="400" cy="235" r="28"/>\n'                                      # round window
b += '<circle cx="680" cy="110" r="45"/>\n' + "".join(
    f'<path d="M {680 + 60*c:.0f} {110 + 60*s:.0f} L {680 + 80*c:.0f} {110 + 80*s:.0f}"/>\n'
    for c, s in [(1, 0), (-1, 0), (0, 1), (0, -1), (0.7, 0.7), (-0.7, 0.7), (0.7, -0.7), (-0.7, -0.7)])
b += '<rect x="110" y="400" width="34" height="120"/>\n<ellipse cx="127" cy="345" rx="70" ry="75"/>\n'
b += '<path d="M 40 520 L 760 520"/>\n' + cloud(60, 140, 140)
lab = text(400, 575, "Busca: círculos, cuadrados, triángulos / Find: circles, squares, triangles", 20)
save("casa-figuras", "La casa de figuras / The house of shapes", b, lab)

# a train made of shapes
b = '<path d="M 30 500 L 770 500"/>\n<path d="M 30 520 L 770 520"/>\n'
b += '<rect x="520" y="300" width="210" height="150"/>\n<rect x="600" y="220" width="110" height="80"/>\n'
b += '<rect x="545" y="240" width="35" height="60"/>\n<path d="M 535 240 L 590 240"/>\n'
b += '<path d="M 730 450 L 770 450 L 730 400 Z"/>\n<rect x="625" y="240" width="60" height="45"/>\n'
b += cloud(520, 200, 70) + cloud(470, 150, 60)
for x in (560, 640, 705):
    b += f'<circle cx="{x}" cy="470" r="28"/>\n<circle cx="{x}" cy="470" r="8"/>\n'
for x0 in (290, 60):
    b += f'<rect x="{x0}" y="330" width="200" height="120"/>\n<path d="M {x0 + 200} 420 L {x0 + 230} 420"/>\n'
    for x in (x0 + 45, x0 + 155):
        b += f'<circle cx="{x}" cy="470" r="28"/>\n<circle cx="{x}" cy="470" r="8"/>\n'
b += shape("triángulo", 340, 370, 25) + shape("estrella", 440, 380, 28)
b += shape("círculo", 110, 380, 26) + shape("rombo", 210, 385, 34)
lab = text(400, 70, "El tren de figuras / The shape train", 28)
save("tren-figuras", "El tren de figuras / The shape train", b, lab)

# ---------- mazes ----------
def maze(name, title, cols, rows, seed):
    random.seed(seed)
    x0, y0, x1, y1 = 110, 95, 690, 545
    cw, ch = (x1 - x0) / cols, (y1 - y0) / rows
    walls = {(c, r, d) for c in range(cols) for r in range(rows) for d in "NESW"}
    seen, stack = {(0, 0)}, [(0, 0)]
    D = {"N": (0, -1, "S"), "S": (0, 1, "N"), "E": (1, 0, "W"), "W": (-1, 0, "E")}
    while stack:
        c, r = stack[-1]
        opts = [(d, c + dx, r + dy, o) for d, (dx, dy, o) in D.items()
                if 0 <= c + dx < cols and 0 <= r + dy < rows and (c + dx, r + dy) not in seen]
        if not opts:
            stack.pop(); continue
        d, nc, nr, o = random.choice(opts)
        walls.discard((c, r, d)); walls.discard((nc, nr, o))
        seen.add((nc, nr)); stack.append((nc, nr))
    walls.discard((0, 0, "W")); walls.discard((cols - 1, rows - 1, "E"))  # entrance and exit
    segs = set()
    for c, r, d in walls:
        xa, ya = x0 + c * cw, y0 + r * ch
        seg = {"N": (xa, ya, xa + cw, ya), "S": (xa, ya + ch, xa + cw, ya + ch),
               "W": (xa, ya, xa, ya + ch), "E": (xa + cw, ya, xa + cw, ya + ch)}[d]
        segs.add(tuple(round(v) for v in seg))
    b = "".join(f'<path d="M {a} {b_} L {c} {d}"/>\n' for a, b_, c, d in sorted(segs))
    b += star(60, y0 + ch / 2, 30)
    hx, hy = 740, y1 - ch / 2
    b += f'<rect x="{hx - 30}" y="{hy - 10:.0f}" width="60" height="45"/>\n<path d="M {hx - 40} {hy - 8:.0f} L {hx} {hy - 45:.0f} L {hx + 40} {hy - 8:.0f}"/>\n'
    lab = text(400, 50, title, 26) + text(60, y0 + ch / 2 + 60, "inicio", 18) + text(740, y1 + 40, "casa / home", 18)
    save(name, title, b.replace("stroke-width", "stroke-width"), lab)


maze("laberinto-facil", "Laberinto fácil / Easy maze", 6, 5, 7)
maze("laberinto-medio", "Laberinto medio / Medium maze", 9, 7, 11)
maze("laberinto-dificil", "Laberinto difícil / Hard maze", 13, 10, 23)

# ---------- step-by-step sequences (panels shuffled; she writes 1-4 in the boxes) ----------
P = [(30, 70), (410, 70), (30, 335), (410, 335)]
PW, PH = 360, 245


def seq(name, title, panels):
    b, lab = "", text(400, 45, "¿Qué va primero? Escribe 1, 2, 3, 4 / What comes first? Write 1, 2, 3, 4", 17)
    for (x, y), (es, en, art) in zip(P, panels):
        b += f'<rect x="{x}" y="{y}" width="{PW}" height="{PH}" rx="18"/>\n<rect x="{x + 14}" y="{y + 14}" width="48" height="48" rx="8"/>\n'
        b += f'<g transform="translate({x + PW // 2} {y + 105})">{art}</g>\n'
        lab += text(x + PW // 2, y + PH - 38, es, 19) + text(x + PW // 2, y + PH - 14, en, 17)
    save(name, title, b, lab)


face = '<circle cx="0" cy="0" r="52"/><circle cx="-18" cy="-10" r="6" fill="#111"/><circle cx="18" cy="-10" r="6" fill="#111"/>'
clown_pants = ('<path d="M -60 -60 L 60 -60 L 72 65 L 12 65 L 0 -5 L -12 65 L -72 65 Z"/><path d="M -40 -60 L -40 -95"/>'
               '<path d="M 40 -60 L 40 -95"/><circle cx="-35" cy="10" r="8"/><circle cx="35" cy="25" r="8"/><circle cx="-20" cy="45" r="7"/>')
clown_shoes = ('<path d="M -110 40 C -110 0, -60 -10, -20 10 L -10 40 Z"/><path d="M 10 40 C 10 0, 60 -10, 110 10 C 125 20, 120 40, 110 40 Z"/>'
               '<path d="M -60 -5 L -60 -50"/><path d="M -30 -5 L -30 -50"/><path d="M 40 -5 L 40 -50"/><path d="M 70 -5 L 70 -50"/>')
clown_makeup = (face + '<path d="M -30 15 C -15 40, 15 40, 30 15"/>' + star(-18, -12, 16).replace("\n", "") +
                '<rect x="70" y="-60" width="16" height="70" rx="4" transform="rotate(25 78 -25)"/><path d="M 95 -70 L 104 -88 L 110 -66"/>')
clown_nose = (face + '<circle cx="0" cy="8" r="14"/><path d="M -30 25 C -15 45, 15 45, 30 25"/>'
              '<circle cx="-55" cy="-35" r="18"/><circle cx="-62" cy="-5" r="16"/><circle cx="55" cy="-35" r="18"/><circle cx="62" cy="-5" r="16"/>'
              '<path d="M -35 -48 L 0 -105 L 35 -48 Z"/><circle cx="0" cy="-110" r="8"/>')
seq("secuencia-payaso", "El payaso se prepara / The clown gets ready", [
    ("Se pinta la cara", "Paints his face", clown_makeup),
    ("Se pone los pantalones", "Puts on his pants", clown_pants),
    ("Se pone la nariz roja", "Puts on the red nose", clown_nose),
    ("Se pone los zapatos", "Puts on the shoes", clown_shoes)])

leaf = '<path d="M -90 40 C -40 -40, 60 -40, 100 30 C 50 60, -40 70, -90 40 Z"/><path d="M -90 40 L 100 30"/>'
seq("secuencia-mariposa", "La vida de la mariposa / The life of a butterfly", [
    ("La crisálida", "The chrysalis", '<path d="M -100 -70 L 100 -70"/><path d="M 0 -70 L 0 -55"/>'
     '<path d="M 0 -55 C 35 -40, 35 30, 0 60 C -35 30, -35 -40, 0 -55 Z"/><path d="M -20 -15 L 20 -15"/><path d="M -18 15 L 18 15"/>'),
    ("Los huevos en la hoja", "Eggs on a leaf", leaf + '<circle cx="-20" cy="10" r="9"/><circle cx="2" cy="4" r="9"/><circle cx="24" cy="10" r="9"/>'),
    ("La mariposa", "The butterfly", '<path d="M 0 -30 C -40 -90, -110 -70, -90 -10 C -110 40, -40 60, 0 20 Z"/>'
     '<path d="M 0 -30 C 40 -90, 110 -70, 90 -10 C 110 40, 40 60, 0 20 Z"/><path d="M 0 -45 L 0 50"/>'
     '<path d="M 0 -45 C -5 -65, -18 -75, -26 -72"/><path d="M 0 -45 C 5 -65, 18 -75, 26 -72"/>'),
    ("La oruga come", "The caterpillar eats", '<path d="M -120 60 L 120 60"/>' + "".join(
        f'<circle cx="{-70 + i*30}" cy="{30 - (8 if i % 2 else 0)}" r="20"/>' for i in range(5)) +
     '<circle cx="85" cy="10" r="24"/><circle cx="93" cy="4" r="4" fill="#111"/><path d="M 80 -12 L 70 -40"/><path d="M 92 -12 L 102 -40"/>')])

ground = '<path d="M -130 55 L 130 55"/>'
seq("secuencia-planta", "Una semilla crece / A seed grows", [
    ("Sale un brote", "A sprout comes out", ground + '<path d="M 0 55 L 0 -10"/><path d="M 0 10 C -40 -20, -60 0, -50 15 C -30 20, -15 18, 0 10 Z"/>'
     '<path d="M 0 -5 C 40 -35, 60 -15, 50 0 C 30 5, 15 3, 0 -5 Z"/>'),
    ("Crece una flor", "A flower grows", ground + flower(0, -50, 18, 85).replace("\n", "")),
    ("Pongo la semilla", "I plant the seed", ground + '<path d="M -50 55 C -50 95, 50 95, 50 55"/><ellipse cx="0" cy="70" rx="14" ry="9"/>'
     '<path d="M -60 -60 C -40 -30, -20 -10, -5 40"/>'),
    ("Riego con agua", "I water it", ground + '<rect x="-20" y="-40" width="80" height="60" rx="10"/><path d="M -20 -25 L -80 -55"/>'
     '<path d="M 60 -30 C 95 -30, 95 10, 60 10"/><path d="M -88 -40 L -92 -25"/><path d="M -100 -30 L -105 -12"/><path d="M -76 -28 L -80 -10"/>')])

seq("secuencia-manana", "Mi mañana de escuela / My school morning", [
    ("Desayuno", "I have breakfast", '<path d="M -100 10 C -100 70, -10 70, -10 10 Z"/><path d="M -110 10 L 0 10"/>'
     '<path d="M -30 -40 L -60 5"/><rect x="25" y="-20" width="50" height="70" rx="6"/><path d="M 75 0 C 100 0, 100 30, 75 30"/>'
     '<path d="M -80 -20 C -60 -60, -20 -60, 0 -40 C -30 -45, -55 -40, -80 -20 Z"/>'),
    ("Me despierto a las 6:30", "I wake up at 6:30", '<rect x="-120" y="10" width="150" height="45" rx="8"/><rect x="-115" y="-12" width="50" height="24" rx="10"/>'
     '<circle cx="85" cy="-15" r="45"/><path d="M 85 -15 L 85 -48"/><path d="M 85 -15 L 85 20"/><path d="M 55 -55 L 45 -68"/><path d="M 115 -55 L 125 -68"/>'),
    ("Llevo mi mochila", "I take my backpack", '<rect x="-55" y="-60" width="110" height="130" rx="30"/><rect x="-35" y="10" width="70" height="45" rx="10"/>'
     '<path d="M -25 -60 C -25 -95, 25 -95, 25 -60"/><path d="M -35 30 L 35 30"/>'),
    ("Me pongo el uniforme", "I put on my uniform", '<path d="M -40 -65 L -95 -35 L -75 0 L -55 -12 L -55 70 L 55 70 L 55 -12 L 75 0 L 95 -35 L 40 -65 '
     'C 25 -40, -25 -40, -40 -65 Z"/><path d="M 0 -45 L 0 70"/><circle cx="12" cy="-10" r="4"/><circle cx="12" cy="20" r="4"/><circle cx="12" cy="50" r="4"/>')])

bread = '<path d="M -75 55 L -75 -20 C -105 -30, -95 -75, -50 -70 L 50 -70 C 95 -75, 105 -30, 75 -20 L 75 55 Z"/>'
seq("secuencia-sandwich", "Preparo un sándwich / I make a sandwich", [
    ("Pongo queso y jamón", "I add cheese and ham", bread + '<path d="M -80 -5 C -40 10, 0 -15, 40 0 C 60 8, 75 0, 85 -5"/>'
     '<path d="M -70 -35 L 70 -35 L 60 20 L -60 20 Z"/>'),
    ("Lo corto en triángulos", "I cut it into triangles", '<path d="M -90 60 L 0 60 L -90 -40 Z"/><path d="M 10 50 L 100 -50 L 100 50 Z"/>'),
    ("Tomo una rebanada de pan", "I take a slice of bread", bread),
    ("Pongo otra rebanada", "I put another slice on top", bread + '<path d="M -75 -20 L 75 -20"/><path d="M -80 5 L 80 5"/><path d="M -78 30 L 78 30"/>')])
print("ok")
