#!/usr/bin/env node
/**
 * IA v1.2 · 기능정의서에 정의된 HTML만 JPG 변환 (고객사 컨펌용)
 * - 게시판: 목록·상세·작성(·FAQ 펼침) JPG — A안 localStorage 시딩
 * - 시험접수: register-step1~4.jpg
 *
 * Usage:
 *   node scripts/html-to-jpg.mjs              # PC (1440px), full run
 *   node scripts/html-to-jpg.mjs --mobile     # 모바일 (390px), full run
 *   node scripts/html-to-jpg.mjs --both       # desktop + mobile, full run
 *
 * Watch (변경된 HTML/자산만 즉시 JPG 반영):
 *   node scripts/html-to-jpg.mjs --watch
 *   node scripts/html-to-jpg.mjs --watch --mobile
 *   node scripts/html-to-jpg.mjs --watch --both
 *   node scripts/html-to-jpg.mjs --signup-only   # 회원가입 1~3단계만
 *   node scripts/html-to-jpg.mjs --signup-only --mobile   # 모바일 회원가입 1~3단계
 *   node scripts/html-to-jpg.mjs --only password-reset,signup-complete,register-complete
 *   npm run jpg:watch          # (scripts/ 디렉터리에서)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';
import {
  classifyHtmlFile,
  needsFoLoginSeed,
  needsBoLoginSeed,
  isLoggedOutCapturePage,
  needsAuthSeedForJob,
} from './ia-allowlist.mjs';
import {
  isBoardPage,
  isRegisterPage,
  isSignupPage,
  registerStepOutPath,
  signupStepOutPath,
  signupStepRelPath,
  SIGNUP_STEPS,
  getBoardViews,
  boardViewOutPath,
  buildAuthClearSeed,
  buildCaptureAuthSeed,
  buildJobAuthSeed,
  needsFoStorageSeed,
  needsProfilePhotoPrep,
  prepareBoardView,
  prepareProfilePhoto,
  prepareRegisterStep,
  prepareSignupStep,
  needsModalCompleteCapture,
  modalCompleteOutPath,
  modalCompleteRelPath,
  pageOutPath,
  pageOutRelPath,
  prepareSignupCompleteModal,
  prepareRegisterCompleteModal,
} from './screenshot-seeds.mjs';

const CAPTURE_AUTH_SEED = buildCaptureAuthSeed();
const AUTH_CLEAR_SEED = buildAuthClearSeed();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const HTML_ROOT = path.join(ROOT, 'html');
const CHROME =
  process.env.CHROME_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const argv = process.argv.slice(2);
const isWatch = argv.includes('--watch');
const isBoth = argv.includes('--both');
const isMobileOnly = argv.includes('--mobile') && !isBoth;
const isSignupOnly = argv.includes('--signup-only');
const onlyIdx = argv.indexOf('--only');
const onlyPatterns =
  onlyIdx >= 0 && argv[onlyIdx + 1]
    ? argv[onlyIdx + 1]
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    : null;

const DESKTOP_VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 2 };
const MOBILE_VIEWPORT = {
  width: 390,
  height: 844,
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
};
const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

/** JPG export: hide developer/demo hints (see .demo-only in HTML) */
const EXPORT_HIDE_CSS = `
  body.capture-export .demo-only,
  body.capture-export .demo-note,
  body.capture-export .dev-note { display: none !important; }
`;

const SCAN_ROOTS = [
  path.join(HTML_ROOT, 'A안'),
  path.join(HTML_ROOT, 'B안'),
  path.join(HTML_ROOT, 'B안', 'admin'),
  path.join(HTML_ROOT, 'C안', 'FO'),
  path.join(HTML_ROOT, 'C안', 'BO(admin)', 'project'),
];

const WATCH_DEBOUNCE_MS = 1200;
const ASSET_EXT = new Set(['.css', '.js', '.jpg', '.jpeg', '.png', '.svg', '.webp', '.woff', '.woff2']);

