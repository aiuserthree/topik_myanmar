"""Generate a small ID-style portrait JPEG for FO dummy photos."""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent / "assets" / "dummy-portrait.jpg"
out.parent.mkdir(parents=True, exist_ok=True)

w, h = 120, 156
img = Image.new("RGB", (w, h), (245, 247, 250))
d = ImageDraw.Draw(img)
for y in range(h):
    t = y / h
    c = int(235 + 12 * t)
    d.line([(0, y), (w, y)], fill=(c, c + 2, c + 6))
d.ellipse([18, 108, 102, 168], fill=(180, 155, 130))
d.rectangle([48, 88, 72, 118], fill=(195, 168, 142))
d.ellipse([32, 36, 88, 102], fill=(210, 182, 155))
d.ellipse([28, 28, 92, 78], fill=(55, 48, 42))
d.rectangle([28, 52, 92, 72], fill=(210, 182, 155))
d.ellipse([44, 58, 52, 66], fill=(40, 35, 32))
d.ellipse([68, 58, 76, 66], fill=(40, 35, 32))
d.arc([50, 72, 70, 86], 20, 160, fill=(140, 90, 85), width=2)
img.save(out, "JPEG", quality=82, optimize=True)
print(out, out.stat().st_size)
