/**
 * IA v1.2 · 기능정의서 기준 캡처 대상 HTML (파일명)
 * - C안 handoff/docs 복제본 제외
 * - A안 BO·lookup 등 IA 외 페이지 제외
 */
import path from 'path';

/** FO — 로그인 필수 (IA TPKM_FO_0_1_3, 접수·게시판) */
export const FO_LOGIN_REQUIRED = new Set([
  'register.html',
  'register-complete.html',
  'mypage.html',
  'mypage-profile.html',
  'refund-correction.html',
  'board-refund.html',
  'qna.html',
  'board-inquiry.html',
]);

const B_FO = new Set([
  'index.html',
  'guide-overview.html',
  'guide-intro.html',
  'guide-questions.html',
  'guide-evaluation.html',
  'rules-notice.html',
  'rules-answer.html',
  'rules-fee.html',
  'rules-id.html',
  'apply-howto.html',
  'register.html',
  'mypage.html',
  'mypage-profile.html',
  'admit-card.html',
  'notice.html',
  'refund-correction.html',
  'qna.html',
  'faq.html',
  'login.html',
  'signup.html',
]);

/** A안 — 4분할 guide/rules·게시판 파일명이 IA와 다름 */
const A_FO = new Set([
  'index.html',
  'guide.html',
  'rules.html',
  'apply-howto.html',
  'register.html',
  'register-complete.html',
  'mypage.html',
  'mypage-profile.html',
  'admit.html',
  'notice.html',
  'board-refund.html',
  'board-inquiry.html',
  'faq.html',
  'login.html',
  'signup.html',
  'signup-complete.html',
  'password-reset.html',
]);

const C_FO = new Set([...B_FO, 'ticket.html']);
C_FO.delete('admit-card.html');

const B_BO = new Set([
  'admin-login.html',
  'admin-dashboard.html',
  'admin-applicants.html',
  'admin-exam-rounds.html',
  'admin-exam-venues.html',
  'admin-notice.html',
  'admin-faq.html',
  'admin-refund.html',
  'admin-inquiry.html',
  'admin-members.html',
  'admin-terms.html',
  'admin-accounts.html',
  'admin-permissions.html',
  'admin-history.html',
]);

const C_BO = new Set(['admin-login.html', 'admin.html']);

/**
 * @param {string} htmlFile absolute path
 * @param {string} htmlRoot
 * @returns {{ allowed: boolean, kind: 'A_FO'|'B_FO'|'C_FO'|'B_BO'|'C_BO'|null }}
 */
export function classifyHtmlFile(htmlFile, htmlRoot) {
  const rel = path.relative(htmlRoot, htmlFile).split(path.sep);
  const base = path.basename(htmlFile).toLowerCase();
  const variant = rel[0];

  if (variant === 'A안' && rel.length === 2) {
    return { allowed: A_FO.has(base), kind: 'A_FO' };
  }
  if (variant === 'B안' && rel.length === 2) {
    return { allowed: B_FO.has(base), kind: 'B_FO' };
  }
  if (variant === 'B안' && rel[1] === 'admin' && rel.length === 3) {
    return { allowed: B_BO.has(base), kind: 'B_BO' };
  }
  if (variant === 'C안' && rel[1] === 'FO' && rel.length === 3) {
    return { allowed: C_FO.has(base), kind: 'C_FO' };
  }
  if (
    variant === 'C안' &&
    rel[1] === 'BO(admin)' &&
    rel[2] === 'project' &&
    rel.length === 4 &&
    !rel.includes('docs') &&
    !rel.includes('uploads')
  ) {
    return { allowed: C_BO.has(base), kind: 'C_BO' };
  }

  return { allowed: false, kind: null };
}

export function needsFoLoginSeed(basename) {
  return FO_LOGIN_REQUIRED.has(basename.toLowerCase());
}

export function needsBoLoginSeed(kind, basename) {
  if (kind !== 'B_BO' && kind !== 'C_BO') return false;
  return basename.toLowerCase() !== 'admin-login.html';
}

/** JPG 캡처 시 로그아웃 UI 유지 (가짜 세션 주입 금지) */
export function isLoggedOutCapturePage(kind, basename) {
  const base = basename.toLowerCase();
  if (kind === 'B_BO' || kind === 'C_BO') return base === 'admin-login.html';
  return /^(login|signup|signup-complete|password-reset)\.html$/i.test(base);
}

export function needsAuthSeedForJob(kind, basename) {
  return needsFoLoginSeed(basename) || needsBoLoginSeed(kind, basename);
}
