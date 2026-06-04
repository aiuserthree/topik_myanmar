/* ============================================================
   panels/admins.js — 관리자 계정 관리 (vanilla port of admins.jsx)
   - 계정 목록 · 등록 · 수정 · 비밀번호 초기화 · 비활성/해제
   - 권한 매트릭스(TPKM_BO_6_5)는 별도 메뉴(panels/permissions.jsx)
   ============================================================ */

function AdminsPanelInner() {
  const state = useStore();
  const myRole = state.me?.role || 'super';
  const canManage = myRole === 'super';

  return h(Fragment, null,
    h('div', { className: 'panel-head' },
      h('div', null,
        h('h1', null, '관리자 계정 관리'),
        h('div', { className: 'sub' }, '여러 명이 별도 아이디로 동시 접속 · 최고관리자만 관리 · 모든 변경은 처리 이력에 기록됩니다.')
      )
    ),

    !canManage && h('div', { style: { padding: 14, background: 'var(--st-photo-bg)', color: 'var(--st-photo)', borderRadius: 8, marginBottom: 14, fontSize: 13 } },
      'ⓘ 최고관리자(super)만 계정을 관리할 수 있습니다. 현재 권한: ', h('b', null, DataStore.roleLabel(myRole)), ' (조회 전용)'
    ),

    h(AdminAccounts, { canManage: canManage })
  );
}

