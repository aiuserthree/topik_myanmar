import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { needsFoLoginSeed, needsBoLoginSeed } from './ia-allowlist.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORTRAIT_JPEG = path.join(__dirname, 'assets', 'dummy-portrait.jpg');

/** 증명사진·프로필 더미 (인물 JPEG, file://·localStorage 공용) */
let _portraitDataUrl;
export function getDummyPortraitDataUrl() {
  if (!_portraitDataUrl) {
    const buf = fs.readFileSync(PORTRAIT_JPEG);
    _portraitDataUrl = `data:image/jpeg;base64,${buf.toString('base64')}`;
  }
  return _portraitDataUrl;
}

/** HTML 상대 경로 더미 사진 */
export const DUMMY_PORTRAIT_PATH = 'assets/dummy-portrait.jpg';

/** @deprecated alias — use getDummyPortraitDataUrl() */
export const PORTRAIT_PHOTO = getDummyPortraitDataUrl;

export const BOARD_PAGES = new Set([
  'notice.html',
  'faq.html',
  'refund-correction.html',
  'board-refund.html',
  'qna.html',
  'board-inquiry.html',
]);

export const REGISTER_PAGE = 'register.html';
export const SIGNUP_PAGE = 'signup.html';
export const SIGNUP_STEPS = 3;

export function isBoardPage(basename) {
  return BOARD_PAGES.has(basename.toLowerCase());
}

export function isRegisterPage(basename) {
  return basename.toLowerCase() === REGISTER_PAGE;
}

export function isSignupPage(basename) {
  return basename.toLowerCase() === SIGNUP_PAGE;
}

/** Mobile confirm JPG: flat Korean display names under A안/B안/C안 */
export function mobileVariantDir(htmlFile, htmlRoot) {
  return path.relative(htmlRoot, htmlFile).split(path.sep)[0];
}

export function signupStepOutPath(htmlFile, htmlRoot, outRoot, step, { mobile = false } = {}) {
  if (mobile) {
    return path.join(outRoot, mobileVariantDir(htmlFile, htmlRoot), `회원가입_step${step}.jpg`);
  }
  const rel = path.relative(htmlRoot, htmlFile).replace(/signup\.html$/i, `signup-step${step}.jpg`);
  return path.join(outRoot, rel);
}

export function signupStepRelPath(htmlFile, htmlRoot, step, { mobile = false } = {}) {
  if (mobile) {
    return `${mobileVariantDir(htmlFile, htmlRoot)}/회원가입_step${step}.jpg`;
  }
  return path.relative(htmlRoot, htmlFile).replace(/signup\.html$/i, `signup-step${step}.jpg`);
}

/** A안 게시판·접수 더미 localStorage (ContentStore/BoardStore) */
export function needsFoStorageSeed(kind, basename) {
  if (kind !== 'A_FO') return false;
  return isBoardPage(basename) || isRegisterPage(basename);
}

export function registerStepOutPath(htmlFile, htmlRoot, outRoot, step) {
  const rel = path.relative(htmlRoot, htmlFile).replace(/register\.html$/i, `register-step${step}.jpg`);
  return path.join(outRoot, rel);
}

/** @returns {('list'|'detail'|'write'|'open')[]} */
export function getBoardViews(basename) {
  const b = basename.toLowerCase();
  if (b === 'notice.html') return ['list', 'detail'];
  if (b === 'faq.html') return ['list', 'open'];
  if (b === 'refund-correction.html' || b === 'board-refund.html') {
    return ['list', 'detail', 'write'];
  }
  if (b === 'qna.html' || b === 'board-inquiry.html') {
    return ['list', 'detail', 'write'];
  }
  return ['list'];
}

export function boardViewOutPath(htmlFile, htmlRoot, outRoot, view) {
  const rel = path.relative(htmlRoot, htmlFile).replace(/\.html$/i, '');
  const suffix =
    view === 'detail' ? '-detail' : view === 'write' ? '-write' : view === 'open' ? '-open' : '';
  return path.join(outRoot, rel + suffix + '.jpg');
}

