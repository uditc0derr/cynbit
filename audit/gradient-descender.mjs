/**
 * Descender pixel test.
 *
 * For every gradient-clipped heading word, capture the same pixels twice:
 *   1. as shipped (transparent text + gradient background + background-clip:text)
 *   2. with the gradient removed and the text filled solid
 * If the gradient box ends above the glyph's descender, the tail of y/g/p/j/q
 * is painted in (2) but missing in (1). The Python analyser counts exactly
 * those pixels, so the claim is measured rather than asserted.
 *
 * Usage:
 *   BASE=https://www.cynbit.in ROUTES=live OUT=descenders node gradient-descender.mjs
 *   BASE=http://127.0.0.1:4174 ROUTES=prototype OUT=descenders-proto node gradient-descender.mjs
 */
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const BASE = process.env.BASE || 'https://www.cynbit.in';
const MODE = process.env.ROUTES || 'live';
const WIDTH = Number(process.env.WIDTH || 1440);
const HEIGHT = Number(process.env.HEIGHT || 900);
const OUT = path.join(ROOT, 'evidence', 'after', process.env.OUT || 'descenders');
await mkdir(OUT, { recursive: true });

const EXE =
  process.env.CHROME_PATH ||
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;

const LIVE_ROUTES = [
  ['home', '/'],
  ['services', '/services'],
  ['products', '/products'],
  ['case-studies', '/case-studies'],
  ['bitelevate', '/bitelevate'],
  ['bitelevate-paths', '/bitelevate/paths'],
  ['contact', '/contact'],
  ['blog', '/blog'],
  ['careers', '/careers'],
  ['impact', '/impact'],
  ['privacy', '/privacy'],
];

const PROTOTYPE_ROUTES = [
  ['prototype-home', '/'],
  ['prototype-impact', '/impact'],
  ['prototype-privacy', '/privacy'],
  ['prototype-system', '/system'],
];

const routes = MODE === 'live' ? LIVE_ROUTES : PROTOTYPE_ROUTES;

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 2 });
const page = await context.newPage();
const manifest = [];

/** Reads the gradient spans currently inside the h1, with visibility info. */
const readSpans = () =>
  page.evaluate(() => {
    const h1 = document.querySelector('h1');
    if (!h1) return [];
    return [...h1.querySelectorAll('span')]
      .filter((el) => {
        const cs = getComputedStyle(el);
        return (
          (cs.webkitBackgroundClip === 'text' || cs.backgroundClip === 'text') &&
          el.textContent.trim().length > 0
        );
      })
      .map((el, index) => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        // Effective opacity, so a word hidden by an animated parent is skipped.
        let opacity = 1;
        let node = el;
        while (node && node !== h1) {
          opacity *= parseFloat(getComputedStyle(node).opacity);
          node = node.parentElement;
        }
        return {
          index,
          text: el.textContent.trim().replace(/\s+/g, ' '),
          display: cs.display,
          fontSize: parseFloat(cs.fontSize),
          lineHeight: parseFloat(cs.lineHeight),
          paddingBottom: parseFloat(cs.paddingBottom),
          opacity,
          visibility: cs.visibility,
          rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        };
      });
  });

for (const [name, route] of routes) {
  await page.goto(BASE + route, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400); // let reveal transitions settle
  const count = (await readSpans()).length;

  for (let index = 0; index < count; index += 1) {
    // Reload per span: the solid-text override must never leak into the next
    // capture, and it keeps rotating headlines on their first frame.
    await page.goto(BASE + route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1400);

    const span = (await readSpans())[index];
    if (!span) continue;
    if (span.opacity < 0.5 || span.visibility === 'hidden') {
      console.log(`- ${name} span ${index} not visible (opacity ${span.opacity}); skipped`);
      continue;
    }

    await page.evaluate((i) => {
      const h1 = document.querySelector('h1');
      const el = [...h1.querySelectorAll('span')].filter((s) => {
        const cs = getComputedStyle(s);
        return (cs.webkitBackgroundClip === 'text' || cs.backgroundClip === 'text') && s.textContent.trim();
      })[i];
      el.scrollIntoView({ block: 'center' });
    }, index);
    await page.waitForTimeout(250);

    const measured = (await readSpans())[index];
    const { rect, fontSize } = measured;
    if (!rect || rect.w < 4 || rect.h < 4) continue;

    const padX = Math.ceil(fontSize * 0.08);
    const clip = {
      x: Math.max(0, Math.floor(rect.x - padX)),
      y: Math.max(0, Math.floor(rect.y - fontSize * 0.1)),
      width: 0,
      height: 0,
    };
    clip.width = Math.min(Math.ceil(rect.w + padX * 2), WIDTH - clip.x);
    clip.height = Math.min(Math.ceil(rect.h + fontSize * 0.55), HEIGHT - clip.y);
    if (clip.width <= 0 || clip.height <= 0) continue;

    const slug = `${name}-${index}-${measured.text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 28)}`;
    const before = path.join(OUT, `${slug}--shipped.png`);
    const after = path.join(OUT, `${slug}--solid.png`);

    await page.screenshot({ path: before, clip });
    await page.waitForTimeout(80);

    const switched = await page.evaluate((i) => {
      const h1 = document.querySelector('h1');
      const el = [...h1.querySelectorAll('span')].filter((s) => {
        const cs = getComputedStyle(s);
        return (cs.webkitBackgroundClip === 'text' || cs.backgroundClip === 'text') && s.textContent.trim();
      })[i];
      if (!el) return null;
      el.style.backgroundImage = 'none';
      el.style.background = 'none';
      el.style.color = '#111111';
      el.style.webkitTextFillColor = '#111111';
      return el.textContent.trim().replace(/\s+/g, ' ');
    }, index).catch(() => null);

    if (!switched) {
      console.log(`! ${name} span ${index} disappeared before capture`);
      continue;
    }

    await page.waitForTimeout(80);
    await page.screenshot({ path: after, clip });

    manifest.push({
      route,
      name,
      spanIndex: index,
      text: measured.text,
      switchedText: switched,
      textStable: switched === measured.text,
      display: measured.display,
      fontSize: measured.fontSize,
      lineHeight: measured.lineHeight,
      leading: +(measured.lineHeight / measured.fontSize).toFixed(3),
      paddingBottom: measured.paddingBottom,
      opacity: measured.opacity,
      rect: measured.rect,
      clip,
      before: path.relative(ROOT, before),
      after: path.relative(ROOT, after),
    });
    console.log(
      `✓ ${name.padEnd(17)} #${index} "${measured.text}" ${measured.display} ${measured.fontSize}px/${measured.lineHeight}px pad=${measured.paddingBottom}px clip=${clip.width}x${clip.height}`,
    );
  }
}

await writeFile(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
await browser.close();
console.log(`\n${manifest.length} gradient spans captured into ${path.relative(ROOT, OUT)}`);