function outRootFor(mobile) {
  return path.join(ROOT, 'exports', mobile ? 'confirm-jpg-mobile' : 'confirm-jpg');
}

function captureModes() {
  if (isBoth) return [{ mobile: false }, { mobile: true }];
  if (isMobileOnly) return [{ mobile: true }];
  return [{ mobile: false }];
}

function jobMatchesOnly(job) {
  if (!onlyPatterns?.length) return true;
  const rel = path.relative(HTML_ROOT, job.htmlFile).toLowerCase();
  const stem = job.base.toLowerCase().replace(/\.html$/i, '');
  return onlyPatterns.some((p) => {
    if (p === stem) return true;
    if (p === 'signup-complete' && job.modalComplete === 'signup-complete') return true;
    if (p === 'register-complete' && job.modalComplete === 'register-complete') return true;
    if (rel.includes(p)) return true;
    return false;
  });
}

function collectHtmlFiles() {
  const files = [];
  for (const dir of SCAN_ROOTS) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith('.html')) continue;
      if (isSignupOnly && name.toLowerCase() !== 'signup.html') continue;
      const full = path.join(dir, name);
      const { allowed } = classifyHtmlFile(full, HTML_ROOT);
      if (allowed) files.push(full);
    }
  }
  return files.sort();
}

function buildCaptureJobs(files, outRoot, { mobile = false } = {}) {
  const jobs = [];
  for (const htmlFile of files) {
    const base = path.basename(htmlFile);
    const { kind } = classifyHtmlFile(htmlFile, HTML_ROOT);
    if (isRegisterPage(base)) {
      for (let step = 1; step <= 4; step++) {
        jobs.push({
          htmlFile,
          base,
          kind,
          step,
          view: null,
          modalComplete: null,
          dest: registerStepOutPath(htmlFile, HTML_ROOT, outRoot, step),
        });
      }
      if (needsModalCompleteCapture(kind, base)) {
        jobs.push({
          htmlFile,
          base,
          kind,
          step: null,
          view: null,
          modalComplete: 'register-complete',
          dest: modalCompleteOutPath(htmlFile, HTML_ROOT, outRoot, 'register-complete', { mobile }),
        });
      }
    } else if (isSignupPage(base)) {
      for (let step = 1; step <= SIGNUP_STEPS; step++) {
        jobs.push({
          htmlFile,
          base,
          kind,
          step,
          view: null,
          modalComplete: null,
          dest: signupStepOutPath(htmlFile, HTML_ROOT, outRoot, step, { mobile }),
        });
      }
      if (needsModalCompleteCapture(kind, base)) {
        jobs.push({
          htmlFile,
          base,
          kind,
          step: null,
          view: null,
          modalComplete: 'signup-complete',
          dest: modalCompleteOutPath(htmlFile, HTML_ROOT, outRoot, 'signup-complete', { mobile }),
        });
      }
    } else if (isBoardPage(base)) {
      for (const view of getBoardViews(base)) {
        jobs.push({
          htmlFile,
          base,
          kind,
          step: null,
          view,
          modalComplete: null,
          dest: boardViewOutPath(htmlFile, HTML_ROOT, outRoot, view),
        });
      }
    } else {
      jobs.push({
        htmlFile,
        base,
        kind,
        step: null,
        view: null,
        modalComplete: null,
        dest: pageOutPath(htmlFile, HTML_ROOT, outRoot, { mobile }),
      });
    }
  }
  return onlyPatterns?.length ? jobs.filter(jobMatchesOnly) : jobs;
}

function findScanRoot(filePath) {
  const normalized = path.normalize(filePath);
  let best = null;
  for (const root of SCAN_ROOTS) {
    if (normalized === root || normalized.startsWith(root + path.sep)) {
      if (!best || root.length > best.length) best = root;
    }
  }
  return best;
}

