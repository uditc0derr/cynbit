"""
Analyse the gradient-vs-solid screenshot pairs from gradient-descender.mjs.

For each heading word:
  * build an "ink" mask (pixels that differ from the page background)
  * lost = ink present in the solid-text reference but missing in the shipped
    gradient version, after dilating the shipped mask by 1px so anti-aliasing
    differences are not counted as missing glyph
  * report lost pixels below the element's paint box, and how deep they go

Outputs evidence/after/descenders/report.json and one annotated diff per word.
"""
import json
import pathlib
import sys

from PIL import Image, ImageChops, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent
HERE = ROOT / "evidence" / "after" / (sys.argv[1] if len(sys.argv) > 1 else "descenders")
manifest = json.loads((HERE / "manifest.json").read_text())

INK_THRESHOLD = 30  # Euclidean RGB distance from the page background


def background(im: Image.Image) -> tuple[int, int, int]:
    """Median-ish background sampled from the four corners."""
    w, h = im.size
    px = im.load()
    samples = []
    for x in range(0, 12):
        for y in range(0, 12):
            samples.append(px[x, y])
            samples.append(px[w - 1 - x, y])
            samples.append(px[x, h - 1 - y])
            samples.append(px[w - 1 - x, h - 1 - y])
    samples.sort(key=lambda c: c[0] + c[1] + c[2])
    return samples[len(samples) // 2]


def ink_mask(im: Image.Image, bg: tuple[int, int, int]) -> Image.Image:
    r, g, b = im.split()
    br, bgc, bb = bg
    dist = ImageChops.add(
        ImageChops.add(ImageChops.difference(r, Image.new("L", im.size, br)), ImageChops.difference(g, Image.new("L", im.size, bgc))),
        ImageChops.difference(b, Image.new("L", im.size, bb)),
    )
    return dist.point(lambda v: 255 if v > INK_THRESHOLD else 0)


rows = []
for entry in manifest:
    before = Image.open(ROOT / entry["before"]).convert("RGB")
    after = Image.open(ROOT / entry["after"]).convert("RGB")
    if before.size != after.size:
        rows.append({**entry, "error": "size mismatch", "beforeSize": before.size, "afterSize": after.size})
        continue

    scale = before.size[0] / entry["clip"]["width"]
    shipped_ink = ink_mask(before, background(before))
    solid_ink = ink_mask(after, background(after))
    # Dilate the shipped mask so a 1px anti-aliasing difference around a glyph
    # edge cannot masquerade as a missing descender.
    shipped_dilated = shipped_ink.filter(ImageFilter.MaxFilter(3))
    lost = ImageChops.subtract(solid_ink, shipped_dilated)

    y_bottom = round((entry["rect"]["y"] + entry["rect"]["h"] - entry["clip"]["y"]) * scale)
    x_left = round((entry["rect"]["x"] - entry["clip"]["x"]) * scale)
    x_right = round((entry["rect"]["x"] + entry["rect"]["w"] - entry["clip"]["x"]) * scale)

    lost_px = lost.load()
    w, h = lost.size
    lost_total = 0
    lost_below = 0
    deepest = None
    for y in range(h):
        for x in range(w):
            if lost_px[x, y]:
                lost_total += 1
                if y >= y_bottom:
                    lost_below += 1
                    if deepest is None or y > deepest:
                        deepest = y

    solid_px = solid_ink.load()
    solid_ink_total = sum(1 for y in range(h) for x in range(w) if solid_px[x, y])
    solid_below = sum(1 for y in range(y_bottom, h) for x in range(w) if solid_px[x, y])

    # Annotate: solid reference in grey, missing pixels in red.
    annot = after.copy()
    ap = annot.load()
    lp = lost.load()
    for y in range(h):
        for x in range(w):
            if lp[x, y]:
                ap[x, y] = (220, 38, 38)

    slug = pathlib.Path(entry["before"]).stem.replace("--shipped", "")
    annot_path = HERE / f"{slug}--lost.png"
    annot.save(annot_path)

    row = {
        **entry,
        "imageScale": round(scale, 3),
        "paintBoxBottomCss": round(entry["rect"]["y"] + entry["rect"]["h"], 2),
        "background": background(before),
        "solidInkPixels": solid_ink_total,
        "solidInkBelowBox": solid_below,
        "lostPixels": lost_total,
        "lostPixelsBelowBox": lost_below,
        "lostPercentOfBelowBox": round(100 * lost_below / solid_below, 2) if solid_below else 0,
        "deepestLostBelowBoxCss": round((deepest - y_bottom) / scale, 2) if deepest is not None else 0,
        "annotated": str(annot_path.relative_to(ROOT)),
    }
    rows.append(row)
    print(
        f"{entry['name']:18} {entry['text'][:26]:28} {entry['display']:11} "
        f"lead={entry['leading']:<5} pad={entry['paddingBottom']:>4}px  "
        f"lost={lost_below:>5}px  depth={row['deepestLostBelowBoxCss']:>5}px  "
        f"({row['lostPercentOfBelowBox']:>5}% of descender ink)"
    )

summary = {
    "source": str(HERE.relative_to(ROOT)),
    "note": "lostPixelsBelowBox counts ink a solid text reference paints below the element's background box that the shipped gradient does not paint.",
    "totals": {
        "spans": len(rows),
        "spansWithLoss": sum(1 for r in rows if r.get("lostPixelsBelowBox", 0) > 0),
        "lostBelowBox": sum(r.get("lostPixelsBelowBox", 0) for r in rows),
        "solidBelowBox": sum(r.get("solidInkBelowBox", 0) for r in rows),
    },
    "rows": rows,
}
(HERE / "report.json").write_text(json.dumps(summary, indent=2))
print("\n" + json.dumps(summary["totals"], indent=2))
print(f"report -> {HERE / 'report.json'}")
