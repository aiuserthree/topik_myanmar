/* ============================================================
   bo-app.js — Admin shell (sidebar + topbar + router)
   Vanilla port of app.jsx. Redirects target login.html / admin.html.
   ============================================================ */

const NAV = [
  { section: '메인' },
  { id: 'dashboard',   label: '대시보드',       icon: 'Dashboard' },

  { section: '접수' },
  { id: 'applicants',  label: '접수자 목록',     icon: 'Users',  badge: 'unreviewed' },

  { section: '시험 운영' },
  { id: 'sessions',    label: '회차 관리',       icon: 'Calendar' },
  { id: 'venues',      label: '시험장 관리',     icon: 'Pin' },

  { section: '콘텐츠' },
  { id: 'notices',     label: '공지사항',        icon: 'Bell' },
  { id: 'faq',         label: 'FAQ',           icon: 'Help' },
  { id: 'refunds',     label: '환불·정보정정',   icon: 'RefreshCcw', badge: 'refundNew' },
  { id: 'inquiries',   label: '문의 게시판',     icon: 'Mail',   badge: 'inquiryWait' },

  { section: '회원·약관' },
  { id: 'members',     label: '회원 관리',       icon: 'Users' },
  { id: 'terms',       label: '약관 관리',       icon: 'FileText' },

  { section: '시스템' },
  { id: 'admins',      label: '관리자 계정',     icon: 'ShieldCheck' },
  { id: 'permissions', label: '관리자 권한',     icon: 'Lock' },
  { id: 'audit',       label: '처리 이력',       icon: 'History' },
];

const PANEL_TITLE = Object.fromEntries(NAV.filter(n => n.id).map(n => [n.id, n.label]));
const CRUMB = {
  dashboard:  ['메인', '대시보드'],
  applicants: ['접수 관리', '접수자 목록'],
  sessions:   ['시험 관리', '회차 관리'],
  venues:     ['시험 관리', '시험장 관리'],
  notices:    ['콘텐츠 관리', '공지사항'],
  faq:        ['콘텐츠 관리', 'FAQ'],
  refunds:    ['콘텐츠 관리', '환불·정보정정'],
  inquiries:  ['콘텐츠 관리', '문의 게시판'],
  members:    ['회원·약관 관리', '회원 관리'],
  terms:      ['회원·약관 관리', '약관 관리'],
  admins:     ['시스템', '관리자 계정 관리'],
  permissions:['시스템', '관리자 권한 관리'],
  audit:      ['시스템', '처리 이력'],
};

// '사진 심사' 메뉴는 제거됨 — 접수자 상세에서 처리. 옛 해시는 접수자 목록으로 보냄.
const normalizeRoute = (r) => (r === 'photos' ? 'applicants' : r);