function isWatchablePath(filePath) {
  if (!filePath.startsWith(HTML_ROOT + path.sep)) return false;
  const base = path.basename(filePath);
  if (base.startsWith('.') || base === 'node_modules') return false;
  const ext = path.extname(filePath).toLowerCase();
  if (filePath.endsWith('.html')) return true;
  if (ASSET_EXT.has(ext)) return true;
  const parts = path.relative(HTML_ROOT, filePath).split(path.sep);
  return parts.some((p) => p === 'assets' || p === 'js' || p === 'css');
}

/** Map changed file → allowlisted HTML file(s) to re-capture */
function htmlFilesAffectedByChange(changedPath) {
  const normalized = path.normalize(changedPath);
  if (!isWatchablePath(normalized)) return [];

  if (normalized.endsWith('.html')) {
    const { allowed } = classifyHtmlFile(normalized, HTML_ROOT);
    return allowed ? [normalized] : [];
  }

  const scanRoot = findScanRoot(normalized);
  if (!scanRoot || !fs.existsSync(scanRoot)) return [];

  const relAsset = path.relative(scanRoot, normalized);
  const assetRef = relAsset.split(path.sep).join('/');
  const basename = path.basename(normalized);
  const affected = [];

  for (const name of fs.readdirSync(scanRoot)) {
    if (!name.endsWith('.html')) continue;
    const full = path.join(scanRoot, name);
    const { allowed } = classifyHtmlFile(full, HTML_ROOT);
    if (!allowed) continue;
    const content = fs.readFileSync(full, 'utf8');
    if (content.includes(basename) || content.includes(assetRef)) {
      affected.push(full);
    }
  }
  return affected.sort();
}

function authSeedForJob(job) {
  return buildJobAuthSeed(job.kind, job.base);
}

async function applyAuthSeedBeforeGoto(page, job) {
  if (isLoggedOutCapturePage(job.kind, job.base)) {
    await page.evaluate(AUTH_CLEAR_SEED);
    return;
  }
  const seed = buildJobAuthSeed(job.kind, job.base);
  if (seed) await page.evaluate(seed);
}

async function assertNotOnLoginPage(page, job) {
  if (isLoggedOutCapturePage(job.kind, job.base)) return;
  if (!needsAuthSeedForJob(job.kind, job.base)) return;
  const redirected = await page.evaluate(
    (kind) => {
      const p = location.pathname;
      if (kind === 'B_BO' || kind === 'C_BO') {
        return /[/\\]admin-login\.html$/i.test(p);
      }
      return /[/\\]login\.html$/i.test(p) && !/[/\\]admin-login\.html$/i.test(p);
    },
    job.kind
  );
  if (redirected) {
    throw new Error('auth seed missing or rejected — page redirected to login');
  }
}