/** location.pathname → html basename (file:// paths included) */
export function pageBasenameFromPath(pathname) {
  const parts = String(pathname || '').split(/[/\\]/);
  return (parts.pop() || '').toLowerCase();
}

/** FO guard redirected to login.html (admin-login.html is excluded) */
export function isFoLoginRedirectPathname(pathname) {
  return pageBasenameFromPath(pathname) === 'login.html';
}

/** BO guard redirected to admin-login.html */
export function isBoLoginRedirectPathname(pathname) {
  return pageBasenameFromPath(pathname) === 'admin-login.html';
}

/** B안 BO session — matches admin-login.html / admin-*.html */
export function buildBoAuthBSeed() {
  return `(() => {
  try {
    sessionStorage.setItem('bo_admin', JSON.stringify({
      id: 'superadmin', name: '관리자', role: '최고관리자'
    }));
  } catch (e) {}
})()`;
}

/** C안 BO session — matches admin.html auth gate */
export function buildBoAuthCSeed() {
  return `(() => {
  try {
    sessionStorage.setItem('bo_session', JSON.stringify({
      id: 'admin01', name: '김관리', role: 'super',
      loginAt: new Date().toISOString(), ip: '203.0.113.42'
    }));
    sessionStorage.setItem('tpkm_bo_admin', JSON.stringify({ role: 'super', name: '김관리' }));
  } catch (e) {}
})()`;
}

function mergeSeedScripts(scripts) {
  const bodies = scripts.map((s) => {
    const body = s.replace(/^\(\(\)\s*=>\s*\{/, '').replace(/\}\)\(\)\s*;?\s*$/, '');
    return `{${body}}`;
  });
  return `(() => {${bodies.join('')}})()`;
}

/** Per-job auth seed (FO keys + variant BO) — run via evaluateOnNewDocument and before goto */
export function buildJobAuthSeed(kind, basename) {
  const scripts = [];
  if (needsFoLoginSeed(basename)) {
    scripts.push(buildFoAuthSeed());
    if (kind === 'A_FO') scripts.push(buildFoStorageSeed());
  }
  if (needsBoLoginSeed(kind, basename)) {
    scripts.push(kind === 'C_BO' ? buildBoAuthCSeed() : buildBoAuthBSeed());
  }
  if (!scripts.length) return null;
  return mergeSeedScripts(scripts);
}

/** Auth capture page: all FO + both BO seeds (shared session across jobs in one run) */
export function buildCaptureAuthSeed() {
  return mergeSeedScripts([
    buildFoAuthSeed(),
    buildFoStorageSeed(),
    buildBoAuthBSeed(),
    buildBoAuthCSeed(),
  ]);
}

/** FO/BO 세션 제거 — login·signup·admin-login 캡처용 */
export function buildAuthClearSeed() {
  return `(() => {
  try {
    localStorage.removeItem('tm_session');
    localStorage.removeItem('tm_profile_v1');
    localStorage.removeItem('tm_signup_photo_v1');
    localStorage.removeItem('tpkm_user');
    sessionStorage.removeItem('bo_admin');
    sessionStorage.removeItem('bo_session');
    sessionStorage.removeItem('tpkm_bo_admin');
  } catch (e) {}
})()`;
}

/** FO 로그인 시딩 — 프로필 + 증명사진 (A/B/C) */
export function buildFoAuthSeed() {
  const photo = JSON.stringify(getDummyPortraitDataUrl());
  return `(() => {
  const photo = ${photo};
  const profile = {
    nameKr: '홍길동', nameKo: '홍길동', nameEn: 'HONG GILDONG',
    birthdate: '1990-01-15', gender: 'M', nationality: 'MM', firstLang: 'MM',
    phone: '+95-9-1234567', email: 'hong@example.com',
    occupation: '학생', motive: '유학', purpose: '학업', marketingConsent: true
  };
  const user = {
    name: '홍길동', nameKo: '홍길동', nameEn: 'HONG GILDONG', email: 'hong@example.com'
  };
  try {
    localStorage.setItem('tm_session', '1');
    localStorage.setItem('tm_profile_v1', JSON.stringify(profile));
    localStorage.setItem('tm_signup_photo_v1', photo);
    localStorage.setItem('tpkm_user', JSON.stringify(user));
  } catch (e) {}
})()`;
}

