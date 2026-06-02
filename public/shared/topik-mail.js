/**
 * 이메일 발송 시뮬레이션 — localStorage 아웃박스 + 처리 이력 연동
 * template_key ↔ 시안/email/templates/data.js (C안 에디토리얼 14종)
 * @see 시안/email/README.md
 */
(function (g) {
  'use strict';

  var OUTBOX_KEY = 'topik_mm_mail_outbox_v1';
  var MAX_ITEMS = 200;

  /** email_outbox.template_key — REST_API_명세_초안 §4.8 */
  var TEMPLATE_KEYS = {
    signup_verify_code: { label: '회원가입 이메일 인증', previewKey: 'signup-verify' },
    password_reset: { label: '비밀번호 재설정', previewKey: 'password-reset' },
    application_approved: { label: '접수 승인 완료', previewKey: 'approve-notice' },
    application_rejected: { label: '접수 반려', previewKey: 'reject-notice' },
    photo_rejected: { label: '증명사진 심사 반려', previewKey: 'photo-reject-notice' },
    temp_password: { label: '회원 임시 비밀번호', previewKey: 'member-temp-password' },
    temp_password_admin: { label: '관리자 임시 비밀번호', previewKey: 'admin-temp-password' },
    board_refund_received: { label: '게시글 접수 확인', previewKey: 'board-submission-received' },
    board_admin_new_post: { label: '운영자 신규 접수 알림', previewKey: 'board-admin-new-post' },
    board_reply: { label: '게시판 활동 알림', previewKey: 'board-activity' },
    notice_marketing: { label: '마케팅 공지 알림', previewKey: 'marketing-notice' },
    account_status: { label: '계정 정지·탈퇴', previewKey: 'account-status', locales: ['ko', 'my', 'en'] },
    member_info_changed: { label: '회원정보 수정 통지', previewKey: 'member-info-changed', locales: ['ko', 'my', 'en'] },
    password_expiry_reminder: { label: '비밀번호 6개월 변경 권고', previewKey: 'password-expiry-reminder', locales: ['ko', 'my', 'en'] }
  };

  var PREVIEW_BASE = '../시안/email/TOPIK%20Myanmar%20%EC%9D%B4%EB%A9%94%EC%9D%BC%20%ED%85%9C%ED%94%8C%EB%A6%BF.html';

  function readOutbox() {
    try {
      var list = JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function writeOutbox(list) {
    try {
      localStorage.setItem(OUTBOX_KEY, JSON.stringify(list.slice(0, MAX_ITEMS)));
    } catch (e) {}
  }

  function uid() {
    return 'mail_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  }

  /**
   * @param {Object} opts - { to, subject, body, template, templateKey, locale, meta, from }
   * @returns {Object} sent item
   */
  function send(opts) {
    opts = opts || {};
    var templateKey = opts.templateKey || opts.template || 'generic';
    var reg = TEMPLATE_KEYS[templateKey];
    var item = {
      id: uid(),
      to: opts.to || '',
      from: opts.from || 'topik.myanmar@mofa.go.kr',
      subject: opts.subject || '(제목 없음)',
      body: opts.body || '',
      template: templateKey,
      templateKey: templateKey,
      locale: opts.locale || 'ko',
      previewKey: reg ? reg.previewKey : null,
      meta: opts.meta || {},
      status: 'sent',
      sentAt: new Date().toISOString()
    };
    var list = readOutbox();
    list.unshift(item);
    writeOutbox(list);
    if (typeof opts.onSent === 'function') opts.onSent(item);
    if (g.TOPIKBoCore && typeof g.TOPIKBoCore.notifyMailSent === 'function') {
      g.TOPIKBoCore.notifyMailSent(item);
    }
    return item;
  }

  function getOutbox(limit) {
    var list = readOutbox();
    return typeof limit === 'number' ? list.slice(0, limit) : list;
  }

  function clearOutbox() {
    writeOutbox([]);
  }

  function countUnread() {
    return readOutbox().filter(function (m) { return m.status === 'sent'; }).length;
  }

  /** 마케팅 수신 동의자 일괄 발송 (0527) */
  function sendBulk(recipients, opts) {
    opts = opts || {};
    var sent = [];
    (recipients || []).forEach(function (r) {
      sent.push(send({
        to: r.email || r,
        subject: opts.subject,
        body: opts.body,
        template: opts.template || 'marketing',
        meta: { name: r.name, noticeId: opts.noticeId }
      }));
    });
    return sent;
  }

  /**
   * SMTP 대체 — outbox에 적재 (본문 HTML은 서버/시안 render.js)
   * @param {Object} opts - { templateKey, locale, to, subject, body, meta }
   */
  function enqueue(opts) {
    opts = opts || {};
    var key = opts.templateKey;
    if (key && !TEMPLATE_KEYS[key]) {
      console.warn('[TOPIKMail] unknown template_key:', key);
    }
    return send({
      to: opts.to,
      subject: opts.subject,
      body: opts.body,
      templateKey: key,
      locale: opts.locale || 'ko',
      meta: opts.meta || {},
      from: opts.from,
      onSent: opts.onSent
    });
  }

  function previewUrl(templateKey, locale) {
    var reg = TEMPLATE_KEYS[templateKey];
    if (!reg) return PREVIEW_BASE;
    var q = '?key=' + encodeURIComponent(reg.previewKey);
    if (locale) q += '&locale=' + locale;
    return PREVIEW_BASE + q;
  }

  g.TOPIKMail = {
    TEMPLATE_KEYS: TEMPLATE_KEYS,
    PREVIEW_BASE: PREVIEW_BASE,
    send: send,
    enqueue: enqueue,
    sendBulk: sendBulk,
    getOutbox: getOutbox,
    clearOutbox: clearOutbox,
    count: countUnread,
    previewUrl: previewUrl
  };
})(typeof window !== 'undefined' ? window : this);