async function waitForPageReady(page, job) {
  const { base, kind, step } = job;

  const isFoLoginPage =
    /^(login|signup|signup-complete|password-reset)\.html$/i.test(base) && kind !== 'B_BO' && kind !== 'C_BO';
  if ((needsFoLoginSeed(base) || needsBoLoginSeed(kind, base)) && !isFoLoginPage) {
    const isBo = kind === 'B_BO' || kind === 'C_BO';
    await page.waitForFunction(
      (bo) => {
        const pageBase = (location.pathname.split(/[/\\]/).pop() || '').toLowerCase();
        return bo ? pageBase !== 'admin-login.html' : pageBase !== 'login.html';
      },
      { timeout: 15000 },
      isBo
    );
  }

  if (kind === 'B_BO' || kind === 'C_BO') {
    if (base === 'admin-login.html') {
      await page.waitForSelector('.login-wrap, .login-card, form', { timeout: 15000 });
    } else if (kind === 'C_BO') {
      await page.waitForSelector('.admin, #sidebar, .sidebar, #root', { timeout: 15000 });
    } else {
      await page.waitForSelector('.admin-layout, .sidebar, .admin-sidebar, aside', {
        timeout: 15000,
      });
    }
    return;
  }

  if (step != null) {
    await page.waitForSelector(
      [
        `#regStep${step}`,
        `#page${step}`,
        `#panel-${step}.is-active`,
        `#panel-${step}`,
        `.step-pane[data-s="${step}"].active`,
      ].join(', '),
      { timeout: 15000 }
    ).catch(() =>
      page.waitForSelector('.step-pane.active, .step-panel.is-active', { timeout: 5000 })
    );
    return;
  }

  if (base === 'password-reset.html') {
    await page.waitForFunction(
      () => {
        const el = document.getElementById('panelForm');
        return !!(
          el &&
          (el.classList.contains('active') ||
            el.classList.contains('is-show') ||
            el.classList.contains('show'))
        );
      },
      { timeout: 15000 }
    );
    return;
  }

  await page.waitForSelector(
    [
      '.board-wrap',
      '.board-table',
      '.faq-item',
      '.faq-group',
      '#noticeBoardRows',
      '.user-card',
      '.member-card',
      '.me-card',
      '.page-hero',
      '.page-head',
      '.main-wrap',
      'main.page',
      '.content',
      '#site-header',
      '.login-card',
    ].join(', '),
    { timeout: 15000 }
  ).catch(() => {});
}