/** FO localStorage — A안 ContentStore · BoardStore + 가입 사진 */
export function buildFoStorageSeed() {
  const photo = JSON.stringify(getDummyPortraitDataUrl());
  return `(() => {
  const photo = ${photo};
  const profile = {
    nameKr: '홍길동', nameKo: '홍길동', nameEn: 'HONG GILDONG',
    birthdate: '1990-01-15', gender: 'M', nationality: 'MM', firstLang: 'MM',
    phone: '+95-9-1234567', email: 'hong@example.com',
    occupation: '학생', motive: '유학', purpose: '학업', marketingConsent: true
  };
  try {
    localStorage.setItem('tm_profile_v1', JSON.stringify(profile));
    localStorage.setItem('tm_signup_photo_v1', photo);
  } catch (e) {}

  const content = {
    noticeCategories: [
      { id: 'imp', label: '중요' }, { id: 'new', label: '접수 안내' },
      { id: 'gen', label: '시험 일정' }, { id: 'result', label: '결과 발표' }
    ],
    faqCategories: [
      { id: 'reg', label: '접수' }, { id: 'exam', label: '시험' },
      { id: 'score', label: '결과' }, { id: 'etc', label: '기타' }
    ],
    noticeItems: [
      { id: 'nt1', catId: 'new', title: '제99회 TOPIK 미얀마 접수 안내', date: '2026.06.01', views: 842,
        bodyHtml: '<p><strong>제99회 접수</strong>가 시작되었습니다.</p>' },
      { id: 'nt2', catId: 'imp', title: '[중요] 응시료 수납처 변경 안내', date: '2026.05.28', views: 1203,
        bodyHtml: '<p>오프라인 수납 은행이 변경되었습니다.</p>' },
      { id: 'nt3', catId: 'gen', title: '시험장 입실·지각 처리 기준', date: '2026.05.20', views: 334,
        bodyHtml: '<p>시험 시작 30분 전까지 입실해 주세요.</p>' },
      { id: 'nt4', catId: 'result', title: '제98회 합격자 발표', date: '2026.05.10', views: 2104,
        bodyHtml: '<p>합격자 발표일 안내입니다.</p>' },
      { id: 'nt5', catId: 'gen', title: '증명사진 심사 기준 요약', date: '2026.05.05', views: 567,
        bodyHtml: '<p>정면·밝기·배경 규격을 준수해 주세요.</p>' }
    ],
    faqItems: [
      { id: 'fq1', catId: 'reg', question: '접수 후 수험번호는 언제 확인하나요?', answer: '수납·사진 심사 완료 후 마이페이지에서 확인할 수 있습니다.', updatedAt: '2026.05.01' },
      { id: 'fq2', catId: 'reg', question: '동시 접수(Ⅰ+Ⅱ)가 가능한가요?', answer: '동일 회차에서 동시 접수가 가능합니다.', updatedAt: '2026.05.01' },
      { id: 'fq3', catId: 'exam', question: '시험 당일 지참 서류는?', answer: '여권·NRC 등 신분증 1부를 지참해 주세요.', updatedAt: '2026.05.01' },
      { id: 'fq4', catId: 'score', question: '성적표는 어디서 받나요?', answer: 'TOPIK 본부 홈페이지 안내를 참고해 주세요.', updatedAt: '2026.05.01' },
      { id: 'fq5', catId: 'etc', question: '환불은 어떻게 신청하나요?', answer: '환불·정보정정신청 게시판을 이용해 주세요.', updatedAt: '2026.05.01' }
    ]
  };
  const boards = {
    refundPosts: [
      { id: 'rf1', type: 'refund', title: '제99회 접수 취소·환불 요청', body: '접수 취소합니다.', authorEmail: 'hong@example.com', authorName: '홍길동', date: '2026.06.02', status: 'review', secret: false, secretPw: '', attachments: [], adminReply: '', comments: [] },
      { id: 'rf2', type: 'correction', title: '영문 성명 정정 요청', body: '여권 표기와 다릅니다.', authorEmail: 'user2@example.com', authorName: '김영희', date: '2026.05.28', status: 'done', secret: true, secretPw: '1234', attachments: [], adminReply: '처리 완료', comments: [] },
      { id: 'rf3', type: 'refund', title: '수납 후 환불 문의', body: '영수증 첨부', authorEmail: 'hong@example.com', authorName: '홍길동', date: '2026.05.20', status: 'received', secret: false, secretPw: '', attachments: [], adminReply: '', comments: [] }
    ],
    inquiryPosts: [
      { id: 'iq1', type: 'inquiry', category: 'reg', visibility: 'general', title: '동시 접수 시험장 문의', body: '같은 시험장인가요?', authorEmail: 'hong@example.com', authorName: '홍길동', date: '2026.06.01', status: 'answered', secret: false, secretPw: '', attachments: [], adminReply: '동일 시험장 코드로 배정됩니다.', comments: [] },
      { id: 'iq2', type: 'inquiry', category: 'exam', visibility: 'secret', title: '시험장 위치 문의', body: '교통편 안내', authorEmail: 'ask@example.com', authorName: '이철수', date: '2026.05.25', status: 'pending', secret: true, secretPw: '5678', attachments: [], adminReply: '', comments: [] },
      { id: 'iq3', type: 'inquiry', category: 'other', visibility: 'general', title: '인증 메일 미수신', body: '메일이 오지 않습니다.', authorEmail: 'new@example.com', authorName: '박지민', date: '2026.05.18', status: 'answered', secret: false, secretPw: '', attachments: [], adminReply: '스팸함을 확인해 주세요.', comments: [] }
    ]
  };
  try {
    localStorage.setItem('topik_mm_content_v1', JSON.stringify(content));
    localStorage.setItem('topik_mm_boards_v1', JSON.stringify(boards));
  } catch (e) {}
})()`;
}

