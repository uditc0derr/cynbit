/**
 * Page-level horizontal overflow on the live site.
 *
 * The layout capture records decorations that sit outside their section box,
 * which is not the same as a horizontal scrollbar. This pass asks the question
 * the prototype budget cares about: does the document get wider than the
 * viewport, and which elements are actually unclipped?
 *
 * Usage: node overflow-live.mjs
 */
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'evidence', 'before');
await mkdir(OUT, { recursive: true });

const EXE =
  process.env.CHROME_PATH ||
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const BASE = 'https://www.cynbit.in';
const ROUTES = [
  ['home', '/'], ['services', '/services'], ['products', '/products'],
  ['case-studies', '/case-studies'], ['bitelevate', '/bitelevate'],
  ['bitelevate-paths', '/bitelevate/paths'], ['contact', '/contact'],
  ['blog', '/blog'], ['careers', '/careers'], ['impact', '/impact'],
  ['privacy', '/privacy'],
];
const VIEWPORTS = [
  ['desktop', 1440, 900],
  ['tablet', 768, 1024],
  ['mobile', 390, 844],
];

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const rows = [];

for (const [page, route] of ROUTES) {
  for (const [viewport, width, height] of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width, height } });
    const pageHandle = await context.newPage();
    await pageHandle.goto(BASE + route, { waitUntil: 'networkidle' });
    await pageHandle.waitForTimeout(1500);

    const result = await pageHandle.evaluate(() => {
      const de = document.documentElement;

      /** True when an ancestor scrolls or clips in the x axis. */
      const isClipped = (element) => {
        let ancestor = element.parentElement;
        while (ancestor) {
          const overflowX = getComputedStyle(ancestor).overflowX;
          if (['hidden', 'clip', 'auto', 'scroll'].includes(overflowX)) return true;
          ancestor = ancestor.parentElement;
        }
        return false;
      };

      const offenders = [];
      for (const element of document.querySelectorAll('body *')) {
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.left >= -1 && rect.right <= window.innerWidth + 1) continue;
        if (isClipped(element)) continue;
        offenders.push({
          tag: element.tagName.toLowerCase(),
          cls: (element.className?.baseVal ?? element.className ?? '').toString().slice(0, 110),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
        });
      }

      return {
        scrollWidth: de.scrollWidth,
        clientWidth: de.clientWidth,
        innerWidth: window.innerWidth,
        scrollHeight: de.scrollHeight,
        offenders: offenders.slice(0, 8),
      };
    });

    rows.push({ page, route, viewport, width, ...result });
    const overflow = result.scrollWidth - result.clientWidth;
    console.log(
      `${page.padEnd(17)} ${viewport.padEnd(8)} scrollW=${result.scrollWidth}/${result.clientWidth} ` +
        `overflow=${String(overflow).padStart(4)} offenders=${result.offenders.length}`,
    );
    await context.close();
  }
}

await writeFile(path.join(OUT, 'overflow-live.json'), JSON.stringify(rows, null, 2));
await browser.close();
console.log('\nwritten evidence/before/overflow-live.json');
