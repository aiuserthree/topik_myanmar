/**
 * Smoke-test: render all 14 transactional template keys without error.
 * Run: npx tsx scripts/render-email-templates.ts
 */
import { buildEmailDefaults } from "../src/lib/email-templates/defaults.js";
import { renderEmail, TEMPLATE_KEYS } from "../src/lib/email-templates/render-html.js";

const sample = buildEmailDefaults({
  userName: "민 텟 아웅",
  verificationCode: "482 915",
  expiresMinutes: "5",
  email: "m****@gmail.com",
  resetLink: "https://example.com/reset",
  applicantNo: "MMR-098-00471",
  roundName: "제98회",
  level: "TOPIK Ⅱ",
  examDate: "2026.05.17 (일)",
  venueName: "양곤 시험장",
  rejectReason: "정보 불일치",
  rejectCode: "정보 불일치",
  photoRejectReason: "정면 사진이 아닙니다.",
  photoRejectCode: "정면 아님",
  temporaryPassword: "Tmp9#kQ2m",
  adminUsername: "admin_kyaw",
  boardName: "환불·정보정정신청",
  postTitle: "응시료 환불 신청",
  postId: "R-2026-0142",
  submittedAt: "2026.04.03 14:22",
  category: "환불 신청",
  secretFlag: "아니오",
  activityType: "공식 답변",
  noticeTitle: "제98회 TOPIK 접수 안내",
  noticeCategory: "접수",
  publishedAt: "2026.04.01",
  accountAction: "suspended",
  accountStatusLabel: "정지",
  statusReason: "운영 정책 위반",
  statusUntil: "2026.07.01",
  canceledApplications: "2",
  changedAt: "2026.04.03 15:40",
  changedBy: "관리자(admin_kyaw)",
  changedFieldsSummary: "연락처 · 국적",
  changeDiffHtml: "연락처 변경",
  lastPasswordChange: "2025.09.15",
  daysSincePwChange: "195",
});

let failed = 0;
for (const key of TEMPLATE_KEYS) {
  for (const locale of ["ko", "my", "en"] as const) {
    try {
      const { subject, html } = renderEmail(key, locale, sample);
      if (!subject || html.length < 500) {
        throw new Error("empty output");
      }
      console.log(`ok  ${key} [${locale}] — ${subject.slice(0, 50)}…`);
    } catch (err) {
      failed += 1;
      console.error(`FAIL ${key} [${locale}]`, err);
    }
  }
}

if (failed > 0) {
  process.exit(1);
}
console.log(`\nAll ${TEMPLATE_KEYS.length} templates rendered (${TEMPLATE_KEYS.length * 3} locale attempts).`);
