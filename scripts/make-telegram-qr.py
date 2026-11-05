"""EspaLuz Telegram QR in the same style as src/assets/whatsapp-qr-code.jpg, in Telegram blue (Elena, 5 Nov 2026).
Style copied from the WhatsApp QR: 1138 px canvas, 69 px quiet zone, four-point-star modules, rounded "leaf" finder
eyes (sharp inner corner) with a round centre dot, soft background, a 310 px square left empty in the centre for the
moving video. Error correction H so the covered centre still scans.
usage: python -I scripts/make-telegram-qr.py [out.png]"""
import sys
import qrcode
from PIL import Image, ImageDraw

URL = "https://t.me/EspaLuzFamily_bot"
OUT = sys.argv[1] if len(sys.argv) > 1 else "src/assets/telegram-qr-code.png"
SIZE, QUIET, S = 1138, 69, 4                     # S = supersampling
BLUE = (34, 158, 217)                            # Telegram brand blue #229ED9
BG = (219, 230, 238)                             # soft blue-grey, the twin of the WhatsApp mint (221, 228, 220)
HOLE0, HOLE1 = 414, 724                          # centre square, same place as the WhatsApp face

qr = qrcode.QRCode(version=4, error_correction=qrcode.constants.ERROR_CORRECT_H, border=0)
qr.add_data(URL)
qr.make(fit=False)
m = qr.get_matrix()
n = len(m)
mod = (SIZE - 2 * QUIET) / n

img = Image.new("RGB", (SIZE * S, SIZE * S), BG)
d = ImageDraw.Draw(img)


def finder_cell(r, c):
    return (r < 7 and c < 7) or (r < 7 and c >= n - 7) or (r >= n - 7 and c < 7)


def in_hole(r, c):
    x0, y0 = QUIET + c * mod, QUIET + r * mod
    return x0 + mod > HOLE0 and x0 < HOLE1 and y0 + mod > HOLE0 and y0 < HOLE1


# four-point stars
for r in range(n):
    for c in range(n):
        if not m[r][c] or finder_cell(r, c) or in_hole(r, c):
            continue
        cx = (QUIET + (c + .5) * mod) * S
        cy = (QUIET + (r + .5) * mod) * S
        R = mod * 0.5 * S
        k = R * 0.30
        d.polygon([(cx, cy - R), (cx + k, cy - k), (cx + R, cy), (cx + k, cy + k),
                   (cx, cy + R), (cx - k, cy + k), (cx - R, cy), (cx - k, cy - k)], fill=BLUE)


def leaf(x0, y0, size, radius, sharp, fill):
    """rounded square with one sharp corner: sharp in {'tl','tr','bl','br'}"""
    x1, y1 = x0 + size, y0 + size
    d.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill)
    h = size / 2
    box = {'tl': (x0, y0), 'tr': (x0 + h, y0), 'bl': (x0, y0 + h), 'br': (x0 + h, y0 + h)}[sharp]
    d.rectangle([box[0], box[1], box[0] + h, box[1] + h], fill=fill)


for (fr, fc, sharp) in [(0, 0, 'br'), (0, n - 7, 'bl'), (n - 7, 0, 'tr')]:
    x0 = (QUIET + fc * mod) * S
    y0 = (QUIET + fr * mod) * S
    size = 7 * mod * S
    leaf(x0, y0, size, size * 0.30, sharp, BLUE)                        # outer ring
    inset = mod * S
    leaf(x0 + inset, y0 + inset, size - 2 * inset, (size - 2 * inset) * 0.24, sharp, BG)
    cx, cy, rr = x0 + size / 2, y0 + size / 2, 1.45 * mod * S         # round centre dot, ~3 modules wide
    d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=BLUE)

# the centre square: the still poster frame is pasted here by the caller; leave it as background for the clean QR
img = img.resize((SIZE, SIZE), Image.LANCZOS)
img.save(OUT, optimize=True)
print("version", qr.version, "modules", n, "->", OUT)