export const PHOTO_PREP_PAGES = new Set(['mypage-profile.html', 'signup.html']);

export function needsProfilePhotoPrep(base, step) {
  if (base === 'register.html' && step != null && step >= 3) return true;
  if (base === 'signup.html' && step != null && step >= 2) return true;
  return PHOTO_PREP_PAGES.has(base.toLowerCase()) && step == null;
}

/** @param {import('puppeteer').Page} page */
export async function prepareProfilePhoto(page, base, step, kind) {
  const photo = getDummyPortraitDataUrl();
  await page.evaluate(
    (b, s, variant, photoUrl, relPath) => {
      const setImg = (id) => {
        const el = document.getElementById(id);
        if (el) {
          el.src = photoUrl;
          el.style.display = el.tagName === 'IMG' ? 'block' : el.style.display;
        }
      };
      if (variant === 'A_FO') {
        if (window.TMProfile?.saveSignupPhoto) TMProfile.saveSignupPhoto(photoUrl);
        setImg('previewImg');
        setImg('pfPhotoPreview');
        setImg('confirmPhotoImg');
        setImg('signupPreviewImg');
        const phIcon = document.getElementById('phIcon');
        const phText = document.getElementById('phText');
        if (phIcon) phIcon.style.display = 'none';
        if (phText) phText.style.display = 'none';
        const prev = document.getElementById('previewImg');
        if (prev) prev.style.display = 'block';
        if (b === 'register.html' && s >= 3 && typeof initRegisterStep3Photo === 'function') {
          initRegisterStep3Photo();
        }
        if (b === 'register.html' && s === 4 && typeof fillConfirm === 'function') fillConfirm();
        if (b === 'mypage-profile.html' && typeof loadProfileForm === 'function') loadProfileForm();
        return;
      }
      if (variant === 'B_FO') {
        ['profile-photo', 'photo-img', 'sum-photo'].forEach(setImg);
        if (b === 'register.html' && s === 4 && typeof updateSummary === 'function') updateSummary();
        return;
      }
      if (variant === 'C_FO') {
        document.querySelectorAll('.photo-frame .pf, .pf').forEach((pf) => {
          pf.classList.add('has-photo');
          pf.style.padding = '0';
          pf.style.overflow = 'hidden';
          pf.innerHTML =
            '<img src="' + photoUrl + '" alt="증명사진" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">';
        });
        document.querySelectorAll('.ph-prev, .photo-preview').forEach((el) => {
          el.classList.add('has-photo');
          el.innerHTML =
            '<img src="' + photoUrl + '" alt="증명사진 미리보기" style="width:100%;height:100%;object-fit:cover;">';
        });
        const av = document.querySelector('.me-card .avatar');
        if (av) {
          av.textContent = '';
          av.style.padding = '0';
          av.style.overflow = 'hidden';
          av.style.background = 'transparent';
          av.innerHTML =
            '<img src="' + photoUrl + '" alt="프로필" style="width:100%;height:100%;object-fit:cover;">';
        }
      }
    },
    base,
    step ?? 0,
    kind,
    photo,
    DUMMY_PORTRAIT_PATH
  );
  await page
    .waitForFunction(
      () => {
        const ok = (img) =>
          img &&
          img.offsetParent !== null &&
          img.naturalWidth > 0 &&
          (img.src.startsWith('data:image/') || /\.(jpe?g|png)/i.test(img.src));
        return (
          ok(document.getElementById('previewImg')) ||
          ok(document.getElementById('pfPhotoPreview')) ||
          ok(document.getElementById('profile-photo')) ||
          ok(document.getElementById('photo-img')) ||
          ok(document.querySelector('.photo-frame .pf img, .pf img')) ||
          ok(document.querySelector('.ph-prev img, .photo-preview img'))
        );
      },
      { timeout: 10000 }
    )
    .catch(() => {});
}

