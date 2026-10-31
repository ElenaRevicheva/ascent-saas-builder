"""The EspaLuz mark (31 Oct 2026). Elena: the AIdeazz "AZ" icon "is not appropriate here ... design smth unique like we
did for atlas page"; then the speech bubble with an "ñ" was "ugly - not visible what it is about - maybe do something
like sun with rays of light". So: Luz = a golden sun with eight bold rays on the hero title's orange -> pink -> purple
gradient - long and short rays in turn, like a sunburst, and no face (a tilde mouth read as a worried face). Bold
enough to read as a sun at 16 px. One geometry, drawn twice: public/espaluz-icon.svg, and favicon.ico /
favicon-32.png / apple-touch-icon.png drawn with Pillow at 8x and scaled down, so all of them match.
Run from the repo root: python scripts/make-espaluz-icon.py
"""
import math

from PIL import Image, ImageDraw

STOPS = ["#f97316", "#ec4899", "#a855f7"]  # the hero headline's gradient
SUN_IN, SUN_OUT, RAY = "#fef08a", "#f59e0b", "#fff7c2"
C, R_SUN, RAY_IN, RAY_W = 32, 14, 19.5, 5.5
RAYS = [(C + RAY_IN * math.cos(a), C + RAY_IN * math.sin(a), C + out * math.cos(a), C + out * math.sin(a))
        for a, out in ((i * math.pi / 4 - math.pi / 2, 26 if i % 2 == 0 else 24) for i in range(8))]

SVG = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <!-- EspaLuz: Luz = a golden sun with long and short rays on the hero title's orange-pink-purple gradient. Made by scripts/make-espaluz-icon.py - edit there, not here. -->
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{STOPS[0]}"/><stop offset="0.5" stop-color="{STOPS[1]}"/><stop offset="1" stop-color="{STOPS[2]}"/>
    </linearGradient>
    <radialGradient id="s" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="{SUN_IN}"/><stop offset="1" stop-color="{SUN_OUT}"/></radialGradient>
  </defs>
  <rect x="2" y="2" width="60" height="60" rx="15" fill="url(#g)"/>
  <g stroke="{RAY}" stroke-width="{RAY_W}" stroke-linecap="round">
{chr(10).join(f'    <line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}"/>' for x1, y1, x2, y2 in RAYS)}
  </g>
  <circle cx="{C}" cy="{C}" r="{R_SUN}" fill="url(#s)"/>
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
    a, b, c = (hexrgb(x) for x in STOPS)
    grad = Image.new("RGBA", (big, big))
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

    def stroke(pts, color, w):
        pts = [(x * k, y * k) for x, y in pts]
        d.line(pts, fill=color, width=int(w * k), joint="curve")
        r = w * k / 2
        for x, y in (pts[0], pts[-1]):
            d.ellipse([x - r, y - r, x + r, y + r], fill=color)

    for x1, y1, x2, y2 in RAYS:
        stroke([(x1, y1), (x2, y2)], RAY, RAY_W)
    # the sun: a radial gradient from the upper left, like the SVG
    sun = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    sp = sun.load()
    i_c, o_c = hexrgb(SUN_IN), hexrgb(SUN_OUT)
    cx, cy, rr = C * k, C * k, R_SUN * k
    fx, fy = (C - 0.2 * 2 * R_SUN) * k, (C - 0.3 * 2 * R_SUN) * k
    for y in range(int(cy - rr) - 1, int(cy + rr) + 2):
        for x in range(int(cx - rr) - 1, int(cx + rr) + 2):
            if (x - cx) ** 2 + (y - cy) ** 2 <= rr * rr:
                u = min(1.0, math.hypot(x - fx, y - fy) / (1.4 * rr))
                sp[x, y] = tuple(int(i_c[i] + (o_c[i] - i_c[i]) * u) for i in range(3)) + (255,)
    img.alpha_composite(sun)
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
