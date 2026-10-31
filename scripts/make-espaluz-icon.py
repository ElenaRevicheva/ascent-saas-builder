"""The EspaLuz mark (31 Oct 2026, Elena: "this AZ icon is not appropriate here ... design smth unique like we did for
atlas page"). A speech bubble holding an "ñ" whose tilde is a ray of golden light: Español + Luz, on the hero title's
orange -> pink -> purple gradient. One geometry, drawn twice: public/espaluz-icon.svg for browsers that take SVG, and
favicon.ico / favicon-32.png / apple-touch-icon.png drawn with Pillow at 8x and scaled down, so all of them match.
Run from the repo root: python scripts/make-espaluz-icon.py
"""
from PIL import Image, ImageDraw

STOPS = ["#f97316", "#ec4899", "#a855f7"]  # the hero headline's gradient
INK, LIGHT = "#6d28d9", "#f59e0b"

SVG = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <!-- EspaLuz: a speech bubble with an "ñ" whose tilde is a ray of golden light (Español + Luz), on the hero title's
       orange-pink-purple gradient. Made by scripts/make-espaluz-icon.py - edit there, not here. -->
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{STOPS[0]}"/><stop offset="0.5" stop-color="{STOPS[1]}"/><stop offset="1" stop-color="{STOPS[2]}"/>
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="60" height="60" rx="15" fill="url(#g)"/>
  <path d="M22 11 H45 Q55 11 55 21 V36 Q55 46 45 46 H25 L15 55 L17 45 Q9 43 9 35 V21 Q9 11 19 11 Z" fill="#fff"/>
  <path d="M23 41 V29 M23 34 Q23 28 32 28 Q41 28 41 34 V41" fill="none" stroke="{INK}" stroke-width="5.5"
        stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M22 22 Q26.5 16.5 31 20 Q35.5 23.5 42 18" fill="none" stroke="{LIGHT}" stroke-width="4.5" stroke-linecap="round"/>
</svg>
"""


def hexrgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def quad(p0, p1, p2, n=24):
    return [((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
             (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]) for t in (i / n for i in range(n + 1))]


def draw(size):
    k = 8 * size / 64  # draw at 8x, then scale down for smooth edges
    big = int(64 * k)
    s = lambda pts: [(x * k, y * k) for x, y in pts]
    grad = Image.new("RGBA", (big, big))
    a, b, c = (hexrgb(x) for x in STOPS)
    px = grad.load()
    for y in range(big):
        for x in range(big):
            t = (x + y) / (2 * big)
            lo, hi, u = (a, b, t * 2) if t < 0.5 else (b, c, (t - 0.5) * 2)
            px[x, y] = tuple(int(lo[i] + (hi[i] - lo[i]) * u) for i in range(3)) + (255,)
    mask = Image.new("L", (big, big), 0)
    ImageDraw.Draw(mask).rounded_rectangle([2 * k, 2 * k, 62 * k, 62 * k], radius=15 * k, fill=255)
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    img.paste(grad, (0, 0), mask)
    d = ImageDraw.Draw(img)
    bubble = ([(22, 11), (45, 11)] + quad((45, 11), (55, 11), (55, 21)) + [(55, 36)] + quad((55, 36), (55, 46), (45, 46))
              + [(25, 46), (15, 55), (17, 45)] + quad((17, 45), (9, 43), (9, 35)) + [(9, 21)] + quad((9, 21), (9, 11), (19, 11)))
    d.polygon(s(bubble), fill="#ffffff")

    def stroke(pts, color, w):
        pts = s(pts)
        d.line(pts, fill=color, width=int(w * k), joint="curve")
        r = w * k / 2
        for x, y in (pts[0], pts[-1]):
            d.ellipse([x - r, y - r, x + r, y + r], fill=color)

    stroke([(23, 41), (23, 29)], INK, 5.5)
    stroke([(23, 34)] + quad((23, 34), (23, 28), (32, 28)) + quad((32, 28), (41, 28), (41, 34)) + [(41, 41)], INK, 5.5)
    stroke(quad((22, 22), (26.5, 16.5), (31, 20)) + quad((31, 20), (35.5, 23.5), (42, 18)), LIGHT, 4.5)
    return img.resize((size, size), Image.LANCZOS)


if __name__ == "__main__":
    with open("public/espaluz-icon.svg", "w", encoding="utf-8", newline="\n") as f:
        f.write(SVG)
    draw(32).save("public/favicon-32.png")
    # iOS paints transparent corners black and rounds the icon itself, so the touch icon is full-bleed.
    touch = Image.new("RGBA", (180, 180), "#ec4899")
    touch.alpha_composite(draw(180))
    touch.convert("RGB").save("public/apple-touch-icon.png")
    draw(64).save("public/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    draw(512).save("public/espaluz-icon-512.png")
    print("written: public/espaluz-icon.svg, favicon.ico, favicon-32.png, apple-touch-icon.png, espaluz-icon-512.png")