/** @param {import('puppeteer').Page} page */
async function prepareBoardList(page, basename) {
  await page.evaluate((base) => {
    if (typeof showList === 'function') showList({ skipHistory: true });
    if (typeof renderNoticeBoard === 'function') renderNoticeBoard();
    if (typeof refreshFaqPage === 'function') refreshFaqPage();
    if (typeof renderManagedFaqs === 'function') renderManagedFaqs();
    if (typeof renderFaqChips === 'function') {
      renderFaqChips();
      renderManagedFaqs();
    }
    if (typeof filterList === 'function') filterList();
    if (typeof showPane === 'function') showPane('list');
    if (typeof show === 'function') {
      const listPane = document.getElementById('listPane');
      if (listPane) show('listPane');
    }
  }, basename);
  await waitForBoardView(page, basename, 'list');
}

async function waitForBoardView(page, basename, view) {
  await page
    .waitForFunction(
      (base, v) => {
        if (v === 'list') {
          if (base === 'notice.html') {
            return (
              document.querySelectorAll('#noticeBoardRows .board-row, #noticeBoardRows tr').length >
                0 || document.querySelectorAll('.board-wrap tbody tr, #js-notice-tbody tr').length > 0
            );
          }
          if (base === 'faq.html') {
            return document.querySelectorAll('.faq-item, .faq-group details, .accordion details').length > 0;
          }
          return (
            document.querySelectorAll(
              '.board-table tbody tr, .board-wrap .board-row, #boardList .board-row, table tbody tr'
            ).length > 0
          );
        }
        if (v === 'open') {
          return !!(
            document.querySelector('.faq-item.open .faq-a') ||
            document.querySelector('.faq-item.is-open .faq-item-a') ||
            document.querySelector('.accordion details[open], .faq-group details[open]')
          );
        }
        if (v === 'detail') {
          const dv = document.getElementById('detailView');
          if (dv && dv.style.display !== 'none') return true;
          if (document.getElementById('js-detail-view')?.classList.contains('is-show')) return true;
          if (document.getElementById('pane-detail')?.classList.contains('is-active')) return true;
          if (document.getElementById('detailPane')?.classList.contains('active')) return true;
          const card = document.querySelector('.detail-card');
          if (card && card.offsetParent) return true;
          const dt = document.getElementById('d-title');
          return !!(dt && dt.offsetParent && dt.textContent?.trim());
        }
        if (v === 'write') {
          if (document.getElementById('pane-write')?.classList.contains('is-active')) return true;
          if (document.getElementById('writePane')?.classList.contains('active')) return true;
          const wf = document.getElementById('writeForm');
          return !!(wf && wf.offsetParent);
        }
        return false;
      },
      { timeout: 12000 },
      basename,
      view
    )
    .catch(() => {});
}

