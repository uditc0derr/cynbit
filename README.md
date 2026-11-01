# Cynbit PageHero prototype

A shared hero system for Cynbit's marketing pages: one `PageHero` for structure and typography, one `HeroOrbit` for the animated visual. Built as an interview take-home after auditing the live site.

**Audit write-up:** [`AUDIT.md`](./AUDIT.md)
**Two-minute walkthrough:** [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md)

```bash
cd prototype
npm install
npm run dev
```

The dev server runs at <http://localhost:5173>. Production build:

```bash
npm run build
npm run preview
```

---

## What this solves

The live site has eleven hand-built heroes. Auditing them found three headline problems:

1. **Gradient text loses descenders.** Two pages clip the tail of `y`, `g` and `p` because `background-clip: text` only paints inside the element's background box. Privacy and Impact — the two pages named in the brief — are **not** affected; Products and Bitelevate are.
2. **Hero animation never stops.** Off screen, the live hero costs 301 layout passes and 978 ms of main-thread work per five seconds — more than when it is visible. Reduced motion changes nothing.
3. **Nothing is shared.** Eleven heroes means eleven chances to diverge on line-height, overflow, reveal behaviour and visual structure.

The prototype fixes all three at the component level, then proves it with pixel diffs, CDP metrics and Lighthouse. `AUDIT.md` has the full before/after tables and links every raw report. The complete list — including the bugs I introduced and fixed during the build — is below.

---

## Bugs and problems solved

### In the live site

| Problem | Symptom | Cause | Fix in the prototype | Proof |
| --- | --- | --- | --- | --- |
| Descenders clipped by gradient text | Products loses **610 px of ink, 8 px deep** at the tail of “Cynbit”; Bitelevate loses **215 px, 3.5 px deep** in “Doing”. Mobile loses 40 px / 2 px and 78 px / 2.5 px | `background-clip: text` only paints inside the element's background box. A short line box means the gradient simply does not exist under `y / g / p / j / q` | `.hero-display` uses line-height 1.15, and `.gradient-word` adds `0.12em` of bottom padding **inside its own paint box**. Only the decorative backdrop is clipped | `evidence/after/descenders/report.json`, `descenders-mobile/report.json`; prototype reports **0 lost px** on all four routes |
| Hero animation keeps running off screen | 301 layout passes and **978 ms** of main-thread work per 5 s when the hero is 7,800 px off screen — more than when it is visible | Framer Motion writes `transform` inline every frame; CSS pulses animate `width`; there is no `IntersectionObserver` or `visibilitychange` pause | `HeroOrbit` sets `data-paused="true"` off screen and in hidden tabs. All movement is `transform`/`opacity` only | `evidence/after/pause-behavior.json`: live 9 style changes/s and 2–4 animations still running; prototype 0 changes and 0/14 running |
| Reduced motion ignored | Seven CSS animations still run and the hero still does 146 layout passes with `prefers-reduced-motion: reduce` | No reduced-motion rule anywhere on the live site | `data-static="true"` removes every orbit animation and scan line. `RotatingWord` stops rotating | `audit-prototype.json`: 0 animated descendants, one static word |
| Layout shift before content appears | CLS up to **0.117** (Bitelevate mobile); every route ships **20–52** elements at `opacity: 0` | Reveal wrappers server-render hidden and wait for JS. Webfonts swap in after first paint | In-view hooks default to visible; fonts are self-hosted and preloaded with local `@font-face` | CLS **0.000** on every prototype route and viewport |
| Eleven heroes, no shared contract | Five different heading line-heights (0.95–1.11), bespoke visuals and motion per page; the same bug appears on two pages and not the other nine | Each page hero was built separately | One `PageHero` and one `HeroOrbit`; page differences are props | `capture-live.mjs` vs `capture-prototype.mjs` |

### In the prototype, found during the build

These were caught by the measurement scripts rather than by eye, and each one has a saved check:

| Bug I introduced | What it looked like | Fix | Re-verified |
| --- | --- | --- | --- |
| Hamburger visible on desktop | The menu button was `display: grid` at 1440 px because unlayered `.menu-button` CSS outranked Tailwind's `md:hidden` | Moved all custom CSS into `@layer components` so utilities keep their normal priority | Hidden at 1440 / 1024 / 768, visible at 767 / 390 |
| Rotating SVG groups forced layout every frame | 180 layout passes in 3 s from the orbit rings | Each rotating ring moved into an HTML layer containing a static SVG, so the rotation stays on the compositor | 2 layout passes in the same window |
| Rotating layers widened the page | `scrollWidth` intermittently **1449 / 1440** on desktop and **399 / 390** on mobile, because a rotated square's bounding box is wider than the square | `overflow: clip` on the square orbit stage; every ring and chip is designed to sit inside it | `scrollWidth` equals the viewport at 1440, 1024, 768, 767 and 390; 0 unclipped offenders |
| Fonts caused a swap-in shift | The first paint used a metric-different fallback before the webfont arrived | Self-hosted the two Latin variable fonts, preloaded them in `index.html`, removed the fontsource packages | CLS 0 on all routes; both families report `loaded` |
| The FPS probe polluted its own metric | The rAF loop added one style recalc per frame while CPU numbers were being read | CPU/layout and FPS are measured in separate windows | Final numbers in `animation-profile.json` |

