/**
 * 관리자 세션 (정적 전용). 운영 환경에서는 반드시 서버 인증으로 교체하세요.
 * 비밀번호는 이 파일의 ADMIN_USER / ADMIN_PASSWORD 를 배포 전 변경하세요.
 */
(function (global) {
  var SESSION_KEY = 'tm_admin_session_v1';
  var SESSION_MS = 8 * 60 * 60 * 1000;

  var ADMIN_USER = 'admin';
  var ADMIN_PASSWORD = 'topik2025';

  function getSession() {
    try {
      var raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function isSessionValid() {
    var s = getSession();
    if (!s || typeof s.at !== 'number') return false;
    if (s.user !== ADMIN_USER) return false;
    if (Date.now() - s.at > SESSION_MS) {
      sessionStorage.removeItem(SESSION_KEY);
      return false;
    }
    return true;
  }

  function timingSafeEq(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    if (a.length !== b.length) return false;
    var out = 0;
    for (var i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return out === 0;
  }

  function login(user, pass) {
    var u = typeof user === 'string' ? user.trim() : '';
    var p = typeof pass === 'string' ? pass : '';
    if (!timingSafeEq(u, ADMIN_USER)) return false;
    if (!timingSafeEq(p, ADMIN_PASSWORD)) return false;
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ user: ADMIN_USER, at: Date.now() })
    );
    return true;
  }

  /** 테스트·로컬용: 계정 입력 없이 관리자 세션만 설정 */
  function loginTest() {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ user: ADMIN_USER, at: Date.now() })
    );
    return true;
  }

  function logout() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch (e) {}
    global.location.href = 'admin-login.html';
  }

  global.AdminAuth = {
    isSessionValid: isSessionValid,
    login: login,
    loginTest: loginTest,
    logout: logout,
  };
})(window);
