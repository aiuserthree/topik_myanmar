(function () {
  'use strict';

  var PROTECTED = [
    'register.html',
    'mypage.html',
    'mypage-profile.html',
    'refund-correction.html',
    'qna.html'
  ];

  var Auth = {
    get user() {
      try { return JSON.parse(localStorage.getItem('tpkm_user') || 'null'); }
      catch (e) { return null; }
    },
    login: function (u) {
      try { localStorage.setItem('tpkm_user', JSON.stringify(u)); } catch (e) {}
    },
    logout: function () {
      try { localStorage.removeItem('tpkm_user'); } catch (e) {}
      location.href = 'index.html';
    },
    isLoggedIn: function () { return !!this.user; }
  };
  window.TPKMAuth = Auth;

  window.TPKM = {
    openModal: function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.classList.add('is-show', 'open');
      document.body.style.overflow = 'hidden';
    },
    closeModal: function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.classList.remove('is-show', 'open');
      document.body.style.overflow = '';
    }
  };

  function currentFile() {
    var p = location.pathname.split('/').pop();
    return p || 'index.html';
  }

  function checkGuard() {
    if (document.body.getAttribute('data-require-login') === null) return;
    if (Auth.isLoggedIn()) return;
    location.href = 'login.html?next=' + encodeURIComponent(currentFile());
  }

  /* =========================================================
     GNB 로그인 상태 반영 (모든 FO 페이지 공통)
     - 로그인 시: 로그인/회원가입 → 마이페이지 + 사용자명 + 로그아웃
     - 페이지별 기존 클래스를 그대로 재사용하여 디자인을 유지합니다.
     ========================================================= */
  function displayName(u) {
    if (!u) return '회원';
    return u.nameKo || u.name || ((u.email || '').split('@')[0]) || '회원';
  }

  function injectAuthStyle() {
    if (document.getElementById('tm-auth-style')) return;
    var css =
      '.tm-auth-greet{font-size:13px;font-weight:600;color:var(--primary,#1a3a6b);white-space:nowrap;display:inline-flex;align-items:center}' +
      '.gnb-actions .tm-auth-greet{margin:0 2px}' +
      '.drawer-foot .tm-auth-greet,.drawer-actions .tm-auth-greet{display:block;width:100%;text-align:center;padding:2px 0 8px;font-size:14px}' +
      '@media(max-width:768px){.gnb-actions .tm-auth-greet{display:none}}';
    var st = document.createElement('style');
    st.id = 'tm-auth-style';
    st.textContent = css;
    document.head.appendChild(st);
  }

  function onLogoutClick(e) {
    e.preventDefault();
    Auth.logout();
  }

  function makeGreet(name) {
    var s = document.createElement('span');
    s.className = 'tm-auth-greet';
    s.textContent = name + '님';
    return s;
  }

  function transformActionArea(area, name, isDrawer) {
    if (!area || area.getAttribute('data-tm-auth') === '1') return;
    var loginA = area.querySelector('a[href^="login.html"]');
    var signupA = area.querySelector('a[href^="signup.html"]');
    if (loginA || signupA) {
      if (loginA) {
        loginA.setAttribute('href', 'mypage.html');
        loginA.textContent = '마이페이지';
      }
      if (signupA) {
        signupA.setAttribute('href', '#');
        signupA.textContent = '로그아웃';
        signupA.classList.add('tm-logout-link');
        signupA.addEventListener('click', onLogoutClick);
      } else if (loginA) {
        var lo = document.createElement('a');
        lo.href = '#';
        lo.className = loginA.className;
        lo.textContent = '로그아웃';
        lo.classList.add('tm-logout-link');
        lo.addEventListener('click', onLogoutClick);
        loginA.parentNode.insertBefore(lo, loginA.nextSibling);
      }
      var anchor = loginA || signupA;
      if (isDrawer) area.insertBefore(makeGreet(name), area.firstChild);
      else area.insertBefore(makeGreet(name), anchor);
    } else if (!isDrawer) {
      // 이미 로그인 상태 마크업(내 정보/로그아웃)인 페이지: 사용자명만 추가
      var firstCtrl = area.querySelector('a.btn, button.btn, .btn');
      if (firstCtrl) area.insertBefore(makeGreet(name), firstCtrl);
    }
    area.setAttribute('data-tm-auth', '1');
  }

  function renderAuthArea() {
    if (!Auth.isLoggedIn()) return;
    injectAuthStyle();
    var name = displayName(Auth.user);
    document.querySelectorAll('.gnb-actions').forEach(function (a) {
      transformActionArea(a, name, false);
    });
    document.querySelectorAll('.drawer-foot, .drawer-actions').forEach(function (a) {
      transformActionArea(a, name, true);
    });
  }

  function wireProtectedLinks() {
    document.querySelectorAll('a[href]').forEach(function (a) {
      var href = (a.getAttribute('href') || '').split('?')[0].split('#')[0];
      if (PROTECTED.indexOf(href) === -1) return;
      a.addEventListener('click', function (e) {
        if (Auth.isLoggedIn()) return;
        e.preventDefault();
        location.href = 'login.html?next=' + encodeURIComponent(href);
      });
    });
  }

  function wireLangToggle() {
    var map = { 'KO': 'KO', 'MY': 'MY', 'EN': 'EN', '한국어': 'KO', 'မြန်မာ': 'MY', 'English': 'EN' };
    function setLang(code) {
      try { localStorage.setItem('tm_lang', code); } catch (e) {}
      document.documentElement.setAttribute('data-lang', code.toLowerCase());
      document.querySelectorAll('.lang-toggle button, .drawer-lang button').forEach(function (btn) {
        var t = (btn.textContent || '').trim();
        var c = btn.dataset.lang || map[t] || t;
        btn.classList.toggle('is-active', c === code);
      });
      if (window.TOPIKPageI18n) TOPIKPageI18n.apply(code);
    }
    document.querySelectorAll('.lang-toggle button, .drawer-lang button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var t = (btn.textContent || '').trim();
        setLang(btn.dataset.lang || map[t] || 'KO');
      });
    });
    var saved = localStorage.getItem('tm_lang') || 'KO';
    setLang(saved);
    window.TMI18n = { getLang: function () { return localStorage.getItem('tm_lang') || 'KO'; }, setLang: setLang };
  }

  document.addEventListener('DOMContentLoaded', function () {
    checkGuard();
    renderAuthArea();
    wireProtectedLinks();
    var sc = document.createElement('script');
    sc.src = 'shared/topik-i18n-content.js';
    sc.onload = wireLangToggle;
    document.head.appendChild(sc);
  });
})();