### Reported, but not a bug

- **Privacy “Policy” and Impact “Society”** were reported as clipped. The pixel test found **0 lost pixels** on both words at desktop and mobile — their gradient boxes are tall enough. The fix still covers them, because the contract is shared.
- **“The left side is more broken”** was not reproduced. No live route has a horizontal scrollbar; decorations sit outside their section on both sides and rely on an ancestor to clip them. The prototype contains the orbit in a square stage so its moving layers cannot leave the stage on either side.

---

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Split hero with the rotating headline and the full orbit (cool accent, four satellites, two glass notes) |
| `/privacy` | Centred hero, no visual; ordinary policy page below |
| `/impact` | Split hero, warm tertiary accent, different icons, slower tempo, larger stage |
| `/system` | Component demo: typography specimen, orbit presets, API notes. Linked from the footer, not the primary nav |
| `*` | 404 that uses the same hero shell |

---

## The two components

### `PageHero`

`prototype/src/components/PageHero.tsx` + `PageHero.css`

```tsx
<PageHero
  eyebrow="The optimistic architect"
  eyebrowIcon="auto_awesome"
  heading={<>Architecting the future with <span className="gradient-word">AI automation.</span></>}
  subtext="Cynbit designs AI automation..."
  meta={<>Last updated 20 May 2026</>}
  actions={[
    { label: 'Start discovery', href: '#contact' },
    { label: 'How we work', href: '#approach', variant: 'secondary', icon: 'insights' },
  ]}
  visual={<HeroOrbit />}
  align="split"   // or "centre"
  tone="cool"     // or "warm"
/>
```

| Prop | Type | Notes |
| --- | --- | --- |
| `eyebrow` | `string` | Required small label above the heading |
| `eyebrowIcon` | `IconName` | Optional icon inside the eyebrow |
| `heading` | `ReactNode` | Put gradient words in `<span className="gradient-word">` |
| `subtext` | `ReactNode` | Supporting paragraph |
| `meta` | `ReactNode` | Optional line under the subtext |
| `actions` | `HeroAction[]` | Primary/secondary buttons; internal routes use `<Link>` |
| `visual` | `ReactNode` | Optional stage, usually `HeroOrbit` |
| `align` | `'split' \| 'centre'` | Centre mode drops the visual column |
| `tone` | `'cool' \| 'warm'` | Swaps the accent custom properties |
| `id` | `string` | Anchor target |

The clip-safe contract lives in `index.css` under “Clip-safe display type”:

- `line-height ≥ 1.15` on display type;
- `padding-bottom: 0.12em` **inside** the gradient word's own paint box;
- no `overflow: hidden` or fixed height above copy — only the decorative backdrop is clipped.

The heading on every breakpoint measures 1.15 exactly (94.08/108.192 px desktop, 59.136/68.0064 tablet, 41.6/47.84 mobile).

### `HeroOrbit`

`prototype/src/components/HeroOrbit.tsx` + `HeroOrbit.css`

```tsx
<HeroOrbit
  accent="#006067"
  accentAlt="#12629d"
  centerIcon="hub"
  icons={['terminal', 'psychology', 'auto_awesome', 'insights']}
  size={560}
  speed={1}
  label="Automation"
  notes={[
    { icon: 'terminal', title: 'Runtime', value: 'Always on' },
    { icon: 'insights', title: 'Systems', value: 'Connected' },
  ]}
/>
```

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `accent` | `string` | `#006067` | Main ring, chip and label colour |
| `accentAlt` | `string` | `#12629d` | Second note's accent |
| `centerIcon` | `IconName` | `hub` | Icon inside the glass disc |
| `icons` | `IconName[]` | four defaults | 2–4 satellites; extras are ignored |
| `size` | `number` | `560` | Maximum stage size in px; scales down fluidly |
| `speed` | `number` | `1` | Tempo multiplier: `0.7` calmer, `1.4` faster |
| `label` | `string` | `Automation` | Caption under the centre icon |
| `notes` | `OrbitNote[]` | `[]` | Up to two glass notes; hidden below 640 px |
| `className` | `string` | `''` | Extra class on the stage |

Behaviour is driven by two data attributes, not by a JavaScript frame loop:

