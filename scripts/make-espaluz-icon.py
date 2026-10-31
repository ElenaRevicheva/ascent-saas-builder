"""The EspaLuz mark (31 Oct 2026). Elena, in order: the AIdeazz "AZ" icon "is not appropriate here"; the ñ bubble "not
visible what it is about"; the sun "too simple" - "let us do the style lovable manner - but not heart, atlas - with
yellow land and violet other space". So: a globe like the Atlas mark (yellow land, violet sea), turned to the
Spanish-speaking world - centred near Panama, Latin America in front, Spain and the edge of Africa on the right rim -
drawn in Lovable's soft manner: a glowing gradient sphere with a golden light from the upper left (Luz) and a gloss.

Coastlines are rough real lat/lon outlines, projected orthographically (the view of a globe from space); land behind
the globe is pushed to the rim. One geometry, drawn twice: public/espaluz-icon.svg, and favicon.ico / favicon-32.png /
apple-touch-icon.png drawn with Pillow at 8x and scaled down, so all of them match.
Run from the repo root: python scripts/make-espaluz-icon.py
"""
import math

from PIL import Image, ImageDraw

LON0, LAT0 = -72.0, 8.0  # the globe faces Panama and Latin America, with Spain on the right rim
C, R = 32.0, 26.5
SEA_IN, SEA_OUT, LAND_IN, LAND_OUT, GLOW = "#a78bfa", "#4c1d95", "#fef08a", "#facc15", "#fde047"

LAND = {  # (lon, lat), rough and real
    "south_america": [(-77.3, 8.7), (-75.5, 10.5), (-72, 11.8), (-71, 12.4), (-68, 10.6), (-64, 10.7), (-61, 10.7),
        (-60, 8.5), (-57, 6), (-54, 5.8), (-51.5, 4.5), (-50, 1.7), (-48.5, -1.2), (-44.5, -2.5), (-40, -2.9),
        (-35.2, -5.5), (-34.8, -7.5), (-35.5, -9.8), (-38.5, -13), (-39, -17.5), (-40.5, -21), (-42, -23),
        (-44.5, -23.3), (-48.5, -26.5), (-48.7, -28.5), (-51, -31), (-53, -33.7), (-56, -34.9), (-57.5, -36.5),
        (-58, -38.5), (-62, -39), (-62.5, -41), (-65, -42.5), (-67.5, -46), (-66, -48), (-68.5, -50.5), (-68.5, -53),
        (-70, -55), (-72.5, -53.5), (-74, -50), (-75.5, -46), (-74, -43), (-73.5, -38), (-72, -33), (-71.5, -29),
        (-70.5, -23), (-70.2, -18.4), (-72.5, -16.5), (-76, -13.5), (-78, -10), (-79.5, -7), (-81.2, -5),
        (-80.3, -3.3), (-80.5, -1), (-80, 1), (-78.8, 1.5), (-77.5, 4), (-77.3, 6.5), (-77.8, 7.5)],
    "north_america": [(-77.9, 7.2), (-80, 7.3), (-81.5, 7.8), (-83.5, 8.5), (-85.7, 10), (-86, 11.5), (-87.5, 13),
        (-90, 13.8), (-92.2, 14.5), (-94.5, 16.1), (-96.5, 15.7), (-99, 16.7), (-101.5, 17.8), (-103.5, 18.3),
        (-105.5, 20.5), (-105.3, 22.5), (-107, 24), (-109.5, 26.5), (-112.2, 29), (-114.7, 31.7), (-113, 29),
        (-110.3, 24.2), (-109.5, 23), (-112, 26), (-114, 28), (-115.7, 30.3), (-117.1, 32.5), (-118.5, 34),
        (-120.6, 34.6), (-122.5, 37.5), (-124, 40.5), (-124.5, 43), (-124, 46.2), (-124.7, 48.4), (-127.5, 51),
        (-130, 54.5), (-137, 58.5), (-145, 60.3), (-152, 58), (-162, 55.5), (-165, 62.5), (-163, 66.5),
        (-156.5, 71.3), (-141, 69.7), (-128, 70), (-110, 68), (-95, 71), (-85, 69.5), (-82, 66), (-87, 64), (-93, 61),
        (-94.5, 58.8), (-87, 55.5), (-82.3, 55), (-79.5, 51.5), (-77, 58), (-78, 61), (-70, 61), (-62, 57.5),
        (-57, 52), (-59.5, 48), (-64.5, 49), (-61, 46), (-66, 44.5), (-70, 43.5), (-70.5, 41.8), (-74, 40.5),
        (-76, 37), (-76, 35), (-78, 33.8), (-80.8, 32), (-81.3, 30), (-80.2, 27), (-80.4, 25.2), (-81.2, 25.2),
        (-82.5, 27.5), (-82.8, 29.5), (-84.5, 30), (-89.5, 30.2), (-90.5, 29.2), (-95, 29.2), (-97.2, 27.5),
        (-97.5, 25), (-97.8, 22.5), (-97.2, 20.5), (-96, 19), (-94.5, 18.2), (-91, 19), (-90.5, 21), (-87, 21.4),
        (-87.5, 19.5), (-88.2, 18.5), (-88.5, 16.2), (-84, 15.8), (-83.2, 14.8), (-83.6, 12), (-83.8, 11),
        (-82.4, 9.4), (-81, 8.8), (-79.5, 9.5), (-78, 9.2), (-77.4, 8.5)],
    "greenland": [(-73, 78), (-60, 82), (-35, 83), (-20, 81), (-18, 76), (-22, 70), (-32, 68), (-40, 65), (-43, 60),
        (-48, 61), (-52, 64), (-54, 67), (-56, 72), (-66, 76)],
    "cuba": [(-85, 21.9), (-82, 23.2), (-80, 23.1), (-77, 21.8), (-74.2, 20.2), (-77.5, 19.9), (-80, 21.7), (-82.5, 22.3)],
    "hispaniola": [(-74.5, 18.4), (-72.8, 19.9), (-70, 19.7), (-68.4, 18.5), (-71, 18), (-74.4, 18.1)],
    "iberia": [(-9, 43), (-8, 43.7), (-2, 43.4), (3.2, 42.4), (3, 41.8), (0.8, 41), (0, 39), (-0.5, 38.4), (-2, 36.8),
        (-5.5, 36), (-6.5, 36.9), (-7.5, 37.2), (-8.9, 37), (-8.7, 40), (-8.8, 42)],
    "africa": [(-6, 35.8), (-10, 30), (-13, 27.5), (-16.5, 22), (-17, 20.5), (-16.5, 16), (-17.5, 14.7), (-15, 11),
        (-13, 8.5), (-11, 6.8), (-7.5, 4.4), (-4, 5.2), (0, 5.5), (4, 6.3), (8.5, 4.5), (9.5, 1), (9, -2), (11.5, -6),
        (12, -12), (13.5, -20), (15, -27), (17.5, -33), (20, -34.8), (26, -34), (30, -31), (33, -26), (35, -20),
        (40, -15), (40, -10), (39, -5), (42, 0), (46, 2), (51, 11.5), (44, 11), (43, 13), (39, 16), (37, 21),
        (35, 24), (33.5, 28), (32, 31), (25, 31.8), (20, 31), (15, 32.3), (10, 34), (10, 37), (5, 36.8), (0, 35.8),
        (-2, 35.1)],
}