function appendQueryParam(url, key, value) {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

function captureUrlForJob(job) {
  let url = 'file://' + job.htmlFile.split(path.sep).join('/');
  if (job.base === 'password-reset.html') {
    url = appendQueryParam(url, 'token', 'demo');
  }
  return appendQueryParam(url, 'export', '1');
}

async function prepareExportCapture(page) {
  await page.evaluate((css) => {
    document.documentElement.dataset.export = '1';
    document.body.classList.add('capture-export');
    if (!document.getElementById('capture-export-style')) {
      const style = document.createElement('style');
      style.id = 'capture-export-style';
      style.textContent = css;
      document.head.appendChild(style);
    }
  }, EXPORT_HIDE_CSS);
}

async function screenshot(page, job) {
  const url = captureUrlForJob(job);
  await applyAuthSeedBeforeGoto(page, job);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await assertNotOnLoginPage(page, job);
  await waitForPageReady(page, job);

  if (job.step != null) {
    if (isRegisterPage(job.base)) {
      await prepareRegisterStep(page, job.step, job.kind);
    } else if (isSignupPage(job.base)) {
      await prepareSignupStep(page, job.step, job.kind);
    }
    if (needsProfilePhotoPrep(job.base, job.step)) {
      await prepareProfilePhoto(page, job.base, job.step, job.kind);
    }
  } else if (job.modalComplete === 'signup-complete') {
    await prepareSignupCompleteModal(page, job.kind);
  } else if (job.modalComplete === 'register-complete') {
    await prepareRegisterCompleteModal(page, job.kind);
  } else if (isBoardPage(job.base) && job.view) {
    await prepareBoardView(page, job.base, job.view, job.kind);
  } else if (needsProfilePhotoPrep(job.base, null)) {
    await prepareProfilePhoto(page, job.base, null, job.kind);
  }

  await prepareExportCapture(page);
  await page.evaluate(() => document.fonts?.ready);
  await page
    .waitForFunction(
      () =>
        document.querySelector('.footer') ||
        document.querySelector('#site-footer')?.innerHTML ||
        document.querySelector('.admin-footer') ||
        document.querySelector('.login-footer'),
      { timeout: 10000 }
    )
    .catch(() => {});
  await new Promise((r) => setTimeout(r, 600));
  fs.mkdirSync(path.dirname(job.dest), { recursive: true });
  await page.screenshot({
    path: job.dest,
    type: 'jpeg',
    quality: 92,
    fullPage: true,
  });
}

function allowedJpgRelPaths(files, { mobile = false } = {}) {
  const rels = [];
  for (const f of files) {
    const rel = path.relative(HTML_ROOT, f);
    const base = path.basename(f);
    const { kind } = classifyHtmlFile(f, HTML_ROOT);
    if (isRegisterPage(base)) {
      for (let s = 1; s <= 4; s++) {
        rels.push(rel.replace(/register\.html$/i, `register-step${s}.jpg`));
      }
      if (needsModalCompleteCapture(kind, base)) {
        rels.push(modalCompleteRelPath(f, HTML_ROOT, 'register-complete', { mobile }));
      }
    } else if (isSignupPage(base)) {
      for (let s = 1; s <= SIGNUP_STEPS; s++) {
        rels.push(signupStepRelPath(f, HTML_ROOT, s, { mobile }));
      }
      if (needsModalCompleteCapture(kind, base)) {
        rels.push(modalCompleteRelPath(f, HTML_ROOT, 'signup-complete', { mobile }));
      }
    } else if (isBoardPage(base)) {
      for (const view of getBoardViews(base)) {
        const suffix =
          view === 'detail' ? '-detail' : view === 'write' ? '-write' : view === 'open' ? '-open' : '';
        rels.push(rel.replace(/\.html$/i, `${suffix}.jpg`));
      }
    } else {
      rels.push(pageOutRelPath(f, HTML_ROOT, { mobile }));
    }
  }
  return rels;
}

/** --signup-only: remove legacy signup.jpg and stray signup-stepN only */
function pruneSignupOrphanJpgs(outRoot, allowedRels, { mobile = false } = {}) {
  if (!fs.existsSync(outRoot)) return;
  const allowed = new Set(allowedRels);
  const signupLegacy = mobile
    ? new Set(['A안/회원가입.jpg', 'B안/회원가입.jpg', 'C안/회원가입.jpg'])
    : new Set(['A안/signup.jpg', 'B안/signup.jpg', 'C안/FO/signup.jpg']);
  const walk = (dir, prefix = '') => {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) walk(full, prefix ? `${prefix}/${name}` : name);
      else if (name.endsWith('.jpg')) {
        const rel = prefix ? `${prefix}/${name}` : name;
        const isEnglishStep = /\/signup-step\d+\.jpg$/i.test(rel) && !allowed.has(rel);
        const isKoreanLegacy =
          mobile && /^[^/]+\/회원가입\.jpg$/i.test(rel) && !/^[^/]+\/회원가입_step\d+\.jpg$/i.test(rel);
        if (signupLegacy.has(rel) || isEnglishStep || isKoreanLegacy) {
          fs.unlinkSync(full);
          console.log(`DEL orphan ${rel}`);
        }
      }
    }
  };
  walk(outRoot);
}

function pruneOrphanJpgs(outRoot, allowedRels) {
  if (!fs.existsSync(outRoot)) return;
  const allowed = new Set(allowedRels);
  const walk = (dir, prefix = '') => {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) walk(full, prefix ? `${prefix}/${name}` : name);
      else if (name.endsWith('.jpg')) {
        const rel = prefix ? `${prefix}/${name}` : name;
        if (!allowed.has(rel)) {
          fs.unlinkSync(full);
          console.log(`DEL orphan ${rel}`);
        }
      }
    }
  };
  walk(outRoot);
}

function watchLogDest(job) {
  if (job.modalComplete) {
    return path.relative(HTML_ROOT, job.dest);
  }
  return path.relative(HTML_ROOT, job.htmlFile).replace(/\.html$/i, '') +
    (job.step ? `-step${job.step}` : '') +
    (job.view === 'detail' ? '-detail' : job.view === 'write' ? '-write' : job.view === 'open' ? '-open' : '') +
    '.jpg';
}

