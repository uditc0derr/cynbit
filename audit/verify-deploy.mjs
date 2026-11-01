/**
 * Smoke-test a deployed build: routes, fonts, heading ratio, overflow,
 * console/page errors. Defaults to the production prototype URL.
 *
 * Usage: node verify-deploy.mjs
 *        BASE=https://your-deployment.vercel.app node verify-deploy.mjs
 */
import { chromium } from 'playwright-core';

const EXE =
  process.env.CHROME_PATH ||
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const BASE = (process.env.BASE || 'https://prototype-black-rho.vercel.app').replace(/\/$/, '');

// Width, route, and whether that route is expected to have an orbit stage.
const CHECKS = [
  [1440, '/', true],
  [1440, '/impact', true],
  [1440, '/privacy', false],
  [1024, '/', true],
  [768, '/', true],
  [767, '/', true],
  [390, '/', true],
  [390, '/impact', true],
  [390, '/privacy', false],
];

const browser = await chromium.launch({ executablePath: EXE, headless: true });
let failures = 0;

for (const [width, route, expectOrbit] of CHECKS) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });

  await page.goto(BASE + route, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  const result = await page.evaluate(() => {
    const heading = document.querySelector('h1');
    const orbit = document.querySelector('[data-testid="hero-orbit"]');
    const style = heading ? getComputedStyle(heading) : null;
    const display = (selector) => {
      const element = document.querySelector(selector);
      return element ? getComputedStyle(element).display : null;
    };
    return {
      h1: heading?.innerText.split('\n')[0].slice(0, 60),
      ratio: style ? +(parseFloat(style.lineHeight) / parseFloat(style.fontSize)).toFixed(3) : null,
      orbitWidth: orbit ? Math.round(orbit.getBoundingClientRect().width) : null,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      navDisplay: display('nav[aria-label="Primary"]'),
      menuDisplay: display('.menu-button'),
      fonts: new Set(
        [...document.fonts].filter((face) => face.status === 'loaded').map((face) => face.family),
      ).size,
    };
  });

  const desktop = width >= 768;
  const problems = [...errors];
  if (result.ratio !== 1.15) problems.push(`heading ratio ${result.ratio}`);
  if (result.scrollWidth !== result.innerWidth) problems.push(`overflow ${result.scrollWidth}/${result.innerWidth}`);
  if (result.fonts < 2) problems.push(`only ${result.fonts} font families loaded`);
  if (expectOrbit && !result.orbitWidth) problems.push('orbit missing');
  if (!expectOrbit && result.orbitWidth) problems.push('unexpected orbit');
  if (desktop && result.menuDisplay !== 'none') problems.push(`hamburger visible (${result.menuDisplay})`);
  if (desktop && result.navDisplay === 'none') problems.push('desktop nav hidden');
  if (!desktop && result.menuDisplay === 'none') problems.push('hamburger hidden');
  if (!desktop && result.navDisplay !== 'none') problems.push('mobile nav visible');

  failures += problems.length;
  console.log(
    `${problems.length ? 'FAIL' : 'ok  '} ${String(width).padStart(4)} ${route.padEnd(9)} ` +
      `ratio=${result.ratio} orbit=${result.orbitWidth ?? '-'} scrollW=${result.scrollWidth}/${result.innerWidth} ` +
      `fonts=${result.fonts} ${problems.length ? JSON.stringify(problems) : ''}`,
  );
  await context.close();
}

await browser.close();
console.log(failures ? `\n${failures} problem(s)` : '\nall checks passed');
process.exit(failures ? 1 : 0);