/**
 * @param {import('puppeteer').Page} page
 * @param {'list'|'detail'|'write'|'open'} view
 * @param {string} kind — classifyHtmlFile kind (A_FO, B_FO, C_FO)
 */
export async function prepareBoardView(page, basename, view, kind) {
  await prepareBoardList(page, basename);
  if (view === 'list') return;

  await page.evaluate(
    (base, v, variant) => {
      if (base === 'notice.html' && v === 'detail') {
        if (variant === 'A_FO' && typeof showNoticeDetail === 'function') {
          showNoticeDetail('nt1', { skipHistory: true });
        } else if (variant === 'B_FO' && typeof showDetail === 'function') {
          showDetail(0);
        } else if (variant === 'C_FO' && typeof openDetail === 'function') {
          openDetail();
        }
        return;
      }
      if (base === 'faq.html' && v === 'open') {
        if (variant === 'A_FO') {
          const item = document.querySelector('.faq-item-managed, .faq-item');
          if (item) item.classList.add('open');
        } else if (variant === 'B_FO') {
          const item = document.querySelector('.faq-item');
          if (item) item.classList.add('is-open');
        } else if (variant === 'C_FO') {
          const d = document.querySelector('.accordion details, .faq-group details');
          if (d) d.open = true;
        }
        return;
      }
      const isRefund = base === 'refund-correction.html' || base === 'board-refund.html';
      const isInquiry = base === 'qna.html' || base === 'board-inquiry.html';
      if (!isRefund && !isInquiry) return;

      if (v === 'detail') {
        if (variant === 'A_FO') {
          const id = isRefund ? 'rf1' : 'iq1';
          const row =
            document.querySelector('#boardList .board-row[data-id="' + id + '"]') ||
            document.querySelector('#boardList .board-row');
          if (row) row.click();
        } else if (variant === 'B_FO' && typeof openDetail === 'function') {
          openDetail(isRefund ? 2 : 3);
        } else if (variant === 'C_FO' && typeof show === 'function') {
          show('detailPane');
        }
      } else if (v === 'write') {
        if (variant === 'A_FO') {
          document.getElementById('btnWrite')?.click();
        } else if (variant === 'B_FO' && typeof showPane === 'function') {
          showPane('write');
        } else if (variant === 'C_FO' && typeof show === 'function') {
          show('writePane');
        }
      }
    },
    basename,
    view,
    kind
  );
  await waitForBoardView(page, basename, view);
}

/** @deprecated — use prepareBoardView(page, base, 'list', kind) */
export async function prepareBoardPage(page, basename) {
  await prepareBoardList(page, basename);
}