function App() {
  // hash-based router (?#applicants)
  const initial = () => normalizeRoute(location.hash.replace('#', '') || 'dashboard');
  const [route, setRoute] = useState(initial);
  const [sbOpen, setSbOpen] = useState(false);
  const state = useStore();

  // Boot: real auth check + load admin identity into store
  useEffect(() => {
    const api = window.TopikBoApi;
    const next = encodeURIComponent('admin.html' + (location.hash || ''));
    if (!api || !api.getAccessToken()) {
      location.replace('login.html?next=' + next);
      return;
    }
    // Global 401 handler: cleared token → bounce to login (refresh already tried in client)
    api.onUnauthorized = () => { location.replace('login.html?next=' + next); };

    // Admin identity from sessionStorage (set by TopikBoApi.login on the login page)
    let admin = null;
    try { admin = JSON.parse(sessionStorage.getItem('bo_admin') || 'null'); } catch (e) { admin = null; }
    const roleNorm = { super: 'super', standard: 'general', manager: 'general', general: 'general', readonly: 'viewer', viewer: 'viewer' };
    const roleKey = admin && admin.roleKey;
    const me = {
      id: admin ? (admin.email || admin.id || 'admin') : 'admin',
      email: admin ? (admin.email || '') : '',
      name: admin ? (admin.name || '관리자') : '관리자',
      role: roleNorm[roleKey] || 'super',
      roleKey: roleKey || 'super',
    };
    DataStore.state.me = me;
    DataStore.notify();
    try { sessionStorage.setItem('tpkm_bo_admin', JSON.stringify({ role: me.role, name: me.name })); } catch (e) {}
    if (window.TOPIKBoCore) TOPIKBoCore.startSessionHeartbeat(me.id, me.name);
  }, []);

  // Sidebar badges (환불·정보정정 / 문의) need refunds/inquiries in store before panels open.
  useEffect(() => {
    if (!window.TopikBoApi || !TopikBoApi.getAccessToken() || !window.BoData) return;
    Promise.all([
      BoData.loadRefunds().catch(() => null),
      BoData.loadInquiries().catch(() => null),
    ]);
  }, []);

  useEffect(() => {
    const fn = () => {
      const raw = location.hash.replace('#', '') || 'dashboard';
      // 사진 심사 메뉴 제거 — 옛 해시(#photos)는 접수자 목록으로 리다이렉트
      if (raw === 'photos') { location.replace('#applicants'); return; }
      setRoute(raw);
    };
    window.addEventListener('hashchange', fn);
    // 최초 진입 시 #photos 해시 보정
    if (location.hash.replace('#', '') === 'photos') location.replace('#applicants');
    return () => window.removeEventListener('hashchange', fn);
  }, []);

  useEffect(() => { setSbOpen(false); window.scrollTo(0, 0); }, [route]);

  const navigate = useCallback((id) => { location.hash = id; }, []);
  const logout = useCallback(() => {
    if (!confirm('로그아웃 하시겠습니까?')) return;
    if (window.TopikBoApi) TopikBoApi.logout();
    sessionStorage.removeItem('bo_session');
    location.replace('login.html');
  }, [state.me]);

  const badges = DataStore.badges();
  const me = state.me;

  // session switcher (header)
  const activeSession = state.sessions.find(s => s.id === state.activeSessionId);

  // pick panel
  const PanelByRoute = {
    dashboard:  window.DashboardPanel,
    applicants: window.ApplicantsPanel,
    sessions:   window.SessionsPanel,
    venues:     window.VenuesPanel,
    notices:    window.NoticesPanel,
    faq:        window.FaqPanel,
    refunds:    window.RefundsPanel,
    inquiries:  window.InquiriesPanel,
    members:    window.MembersPanel,
    terms:      window.TermsPanel,
    admins:     window.AdminsPanel,
    permissions:window.PermissionsPanel,
    audit:      window.AuditPanel,
  };
  const Panel = PanelByRoute[route] || PanelByRoute.dashboard;

  return h(Fragment, null,
    h('div', { className: 'app' },
      // Sidebar
      h('aside', { className: `sb ${sbOpen ? 'open' : ''}` },
        h('div', { className: 'sb-brand' },
          h('div', { className: 'mark' }, 'T'),
          h('div', { className: 'name' }, 'TOPIK Myanmar', h('small', null, 'ADMIN CONSOLE'))
        ),
        h('nav', { className: 'sb-nav' },
          NAV.map((item, idx) => item.section
            ? h('div', { className: 'sb-section-title', key: 's' + idx }, item.section)
            : h('button', { key: item.id, className: `sb-link ${route === item.id ? 'active' : ''}`, onClick: () => navigate(item.id) },
                h(I[item.icon] || I.Dashboard, { className: 'ico' }),
                h('span', { className: 'label' }, item.label),
                item.badge && badges[item.badge] > 0 && h('span', { className: 'badge-count' }, badges[item.badge])
              )
          )
        ),
        h('div', { className: 'sb-foot' },
          h('div', { className: 'sb-user' },
            h('div', { className: 'avatar' }, me?.name?.slice(0, 1) || 'A'),
            h('div', { className: 'meta' },
              h('div', { className: 'nm' }, me?.name || '관리자'),
              h('div', { className: 'rl' }, DataStore.roleLabel(me?.role || 'super'), ' · ', me?.id)
            )
          ),
          h('button', { className: 'sb-logout', onClick: logout },
            h(I.LogOut, { style: { width: 14, height: 14 } }), ' 로그아웃'
          )
        )
      ),
      h('div', { className: `sb-backdrop ${sbOpen ? 'open' : ''}`, onClick: () => setSbOpen(false) }),

      // Topbar
      h('header', { className: 'tb' },
        h('button', { className: 'ham', onClick: () => setSbOpen(s => !s) }, h(I.Menu)),
        h('div', null,
          h('div', { className: 'tb-crumb' },
            (CRUMB[route] || []).map((c, i, arr) => h(Fragment, { key: c + i },
              h('span', null, c),
              i < arr.length - 1 && h('span', { className: 'sep' }, '›')
            ))
          ),
          h('div', { className: 'tb-title' }, PANEL_TITLE[route] || '대시보드')
        ),
        h('div', { className: 'tb-spacer' }),
        h('div', { className: 'tb-actions' },
          // Session switcher — context for applicant/exam panels
          ['dashboard', 'applicants'].includes(route) && h('select', {
            className: 'select',
            style: { height: 36, fontSize: 13, minWidth: 200 },
            value: state.activeSessionId,
            onChange: e => DataStore.setSession(e.target.value)
          },
            state.sessions.filter(s => s.active !== false).map(s => h('option', { key: s.id, value: s.id },
              s.name, ' (', s.status === 'open' ? '진행중' : s.status === 'planned' ? '예정' : '종료', ')'
            ))
          ),
          h('a', { className: 'tb-iconbtn', href: 'https://topik-myanmar.vercel.app/', target: '_blank', rel: 'noopener', title: '사이트 보기(새 창)' },
            h(I.ExternalLink)
          ),
          h('div', { className: 'tb-user', title: me?.id },
            h('div', { className: 'avatar' }, me?.name?.slice(0, 1) || 'A'),
            h('div', { className: 'meta' },
              h('div', { className: 'nm' }, me?.name || '관리자'),
              h('div', { className: 'rl' }, DataStore.roleLabel(me?.role || 'super'))
            )
          )
        )
      ),

      // Main
      h('main', { className: 'mn', key: route },
        Panel ? h(Panel) : h('div', { className: 'empty' }, h('div', { className: 'ttl' }, '패널 로드 중…'))
      )
    ),

    h(ToastHost)
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(h(App));
