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

  document.addEventListener('DOMContentLoaded', function () {
    checkGuard();
    wireProtectedLinks();
  });
})();
