/**
 * Diagnose layout shifts and horizontal overflow in the prototype.
 */
import { chromium } from 'playwright-core';

const EXE =
  process.env.CHROME_PATH ||
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const BASE = process.env.BASE || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ executablePath: EXE, headless: true });

for (const [name, route, width, height] of [
  ['home', '/', 1440, 900],
  ['home-tablet', '/', 768, 1024],
  ['impact', '/impact', 1440, 900],
  ['system', '/system', 1440, 900],
]) {
  const context = await browser.newContext({ viewport: { width, height } });
  await context.addInitScript(() => {
    window.__shifts = [];
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.hadRecentInput) continue;
        window.__shifts.push({
          value: +e.value.toFixed(4),
          time: Math.round(e.startTime),
          sources: (e.sources || []).map((s) => ({
            tag: s.node?.tagName?.toLowerCase(),
            cls: (s.node?.className || '').toString().slice(0, 100),
            prev: s.previousRect ? { y: Math.round(s.previousRect.y), h: Math.round(s.previousRect.height) } : null,
            curr: s.currentRect ? { y: Math.round(s.currentRect.y), h: Math.round(s.currentRect.height) } : null,
          })),
        });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  const page = await context.newPage();
  await page.goto(BASE + route, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const data = await page.evaluate(() => {
    const overflowers = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      // Only report if no clipping ancestor would hide it.
      let clipped = false;
      let p = el.parentElement;
      while (p && p !== document.body) {
        const cs = getComputedStyle(p);
        if (cs.overflow !== 'visible') { clipped = true; break; }
        p = p.parentElement;
      }
      if (!clipped && (r.left < -1 || r.right > window.innerWidth + 1)) {
        overflowers.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className?.baseVal ?? el.className ?? '').toString().slice(0, 70),
          left: +r.left.toFixed(1), right: +r.right.toFixed(1),
        });
      }
    }
    return {
      shifts: window.__shifts,
      overflowers: overflowers.slice(0, 10),
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      fonts: [...document.fonts].map((f) => ({ family: f.family, status: f.status, display: f.display })).slice(0, 6),
    };
  });
  console.log(`\n== ${name} cls=${data.shifts.reduce((a, b) => a + b.value, 0).toFixed(3)} scrollW=${data.scrollWidth}/${data.innerWidth}`);
  console.log(JSON.stringify(data.shifts.slice(0, 8), null, 1));
  console.log('overflowers:', data.overflowers);
  console.log('fonts:', data.fonts);
  await context.close();
}
await browser.close();
