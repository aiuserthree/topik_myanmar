#!/usr/bin/env node
/** Spot-capture: mypage-profile + register-step3 only (A/B/C FO). */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';
import { classifyHtmlFile, needsFoLoginSeed } from './ia-allowlist.mjs';
import {
  registerStepOutPath,
  buildJobAuthSeed,
  prepareProfilePhoto,
  prepareRegisterStep,
} from './screenshot-seeds.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const HTML_ROOT = path.join(ROOT, 'html');
const OUT_ROOT = path.join(ROOT, 'exports', 'confirm-jpg');
const CHROME =
  process.env.CHROME_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';


const TARGETS = [
  { dir: 'A안', file: 'mypage-profile.html' },
  { dir: 'A안', file: 'register.html', step: 3 },
  { dir: 'B안', file: 'mypage-profile.html' },
  { dir: 'B안', file: 'register.html', step: 3 },
  { dir: 'C안/FO', file: 'mypage-profile.html' },
  { dir: 'C안/FO', file: 'register.html', step: 3 },
];

async function capture(browser, htmlFile, kind, step) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  const seed = buildJobAuthSeed(kind, path.basename(htmlFile));
  if (seed) {
    await page.evaluateOnNewDocument(seed);
    await page.evaluate(seed);
  }
  const url = 'file://' + htmlFile.split(path.sep).join('/');
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  const base = path.basename(htmlFile);
  if (step != null) {
    await prepareRegisterStep(page, step, kind);
    await prepareProfilePhoto(page, base, step, kind);
  } else {
    await prepareProfilePhoto(page, base, null, kind);
  }
  await new Promise((r) => setTimeout(r, 400));
  const dest =
    step != null
      ? registerStepOutPath(htmlFile, HTML_ROOT, OUT_ROOT, step)
      : path.join(
          OUT_ROOT,
          path.relative(HTML_ROOT, htmlFile).replace(/\.html$/i, '.jpg')
        );
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  await page.screenshot({ path: dest, type: 'jpeg', quality: 90, fullPage: true });
  await page.close();
  return dest;
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  let ok = 0;
  let fail = 0;
  for (const t of TARGETS) {
    const htmlFile = path.join(HTML_ROOT, t.dir, t.file);
    const { kind } = classifyHtmlFile(htmlFile, HTML_ROOT);
    const label = `${t.dir}/${t.file}${t.step ? ` step${t.step}` : ''}`;
    try {
      const dest = await capture(browser, htmlFile, kind, t.step ?? null);
      console.log(`OK  ${label} → ${path.relative(ROOT, dest)}`);
      ok++;
    } catch (e) {
      console.error(`FAIL ${label}: ${e.message}`);
      fail++;
    }
  }
  await browser.close();
  console.log(`\nPhoto spot-check: ${ok} ok, ${fail} failed`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
