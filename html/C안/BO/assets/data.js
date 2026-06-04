// ============================================================
// TOPIK Myanmar — BO client-side store
// Pure plain JS — exposes window.DataStore (no React deps here)
//
// Record collections (sessions/applicants/notices/refunds/inquiries/
// audit/members/admins/terms/...) start EMPTY and are populated only by
// the live admin API via the loaders in bo-api-data.js. No sample/demo
// data is seeded here — panels show real API data or empty/error states.
// Only the permission model (sections/actions/recommended defaults) is
// static configuration.
// ============================================================

(function () {
  function pad(n, w) { return String(n).padStart(w, '0'); }

  // ============================================================
  // Reactive store — listeners pattern (no framework deps)
  // ============================================================
  const listeners = new Set();
  function notify() { listeners.forEach(fn => { try { fn(); } catch(e){} }); }

  // ---- 권한 액션 모델 (편집형 권한 매트릭스) ----
  const PERM_ACTIONS = {
    view: '조회', create: '등록', edit: '수정', delete: '삭제',
    photo: '사진심사', pay: '수납', approve: '승인', reject: '반려', exam: '수험번호부여',
    answer: '답변', publish: '게시·폐지', suspend: '정지·탈퇴', reset: '비번초기화',
    deactivate: '비활성', export: '내보내기', viewAll: '전체이력', viewOwn: '본인이력',
  };
  const PERM_SECTIONS = [
    { id: 'dash', title: '대시보드', menus: [
      { id: 'dashboard', label: '대시보드', actions: ['view'] },
    ]},
    { id: 'apply', title: '접수 관리', menus: [
      { id: 'applicants', label: '접수자 목록', actions: ['view','photo','pay','approve','reject','exam','export'] },
    ]},
    { id: 'exam', title: '시험 관리', menus: [
      { id: 'sessions', label: '회차 관리', actions: ['view','create','edit','delete'] },
      { id: 'venues', label: '시험장 관리', actions: ['view','create','edit','delete'] },
    ]},
    { id: 'content', title: '콘텐츠 관리', menus: [
      { id: 'notices', label: '공지사항', actions: ['view','create','edit','delete'] },
      { id: 'faq', label: 'FAQ', actions: ['view','create','edit','delete'] },
      { id: 'refunds', label: '환불·정보정정', actions: ['view','answer','delete'] },
      { id: 'inquiries', label: '문의 게시판', actions: ['view','answer','delete'] },
    ]},
    { id: 'member', title: '회원·약관', menus: [
      { id: 'members', label: '회원 관리', actions: ['view','edit','suspend','reset'] },
      { id: 'terms', label: '약관 관리', actions: ['view','create','publish'] },
    ]},
    { id: 'system', title: '시스템', menus: [
      { id: 'admins', label: '관리자 계정', actions: ['view','create','edit','reset','deactivate'] },
      { id: 'permissions', label: '관리자 권한', actions: ['view','edit'] },
      { id: 'audit', label: '처리 이력', actions: ['viewAll','viewOwn','export'] },
    ]},
  ];
  // 권장 기본값 (role별)
  function recommendedPerms(role) {
    const out = {};
    PERM_SECTIONS.forEach(sec => sec.menus.forEach(m => {
      if (role === 'super') {
        out[m.id] = m.actions.slice();              // 모든 액션 허용
      } else if (role === 'general') {
        // 운영 액션
        const map = {
          dashboard: ['view'],
          applicants: ['view','photo','pay','approve','reject'],   // 수험번호 일괄부여·내보내기 제외(슈퍼 전용)
          sessions: ['view'], venues: ['view'],
          notices: ['view','create','edit','delete'],
          faq: ['view','create','edit','delete'],
          refunds: ['view','answer','delete'],
          inquiries: ['view','answer','delete'],
          members: ['view'], terms: ['view'],
          admins: [], permissions: [],
          audit: ['viewOwn'],
        };
        out[m.id] = (map[m.id] || []).filter(a => m.actions.includes(a));
      } else { // viewer — read-only
        const ro = m.actions.filter(a => a === 'view' || a === 'viewOwn');
        out[m.id] = ro;
      }
    }));
    return out;
  }

  const PERMS = {
    super: recommendedPerms('super'),
    general: recommendedPerms('general'),
    viewer: recommendedPerms('viewer'),
  };

  const state = {
    sessions: [],
    venues: [],
    regions: [],
    applicants: [],
    members: [],
    notices: [],
    faqs: [],
    refunds: [],
    inquiries: [],
    terms: [],
    admins: [],
    perms: PERMS,
    audit: [],
    consents: [],
    activeSessionId: null, // 현재 회차 — 라운드 로드 후 설정
    me: null, // 로그인 사용자 - set on boot
  };

  function addAudit(entry) {
    const e = {
      id: 'log' + pad(state.audit.length + 1, 4),
      ts: new Date().toISOString().replace('T',' ').slice(0,19),
      actor: state.me?.id || '',
      ip: state.me?.ip || '—',
      ...entry,
    };
    state.audit.unshift(e);
  }

  function setSession(sessionId) {
    state.activeSessionId = sessionId;
    notify();
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  // counts for sidebar badges
  function badges() {
    const s = state.activeSessionId;
    const apps = state.applicants.filter(a => a.sessionId === s);
    return {
      unreviewed: apps.filter(a => a.status === 'applied').length,
      photoWait: apps.filter(a => a.photoStatus === 'pending' && a.status !== 'cancel').length,
      refundNew: state.refunds.filter(r => r.status === '접수' || r.status === '검토중').length,
      inquiryWait: state.inquiries.filter(q => q.status === 'wait').length,
    };
  }

  // ---- Format helpers (Korean text mostly) ----
  function fmtNum(n) { return new Intl.NumberFormat('ko-KR').format(n); }
  function fmtCurrency(n) { return fmtNum(n) + ' MMK'; }
  function statusLabel(s) {
    return ({
      applied: '접수완료', photo: '사진심사중', pay: '수납대기',
      approved: '승인완료', rejected: '반려', cancel: '취소',
      refund: '환불자',
    })[s] || s;
  }
  function levelLabel(l) { return l; }
  function roleLabel(r) {
    return ({ super: '최고관리자', general: '일반관리자', viewer: '조회관리자' })[r] || r;
  }
  function venueName(id) {
    const v = state.venues.find(x => x.id === id);
    return v ? v.nameKo : '—';
  }

  function getAdminSession() {
    try { return JSON.parse(sessionStorage.getItem('tpkm_bo_admin') || 'null'); } catch (e) { return null; }
  }

  window.DataStore = {
    state, subscribe, notify, addAudit, setSession, getAdminSession,
    badges, fmtNum, fmtCurrency, statusLabel, levelLabel, roleLabel, venueName, pad,
    permSections: PERM_SECTIONS, permActions: PERM_ACTIONS, recommendedPerms,
  };
})();