- `data-paused="true"` — set by `IntersectionObserver` when the stage is more than 160 px off screen, and by a `visibilitychange` listener when the tab is hidden. Every descendant gets `animation-play-state: paused`.
- `data-static="true"` — set when `prefers-reduced-motion: reduce` matches. Every animation is removed, the scan line disappears, and the constellation stays fully legible.

The whole stage is `aria-hidden="true"`: it is decorative and repeats information that is already in the hero copy.

---

## File-by-file

### Prototype

| File | What it does, in plain language |
| --- | --- |
| `src/main.tsx` | Mounts React and imports the one stylesheet |
| `src/App.tsx` | Router, layout, scroll-to-top on navigation, 404 |
| `src/index.css` | Design tokens, self-hosted font faces, the clip-safe type contract, rotator, site chrome and section styles. Everything custom sits in `@layer components` so Tailwind utilities can still override it |
| `src/components/PageHero.tsx` | The shared hero shell: eyebrow, heading, subtext, meta, actions, visual slot, alignment and tone |
| `src/components/PageHero.css` | Hero grid, washes, backdrop clip, fluid spacing, mobile action layout |
| `src/components/HeroOrbit.tsx` | The orbit stage: rings, disc, satellites, notes, pause and reduced-motion state |
| `src/components/HeroOrbit.css` | All orbit geometry and animation. Only `transform`/`opacity` animate; the stage reserves a square and clips its own rotating layers |
| `src/components/RotatingWord.tsx` | Rotating last phrase on the home headline; pauses off screen, in a hidden tab and under reduced motion |
| `src/components/Icon.tsx` | Inline Apache-2.0 Material Symbols paths. No icon font, no network request |
| `src/components/SiteHeader.tsx` | Brand, desktop nav, mobile menu, one CTA. The hamburger is `md:hidden` |
| `src/components/SiteFooter.tsx` | Footer navigation, the component-demo link, live-site link |
| `src/components/SectionHeading.tsx` | Shared eyebrow + title + lead for content sections |
| `src/components/CtaBand.tsx` | Closing call-to-action band |
| `src/hooks/useMotion.ts` | Three small hooks: reduced-motion tracking, in-view tracking with a safe default, document visibility |
| `src/pages/HomePage.tsx` | Demonstrates the split hero, rotating word and full orbit |
| `src/pages/PrivacyPage.tsx` | Demonstrates the centred hero with no visual |
| `src/pages/ImpactPage.tsx` | Demonstrates prop reuse: warm accent, different icons, slower speed, larger stage |
| `src/pages/SystemPage.tsx` | Component demo: type specimen, three orbit presets, behaviour notes |
| `public/fonts/*.woff2` | Latin-subset variable Plus Jakarta Sans and Manrope |
| `public/favicon.svg`, `public/robots.txt` | Small finishing assets; the prototype is explicitly not the production site |
| `index.html` | Font preloads, favicon, description, theme colour |
| `vercel.json` | SPA rewrite so `/impact` and `/privacy` work on a static host |
| `vite.config.ts`, `tsconfig*.json` | Build configuration |

### Audit tooling (not shipped)

| File | What it does |
| --- | --- |
| `audit/capture-live.mjs` | 11 live routes × 3 viewports: headings, gradient boxes, clipping candidates, CLS, reveal counts, animation inventory, screenshots |
| `audit/overflow-live.mjs` | Live document width vs viewport and unclipped edge offenders |
| `audit/capture-prototype.mjs` | The same checks on the prototype, plus reduced-motion and pause assertions |
| `audit/cls-debug.mjs` | Attributes layout shifts to elements and finds unclipped horizontal overflow |
| `audit/gradient-descender.mjs` | Screenshots each gradient word twice: shipped, then with the gradient replaced by solid text |
| `audit/analyse-descenders.py` | Pixel-diffs the pairs and counts ink lost below the paint box |
| `audit/animation-profile.mjs` | CDP task/layout/style metrics and FPS over matched 5-second windows |
| `audit/pause-behavior.mjs` | Samples the hero subtree in view vs off screen |
| `audit/make-composites.py` | Builds the before/after, descender and animation-cost images |
| `audit/verify-deploy.mjs` | Smoke-tests the deployed build: routes, fonts, heading ratio, overflow, console errors and the hamburger breakpoint |
| `audit/README.md` | How to reproduce every number |

---

## Design decisions

**One hero, two alignments, two tones.** The live pages differ in copy, accent and whether there is a visual. Those are props, not new components. `align="centre"` removes the visual column; `tone="warm"` swaps two CSS custom properties that the washes and eyebrow already read.

**A typography contract, not a patch.** Fixing Products and Bitelevate individually would leave the next hero free to repeat the bug. `line-height: 1.15` plus `0.12em` of gradient padding is inherited by every hero and verified by a pixel test on all four prototype routes.

