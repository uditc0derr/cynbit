/**
 * Does the hero animation actually pause when the hero is off screen?
 *
 * Scrolls to the footer, then samples only the hero subtree twice, 1s apart:
 *   - inline style changes (Framer Motion writes inline styles every frame)
 *   - computed transform/top changes (covers CSS animations too)
 *   - getAnimations() playState inside the hero
 *
 * Usage: node pause-behavior.mjs
 */
import { chromium } from 'playwright-core';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const EXE =
  process.env.CHROME_PATH ||
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const TARGETS = [
  { name: 'live', url: 'https://www.cynbit.in/' },
  { name: 'prototype', url: process.env.PROTO || 'http://127.0.0.1:4174/' },
];

const browser = await chromium.launch({ executablePath: EXE, headless: true });

const sample = (page, selector) =>
  page.evaluate(
    (heroSelector) =>
      new Promise((resolve) => {
        const hero =
          heroSelector === 'auto'
            ? document.querySelector('h1')?.closest('section') || document.querySelector('h1')?.parentElement
            : document.querySelector(heroSelector);
        if (!hero) return resolve({ error: 'hero not found' });

        const elements = [...hero.querySelectorAll('*')];
        const styleOf = (el) => el.getAttribute('style') || '';
        const transformOf = (el) => {
          const cs = getComputedStyle(el);
          return `${cs.transform}|${cs.top}|${cs.width}`;
        };
        const before = elements.map((el) => [styleOf(el), transformOf(el)]);
        const animations = () =>
          hero.getAnimations({ subtree: true }).map((a) => ({
            name: a.animationName || a.constructor.name,
            playState: a.playState,
          }));

        setTimeout(() => {
          let inlineChanged = 0;
          let computedChanged = 0;
          const properties = {};
          elements.forEach((el, i) => {
            if (!el.isConnected) return;
            const styleAfter = styleOf(el);
            const computedAfter = transformOf(el);
            if (before[i][0] !== styleAfter) {
              inlineChanged += 1;
              const probe = document.createElement('div');
              probe.setAttribute('style', styleAfter);
              [...probe.style].forEach((k) => {
                properties[k] = (properties[k] || 0) + 1;
              });
            }
            if (before[i][1] !== computedAfter) computedChanged += 1;
          });
          const anims = animations();
          resolve({
            hero: `${hero.tagName.toLowerCase()}.${(hero.className || '').toString().slice(0, 80)}`,
            heroRect: (() => {
              const r = hero.getBoundingClientRect();
              return { top: Math.round(r.top), height: Math.round(r.height) };
            })(),
            elements: elements.length,
            inlineChanged,
            computedChanged,
            changedProperties: properties,
            animations: anims.length,
            runningAnimations: anims.filter((a) => a.playState === 'running').length,
            pausedAnimations: anims.filter((a) => a.playState === 'paused').length,
            dataPaused: hero.querySelector('[data-paused]')?.getAttribute('data-paused') ?? null,
            dataStatic: hero.querySelector('[data-static]')?.getAttribute('data-static') ?? null,
          });
        }, 1000);
      }),
    selector,
  );

const results = [];
for (const target of TARGETS) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(target.url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  const inView = await sample(page, 'auto');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1500);
  const offscreen = await sample(page, 'auto');

  const row = { name: target.name, inView, offscreen };
  results.push(row);
  console.log(`\n== ${target.name}`);
  for (const key of ['inView', 'offscreen']) {
    const s = row[key];
    console.log(
      `  ${key.padEnd(9)} heroTop=${String(s.heroRect?.top).padStart(6)} inlineChanged=${String(s.inlineChanged).padStart(3)} computedChanged=${String(s.computedChanged).padStart(3)} running=${String(s.runningAnimations).padStart(2)}/${s.animations} properties=${JSON.stringify(s.changedProperties)} pausedAttr=${s.dataPaused}`,
    );
  }
  await context.close();
}

await writeFile(path.join(ROOT, 'evidence', 'after', 'pause-behavior.json'), JSON.stringify(results, null, 2));
await browser.close();
console.log('\nwritten evidence/after/pause-behavior.json');