function AdminAccounts({ canManage }) {
  const state = useStore();
  const [edit, setEdit] = useState(null);
  const [resetId, setResetId] = useState(null);
  const [toggleId, setToggleId] = useState(null);

  const list = state.admins.slice().sort((a,b) => a.id.localeCompare(b.id));

  const save = (data) => {
    if (data._isNew) {
      TopikBoApi.createAdminUser({
        name: data.name, email: data.email, password: data.pw, role: data.role,
      }).then(res => {
        if (!res.ok) { toastErr(TopikBoApi.parseError(res)); return; }
        BoData.reload('admins').then(() => {
          setEdit(null);
          toastOk('관리자 계정이 등록되었습니다. 초기 비밀번호로 로그인 후 변경하세요.');
        });
      });
    } else {
      const a = state.admins.find(x => x.id === data.id);
      if (!a) { toastErr('계정을 찾을 수 없습니다.'); return; }
      TopikBoApi.updateAdminUser(a.apiId, {
        name: data.name, email: data.email, role: data.role,
      }).then(res => {
        if (!res.ok) { toastErr(TopikBoApi.parseError(res)); return; }
        BoData.reload('admins').then(() => {
          setEdit(null);
          toastOk('관리자 계정이 수정되었습니다.');
        });
      });
    }
  };

  const doReset = () => {
    const a = state.admins.find(x => x.id === resetId);
    if (!a) { setResetId(null); return; }
    TopikBoApi.resetAdminPassword(a.apiId).then(res => {
      setResetId(null);
      if (!res.ok) { toastErr(TopikBoApi.parseError(res)); return; }
      const temp = res.body && res.body.temporary_password;
      if (temp) toast(`임시 비밀번호 ${temp} · 이메일 전송 완료`, { type: 'success', title: '비밀번호 초기화', duration: 6000 });
      else toast('임시 비밀번호를 이메일로 전송했습니다.', { type: 'success', title: '비밀번호 초기화', duration: 5000 });
    });
  };

  const doToggle = () => {
    const a = state.admins.find(x => x.id === toggleId);
    if (!a) { setToggleId(null); return; }
    if (a.id === state.me?.id) { toastErr('본인 계정은 비활성화할 수 없습니다.'); setToggleId(null); return; }
    const next = a.status !== 'active';
    TopikBoApi.updateAdminUser(a.apiId, { is_active: next }).then(res => {
      setToggleId(null);
      if (!res.ok) { toastErr(TopikBoApi.parseError(res)); return; }
      BoData.reload('admins').then(() =>
        toastOk(`계정이 ${next ? '활성화' : '비활성화'}되었습니다. 활성 세션은 즉시 무효화됩니다.`)
      );
    });
  };

  return h(Fragment, null,
    h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginBottom: 12 } },
      h('button', { className: 'btn btn-primary', disabled: !canManage, onClick: () => setEdit({ _isNew: true }) },
        h(I.Plus, { style: { width: 14, height: 14 } }), ' 관리자 등록'
      )
    ),
    h('div', { className: 'dg-wrap' },
      h('div', { className: 'dg-scroll' },
        h('table', { className: 'dg' },
          h('thead', null, h('tr', null,
            h('th', null, '아이디'), h('th', null, '이름'), h('th', null, '이메일'), h('th', null, '권한 등급'),
            h('th', null, '마지막 로그인'), h('th', null, '마지막 IP'), h('th', null, '상태'), h('th', null, '비고'), h('th', null, '관리')
          )),
          h('tbody', null,
            list.map(a => h('tr', { key: a.id },
              h('td', null, h('code', { className: 'code-id' }, a.id)),
              h('td', null, h('b', null, a.name)),
              h('td', { className: 'muted' }, a.email),
              h('td', null, h('span', { className: `tag role-${a.role}` }, DataStore.roleLabel(a.role))),
              h('td', { className: 'code muted' }, a.lastLogin),
              h('td', { className: 'code muted' }, a.lastIp),
              h('td', null, h(Pill, { kind: a.status === 'active' ? 'active' : 'inactive' }, a.status === 'active' ? '활성' : '비활성')),
              h('td', { className: 'muted', style: { maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' } }, a.note || '—'),
              h('td', null,
                h('div', { className: 'row-actions' },
                  h('button', { className: 'ibtn', disabled: !canManage, onClick: () => setEdit({ id: a.id }) }, h(I.Edit, { style: { width: 12, height: 12 } })),
                  h('button', { className: 'ibtn', disabled: !canManage, onClick: () => setResetId(a.id) }, 'PW 초기화'),
                  h('button', { className: 'ibtn danger', disabled: !canManage || a.id === state.me?.id, onClick: () => setToggleId(a.id) },
                    a.status === 'active' ? '비활성' : '활성화'
                  )
                )
              )
            ))
          )
        )
      )
    ),

    edit && h(AdminEditLP, { edit: edit, onClose: () => setEdit(null), onSave: save }),
    resetId && h(Modal, {
      open: true, onClose: () => setResetId(null), title: '비밀번호 초기화',
      footer: h(Fragment, null,
        h('button', { className: 'btn btn-secondary', onClick: () => setResetId(null) }, '취소'),
        h('button', { className: 'btn btn-primary', onClick: doReset }, '임시 비밀번호 발급')
      )
    },
      h('div', null, '해당 관리자의 임시 비밀번호를 발급하고 이메일로 전송합니다. 첫 로그인 시 변경이 강제됩니다.')
    ),
    toggleId && (() => {
      const a = state.admins.find(x => x.id === toggleId);
      return h(ConfirmModal, {
        open: true, title: `계정 ${a.status === 'active' ? '비활성화' : '활성화'} — ${a.name}`,
        danger: a.status === 'active',
        confirmText: a.status === 'active' ? '비활성화' : '활성화',
        message: '사유를 입력하세요. 활성 세션은 즉시 무효화됩니다.',
        onClose: () => setToggleId(null),
        needReason: true,
        reasonOptions: ['휴직/퇴직', '보안 사유', '직무 변경', '기타'],
        onConfirm: doToggle
      });
    })()
  );
}

function AdminEditLP({ edit, onClose, onSave }) {
  const state = useStore();
  const a0 = edit.id ? state.admins.find(x => x.id === edit.id) : null;
  const [f, setF] = useState(a0 ? { ...a0, _isNew: false } : {
    id: '', name: '', email: '', role: 'general', note: '', pw: '',
    _isNew: true,
  });
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));
  // 로그인 식별자는 이메일. (별도 아이디 컬럼 없음 — 백엔드는 이메일 기준)
  const valid = f.name && /^.+@.+\..+$/.test(f.email) && (!f._isNew || (f.pw && f.pw.length >= 8));
  return h(LP, {
    open: true, size: 'sm', title: a0 ? `계정 수정 — ${a0.name}` : '관리자 계정 등록', onClose: onClose,
    footer: h(Fragment, null,
      h('button', { className: 'btn btn-secondary', onClick: onClose }, '취소'),
      h('button', { className: 'btn btn-primary', disabled: !valid, onClick: () => onSave(f) }, a0 ? '저장' : '등록')
    )
  },
    h(FieldSet, { legend: '계정', cols: 2 },
      a0 && h(FormRow, { label: '아이디(로그인)', hint: '로그인은 이메일로 합니다' },
        h('input', { className: 'input', value: a0.id, disabled: true })
      ),
      h(FormRow, { label: '이름', required: true },
        h('input', { className: 'input', value: f.name, onChange: e => set('name', e.target.value) })
      ),
      h(FormRow, { label: '이메일', required: true, span: 2 },
        h('input', { className: 'input', value: f.email, onChange: e => set('email', e.target.value), placeholder: 'user@embassy.kr' })
      ),
      h(FormRow, { label: '권한 등급', required: true },
        h('select', { className: 'select', value: f.role, onChange: e => set('role', e.target.value) },
          h('option', { value: 'super' }, '최고관리자 — 전체'),
          h('option', { value: 'general' }, '일반관리자 — 접수·콘텐츠'),
          h('option', { value: 'viewer' }, '조회관리자 — 읽기 전용')
        )
      ),
      f._isNew && h(FormRow, { label: '초기 비밀번호', required: true, hint: '8자 이상 영문+숫자 · 첫 로그인 시 변경 강제' },
        h('input', { className: 'input', type: 'password', value: f.pw, onChange: e => set('pw', e.target.value), minLength: 8 })
      ),
      h(FormRow, { label: '비고', span: 2 },
        h('input', { className: 'input', value: f.note || '', onChange: e => set('note', e.target.value), placeholder: '예) 콘텐츠 편집 담당' })
      )
    )
  );
}

// 데이터 로딩 게이트 — API에서 관리자 계정 목록을 받아온 뒤 내부 패널을 렌더
function AdminsPanel() {
  return h(ResourceGate, { loader: () => BoData.loadAdmins(), deps: [], inner: AdminsPanelInner });
}

window.AdminsPanel = AdminsPanel;