/** @param {import('puppeteer').Page} page @param {number} step @param {string} kind */
export async function prepareSignupStep(page, step, kind) {
  const photo = getDummyPortraitDataUrl();
  await page.evaluate(
    (s, variant, photoUrl) => {
      if (variant === 'A_FO') {
        const demoEmail = 'demo.signup@topik-myanmar.example';
        const emailEl = document.getElementById('email');
        if (emailEl) emailEl.value = demoEmail;
        try {
          sessionStorage.setItem(
            'tm_signup_email_verify_v1',
            JSON.stringify({
              code: '123456',
              email: demoEmail.toLowerCase(),
              verified: true,
              exp: Date.now() + 3600000,
              expVerified: Date.now() + 86400000,
            })
          );
        } catch (e) {}
        const badge = document.getElementById('signupEmailVerifiedBadge');
        if (badge) badge.classList.add('show');
        if (typeof refreshSignupStep1Next === 'function') refreshSignupStep1Next();

        if (s >= 2) {
          document.getElementById('nameKr').value = '홍길동';
          document.getElementById('nameEn').value = 'HONG GILDONG';
          document.getElementById('birthdate').value = '1990-01-15';
          document.getElementById('phone').value = '+95-9-1234567';
          const g = document.querySelector('input[name="gender"][value="M"]');
          if (g) g.checked = true;
          document.getElementById('pw').value = 'Topik@99';
          document.getElementById('pwConfirm').value = 'Topik@99';
          if (typeof signupPhotoDataUrl !== 'undefined') signupPhotoDataUrl = photoUrl;
          const img = document.getElementById('signupPreviewImg');
          if (img) {
            img.src = photoUrl;
            img.style.display = 'block';
          }
          const phIcon = document.getElementById('signupPhIcon');
          const phText = document.getElementById('signupPhText');
          if (phIcon) phIcon.style.display = 'none';
          if (phText) phText.style.display = 'none';
          if (typeof refreshSignupStep2Next === 'function') refreshSignupStep2Next();
        }

        if (typeof goStep === 'function') goStep(s);
        return;
      }

      if (variant === 'B_FO') {
        if (s === 1) {
          document.getElementById('signup-email').value = 'demo.signup@topik-myanmar.example';
          document.getElementById('otp-section').style.display = 'block';
          document.getElementById('verified-badge').classList.add('is-show');
          if (typeof emailVerified !== 'undefined') emailVerified = true;
          if (typeof setStep1Next === 'function') setStep1Next(true);
          if (typeof goStep === 'function') goStep(1);
          return;
        }
        document.getElementById('signup-email').value = 'demo.signup@topik-myanmar.example';
        document.getElementById('verified-badge').classList.add('is-show');
        if (typeof emailVerified !== 'undefined') emailVerified = true;
        if (typeof isGoogleSignup !== 'undefined') isGoogleSignup = false;
        document.getElementById('name-ko').value = '홍길동';
        document.getElementById('name-en').value = 'HONG GILDONG';
        document.getElementById('birth').value = '1990-01-15';
        document.getElementById('gender').value = 'M';
        document.getElementById('nationality').value = 'MM';
        document.getElementById('lang1').value = 'MM';
        document.getElementById('phone').value = '+95-9-1234567';
        document.getElementById('job').value = '1';
        document.getElementById('motivation').value = '1';
        document.getElementById('purpose').value = '1';
        document.getElementById('pw').value = 'Topik@99';
        document.getElementById('pw-confirm').value = 'Topik@99';
        const pimg = document.getElementById('photo-img');
        if (pimg) pimg.src = photoUrl;
        if (typeof photoUploaded !== 'undefined') photoUploaded = true;
        if (typeof goStep === 'function') goStep(s);
        return;
      }

      if (variant === 'C_FO') {
        if (s === 1) {
          const em = document.getElementById('su-email');
          if (em) em.value = 'demo.signup@topik-myanmar.example';
          document.getElementById('otpRow')?.classList.remove('hidden');
          document.getElementById('emailOk')?.classList.remove('hidden');
          const b2 = document.getElementById('btnGoStep2');
          if (b2) b2.disabled = false;
          if (typeof go === 'function') go(1);
          return;
        }
        document.getElementById('emailOk')?.classList.remove('hidden');
        const b2 = document.getElementById('btnGoStep2');
        if (b2) b2.disabled = false;
        if (window.signupPhotoCtrl?.setDataUrl) signupPhotoCtrl.setDataUrl(photoUrl);
        if (typeof go === 'function') go(s);
      }
    },
    step,
    kind,
    photo
  );
}

