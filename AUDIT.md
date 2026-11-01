# Cynbit hero audit

**Site audited:** <https://www.cynbit.in> (live production)
**Prototype:** <https://prototype-black-rho.vercel.app>
**Date:** 1 November 2026
**Scope:** 11 routes × 3 viewports (1440×900, 768×1024, 390×844)
**Change built:** one shared `PageHero` + one reusable, performant `HeroOrbit`, demoed on Home, Privacy, Impact and a component-demo page.

This document separates three things:

1. **What I measured** — every number below comes from a saved capture or a saved report.
2. **What I inferred** — marked as inference, with the evidence it rests on.
3. **What I changed** — and the measured effect of the change.

---

## 1. Method

| Pass | Tool | Output |
| --- | --- | --- |
| Layout + content audit of every live route | Playwright (Chromium 1243), one fresh page per route/viewport | `evidence/before/audit-raw.json`, 33 screenshots |
| Page-level horizontal overflow | `scrollWidth` vs viewport + unclipped edge offenders on all live routes | `evidence/before/overflow-live.json` |
| Live CSS and font loading | Network + `getComputedStyle` | `evidence/before/css/live.css` |
| Gradient descender test | Screenshot the shipped word, then replace only its gradient with solid text and pixel-diff the two | `evidence/after/descenders*/report.json` |
| Animation cost | CDP `Performance.getMetrics` over 5-second windows, plus a rAF frame probe in a separate window | `evidence/after/animation-profile.json` |
| Off-screen behaviour | Scroll to the footer, then sample only the hero subtree twice, 1 s apart | `evidence/after/pause-behavior.json` |
| Lab score | Lighthouse 12.8.2, mobile emulation | `evidence/after/lighthouse/` |

Measurements are from headless Chromium on one machine. Load-time Lighthouse numbers compare a remote production site with a local preview and are **directional only**; CLS, layout counts, task time, FPS and the pixel tests are like-for-like.

No form was submitted, no newsletter or contact endpoint was called, and no proprietary asset was copied.

---

## 2. The three observations, tested

### "The homepage circle looks less polished"

**Confirmed, and measurable.** The live homepage hero visual is a stack of decorative `div`s, not an illustration or a component:

- three large blurred circles: `1000×1000` with `blur(140px)`, plus `800×800` and `500×500` with `blur(120px)`;
- the decorative rings are `120%`-wide bordered boxes positioned with negative offsets;
- three `pulse` animations run in the hero, two of them on those blurred circles;
- the visual is a stack of absolutely positioned layers, so its silhouette is defined by offsets rather than a reserved stage; the parallax/float is written as inline transforms by Framer Motion.

Read as an interpretation of the DOM — I did not do a visual-input comparison — that reads as soft and approximate: heavy blur, shapes that run past the section edge, and motion not tied to a fixed stage. The prototype replaces it with a defined square stage, real rings, labelled satellites and a centred glass disc — same palette, no copied artwork.

### "The left side of the inner-page circle animations is more broken"

**Not reproduced as left-side clipping.** I measured document width and every element that crosses a viewport edge at all three widths:

- every live route's `scrollWidth` equals the viewport at 1440, 768 and 390 — there is **no horizontal scrollbar** (`evidence/before/overflow-live.json`);
- decorative elements do sit outside their section boxes: 32.9 px past the right edge on Services, 7.2 px on Home, 280 px on Bitelevate, and 300–840 px to the left on Home. Something above them clips, so they add no page overflow;
- the only unclipped element outside the viewport is the closed off-canvas mobile menu (fixed, translated off screen), which is intentional;
- no heading, icon, label or ring appeared cut on the left edge in the geometry captures.

So the asymmetry is real, but the cause is oversized decorations and negative offsets, not a left-side crop. The prototype removes both sides of the problem by containing the orbit in a square stage and clipping only that stage.

### "Privacy 'Policy' and Impact 'Society' lose their descenders"

**Refuted.** Both words are gradient text, but their background box is tall enough (roughly 1.25em) that the `y` is painted. The pixel test found:

| Word | Desktop | Mobile |
| --- | --- | --- |
| Privacy — “Policy” | **0 lost px** | **0 lost px** |
| Impact — “Society” | **0 lost px** | **0 lost px** |

The defect is real, just on different pages. `inline-block` gradient spans with a tight line box do clip:

| Page / word | Desktop lost ink | Desktop depth | Mobile lost ink | Mobile depth |
| --- | --- | --- | --- | --- |
| Products — “Cynbit Product” | **610 px** | **8.0 px** | **40 px** | **2.0 px** |
| Bitelevate — “Start Doing the Work.” | **215 px** | **3.5 px** | **78 px** | **2.5 px** |

The lost rows taper cleanly (49 px wide down to 6 px) and sit entirely below the element's paint box: that is a clipped descender, not anti-aliasing noise. See `evidence/after/composites/descenders-products.png`.

**Why the guess was reasonable but wrong:** the three words look similar in a screenshot. Only a pixel diff below the background box distinguishes “the gradient stops at the box” from “the gradient is simply dark down there”.

### "Each page hero is built separately"

**Supported.** Across the 11 routes:

- 11 different hero heading structures; no shared hero component in the DOM;
- the only shared motion primitive is a `Reveal` wrapper that server-renders `opacity: 0`;
- each route loads its own page chunk;
- the visual is different bespoke markup per page (CSS blobs, rings, cards, lists).

That is the structural reason the same bug class appears on two pages and not the other nine: there is no single place where the typography contract or the animation policy can be enforced.

---

## 3. Live findings

### Typography

| Measure | Live result |
| --- | --- |
| Heading line-height ratios | 0.95, 1.0, 1.08, 1.1, 1.11 — five different values |
| Heading bottom padding | `0px` on every route |
| `overflow: hidden` above copy | none directly, but the gradient paint box is the real clip |
| Descender loss | Products (8 px / 3.5 px) and Bitelevate (3.5 px / 2.5 px) |

A line-height of `0.95` and `1.0` is visually tight by design, but it is only safe while no ancestor or paint box clips. The two clipped pages prove the contract was never written down.

### Layout and loading

| Page | CLS desktop | CLS tablet | CLS mobile | Hidden reveal blocks |
| --- | --- | --- | --- | --- |
| Home | 0.006 | 0.003 | 0.018 | 51 |
| Services | 0.004 | 0.000 | 0.042 | 39 |
| Products | 0.003 | 0.013 | 0.016 | 35 |
| Case studies | 0.003 | 0.000 | 0.009 | 33 |
| Bitelevate | **0.065** | 0.042 | **0.117** | 34 |
| Bitelevate paths | 0.003 | 0.000 | 0.009 | 31 |
| Contact | 0.005 | 0.004 | 0.010 | 27 |
| Blog | 0.003 | 0.000 | 0.009 | 22 |
| Careers | 0.003 | 0.000 | 0.009 | 48 |
| Impact | 0.003 | 0.000 | 0.048 | 22 |
| Privacy | 0.003 | 0.000 | 0.009 | 21 |

- Every route ships **20–52** elements at `opacity: 0` and waits for JavaScript before showing them.
- **No route has a `prefers-reduced-motion` rule.**
- Bitelevate is the worst case at **0.117** CLS on mobile and **0.065** on desktop.

### Animation

Live hero, same 5-second windows on the same machine:

| Window | Main-thread task | Layout passes | FPS | Long frames |
| --- | --- | --- | --- | --- |
| Hero in view | **190 ms** | **145** | **28.0** | 2 |
| Hero off screen | **978 ms** | **301** | 120.0 (uncapped headless) | 0 |
| Reduced motion | **161 ms** | **146** | 26.0 | — |

Two findings matter more than the raw cost:

1. **Off screen is more expensive than on screen.** The animation keeps running and Chrome pays for 301 layout passes per 5 s. The parallax writes `transform`, the scan line writes `top`, and a pulse writes `width` — none of that is free when nobody is looking.
2. **Reduced motion changes nothing.** Seven CSS animations still run and the hero still does 146 layout passes.

The live hero also writes inline styles every second while off screen (`transform`, `opacity`, `top`, `width`) and leaves 2/2–4/4 hero animations running depending on the frame sampled. There is no `IntersectionObserver` pause and no `visibilitychange` pause.

---

## 4. Root causes

1. **No typography contract.** Each hero picks its own line-height and gradient span class. `background-clip: text` paints only inside the element's background box; a tight box silently crops descenders.
2. **Decorations own the layout.** Bespoke absolute blobs, negative margins and transformed rings extend well outside their section and create asymmetric edges, relying on whichever ancestor happens to clip them.
3. **Animation is attached per element with no lifecycle.** Framer Motion writes inline transforms; CSS pulses animate `width`; nothing stops when the hero leaves the viewport or when the user asks for less motion.
4. **Reveals start hidden.** Server-rendered `opacity: 0` turns every section into a layout-shift risk and a content-visibility dependency.
5. **No shared hero means no shared fix.** The same defect has to be rediscovered on every page.

---

## 5. The change

### `PageHero` — one shell, one typography contract

Props: `eyebrow`, `eyebrowIcon`, `heading`, `subtext`, `meta`, `actions`, `visual`, `align` (`split` / `centre`), `tone` (`cool` / `warm`), `id`.

Rules the component enforces:

- `.hero-display` uses `line-height: 1.15` and bottom padding. Descenders have real room.
- `.gradient-word` adds `0.12em` of padding **inside its own paint box**, so the gradient exists behind the tail of `y / g / p / j / q`.
- Only the decorative backdrop is clipped. The heading itself is `overflow: visible`.
- Fluid type via `clamp()`; no fixed height on the copy.
- `align="centre"` drops the visual column without forking markup.
- `tone="warm"` swaps two custom properties, which the washes and eyebrow inherit.

### `HeroOrbit` — one stage, three behaviours

Props: `accent`, `accentAlt`, `centerIcon`, `icons`, `size`, `speed`, `label`, `notes`, `className`.