async function createCaptureSession(browser, mobile) {
  let publicPage = null;
  let authPage = null;

  async function applyViewport(page) {
    if (mobile) {
      await page.setUserAgent(MOBILE_UA);
      await page.setViewport(MOBILE_VIEWPORT);
    } else {
      await page.setViewport(DESKTOP_VIEWPORT);
    }
  }

  async function newCapturePage() {
    const p = await browser.newPage();
    await applyViewport(p);
    return p;
  }

  async function getPublicPage() {
    if (!publicPage) publicPage = await newCapturePage();
    return publicPage;
  }

  async function getAuthPage() {
    if (!authPage) {
      authPage = await newCapturePage();
      await authPage.evaluateOnNewDocument(CAPTURE_AUTH_SEED);
    }
    return authPage;
  }

  async function getLoggedOutPage() {
    const p = await newCapturePage();
    await p.evaluateOnNewDocument(AUTH_CLEAR_SEED);
    return p;
  }

  async function resolveCapturePage(job) {
    if (isLoggedOutCapturePage(job.kind, job.base)) {
      return { page: await getLoggedOutPage(), closeAfter: true };
    }
    if (needsAuthSeedForJob(job.kind, job.base)) {
      return { page: await getAuthPage(), closeAfter: false };
    }
    return { page: await getPublicPage(), closeAfter: false };
  }

  async function runJobs(jobs, { quiet = false } = {}) {
    let ok = 0;
    let fail = 0;
    const errors = [];

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      const label = `[${i + 1}/${jobs.length}] ${path.relative(HTML_ROOT, job.htmlFile)}${job.step ? ` (step ${job.step})` : ''}`;
      const seed = authSeedForJob(job);
      let capPage = null;
      let closeAfter = false;

      try {
        ({ page: capPage, closeAfter } = await resolveCapturePage(job));

        await screenshot(capPage, job);
        if (quiet) {
          console.log(`WATCH updated ${watchLogDest(job)}`);
        } else {
          const tags = [];
          if (seed) tags.push('logged-in');
          if (isLoggedOutCapturePage(job.kind, job.base)) tags.push('logged-out');
          if (job.step) tags.push(`step${job.step}`);
          if (job.modalComplete) tags.push(job.modalComplete);
          if (needsFoStorageSeed(job.kind, job.base)) tags.push('seeded');
          console.log(`OK  ${label}${tags.length ? ' (' + tags.join(', ') + ')' : ''}`);
        }
        ok++;
      } catch (e) {
        if (quiet) {
          console.error(`WATCH fail ${watchLogDest(job)}: ${e.message}`);
        } else {
          console.error(`FAIL ${label}: ${e.message}`);
        }
        errors.push({ file: job.htmlFile, step: job.step, error: e.message });
        fail++;
      } finally {
        if (closeAfter && capPage) await capPage.close();
      }
    }

    return { ok, fail, errors };
  }

  async function close() {
    if (publicPage) await publicPage.close();
    if (authPage) await authPage.close();
  }

  return { runJobs, close };
}

async function launchBrowser() {
  return puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=medium'],
  });
}

async function runBatch({ prune = true } = {}) {
  if (!fs.existsSync(CHROME)) {
    console.error('Chrome not found:', CHROME);
    process.exit(1);
  }

  const files = collectHtmlFiles();
  const browser = await launchBrowser();
  let totalOk = 0;
  let totalFail = 0;
  const allErrors = [];

  for (const { mobile } of captureModes()) {
    const outRoot = outRootFor(mobile);
    const jobs = buildCaptureJobs(files, outRoot, { mobile });
    const mode = mobile ? 'mobile (390px)' : 'desktop (1440px)';
    console.log(`Mode: ${mode} · IA allowlist · ${jobs.length} captures`);
    console.log(`Output → ${outRoot}`);

    const session = await createCaptureSession(browser, mobile);
    const { ok, fail, errors } = await session.runJobs(jobs);
    await session.close();
    totalOk += ok;
    totalFail += fail;
    allErrors.push(...errors.map((e) => ({ ...e, mobile })));

    if (prune && !isSignupOnly && !onlyPatterns?.length) pruneOrphanJpgs(outRoot, allowedJpgRelPaths(files, { mobile }));
    if (prune && isSignupOnly) {
      pruneSignupOrphanJpgs(outRoot, allowedJpgRelPaths(files, { mobile }), { mobile });
    }
  }

  await browser.close();

  console.log(`\nDone: ${totalOk} ok, ${totalFail} failed`);
  if (allErrors.length) {
    const errPath = path.join(outRootFor(false), '_errors.json');
    fs.writeFileSync(errPath, JSON.stringify(allErrors, null, 2), 'utf8');
  }
}