/** @param {import('puppeteer').Page} page @param {number} step @param {string} kind */
export async function prepareRegisterStep(page, step, kind) {
  await page.evaluate(
    (s, variant, photo) => {
      if (variant === 'A_FO') {
        const openRound = document.querySelector('.round-card .rc-badge.open')?.closest('.round-card')
          || document.querySelector('.round-card:not(.is-disabled)');
        if (openRound) {
          document.querySelectorAll('.round-card').forEach((c) => c.classList.remove('selected'));
          openRound.classList.add('selected');
        }
        ['lvBtnI', 'lvBtnII'].forEach((id) => {
          const el = document.getElementById(id);
          if (el) el.classList.add('selected');
        });
        window.selLevel = 'BOTH';
        if (window.TMProfile?.saveSignupPhoto) TMProfile.saveSignupPhoto(photo);
        const img = document.getElementById('previewImg');
        if (img) {
          img.src = photo;
          img.style.display = 'block';
        }
        document.querySelectorAll('.photo-spec input[type=checkbox], #agreePhotoSpec').forEach((c) => {
          c.checked = true;
        });
        if (typeof goRegStep === 'function') goRegStep(s);
        return;
      }
      if (variant === 'B_FO') {
        const card = document.querySelector('.round-card.is-selected') || document.querySelector('.round-card:not(.is-disabled)');
        if (card) card.click();
        const c1 = document.getElementById('chk-topik1');
        const c2 = document.getElementById('chk-topik2');
        if (c1) c1.checked = true;
        if (c2) c2.checked = true;
        if (typeof updateLevelUI === 'function') updateLevelUI();
        if (s >= 3) {
          ['profile-photo', 'sum-photo'].forEach((id) => {
            const el = document.getElementById(id);
            if (el) {
              el.src = photo;
            }
          });
          document.querySelectorAll('.photo-check').forEach((c) => {
            c.checked = true;
          });
          if (typeof updatePhotoCheckState === 'function') updatePhotoCheckState();
        }
        if (s === 4 && typeof updateSummary === 'function') updateSummary();
        if (typeof goStep === 'function') goStep(s);
        return;
      }
      if (variant === 'C_FO') {
        const card = document.querySelector('.round-card.selected') || document.querySelector('.round-card:not(.disabled)');
        if (card) {
          document.querySelectorAll('.round-card').forEach((x) => x.classList.remove('selected'));
          card.classList.add('selected');
        }
        const l1 = document.getElementById('lvl1');
        const l2 = document.getElementById('lvl2');
        if (l1) l1.checked = true;
        if (l2) l2.checked = true;
        if (s >= 3) {
          document.querySelectorAll('.photo-frame .pf, .pf').forEach((pf) => {
            pf.classList.add('has-photo');
            pf.style.padding = '0';
            pf.style.overflow = 'hidden';
            pf.innerHTML =
              '<img src="' + photo + '" alt="증명사진" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">';
          });
          document.querySelectorAll('.check-photo input').forEach((c) => {
            c.checked = true;
          });
          const b4 = document.getElementById('btnGoStep4');
          if (b4) b4.disabled = false;
        }
        if (s === 4 && typeof updateSummary === 'function') updateSummary();
        if (typeof go === 'function') go(s);
      }
    },
    step,
    kind,
    getDummyPortraitDataUrl()
  );
}