- Square stage with `aspect-ratio: 1 / 1`, so space is reserved before paint.
- Only `transform` and `opacity` animate. The rotating rings are HTML layer boxes containing static SVG circles; rotating an SVG `<g>` is not composited in Chrome and cost a layout per frame.
- `IntersectionObserver` sets `data-paused="true"` off screen; `visibilitychange` does the same in a hidden tab.
- `prefers-reduced-motion` sets `data-static="true"`: movement and scan line stop, the constellation stays legible.
- Below 640 px the glass notes are removed, chips shrink and the disc tightens.
- The stage clips its own rotating layers, so a rotated square can never add page overflow.

### Motion and assets

- `RotatingWord` pauses off screen, in a hidden tab and under reduced motion. Only its padded window uses `overflow: hidden`.
- The two Latin variable fonts are self-hosted and preloaded, with local `@font-face` rules, removing the font-swap CLS.
- No animation library. React toggles two data attributes; CSS does the movement.
- Icons are inline Apache-2.0 Material Symbols paths. No Cynbit artwork, logo or copy was copied.

---

## 6. Results

All prototype numbers are from the final build, measured the same way as the live numbers.

### Typography and layout

| Check | Live | Prototype |
| --- | --- | --- |
| Heading line-height | 0.95–1.11 | **1.15** at every breakpoint |
| Gradient padding below baseline | 0 px | **11.29 px** (0.12em) |
| Lost descender ink (pixel test) | 610 px / 215 px on two pages | **0 px** on Home, Privacy, Impact, System |
| CLS, all routes/viewports | up to **0.117** | **0.000** |
| Page `scrollWidth` vs viewport | equal on all 33 captures | equal on all 12 captures, 1440–390 |
| Hidden reveal blocks | 20–52 per page | **0** |
| Rotating layers escaping their stage | n/a (no stage) | **0** (two escaped before the stage clip was added) |

Heading measurements: 94.08 / 108.192 px desktop, 59.136 / 68.0064 px tablet, 41.6 / 47.84 px mobile — all exactly 1.15. Gradient words carry 11.29 px of bottom padding (≈0.12em).

### Animation and behaviour

| Window | Live task / layouts / FPS | Prototype task / layouts / FPS |
| --- | --- | --- |
| Hero in view | 190 ms / 145 / 28.0 | **19 ms / 2 / 60** |
| Hero off screen | 978 ms / 301 / — | **82 ms / 0 / —** |
| Reduced motion | 161 ms / 146 / 26.0 | **0 ms / 0 / 60** |

Off screen, the live hero writes **9 inline style changes per second** and keeps **2/2–4/4** animations running. The prototype writes **0**, has **0/14** running, and exposes `data-paused="true"`. Under reduced motion it has **0** animated descendants and one static rotator word.

### Lighthouse, mobile emulation

| | Live home | Prototype home |
| --- | --- | --- |
| Performance | 56 | **99** |
| Accessibility | 82 | **100** |
| Best practices | 100 | **100** |
| SEO | 100 | **100** |
| FCP | 9.3 s | 1.2 s |
| LCP | 11.3 s | 1.8 s |
| CLS | 0.013 | **0** |

FCP/LCP are not a fair comparison: one is a remote production site, the other a local preview. They are included because the task asked for before/after evidence, not because the delta is attributable to the hero alone. CLS and the CDP metrics are apples-to-apples.

---

## 7. Evidence index

| Path | Contents |
| --- | --- |
| `evidence/before/audit-raw.json` | 33 live captures: headings, gradient boxes, clipping candidates, CLS, reveal counts, animations |
| `evidence/before/*.png` | Live screenshots at three widths |
| `evidence/before/overflow-live.json` | Live document width vs viewport and unclipped edge offenders, 33 captures |
| `evidence/before/css/live.css` | Saved live stylesheet used for palette and fonts |
| `evidence/after/audit-prototype.json` | Same layout checks on the prototype, plus pause/reduced-motion assertions |
| `evidence/after/descenders/report.json` | Live desktop descender diff |
| `evidence/after/descenders-mobile/report.json` | Live mobile descender diff |
| `evidence/after/descenders-proto/report.json` | Prototype descender diff (zero loss) |
| `evidence/after/animation-profile.json` | Task time, layout/style passes, FPS, inline-property diff |
| `evidence/after/pause-behavior.json` | Hero subtree sampled in view vs off screen |
| `evidence/after/lighthouse/` | Raw Lighthouse JSON for live and prototype |
| `evidence/after/composites/` | Side-by-side before/after, descender proof, animation chart |

---

## 8. Limitations and next steps

- **Four prototype routes, not eleven.** Home, Privacy and Impact prove the split, centred and warm-tone variants; System is a component demo. The remaining pages are copy-and-props migrations, not new design work.
- **No visual-input comparison.** Findings rely on DOM geometry and pixel diffs; screenshots are for the reviewer.
- **Headless FPS is uncapped.** The FPS comparison is valid within the same run, not as a real-device promise.
- **The live site can change.** Numbers are timestamped and the scripts are in `audit/` so they can be re-run.
- **Next:** move the remaining nine routes onto `PageHero`, replace the server-rendered `opacity: 0` reveals with an in-view transition that defaults to visible, and add a CI check that fails if any `.gradient-word` gets less than `0.1em` of bottom padding.
