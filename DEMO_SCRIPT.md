# Two-minute demo

Goal: show one problem, one system, and the evidence — without narrating file names.

Setup before you start:

```bash
cd prototype
npm install
npm run dev
```

Open the printed local URL, or use the deployed build at
<https://prototype-black-rho.vercel.app>. Have `AUDIT.md` open at the results
table, and keep DevTools → Rendering → **Emulate CSS media feature
prefers-reduced-motion** one click away.

---

## 0:00–0:15 — Frame it

> "Cynbit's marketing pages look good individually, but each hero is built on its
> own. The same two defects show up in different places: gradient text that loses
> its descenders, and orbit animations that keep doing layout work when nobody is
> looking. I rebuilt the hero as one component and measured the before and after."

## 0:15–0:40 — What the audit actually found

Show the results table in `AUDIT.md`.

> "I captured all eleven routes at 1440, 768 and 390. The guess was that Privacy
> 'Policy' and Impact 'Society' were clipped. I tested that at pixel level: they
> are **not**. The gradient box on those inline spans is tall enough.
>
> The real clipping is on **Products** — the y in 'Cynbit' loses 8px on desktop —
> and **Bitelevate**, where the g in 'Doing' loses 3.5px. Same bug class, different
> pages than expected. That is why the fix is a system, not two one-off patches."

Show `evidence/after/composites/descenders-products.png` if screen sharing allows:
shipped / solid reference / missing pixels in red.

## 0:40–1:10 — The prototype, and the behaviours you cannot screenshot

On `/`:

- Point at the rotating headline. "The window that clips the rotation is padded;
  the gradient word inside it is padded. Nothing eats the descender."
- Scroll the orbit out of view, open DevTools → Animations. "Every animation is
  paused. `data-paused` flips via IntersectionObserver."
- Toggle **prefers-reduced-motion: reduce**. "The stage becomes a static
  constellation. Rings, icons and labels stay; movement stops. The live site has
  no reduced-motion rule at all."

## 1:10–1:35 — Reuse, not repetition

Open `/privacy`, then `/impact`.

> "Privacy is a centred hero with no visual. Impact passes a warm accent, different
> icons, a slower speed and a larger stage. Same `PageHero`, same `HeroOrbit`,
> no forked markup. The page author writes content and props."

Open `/system` (linked from the footer) to show the typography specimen and three
orbit presets in one place.

## 1:35–2:00 — The numbers

> "Mobile Lighthouse on the prototype: performance 99, accessibility 100, CLS 0.
> The live home page in the same lab: 56, CLS up to 0.117 in the layout-shift
> capture, and 145 layout passes per five seconds while the hero is visible —
> 301 when it is off screen, at nearly a second of main-thread work. The
> prototype does 2, then 0. Task time over the same window: 190ms live, 19ms
> prototype. FPS: 28 versus 60."

> "Adoption is one component swap per page: keep the existing copy and CTAs, pass
> them to `PageHero`, pass the accent and icons to `HeroOrbit`. The migration
> notes are in the README."

---

## If they ask

**"Why no animation library?"**
The orbit is CSS transforms and opacity only. React toggles two data attributes.
There is no JavaScript frame loop, nothing to hydrate for the animation, and the
pause/reduced-motion states are declarative.

**"Why not patch the two clipped pages?"**
Because the next page will repeat the mistake. The typography contract lives on
`.hero-display` and `.gradient-word`, so every hero inherits it. The pixel test
proves the contract holds on all four prototype heroes.

**"You changed the visual design."**
Deliberately, narrowly: same palette, same two typefaces, same tone, no copied
assets. The hero layout is re-composed so the orbit stays inside its stage, which
is what removes the right-side asymmetry and keeps the moving layers contained.

**"What about the left side of the inner-page circles?"**
I could not reproduce left-side clipping, and no live route has a horizontal
scrollbar. What I did find is decorative shapes sitting 32.9px, 7.2px and 280px
past their section on the right, and hundreds of pixels past it on the left,
relying on an ancestor to clip them. The prototype contains the orbit in a square
stage, so its moving layers never leave the stage on either side.

**"Is the Lighthouse comparison fair?"**
No, not for FCP/LCP: the live site is remote and the prototype was served locally.
Treat the load-time gap as directional. The CLS, layout-pass, task-time and FPS
numbers come from the same headless Chromium on the same machine, and those are
the ones the change targets.