**No animation library.** The orbit is CSS keyframes on `transform` and `opacity`. React only toggles `data-paused` and `data-static`. That keeps the animation out of the hydration path and makes pause/reduced-motion declarative. The live site's Framer Motion parallax writes inline transforms every second even when the hero is 7,800 px off screen.

**Rotating HTML layers, not rotating SVG groups.** Chrome does not composite a rotation applied to an SVG `<g>`; it laid out once per frame in measurement (180 layout passes in 3 s). Moving each rotating ring into an HTML box with a static SVG inside dropped that to 2.

**The stage clips itself.** A rotating square's bounding box is wider than the square. Without clipping, the ring layers intermittently pushed the document to 1449 px on a 1440 px viewport and 399 px on 390 px. `overflow: clip` on the square stage removes the overflow without clipping any ring, chip or note, all of which are designed to sit inside it.

**Pause is an attribute, not a timer.** `IntersectionObserver` (160 px margin), `visibilitychange` and `prefers-reduced-motion` each set one attribute. There is no interval, no rAF loop, and no way for one state to leak into another.

**Fonts are self-hosted and preloaded.** Both families are the same two the live site uses, but served locally as Latin variable WOFF2 with preload hints. That removes the swap-in layout shift that contributes to the live site's CLS.

**Tailwind utilities must win.** All custom CSS is inside `@layer components`. Unlayered CSS outranks every layer, which is why an earlier version of `.menu-button { display: grid }` defeated `md:hidden` and showed the hamburger on desktop. The CSS comment records that reason.

**Matches the live visual language, copies no assets.** Palette and typefaces come from the live CSS (`#006067`, `#007b83`, `#12629d`, `#774e00`, `#ffddb3`, surface `#f7fafa`; Plus Jakarta Sans + Manrope). The orbit is a new composition. Icons are Apache-2.0 Material Symbols paths with attribution in `Icon.tsx`. No logo, image or paragraph was lifted.

---

## Verification

Final measurements, same build, same machine:

| | Live | Prototype |
| --- | --- | --- |
| CLS (worst route/viewport) | 0.117 | **0.000** |
| Descender ink lost | 610 px / 215 px on two pages | **0 px** |
| Page `scrollWidth` vs viewport | equal (no scrollbar) | **equal** at 1440, 1024, 768, 767, 390 |
| Rotating layers escaping the stage | n/a | **0** |
| Hero in view: task / layouts / FPS | 190 ms / 145 / 28 | **19 ms / 2 / 60** |
| Hero off screen: task / layouts | 978 ms / 301 | **82 ms / 0** |
| Reduced motion | 7 animations still run | **0 animated descendants** |
| Lighthouse mobile | 56 / 82 / 100 / 100 | **99 / 100 / 100 / 100** |

Full tables, method and limitations: [`AUDIT.md`](./AUDIT.md). Raw JSON: `evidence/after/`.

```bash
# rebuild the evidence (preview must be running on :4174)
cd prototype && npm run build && npm run preview -- --port 4174
cd ../audit && npm install
npm run capture:prototype
npm run perf
npm run descenders:prototype
npm run descenders:analyse
npm run composites
```

---

## Migrating the live site

1. Copy `PageHero.tsx`, `PageHero.css`, `HeroOrbit.tsx`, `HeroOrbit.css`, `RotatingWord.tsx`, `Icon.tsx` and `hooks/useMotion.ts` into the Next.js app. Add `'use client'` to the three interactive components; `PageHero` itself is fine as a server component.
2. Move the clip-safe rules into the global stylesheet, or keep them scoped to `.hero-display` / `.gradient-word`.
3. For each route, replace the bespoke hero section with `PageHero`. Existing copy and CTAs pass through unchanged. Page-specific visuals become either `HeroOrbit` with different props or any node in the `visual` slot.
4. Keep the live palette tokens; the prototype's `@theme` block maps one-to-one.
5. Delete the per-page hero markup and the old `Reveal` wrappers around hero copy. Do not ship `opacity: 0` in server HTML.
6. Run `audit/gradient-descender.mjs` against the changed pages before merging; a non-zero `lostPixelsBelowBox` means the contract was broken.

The prototype intentionally does not import the production site's components or styles. It is a reference implementation, not a drop-in package.

---

## Deploying

The app is a static Vite SPA with `vercel.json` rewrites:

```bash
cd prototype
npx vercel --prod
```

Any static host works if all unknown paths rewrite to `index.html`. The build output is `dist/`.

---

## Notes

- This is an independent interview prototype, not the production Cynbit site.
- No contact, newsletter or form endpoint is called anywhere in the prototype or the audit scripts.
- The audit numbers are a snapshot from 1 November 2026; the live site can change.
