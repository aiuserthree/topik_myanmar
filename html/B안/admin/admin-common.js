(function () {
  'use strict';

  /** 사이드바 메뉴 표시명 (모든 BO 페이지 공통) */
  var MENU_LABELS = {
    'admin-dashboard.html': '대시보드',
    'admin-applicants.html': '접수자 목록',
    'admin-exam-rounds.html': '회차 관리',
    'admin-exam-venues.html': '시험장 관리',
    'admin-notice.html': '공지사항 관리',
    'admin-faq.html': 'FAQ 관리',
    'admin-refund.html': '환불·정정신청',
    'admin-inquiry.html': '문의게시판',
    'admin-members.html': '회원 관리',
    'admin-terms.html': '약관 관리',
    'admin-accounts.html': '관리자 계정',
    'admin-permissions.html': '권한 관리',
    'admin-history.html': '처리 이력',
    '../index.html': '사이트 보기'
  };

  /** 사이드바 메뉴 아이콘 SVG path (href → innerHTML) */
  var MENU_ICONS = {
    'admin-applicants.html':
      '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>' +
      '<circle cx="9" cy="7" r="4"/>' +
      '<path d="M23 21v-2a4 4 0 0 0-3-3.87"/>' +
      '<path d="M16 3.13a4 4 0 0 1 0 7.75"/>'
  };

  var SCROLL_KEY = 'bo_sidebar_scroll';
  var scrollSaveTimer = null;

  function getSidebarNav() {
    return document.querySelector('.sb-nav, .sidebar-nav');
  }

  /** 사이트 보기 링크 — 없으면 nav 맨 하단에 추가 */
  function ensureSiteViewLink() {
    var nav = getSidebarNav();
    if (!nav) return;
    if (nav.querySelector('a.sb-link[href="../index.html"]')) return;

    var link = document.createElement('a');
    link.className = 'sb-link';
    link.href = '../index.html';
    link.target = '_blank';
    link.rel = 'noopener';
    link.innerHTML =
      '<svg viewBox="0 0 24 24">' +
      '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>' +
      '<polyline points="15 3 21 3 21 9"/>' +
      '<line x1="10" y1="14" x2="21" y2="3"/>' +
      '</svg>사이트 보기';
    nav.appendChild(link);
  }

  /** 링크 텍스트를 통일 (badge는 유지) */
  function normalizeSidebarLabels() {
    var nav = getSidebarNav();
    if (!nav) return;
    nav.querySelectorAll('.sb-link[href]').forEach(function (link) {
      var href = (link.getAttribute('href') || '').split('#')[0].split('?')[0];
      var label = MENU_LABELS[href];
      if (!label) return;
      var badge = link.querySelector('.sb-badge, .badge');
      Array.from(link.childNodes).forEach(function (node) {
        if (node.nodeType === 1 && node.tagName.toLowerCase() === 'svg') return;
        if (node === badge) return;
        link.removeChild(node);
      });
      if (badge) {
        link.insertBefore(document.createTextNode(label), badge);
      } else {
        link.appendChild(document.createTextNode(label));
      }
    });
  }

  /** 링크 아이콘 SVG 통일 */
  function normalizeSidebarIcons() {
    var nav = getSidebarNav();
    if (!nav) return;
    nav.querySelectorAll('.sb-link[href]').forEach(function (link) {
      var href = (link.getAttribute('href') || '').split('#')[0].split('?')[0];
      var paths = MENU_ICONS[href];
      if (!paths) return;
      var svg = link.querySelector('svg');
      if (!svg) return;
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.innerHTML = paths;
    });
  }

  function saveSidebarScroll() {
    var nav = getSidebarNav();
    if (!nav) return;
    try {
      sessionStorage.setItem(SCROLL_KEY, String(nav.scrollTop));
    } catch (e) {}
  }

  function restoreSidebarScroll() {
    var nav = getSidebarNav();
    if (!nav) return;
    try {
      var saved = sessionStorage.getItem(SCROLL_KEY);
      if (saved !== null) {
        nav.scrollTop = parseInt(saved, 10) || 0;
      }
    } catch (e) {}
  }

  function bindSidebarScrollPersist() {
    var nav = getSidebarNav();
    if (!nav) return;
    nav.querySelectorAll('.sb-link[href]').forEach(function (link) {
      link.addEventListener('click', saveSidebarScroll);
    });
    nav.addEventListener('scroll', function () {
      if (scrollSaveTimer) clearTimeout(scrollSaveTimer);
      scrollSaveTimer = setTimeout(saveSidebarScroll, 80);
    });
  }

  function initSidebarNav() {
    ensureSiteViewLink();
    normalizeSidebarLabels();
    normalizeSidebarIcons();
    restoreSidebarScroll();
    bindSidebarScrollPersist();
  }

  function getAdmin() {
    try {
      return JSON.parse(sessionStorage.getItem('bo_admin') || 'null');
    } catch (e) {
      return null;
    }
  }

  function getAdminOrDemo() {
    return getAdmin() || { id: 'demo', name: '관리자', role: '최고관리자', roleKey: 'super' };
  }

  window.BOAdminCommon = {
    getAdmin: getAdmin,
    getAdminOrDemo: getAdminOrDemo,
    ensureSiteViewLink: ensureSiteViewLink,
    normalizeSidebarLabels: normalizeSidebarLabels,
    normalizeSidebarIcons: normalizeSidebarIcons,
    saveSidebarScroll: saveSidebarScroll,
    restoreSidebarScroll: restoreSidebarScroll,
    initSidebarNav: initSidebarNav
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSidebarNav);
  } else {
    initSidebarNav();
  }
})();
