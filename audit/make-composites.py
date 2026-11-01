"""
Build the side-by-side evidence images used in AUDIT.md / README.md.

  composites/<page>-<viewport>-before-after.png   live hero vs prototype hero
  composites/descenders-<page>.png                shipped / solid / missing ink
  composites/animation-cost.png                   layout passes + task time + FPS

Run after audit/capture-prototype.mjs and the descender captures.
"""
import json
import pathlib

from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
EVIDENCE = ROOT / "evidence"
OUT = EVIDENCE / "after" / "composites"
OUT.mkdir(parents=True, exist_ok=True)

FONT_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "/Library/Fonts/Arial.ttf",
]


def font(size: int, bold: bool = False):
    for path in FONT_CANDIDATES:
        if pathlib.Path(path).exists():
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                continue
    return ImageFont.load_default()


INK = (24, 28, 29)
MUTED = (90, 100, 101)
PAPER = (247, 250, 250)
LINE = (189, 201, 202)


def framed(image: Image.Image, width: int) -> Image.Image:
    """Resize to a common width, keep aspect ratio."""
    ratio = width / image.width
    return image.resize((width, round(image.height * ratio)), Image.LANCZOS)


def before_after(page: str, viewport: str, target_width: int = 760) -> pathlib.Path:
    live_path = EVIDENCE / "before" / f"{page}-{viewport}-hero.png"
    proto_path = EVIDENCE / "after" / f"{page}-{viewport}-hero.png"
    if not live_path.exists() or not proto_path.exists():
        raise SystemExit(f"missing screenshots for {page}/{viewport}")

    live = framed(Image.open(live_path).convert("RGB"), target_width)
    proto = framed(Image.open(proto_path).convert("RGB"), target_width)
    header = 64
    gap = 24
    label = 34
    height = header + label + max(live.height, proto.height) + 20

    canvas = Image.new("RGB", (target_width * 2 + gap, height), PAPER)
    draw = ImageDraw.Draw(canvas)
    draw.text((24, 20), "LIVE SITE — before", font=font(24, True), fill=(140, 40, 40))
    draw.text((target_width + gap + 24, 20), "PROTOTYPE — after", font=font(24, True), fill=(0, 96, 103))
    draw.text((24, header), f"{page.title()} · {viewport}", font=font(18), fill=MUTED)
    draw.text((target_width + gap + 24, header), "shared PageHero + HeroOrbit", font=font(18), fill=MUTED)
    draw.line([(target_width + gap // 2, 0), (target_width + gap // 2, height)], fill=LINE, width=1)
    canvas.paste(live, (0, header + label))
    canvas.paste(proto, (target_width + gap, header + label))

    path = OUT / f"{page}-{viewport}-before-after.png"
    canvas.save(path, optimize=True)
    return path


def descender(page: str) -> pathlib.Path:
    folder = EVIDENCE / "after" / "descenders"
    manifest = json.loads((folder / "manifest.json").read_text())
    entry = next((e for e in manifest if e["name"] == page), None)
    if not entry:
        raise SystemExit(f"no descender capture for {page}")

    slug = pathlib.Path(entry["before"]).stem.replace("--shipped", "")
    shipped = Image.open(ROOT / entry["before"]).convert("RGB")
    solid = Image.open(ROOT / entry["after"]).convert("RGB")
    lost = Image.open(folder / f"{slug}--lost.png").convert("RGB")

    scale = 2
    width = 620
    tiles = []
    for image, title, color in [
        (shipped, "Shipped gradient text", (140, 40, 40)),
        (solid, "Solid reference", MUTED),
        (lost, "Missing pixels in red", (0, 96, 103)),
    ]:
        tile = framed(image, width)
        canvas = Image.new("RGB", (width, tile.height + 46), PAPER)
        draw = ImageDraw.Draw(canvas)
        draw.text((16, 14), title, font=font(18, True), fill=color)
        canvas.paste(tile, (0, 46))
        tiles.append(canvas)

    gap = 14
    height = max(t.height for t in tiles) + 52
    canvas = Image.new(
        "RGB",
        (width * 3 + gap * 2 + 32, height),
        PAPER,
    )
    draw = ImageDraw.Draw(canvas)
    draw.text(
        (16, 12),
        f'{page} — "{entry["text"]}" · {entry["fontSize"]}px / {entry["lineHeight"]}px · backgrounds end at {entry["rect"]["h"]:.1f}px',
        font=font(16),
        fill=MUTED,
    )
    for i, tile in enumerate(tiles):
        canvas.paste(tile, (16 + i * (width + gap), 44))
    path = OUT / f"descenders-{page}.png"
    canvas.save(path, optimize=True)
    return path


def animation_chart() -> pathlib.Path:
    data = json.loads((EVIDENCE / "after" / "animation-profile.json").read_text())
    live = data["results"][0]
    proto = data["results"][1]

    rows = [
        ("Layout passes / 5s (in view)", live["inView"]["layoutCount"], proto["inView"]["layoutCount"], 300),
        ("Layout passes / 5s (hero off screen)", live["offscreen"]["layoutCount"], proto["offscreen"]["layoutCount"], 300),
        ("Main-thread task ms / 5s (in view)", live["inView"]["taskMs"], proto["inView"]["taskMs"], 200),
        ("Layout passes / 5s (reduced motion)", live["reducedMotion"]["layoutCount"], proto["reducedMotion"]["layoutCount"], 300),
    ]

    width, row_h, label_w = 900, 66, 300
    height = 80 + len(rows) * row_h + 30
    canvas = Image.new("RGB", (width, height), PAPER)
    draw = ImageDraw.Draw(canvas)
    draw.text((24, 20), "Animation cost — same 5s window, 1440×900, headless Chromium", font=font(20, True), fill=INK)
    draw.text((label_w + 20, 52), "live", font=font(13, True), fill=(140, 40, 40))
    draw.text((label_w + 300, 52), "prototype", font=font(13, True), fill=(0, 96, 103))

    max_value = max(max(r[1], r[2]) for r in rows) * 1.1 or 1
    bar_area = width - label_w - 40
    for i, (label, live_value, proto_value, scale_max) in enumerate(rows):
        y = 80 + i * row_h
        draw.text((24, y + 8), label, font=font(14), fill=INK)
        for j, (value, color) in enumerate([(live_value, (140, 40, 40)), (proto_value, (0, 96, 103))]):
            bar_w = max(2, round(value / max_value * bar_area))
            draw.rectangle(
                [label_w, y + j * 18, label_w + bar_w, y + 12 + j * 18],
                fill=color,
            )
            draw.text((label_w + bar_w + 8, y - 1 + j * 18), str(value), font=font(12), fill=MUTED)
    path = OUT / "animation-cost.png"
    canvas.save(path, optimize=True)
    return path


written = []
for page in ("home", "privacy", "impact"):
    for viewport in ("desktop", "tablet", "mobile"):
        written.append(before_after(page, viewport))
written.append(descender("products"))
written.append(descender("bitelevate"))
written.append(animation_chart())

for path in written:
    print(path.relative_to(ROOT))