def project(lon, lat):
    """Orthographic view from space; a point behind the globe is pushed onto its rim."""
    l, p, l0, p0 = (math.radians(v) for v in (lon, lat, LON0, LAT0))
    x = math.cos(p) * math.sin(l - l0)
    y = math.cos(p0) * math.sin(p) - math.sin(p0) * math.cos(p) * math.cos(l - l0)
    if math.sin(p0) * math.sin(p) + math.cos(p0) * math.cos(p) * math.cos(l - l0) < 0:
        n = math.hypot(x, y) or 1
        x, y = x / n, y / n
    return C + R * x, C - R * y


SHAPES = {name: [project(lon, lat) for lon, lat in pts] for name, pts in LAND.items()}

SVG = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <!-- EspaLuz: the Spanish-speaking world as a globe (Latin America in front, Spain on the rim) - yellow land, violet
       sea, a golden light from the upper left. Made by scripts/make-espaluz-icon.py - edit there, not here. -->
  <defs>
    <radialGradient id="sea" cx="36%" cy="30%" r="78%"><stop offset="0" stop-color="{SEA_IN}"/><stop offset="1" stop-color="{SEA_OUT}"/></radialGradient>
    <radialGradient id="land" cx="35%" cy="28%" r="85%"><stop offset="0" stop-color="{LAND_IN}"/><stop offset="1" stop-color="{LAND_OUT}"/></radialGradient>
    <radialGradient id="gloss" cx="34%" cy="24%" r="40%"><stop offset="0" stop-color="#fff" stop-opacity="0.45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <radialGradient id="glow" cx="45%" cy="45%" r="52%"><stop offset="0.78" stop-color="{GLOW}" stop-opacity="0.85"/><stop offset="0.9" stop-color="#e879f9" stop-opacity="0.45"/><stop offset="1" stop-color="#7c3aed" stop-opacity="0"/></radialGradient>
    <clipPath id="ball"><circle cx="{C}" cy="{C}" r="{R}"/></clipPath>
  </defs>
  <circle cx="{C}" cy="{C}" r="31.5" fill="url(#glow)"/>
  <circle cx="{C}" cy="{C}" r="{R}" fill="url(#sea)"/>
  <g clip-path="url(#ball)" fill="url(#land)" stroke="{LAND_OUT}" stroke-width="0.6" stroke-linejoin="round">
{chr(10).join('    <path d="M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in pts) + ' Z"/>' for pts in SHAPES.values())}
  </g>
  <circle cx="{C}" cy="{C}" r="{R}" fill="url(#gloss)"/>
</svg>
"""


def hexrgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def radial(big, cx, cy, r, stops):
    """A radial gradient image (stops = [(offset, (r, g, b, a))]) - the same idea as the SVG's radialGradient."""
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    px = img.load()
    for y in range(big):
        for x in range(big):
            u = min(1.0, math.hypot(x - cx, y - cy) / r)
            for (o0, c0), (o1, c1) in zip(stops, stops[1:]):
                if u <= o1:
                    t = (u - o0) / (o1 - o0) if o1 > o0 else 0
                    px[x, y] = tuple(int(c0[i] + (c1[i] - c0[i]) * t) for i in range(4))
                    break
    return img


def masked(img, mask):
    img.putalpha(Image.composite(img.getchannel("A"), Image.new("L", img.size, 0), mask))
    return img


def draw(size):
    big = min(8 * size, 1024)  # draw large, scale down for smooth edges (pure-Python gradients: keep it bounded)
    k = big / 64
    rgba = lambda h, a=255: hexrgb(h) + (a,)
    circle = lambda r: (lambda m: (ImageDraw.Draw(m).ellipse([(C - r) * k, (C - r) * k, (C + r) * k, (C + r) * k], fill=255), m)[1])(Image.new("L", (big, big), 0))
    ball = circle(R)
    # a soft halo all round, golden where the light comes from (upper left), fading to violet - Lovable's glow
    img = masked(radial(big, 0.45 * 64 * k, 0.45 * 64 * k, 0.52 * 64 * k,
                        [(0, rgba(GLOW, 217)), (0.78, rgba(GLOW, 217)), (0.9, rgba("#e879f9", 115)), (1, rgba("#7c3aed", 0))]), circle(31.5))
    img.alpha_composite(masked(radial(big, (C - R + 0.72 * R) * k, (C - R + 0.6 * R) * k, 1.56 * R * k,
                                      [(0, rgba(SEA_IN)), (1, rgba(SEA_OUT))]), ball))
    land_mask = Image.new("L", (big, big), 0)
    ld = ImageDraw.Draw(land_mask)
    for pts in SHAPES.values():
        ld.polygon([(x * k, y * k) for x, y in pts], fill=255)
    land_mask = Image.composite(land_mask, Image.new("L", (big, big), 0), ball)
    img.alpha_composite(masked(radial(big, (C - R + 0.7 * R) * k, (C - R + 0.56 * R) * k, 1.7 * R * k,
                                      [(0, rgba(LAND_IN)), (1, rgba(LAND_OUT))]), land_mask))
    img.alpha_composite(masked(radial(big, (C - R + 0.68 * R) * k, (C - R + 0.48 * R) * k, 0.8 * R * k,
                                      [(0, (255, 255, 255, 115)), (1, (255, 255, 255, 0))]), ball))
    return img.resize((size, size), Image.LANCZOS)


if __name__ == "__main__":
    with open("public/espaluz-icon.svg", "w", encoding="utf-8", newline="\n") as f:
        f.write(SVG)
    draw(32).save("public/favicon-32.png")
    # iOS paints transparent corners black and rounds the icon itself, so the touch icon sits on deep violet.
    touch = Image.new("RGBA", (180, 180), "#2e1065")
    touch.alpha_composite(draw(180))
    touch.convert("RGB").save("public/apple-touch-icon.png")
    draw(64).save("public/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    draw(512).save("public/espaluz-icon-512.png")
    print("written: public/espaluz-icon.svg, favicon.ico, favicon-32.png, apple-touch-icon.png, espaluz-icon-512.png")
