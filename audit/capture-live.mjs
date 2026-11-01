/**
 * Content + layout audit. Launches a fresh browser per route/viewport so one
 * crash cannot abort the run. No FPS here (that is perf.mjs); this pass captures
 * heading typography, gradient paint boxes, clipping candidates, animation
 * inventory, CLS and screenshots.
 */
import { chromium } from 'playwright-core';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
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
const VIEWPORTS = [['desktop', 1440, 900], ['tablet', 768, 1024], ['mobile', 390, 844]];

const results = new Map();

for (const [vpName, width, height] of VIEWPORTS) {
  for (const [name, route] of ROUTES) {
    const browser = await chromium.launch({
      executablePath: EXE, headless: true,
      args: ['--disable-dev-shm-usage', '--disable-gpu', '--no-sandbox'],
    });
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    await context.addInitScript(() => {
      window.__cls = 0;
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
      }).observe({ type: 'layout-shift', buffered: true });
    });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text().slice(0, 200)));
    try {
      await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(3800);
      await page.evaluate(() => document.fonts.ready);

      const data = await page.evaluate(() => {
        const pick = (el) => {
          if (!el) return null;
          const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
          return {
            tag: el.tagName.toLowerCase(),
            text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 140),
            rect: { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) },
            fontSize: parseFloat(cs.fontSize),
            lineHeight: cs.lineHeight === 'normal' ? null : parseFloat(cs.lineHeight),
            leading: cs.lineHeight === 'normal' ? null : +(parseFloat(cs.lineHeight) / parseFloat(cs.fontSize)).toFixed(2),
            padding: `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
            display: cs.display, overflow: cs.overflow, color: cs.color,
            bgImage: cs.backgroundImage.slice(0, 100),
            bgClip: cs.webkitBackgroundClip, fill: cs.webkitTextFillColor,
            cls: (el.className || '').toString().slice(0, 180),
          };
        };

        const h1 = document.querySelector('h1');
        const ancestors = [];
        let node = h1;
        while (node && node !== document.documentElement) {
          const cs = getComputedStyle(node); const r = node.getBoundingClientRect();
          ancestors.push({
            tag: node.tagName.toLowerCase(), cls: (node.className || '').toString().slice(0, 140),
            rectH: +r.height.toFixed(1), overflow: cs.overflow, height: cs.height,
            maxHeight: cs.maxHeight, paddingBottom: cs.paddingBottom, display: cs.display,
          });
          node = node.parentElement;
        }

        const gradientSpans = [];
        if (h1) for (const s of h1.querySelectorAll('span, div')) {
          const cs = getComputedStyle(s);
          if ((cs.webkitBackgroundClip === 'text' || cs.backgroundClip === 'text') && s.textContent.trim()) {
            const r = s.getBoundingClientRect();
            gradientSpans.push({
              text: s.textContent.trim().slice(0, 40),
              cls: (s.className || '').toString().slice(0, 100),
              box: { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) },
              display: cs.display, fontSize: parseFloat(cs.fontSize),
              lineHeight: cs.lineHeight === 'normal' ? null : parseFloat(cs.lineHeight),
              paddingBottom: cs.paddingBottom,
            });
          }
        }

        const fontCtx = document.createElement('canvas').getContext('2d');
        let fontInk = null;
        if (h1) {
          const cs = getComputedStyle(h1);
          fontCtx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
          const m = fontCtx.measureText('Policy Society gypsy jpq');
          fontInk = {
            font: fontCtx.font,
            actualDescent: +m.actualBoundingBoxDescent.toFixed(1),
            fontSize: parseFloat(cs.fontSize),
          };
        }

        const section = h1?.closest('section');
        const sectionRect = section?.getBoundingClientRect();
        const clippedCandidates = [];
        if (section && sectionRect) {
          const secCs = getComputedStyle(section);
          if (secCs.overflow !== 'visible') {
            for (const el of section.querySelectorAll('*')) {
              const r = el.getBoundingClientRect();
              if (r.width === 0 || r.height === 0) continue;
              const overLeft = sectionRect.left - r.left;
              const overRight = r.right - sectionRect.right;
              if (overLeft > 1 || overRight > 1) clippedCandidates.push({
                tag: el.tagName.toLowerCase(),
                cls: (el.className?.baseVal ?? el.className ?? '').toString().slice(0, 100),
                overLeft: +overLeft.toFixed(1), overRight: +overRight.toFixed(1),
                w: Math.round(r.width), h: Math.round(r.height),
              });
            }
          }
        }

        const anims = [];
        for (const el of document.querySelectorAll('*')) {
          const cs = getComputedStyle(el);
          if (cs.animationName !== 'none') {
            const r = el.getBoundingClientRect();
            anims.push({
              tag: el.tagName.toLowerCase(), cls: (el.className?.baseVal ?? el.className ?? '').toString().slice(0, 90),
              w: Math.round(r.width), h: Math.round(r.height),
              name: cs.animationName, duration: cs.animationDuration,
              willChange: cs.willChange, filter: cs.filter.slice(0, 40), position: cs.position,
            });
          }
          if (anims.length >= 30) break;
        }

        return {
          title: document.title, h1: pick(h1), gradientSpans, ancestors: ancestors.slice(0, 8),
          fontInk, clippedCandidates: clippedCandidates.slice(0, 12),
          animations: anims,
          svgCount: document.querySelectorAll('svg').length,
          canvasCount: document.querySelectorAll('canvas').length,
          videoCount: document.querySelectorAll('video').length,
          domNodes: document.querySelectorAll('*').length,
          hiddenRevealCount: [...document.querySelectorAll('[style*="opacity:0"]')].length,
          cls: +(window.__cls || 0).toFixed(4),
          reducedMotionRule: [...document.styleSheets].some((ss) => {
            try { return [...ss.cssRules].some((r) => r.cssText?.includes('prefers-reduced-motion')); } catch { return false; }
          }),
        };
      });

      const h1Rect = data.h1?.rect;
      if (h1Rect) {
        const sy = await page.evaluate(() => window.scrollY);
        await page.screenshot({
          path: path.join(OUT, `${name}-${vpName}-hero.png`),
          clip: { x: 0, y: Math.max(0, h1Rect.y - 160 + sy), width, height: Math.min(height, h1Rect.h + 430) },
        }).catch(() => {});
        await page.screenshot({
          path: path.join(OUT, `${name}-${vpName}-heading.png`),
          clip: { x: Math.max(0, h1Rect.x - 24), y: Math.max(0, h1Rect.y - 24), width: Math.min(width, Math.max(200, h1Rect.w + 48)), height: h1Rect.h + 64 },
        }).catch(() => {});
      }
      await page.screenshot({ path: path.join(OUT, `${name}-${vpName}-viewport.png`) }).catch(() => {});

      const rec = {
        page: name, route, viewport: vpName, width, height,
        consoleErrors: [...new Set(consoleErrors)].slice(0, 4), ...data,
      };
      results.set(`${name}-${vpName}`, rec);
      console.log(`✓ ${vpName.padEnd(7)} ${route.padEnd(18)} cls=${data.cls} h1=${data.h1?.fontSize}/${data.h1?.lineHeight} grad=${data.gradientSpans.map((g) => g.text + ':' + g.box.h + 'px/' + g.paddingBottom).join(',')} clipped=${data.clippedCandidates.length} hidden=${data.hiddenRevealCount}`);
    } catch (err) {
      console.log(`✗ ${vpName} ${route}: ${err.message.split('\n')[0]}`);
      results.set(`${name}-${vpName}`, { page: name, route, viewport: vpName, width, height, error: err.message.split('\n')[0] });
    }
    await browser.close().catch(() => {});
    await writeFile(path.join(OUT, 'audit-raw.json'), JSON.stringify([...results.values()], null, 2));
  }
}
console.log('\nSaved evidence/before/audit-raw.json');
