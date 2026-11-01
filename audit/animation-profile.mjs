/**
 * Animation cost profile: live Cynbit home vs prototype home.
 *
 * For each site, measures two 5s windows with the Chrome DevTools Protocol:
 *   - hero in view (the orbit is animating where the user can see it)
 *   - hero scrolled out of view (does the animation actually stop?)
 * Metrics: main-thread TaskDuration, LayoutCount, RecalcStyleCount, plus FPS
 * and long frames from a rAF probe. Also diffs inline styles to show *which*
 * CSS properties move, and lists CSS animations via getAnimations().
 *
 * Usage: node animation-profile.mjs
 */
import { chromium } from 'playwright-core';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const EXE =
  process.env.CHROME_PATH ||
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const WINDOW_MS = 5000;
const OUT_FILE = process.env.OUT || 'animation-profile.json';

const TARGETS = [
  { name: 'live', url: 'https://www.cynbit.in/' },
  { name: 'prototype', url: process.env.PROTO || 'http://127.0.0.1:4174/' },
];

const browser = await chromium.launch({ executablePath: EXE, headless: true });

const startProbe = (page) =>
  page.evaluate(() => {
    window.__frames = { frames: 0, long: 0, max: 0, last: performance.now() };
    const loop = (t) => {
      const f = window.__frames;
      const delta = t - f.last;
      if (delta > 50) f.long += 1;
      if (delta > f.max) f.max = delta;
      f.frames += 1;
      f.last = t;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });

const stopProbe = (page) =>
  page.evaluate(() => {
    const f = window.__frames;
    return { frames: f.frames, longFrames: f.long, maxFrameMs: +f.max.toFixed(1) };
  });

/** Records inline-style property names that change over 1.2s. */
const styleChanges = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve) => {
        const props = (value) => {
          const probe = document.createElement('div');
          probe.setAttribute('style', value || '');
          return Object.fromEntries([...probe.style].map((k) => [k, probe.style.getPropertyValue(k)]));
        };
        const elements = [...document.querySelectorAll('body *')];
        const before = elements.map((el) => props(el.getAttribute('style')));
        const started = performance.now();
        setTimeout(() => {
          const counts = {};
          let changed = 0;
          elements.forEach((el, i) => {
            if (!el.isConnected) return;
            const after = props(el.getAttribute('style'));
            const keys = new Set([...Object.keys(before[i]), ...Object.keys(after)]);
            const diff = [...keys].filter((k) => before[i][k] !== after[k]);
            if (diff.length) {
              changed += 1;
              diff.forEach((k) => {
                counts[k] = (counts[k] || 0) + 1;
              });
            }
          });
          const cssAnimations = document.getAnimations().map((a) => {
            const target = a.effect?.target;
            const keys = new Set();
            for (const frame of a.effect?.getKeyframes?.() || []) {
              Object.keys(frame).forEach((k) => {
                if (!['offset', 'easing', 'composite', 'computedOffset'].includes(k)) keys.add(k);
              });
            }
            return {
              name: a.animationName || a.id || a.constructor.name,
              playState: a.playState,
              properties: [...keys],
              target: target
                ? `${target.tagName.toLowerCase()}.${(target.className?.baseVal ?? target.className ?? '').toString().split(' ').slice(0, 2).join('.')}`
                : null,
            };
          });
          resolve({
            durationMs: Math.round(performance.now() - started),
            changedElements: changed,
            inlinePropertyChanges: Object.fromEntries(
              Object.entries(counts).sort((a, b) => b[1] - a[1]),
            ),
            cssAnimationCount: cssAnimations.length,
            cssAnimations: cssAnimations.slice(0, 20),
          });
        }, 1200);
      }),
  );

const run = async (target) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(target.url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  const client = await context.newCDPSession(page);
  await client.send('Performance.enable');
  const snapshot = async () => {
    const { metrics } = await client.send('Performance.getMetrics');
    return Object.fromEntries(metrics.map((m) => [m.name, m.value]));
  };

  const measure = async (label) => {
    // CPU/layout window: no rAF probe, so the probe's own style recalcs cannot
    // pollute the numbers.
    const a = await snapshot();
    await page.waitForTimeout(WINDOW_MS);
    const b = await snapshot();
    // FPS window: separate, because a rAF probe itself causes one style recalc
    // per frame in Chrome's accounting.
    await startProbe(page);
    await page.waitForTimeout(3000);
    const frames = await stopProbe(page);
    return {
      label,
      seconds: WINDOW_MS / 1000,
      taskMs: Math.round((b.TaskDuration - a.TaskDuration) * 1000),
      scriptMs: Math.round((b.ScriptDuration - a.ScriptDuration) * 1000),
      layoutMs: Math.round((b.LayoutDuration - a.LayoutDuration) * 1000),
      styleMs: Math.round((b.RecalcStyleDuration - a.RecalcStyleDuration) * 1000),
      layoutCount: b.LayoutCount - a.LayoutCount,
      styleCount: b.RecalcStyleCount - a.RecalcStyleCount,
      fps: +(frames.frames / 3).toFixed(1),
      longFrames: frames.longFrames,
      maxFrameMs: frames.maxFrameMs,
    };
  };

  const inView = await measure('in-view');
  const changes = await styleChanges(page);

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1200);
  const offscreen = await measure('offscreen');

  // What does the page do when the user asks for less motion?
  await context.close();
  const rmContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const rmPage = await rmContext.newPage();
  await rmPage.goto(target.url, { waitUntil: 'networkidle' });
  await rmPage.waitForTimeout(2500);
  const rmClient = await rmContext.newCDPSession(rmPage);
  await rmClient.send('Performance.enable');
  const a = Object.fromEntries((await rmClient.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  await rmPage.waitForTimeout(WINDOW_MS);
  const b = Object.fromEntries((await rmClient.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  await startProbe(rmPage);
  await rmPage.waitForTimeout(3000);
  const rmFrames = await stopProbe(rmPage);
  const reducedMotion = {
    label: 'reduced-motion',
    seconds: WINDOW_MS / 1000,
    taskMs: Math.round((b.TaskDuration - a.TaskDuration) * 1000),
    layoutCount: b.LayoutCount - a.LayoutCount,
    styleCount: b.RecalcStyleCount - a.RecalcStyleCount,
    fps: +(rmFrames.frames / 3).toFixed(1),
    cssAnimationCount: await rmPage.evaluate(() => document.getAnimations().length),
  };
  await rmContext.close();

  return { target: target.name, url: target.url, inView, offscreen, changes, reducedMotion };
};

const results = [];
for (const target of TARGETS) {
  const result = await run(target);
  results.push(result);
  console.log(`\n== ${result.target}`);
  for (const window of [result.inView, result.offscreen, result.reducedMotion]) {
    console.log(
      `  ${window.label.padEnd(15)} task=${String(window.taskMs).padStart(4)}ms layout=${String(window.layoutCount).padStart(4)} style=${String(window.styleCount).padStart(5)} fps=${window.fps} long=${window.longFrames ?? '-'}`,
    );
  }
  console.log('  inline props:', JSON.stringify(result.changes.inlinePropertyChanges));
  console.log('  css animations:', result.changes.cssAnimationCount, 'elements changed:', result.changes.changedElements);
  console.log('  reduced-motion css animations:', result.reducedMotion.cssAnimationCount);
}

await writeFile(
  path.join(ROOT, 'evidence', 'after', OUT_FILE),
  JSON.stringify({ windowMs: WINDOW_MS, results }, null, 2),
);
await browser.close();
console.log('\nwritten evidence/after/animation-profile.json');
