"""Rebuild Elena's creator QR in her own design, pointing at a new address.
usage: python -I make_qr.py <original.jpg> <out.png> <url>
Design copied from the original: 1280px, curvy violet modules on a black->violet
vertical gradient, dotted finder rings with a grey dot, her photo in a centre circle.
"""
import sys, math
import qrcode
from PIL import Image, ImageDraw, ImageChops

src, out, url = sys.argv[1], sys.argv[2], sys.argv[3]
S = 4                      # supersampling
SIZE = 1280
QUIET = 69                 # measured from the original
TOP, BOT = (14, 0, 22), (150, 0, 196)   # gradient ends (sampled look of the original)
GREY = (91, 94, 101)
PHOTO_R = 190              # photo circle radius in the original

qr = qrcode.QRCode(version=4, error_correction=qrcode.constants.ERROR_CORRECT_H, border=0)
qr.add_data(url); qr.make(fit=False)
m = qr.get_matrix(); n = len(m)
mod = (SIZE - 2 * QUIET) / n
cx = cy = SIZE / 2

def is_finder(r, c):
    return (r < 7 and c < 7) or (r < 7 and c >= n - 7) or (r >= n - 7 and c < 7)

def in_photo(r, c):
    x = QUIET + (c + .5) * mod; y = QUIET + (r + .5) * mod
    return math.hypot(x - cx, y - cy) < PHOTO_R + mod * 0.35

def dark(r, c):
    return 0 <= r < n and 0 <= c < n and m[r][c] and not is_finder(r, c) and not in_photo(r, c)

# --- data modules as a mask (white = ink) --------------------------------
mask = Image.new("L", (SIZE * S, SIZE * S), 0)
d = ImageDraw.Draw(mask)
k = mod * S
for r in range(n):
    for c in range(n):
        if not dark(r, c):
            continue
        x0 = (QUIET + c * mod) * S; y0 = (QUIET + r * mod) * S
        up, dn, lf, rt = dark(r-1, c), dark(r+1, c), dark(r, c-1), dark(r, c+1)
        K = int(round(k)) + 1
        a = Image.new("L", (K, K), 0); b = Image.new("L", (K, K), 0)
        # leaf look: big round on exposed top-left / bottom-right, soft round on the other two
        ImageDraw.Draw(a).rounded_rectangle([0, 0, K - 1, K - 1], radius=K * 0.5, fill=255,
            corners=(not up and not lf, False, not dn and not rt, False))
        ImageDraw.Draw(b).rounded_rectangle([0, 0, K - 1, K - 1], radius=K * 0.38, fill=255,
            corners=(False, not up and not rt, False, not dn and not lf))
        tile = ImageChops.multiply(a, b)
        if not (up or dn or lf or rt):          # a lone module is a round dot, as in the original
            tile = Image.new("L", (K, K), 0)
            ImageDraw.Draw(tile).ellipse([K * .08, K * .08, K * .92, K * .92], fill=255)
        mask.paste(255, (int(x0), int(y0)), tile)

grad = Image.new("RGB", (SIZE * S, SIZE * S))
gd = ImageDraw.Draw(grad)
for y in range(SIZE * S):
    t = min(1, max(0, (y / S - QUIET) / (SIZE - 2 * QUIET)))
    gd.line([(0, y), (SIZE * S, y)], fill=tuple(int(a + (b - a) * t) for a, b in zip(TOP, BOT)))

canvas = Image.new("RGB", (SIZE * S, SIZE * S), "white")
canvas.paste(grad, (0, 0), mask)
cd = ImageDraw.Draw(canvas)

# --- finders: ring of 24 slightly tilted black squares + grey dot ----------
import random
random.seed(7)
for (fr, fc) in [(0, 0), (0, n - 7), (n - 7, 0)]:
    for i in range(7):
        for j in range(7):
            if i in (0, 6) or j in (0, 6):
                x = (QUIET + (fc + j + .5) * mod) * S; y = (QUIET + (fr + i + .5) * mod) * S
                h = k * 0.44; a = math.radians(random.uniform(-7, 7))
                pts = [(x + h * math.cos(a + q) * math.sqrt(2) * math.cos(math.pi/4) - h * math.sin(a + q) * 0,
                        0) for q in ()]
                corners = []
                for dx, dy in [(-h, -h), (h, -h), (h, h), (-h, h)]:
                    corners.append((x + dx * math.cos(a) - dy * math.sin(a), y + dx * math.sin(a) + dy * math.cos(a)))
                cd.polygon(corners, fill=(0, 0, 0))
    gx = (QUIET + (fc + 3.5) * mod) * S; gy = (QUIET + (fr + 3.5) * mod) * S
    gr = k * 1.48
    cd.ellipse([gx - gr, gy - gr, gx + gr, gy + gr], fill=GREY)

canvas = canvas.resize((SIZE, SIZE), Image.LANCZOS)

# --- her photo, cut from the original ------------------------------------
orig = Image.open(src).convert("RGB").resize((SIZE, SIZE))
pm = Image.new("L", (SIZE * S, SIZE * S), 0)
ImageDraw.Draw(pm).ellipse([(cx - PHOTO_R) * S, (cy - PHOTO_R) * S, (cx + PHOTO_R) * S, (cy + PHOTO_R) * S], fill=255)
pm = pm.resize((SIZE, SIZE), Image.LANCZOS)
canvas.paste(orig, (0, 0), pm)
canvas.save(out, optimize=True)
print("version", qr.version, "modules", n, "->", out)