async function runWatch() {
  if (!fs.existsSync(CHROME)) {
    console.error('Chrome not found:', CHROME);
    process.exit(1);
  }

  const modes = captureModes();
  const modeLabel = modes.map((m) => (m.mobile ? 'mobile' : 'desktop')).join('+');
  console.log(`Watch mode · ${modeLabel} · debounce ${WATCH_DEBOUNCE_MS}ms`);
  console.log(`Watching ${HTML_ROOT}`);
  for (const { mobile } of modes) {
    console.log(`Output → ${outRootFor(mobile)}`);
  }

  const browser = await launchBrowser();
  const sessions = new Map();
  for (const { mobile } of modes) {
    sessions.set(mobile, await createCaptureSession(browser, mobile));
  }

  let pendingPaths = new Set();
  let debounceTimer = null;
  let running = false;
  let rerun = false;

  async function processPending() {
    if (running) {
      rerun = true;
      return;
    }
    running = true;
    try {
      do {
        rerun = false;
        const paths = pendingPaths;
        pendingPaths = new Set();
        if (!paths.size) break;

        const htmlSet = new Set();
        for (const p of paths) {
          for (const html of htmlFilesAffectedByChange(p)) htmlSet.add(html);
        }
        if (!htmlSet.size) continue;

        const htmlFiles = [...htmlSet].sort();
        console.log(`\nWATCH ${paths.size} change(s) → ${htmlFiles.length} html → capturing…`);

        for (const { mobile } of modes) {
          const outRoot = outRootFor(mobile);
          const jobs = buildCaptureJobs(htmlFiles, outRoot, { mobile });
          const session = sessions.get(mobile);
          await session.runJobs(jobs, { quiet: true });
        }
      } while (rerun);
    } finally {
      running = false;
    }
  }

  function schedule(changedPath) {
    if (!isWatchablePath(changedPath)) return;
    pendingPaths.add(path.normalize(changedPath));
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      processPending().catch((e) => console.error('WATCH error:', e.message));
    }, WATCH_DEBOUNCE_MS);
  }

  const watchers = [];
  for (const root of SCAN_ROOTS) {
    if (!fs.existsSync(root)) continue;
    try {
      const w = fs.watch(root, { recursive: true }, (_event, filename) => {
        if (!filename) return;
        schedule(path.join(root, filename));
      });
      watchers.push(w);
    } catch {
      watchTree(root, schedule, watchers);
    }
  }

  const shutdown = async () => {
    clearTimeout(debounceTimer);
    for (const w of watchers) w.close();
    for (const session of sessions.values()) await session.close();
    await browser.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

function watchTree(dir, schedule, watchers) {
  if (!fs.existsSync(dir)) return;
  try {
    const w = fs.watch(dir, (_event, filename) => {
      if (!filename) return;
      const full = path.join(dir, filename);
      schedule(full);
      try {
        if (fs.statSync(full).isDirectory()) watchTree(full, schedule, watchers);
      } catch {
        /* file removed */
      }
    });
    watchers.push(w);
  } catch {
    /* unreadable */
  }
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (name.isDirectory() && !name.name.startsWith('.')) {
      watchTree(path.join(dir, name.name), schedule, watchers);
    }
  }
}

async function main() {
  if (isWatch) {
    await runWatch();
    return;
  }
  await runBatch();
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
