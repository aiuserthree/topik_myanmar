/**
 * 관리자 세션 (정적 전용). 운영 환경에서는 반드시 서버 인증으로 교체하세요.
 * 기본 관리자 비밀번호는 배포 전 반드시 변경하세요.
 *  - 기본 계정(admin)은 ADMIN_USER / ADMIN_PASSWORD 로 검증.
 *  - 추가 계정은 '관리자 계정 관리'(topik_mm_admin_users_v1)의 활성 계정 + 비밀번호로 검증.
 *  - 5회 연속 실패 시 30분 잠금(아이디 단위, localStorage).
 */
(function (global) {
  var SESSION_KEY = 'tm_admin_session_v1';
  var SESSION_MS = 8 * 60 * 60 * 1000;
  var LOCK_KEY = 'tm_admin_login_lock_v1';
  var ADMIN_USERS_KEY = 'topik_mm_admin_users_v1';
  var MAX_FAIL = 5;
  var LOCK_MS = 30 * 60 * 1000;

  var ADMIN_USER = 'admin';
  var ADMIN_PASSWORD = 'topik2026';
  var ADMIN_ROLE = 'super';

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
    if (!s.user) return false;
    if (Date.now() - s.at > SESSION_MS) {
      try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
      return false;
    }
    return true;
  }

  function setSession(user, role) {
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ user: user || ADMIN_USER, role: role || ADMIN_ROLE, at: Date.now() })
      );
    } catch (e) {}
  }

  function timingSafeEq(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    if (a.length !== b.length) return false;
    var out = 0;
    for (var i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return out === 0;
  }

  function loadLock() {
    try { return JSON.parse(localStorage.getItem(LOCK_KEY) || '{}'); } catch (e) { return {}; }
  }
  function saveLock(m) {
    try { localStorage.setItem(LOCK_KEY, JSON.stringify(m)); } catch (e) {}
  }
  function lockState(user) {
    var m = loadLock();
    var row = m[user];
    if (!row) return { locked: false, fails: 0, until: 0 };
    if (row.until && Date.now() < row.until) {
      return { locked: true, fails: row.fails || MAX_FAIL, until: row.until };
    }
    if (row.until && Date.now() >= row.until) {
      delete m[user];
      saveLock(m);
      return { locked: false, fails: 0, until: 0 };
    }
    return { locked: false, fails: row.fails || 0, until: 0 };
  }
  function recordFail(user) {
    var m = loadLock();
    var row = m[user] || { fails: 0, until: 0 };
    row.fails = (row.fails || 0) + 1;
    if (row.fails >= MAX_FAIL) row.until = Date.now() + LOCK_MS;
    m[user] = row;
    saveLock(m);
    return row;
  }
  function clearFail(user) {
    var m = loadLock();
    if (m[user]) { delete m[user]; saveLock(m); }
  }

  /** 관리자 계정 관리 스토어에서 활성 계정 + 비밀번호 검증 */
  function matchStoreAccount(user, pass) {
    var list;
    try { list = JSON.parse(localStorage.getItem(ADMIN_USERS_KEY) || 'null'); } catch (e) { list = null; }
    if (!Array.isArray(list)) return null;
    for (var i = 0; i < list.length; i++) {
      var a = list[i];
      if (!a || a.status !== 'active') continue;
      if (String(a.username || '').toLowerCase() !== String(user || '').toLowerCase()) continue;
      /* 비밀번호가 등록된 계정만 로그인 허용. (시드 계정은 비밀번호 없음 → 기본 admin 으로만 로그인) */
      if (a.password && a.password === pass) return a;
    }
    return null;
  }

  /**
   * 로그인. 결과 객체 반환: {ok, role, locked, until, fails, remain}
   */
  function login(user, pass) {
    var u = typeof user === 'string' ? user.trim() : '';
    var p = typeof pass === 'string' ? pass : '';
    var lk = lockState(u || ADMIN_USER);
    if (lk.locked) return { ok: false, locked: true, until: lk.until };

    var ok = false, role = ADMIN_ROLE;
    if (timingSafeEq(u, ADMIN_USER) && timingSafeEq(p, ADMIN_PASSWORD)) {
      ok = true; role = ADMIN_ROLE;
    } else {
      var acct = matchStoreAccount(u, p);
      if (acct) { ok = true; role = acct.role || 'normal'; }
    }

    if (ok) {
      clearFail(u);
      setSession(u, role);
      return { ok: true, role: role };
    }
    var row = recordFail(u || ADMIN_USER);
    if (row.until && Date.now() < row.until) {
      return { ok: false, locked: true, until: row.until };
    }
    return { ok: false, locked: false, fails: row.fails, remain: Math.max(0, MAX_FAIL - row.fails) };
  }

  /** 테스트·로컬용: 계정 입력 없이 관리자 세션만 설정 */
  function loginTest() {
    setSession(ADMIN_USER, ADMIN_ROLE);
    return true;
  }

  function logout() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch (e) {}
    global.location.href = 'admin-login.html';
  }

  function currentUser() {
    var s = getSession();
    return s && s.user ? s.user : ADMIN_USER;
  }
  function currentRole() {
    var s = getSession();
    var role = s && s.role ? s.role : ADMIN_ROLE;
    return { super: '최고관리자', normal: '일반관리자', readonly: '조회관리자' }[role] || role;
  }
  function currentRoleKey() {
    var s = getSession();
    return (s && s.role) || ADMIN_ROLE;
  }

  global.AdminAuth = {
    isSessionValid: isSessionValid,
    login: login,
    loginTest: loginTest,
    logout: logout,
    currentUser: currentUser,
    currentRole: currentRole,
    currentRoleKey: currentRoleKey,
    lockState: lockState,
  };
})(window);
