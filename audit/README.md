# Audit scripts

These scripts produce the evidence in `../evidence`. They are deliberately
separate from the prototype: nothing here ships to the browser.

All timings and measurements were taken on 1 November 2026 with headless
Chromium 1243 at a 1440×900 viewport (plus 768×1024 and 390×844 for the layout
pass). Lighthouse was run with its mobile emulation. The live site can change;
re-run the scripts if you need current numbers.

## Prerequisites

- Node 20+ and npm.
- A Chromium binary. The scripts default to the Playwright cache path used on
  this machine. Override it with `CHROME_PATH=/path/to/Chromium`.
- Python 3 with [Pillow](https://python-pillow.org/) for the analyser and
  composite builder.
- The prototype preview server running at `http://127.0.0.1:4174` for any
  `prototype` script:

  ```bash
  cd ../prototype
  npm install
  npm run build
  npm run preview -- --port 4174
  ```

## Scripts

| Script | What it does | Writes |
| --- | --- | --- |
| `capture-live.mjs` | 11 live routes × 3 viewports: headings, gradient boxes, clipping candidates, CLS, reveal counts, animation inventory, screenshots | `evidence/before/audit-raw.json`, `evidence/before/*.png` |
| `overflow-live.mjs` | Document `scrollWidth` vs viewport on all 11 live routes × 3 widths, plus elements that escape an edge without a clipping ancestor | `evidence/before/overflow-live.json` |
| `capture-prototype.mjs` | Same layout checks on the prototype + reduced-motion and off-screen-pause assertions | `evidence/after/audit-prototype.json`, `evidence/after/*.png` |
| `cls-debug.mjs` | Attributes layout shifts to elements and checks for unclipped horizontal overflow | console |
| `gradient-descender.mjs` | Captures every gradient heading word twice: shipped, then with the gradient replaced by solid text | `evidence/after/descenders*/` |
| `analyse-descenders.py` | Pixel-diffs the pairs and counts ink the gradient loses below its paint box | `report.json`, `*--lost.png` |
| `animation-profile.mjs` | CDP `Performance.getMetrics` over 5s windows: task time, layout/style passes, FPS; inline-property diff | `evidence/after/animation-profile.json` |
| `pause-behavior.mjs` | Samples only the hero subtree before/after scrolling it away | `evidence/after/pause-behavior.json` |
| `make-composites.py` | Side-by-side before/after, descender proof and animation chart | `evidence/after/composites/` |
| `verify-deploy.mjs` | Smoke-tests a deployed build: routes, fonts, heading ratio, overflow, console errors and the hamburger breakpoint | console; exit code 1 on failure |

## Reproducing the final pass

```bash
# terminal 1
cd prototype && npm run build && npm run preview -- --port 4174

# terminal 2
cd audit
npm install

BASE=http://127.0.0.1:4174 node capture-prototype.mjs
BASE=http://127.0.0.1:4174 node cls-debug.mjs

node animation-profile.mjs
node pause-behavior.mjs

BASE=http://127.0.0.1:4174 ROUTES=prototype OUT=descenders-proto node gradient-descender.mjs
python3 analyse-descenders.py descenders-proto

python3 make-composites.py
npm run verify:deploy
```

The live captures are already in `evidence/before`; to refresh them:

```bash
node capture-live.mjs
node overflow-live.mjs
BASE=https://www.cynbit.in ROUTES=live OUT=descenders node gradient-descender.mjs
python3 analyse-descenders.py descenders
```

The mobile variant of the descender test sets `WIDTH=390 HEIGHT=844` and writes
to `descenders-mobile`.

## Reading the descender test

`lostPixelsBelowBox` is the number of pixels that the solid reference paints
below the element's background box and the shipped gradient does not. The
analysis dilates the shipped ink mask by 1px first, so anti-aliasing changes are
not counted. A non-zero value with a clean, tapering row profile is a clipped
descender, not noise.

The test is deliberately conservative: it can only report ink that the solid
version puts *below the paint box*, which is exactly the failure mode of
`background-clip: text` with a short box.

## Notes and limits

- Headless Chromium has no vsync; FPS is comparable between the two sites in the
  same run but should not be read as real-device frame rate.
- Lighthouse load timings compare a remote production site with a local preview.
  Only CLS and the CDP metrics are apples-to-apples.
- The scripts never submit a form, subscribe an address or hit a contact
  endpoint. They only load public pages.
