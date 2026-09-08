from PIL import Image
import os

icon_path = os.path.join(
    os.path.dirname(__file__), "..", "public", "brand", "pwa", "icon-512.png"
)
out_dir = os.path.join(os.path.dirname(__file__), "..", "public", "splash")

icon = Image.open(icon_path).convert("RGBA")
bg = (250, 247, 239, 255)
sizes = [
    (1320, 2868),
    (1290, 2796),
    (1284, 2778),
    (1242, 2688),
    (1206, 2622),
    (1179, 2556),
    (1170, 2532),
    (1125, 2436),
    (828, 1792),
    (750, 1334),
    (2048, 2732),
    (1668, 2388),
    (1640, 2360),
]
try:
    resample = Image.Resampling.LANCZOS
except AttributeError:
    resample = Image.LANCZOS

if not os.path.isdir(out_dir):
    os.makedirs(out_dir)

for w, h in sizes:
    canvas = Image.new("RGBA", (w, h), bg)
    side = max(180, int(min(w, h) * 0.22))
    resized = icon.resize((side, side), resample)
    x = (w - side) // 2
    y = (h - side) // 2
    canvas.paste(resized, (x, y), resized)
    dest = os.path.join(out_dir, "%sx%s.png" % (w, h))
    canvas.convert("RGB").save(dest, "PNG", optimize=True)
    print(dest, os.path.getsize(dest))
