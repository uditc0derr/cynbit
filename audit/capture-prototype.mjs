/**
 * Captures the prototype at the same three widths as the live audit and runs
 * layout/a11y checks: overflow, clip-safety, reserved orbit size, reduced motion.
 */
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'evidence', 'after');
await mkdir(OUT, { recursive: true });

const EXE =
  process.env.CHROME_PATH ||
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const BASE = process.env.BASE || 'http://127.0.0.1:4173';
const ROUTES = [['home', '/'], ['privacy', '/privacy'], ['impact', '/impact'], ['system', '/system']];
const VIEWPORTS = [['desktop', 1440, 900], ['tablet', 768, 1024], ['mobile', 390, 844]];

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const results = [];

for (const [vpName, width, height] of VIEWPORTS) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  await context.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });
  const page = await context.newPage();

  for (const [name, route] of ROUTES) {
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

    await page.goto(BASE + route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    const data = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      const cs = h1 ? getComputedStyle(h1) : null;
      const r = h1?.getBoundingClientRect();
      const spans = h1
        ? [...h1.querySelectorAll('span')]
            .filter((s) => getComputedStyle(s).webkitBackgroundClip === 'text' && s.textContent.trim())
            .map((s) => {
              const ss = getComputedStyle(s);
              const sr = s.getBoundingClientRect();
              return {
                text: s.textContent.trim().slice(0, 40),
                h: +sr.height.toFixed(1),
                lineHeight: ss.lineHeight,
                paddingBottom: ss.paddingBottom,
                display: ss.display,
              };
            })
        : [];

      const overflowers = [];
      for (const el of document.querySelectorAll('body *')) {
        const er = el.getBoundingClientRect();
        if (er.width === 0 || er.height === 0) continue;
        if (er.left >= -1 && er.right <= window.innerWidth + 1) continue;
        // Ignore decorative layers an ancestor already clips; only unclipped
        // overflow can create a horizontal scrollbar.
        let clipped = false;
        let parent = el.parentElement;
        while (parent && parent !== document.body) {
          if (getComputedStyle(parent).overflow !== 'visible') {
            clipped = true;
            break;
          }
          parent = parent.parentElement;
        }
        if (clipped) continue;
        overflowers.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className?.baseVal ?? el.className ?? '').toString().slice(0, 90),
          left: +er.left.toFixed(1),
          right: +er.right.toFixed(1),
        });
      }

      const orbit = document.querySelector('[data-testid="hero-orbit"]');
      const orbitRect = orbit?.getBoundingClientRect();
      const hero = document.querySelector('[data-testid="page-hero"]');
      const heroRect = hero?.getBoundingClientRect();

      const anims = [];
      for (const el of document.querySelectorAll('*')) {
        const s = getComputedStyle(el);
        if (s.animationName !== 'none') {
          anims.push({ name: s.animationName, duration: s.animationDuration, playState: s.animationPlayState });
        }
      }

      return {
        h1: cs && {
          text: h1.textContent.trim().replace(/\s+/g, ' ').slice(0, 90),
          fontSize: parseFloat(cs.fontSize),
          lineHeight: parseFloat(cs.lineHeight),
          leading: +(parseFloat(cs.lineHeight) / parseFloat(cs.fontSize)).toFixed(2),
          paddingBottom: cs.paddingBottom,
          overflow: cs.overflow,
          rect: { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) },
        },
        gradientSpans: spans,
        orbit: orbitRect && {
          w: Math.round(orbitRect.width),
          h: Math.round(orbitRect.height),
          insideHero: !!(heroRect && orbitRect.left >= heroRect.left - 1 && orbitRect.right <= heroRect.right + 1),
          paused: orbit.getAttribute('data-paused'),
          static: orbit.getAttribute('data-static'),
        },
        overflowers: overflowers.slice(0, 8),
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        animationCount: anims.length,
        cls: +(window.__cls || 0).toFixed(4),
        imgCount: document.querySelectorAll('img').length,
      };
    });

    const h1 = data.h1;
    if (h1) {
      await page.screenshot({ path: path.join(OUT, `${name}-${vpName}-hero.png`), clip: { x: 0, y: 0, width, height: Math.min(height, h1.rect.y + h1.rect.h + 360) } }).catch(() => {});
      await page.screenshot({ path: path.join(OUT, `${name}-${vpName}-heading.png`), clip: { x: Math.max(0, h1.rect.x - 30), y: Math.max(0, h1.rect.y - 30), width: Math.min(width, h1.rect.w + 60), height: h1.rect.h + 70 } }).catch(() => {});
    }
    await page.screenshot({ path: path.join(OUT, `${name}-${vpName}-viewport.png`) }).catch(() => {});

    // Full page for README / side-by-side evidence.
    await page.screenshot({ path: path.join(OUT, `${name}-${vpName}-full.png`), fullPage: true }).catch(() => {});

    results.push({ page: name, viewport: vpName, width, height, errors, ...data });
    console.log(`✓ ${vpName.padEnd(7)} ${route.padEnd(10)} cls=${data.cls} h1=${h1?.fontSize}/${h1?.lineHeight} (${h1?.leading}) spans=${JSON.stringify(data.gradientSpans.map((s) => `${s.text}:${s.h}px`))} orbit=${data.orbit?.w}px insideHero=${data.orbit?.insideHero} overflowers=${data.overflowers.length} anims=${data.animationCount}`);
  }
  await context.close();
}

// Reduced-motion behaviour on home.
const rm = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const rmPage = await rm.newPage();
await rmPage.goto(BASE + '/', { waitUntil: 'networkidle' });
await rmPage.waitForTimeout(600);
const reduced = await rmPage.evaluate(() => {
  const orbit = document.querySelector('[data-testid="hero-orbit"]');
  const animated = [...document.querySelectorAll('.orbit *')].filter(
    (el) => getComputedStyle(el).animationName !== 'none',
  ).length;
  const rotator = document.querySelector('.word-rotator');
  return {
    static: orbit?.getAttribute('data-static'),
    animatedDescendants: animated,
    rotatorWords: rotator?.querySelectorAll('.word-rotator__word').length ?? 0,
  };
});
await rmPage.screenshot({ path: path.join(OUT, 'home-desktop-reduced-motion.png') });
await rm.close();

// Off-screen pause: scroll the orbit out of view and confirm data-paused flips.
const pausePage = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await pausePage.goto(BASE + '/', { waitUntil: 'networkidle' });
await pausePage.waitForTimeout(500);
const pausedBefore = await pausePage.getAttribute('[data-testid="hero-orbit"]', 'data-paused');
await pausePage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await pausePage.waitForTimeout(700);
const pausedAfter = await pausePage.getAttribute('[data-testid="hero-orbit"]', 'data-paused');

results.push({ checks: { reducedMotion: reduced, offscreenPause: { before: pausedBefore, after: pausedAfter } } });
await writeFile(path.join(ROOT, 'evidence', 'after', 'audit-prototype.json'), JSON.stringify(results, null, 2));
await browser.close();
console.log('\nReduced motion:', reduced);
console.log('Off-screen pause:', pausedBefore, '->', pausedAfter);
