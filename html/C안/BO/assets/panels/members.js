/* ============================================================
   panels/members.js — 회원 관리 (vanilla port of members.jsx)
   - 필터/검색, 그리드, 상세 LP, 정보 수정 LP, 정지/탈퇴 모달, 비밀번호 초기화, CSV
   - 고객사 수정 0526: 탈퇴 시 진행 중 접수 자동 취소 안내
   ============================================================ */

function MembersPanelInner() {
  const state = useStore();
  const [stF, setStF] = useState('all');
  const [natF, setNatF] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const PER = 12;

  const [detailId, setDetailId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [suspendId, setSuspendId] = useState(null);
  const [withdrawId, setWithdrawId] = useState(null);
  const [resetId, setResetId] = useState(null);

  const nationalities = useMemo(() => Array.from(new Set(state.members.map(m => m.nation))), [state.members]);

  const filtered = useMemo(() => {
    let r = state.members.slice();
    if (stF !== 'all')  r = r.filter(m => m.status === stF);
    if (natF !== 'all') r = r.filter(m => m.nation === natF);
    if (q) {
      const qq = q.toLowerCase();
      r = r.filter(m => m.nameKo.includes(q) || m.nameEn.toLowerCase().includes(qq) || m.email.toLowerCase().includes(qq) || m.tel.includes(q));
    }
    return r.sort((a,b) => b.joinedAt.localeCompare(a.joinedAt));
  }, [state.members, stF, natF, q]);

  useEffect(() => setPage(1), [stF, natF, q]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const pageRows = filtered.slice((page-1)*PER, page*PER);

  const counts = useMemo(() => ({
    all: state.members.length,
    active: state.members.filter(m => m.status === 'active').length,
    inactive: state.members.filter(m => m.status === 'inactive').length,
    withdrawn: state.members.filter(m => m.status === 'withdrawn').length,
  }), [state.members]);

  const exportCSV = () => {
    toastOk(`${filtered.length}건의 회원 CSV가 생성되었습니다.`);
  };

  return h(Fragment, null,
    h('div', { className: 'panel-head' },
      h('div', null,
        h('h1', null, '회원 관리'),
        h('div', { className: 'sub' }, 'FO 회원가입(STEP1~3) 회원 데이터 · 정보정정 신청은 본 패널에서 직접 반영')
      ),
      h('div', { className: 'actions' },
        h('button', { className: 'btn btn-secondary', onClick: exportCSV }, h(I.Download, { style: { width: 14, height: 14 } }), ' CSV 다운로드')
      )
    ),

    h('div', { className: 'filterbar' },
      h('div', { className: 'chips' },
        h('button', { className: `chip ${stF === 'all' ? 'active' : ''}`, onClick: () => setStF('all') }, '전체', h('span', { className: 'cnt' }, counts.all)),
        h('button', { className: `chip ${stF === 'active' ? 'active' : ''}`, onClick: () => setStF('active') }, '활성', h('span', { className: 'cnt' }, counts.active)),
        h('button', { className: `chip ${stF === 'inactive' ? 'active' : ''}`, onClick: () => setStF('inactive') }, '정지', h('span', { className: 'cnt' }, counts.inactive)),
        h('button', { className: `chip ${stF === 'withdrawn' ? 'active' : ''}`, onClick: () => setStF('withdrawn') }, '탈퇴', h('span', { className: 'cnt' }, counts.withdrawn))
      ),
      h('div', { className: 'controls' },
        h('select', { className: 'select', value: natF, onChange: e => setNatF(e.target.value) },
          h('option', { value: 'all' }, '전체 국적'),
          nationalities.map(n => h('option', { key: n }, n))
        ),
        h('input', { className: 'input search', placeholder: '이름·이메일·연락처 검색', value: q, onChange: e => setQ(e.target.value) })
      )
    ),

    h('div', { className: 'dg-wrap' },
      h('div', { className: 'dg-scroll' },
        h('table', { className: 'dg' },
          h('thead', null, h('tr', null,
            h('th', { className: 'num' }, '번호'), h('th', null, '한글성명'), h('th', null, '영문성명'), h('th', null, '이메일'),
            h('th', null, '연락처'), h('th', null, '국적'), h('th', null, '가입일'), h('th', null, '마지막 로그인'), h('th', null, '상태'), h('th', null, '관리')
          )),
          h('tbody', null,
            pageRows.map(m => h('tr', { key: m.id },
              h('td', { className: 'num' }, m.no),
              h('td', null, h('a', { style: { color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }, onClick: () => setDetailId(m.id) }, m.nameKo)),
              h('td', null, m.nameEn),
              h('td', { className: 'muted' }, m.email),
              h('td', { className: 'code muted' }, m.tel),
              h('td', null, m.nation),
              h('td', { className: 'code muted' }, m.joinedAt),
              h('td', { className: 'code muted' }, m.lastLogin),
              h('td', null,
                h(Pill, { kind: m.status === 'active' ? 'active' : m.status === 'inactive' ? 'pay' : 'cancel' },
                  m.status === 'active' ? '활성' : m.status === 'inactive' ? '정지' : '탈퇴'
                )
              ),
              h('td', null,
                h('div', { className: 'row-actions' },
                  h('button', { className: 'ibtn ghost', onClick: () => setDetailId(m.id) }, h(I.Eye, { style: { width: 12, height: 12 } })),
                  h('button', { className: 'ibtn', onClick: () => setEditId(m.id), disabled: m.status === 'withdrawn' }, '수정'),
                  h('button', { className: 'ibtn', onClick: () => setResetId(m.id), disabled: m.status === 'withdrawn' }, 'PW'),
                  m.status === 'active' && h('button', { className: 'ibtn danger', onClick: () => setSuspendId(m.id) }, '정지'),
                  m.status === 'inactive' && h('button', { className: 'ibtn', onClick: () => {
                    TopikBoApi.updateMember(m.apiId, { status: 'active' }).then(res => {
                      if (!res.ok) { toastErr(TopikBoApi.parseError(res)); return; }
                      BoData.reload('members').then(() => toastOk('정지가 해제되었습니다.'));
                    });
                  } }, '해제'),
                  m.status !== 'withdrawn' && h('button', { className: 'ibtn danger', onClick: () => setWithdrawId(m.id) }, '탈퇴')
                )
              )
            ))
          )
        )
      ),
      h('div', { className: 'dg-foot' },
        h('div', { className: 'info' }, '총 ', h('b', { style: { color: 'var(--text)', fontFamily: 'Inter' } }, DataStore.fmtNum(filtered.length)), '건'),
        h(Pager, { page: page, total: totalPages, onPage: setPage })
      )
    ),

    detailId && h(MemberDetailLP, { id: detailId, onClose: () => setDetailId(null), onEdit: () => { setEditId(detailId); setDetailId(null); } }),
    editId && h(MemberEditLP, { id: editId, onClose: () => setEditId(null) }),
    suspendId && h(SuspendModal, { id: suspendId, onClose: () => setSuspendId(null) }),
    withdrawId && h(WithdrawModal, { id: withdrawId, onClose: () => setWithdrawId(null) }),
    resetId && h(PwResetLP, { id: resetId, onClose: () => setResetId(null) })
  );
}

function MemberDetailLP({ id, onClose, onEdit }) {
  const state = useStore();
  const m = state.members.find(x => x.id === id);
  if (!m) return null;
  const myApplies = state.applicants.filter(a => a.email === m.email);
  const log = state.audit.filter(l => l.targetId === id);
  return h(LP, {
    open: true, size: 'wide', title: `회원 상세 — ${m.nameKo}`, sub: `회원ID ${m.id}`, onClose: onClose,
    footer: h(Fragment, null,
      h('button', { className: 'btn btn-secondary', onClick: onClose }, '닫기'),
      h('button', { className: 'btn btn-primary', onClick: onEdit }, '정보 수정')
    )
  },
    h(FieldSet, { legend: '프로필', cols: 2 },
      h(KV, { k: '한글 성명', v: m.nameKo }),
      h(KV, { k: '영문 성명', v: m.nameEn }),
      h(KV, { k: '이메일', v: m.email }),
      h(KV, { k: '연락처', v: h('span', { className: 'code-id' }, m.tel) }),
      h(KV, { k: '국적', v: m.nation }),
      h(KV, { k: '가입일', v: h('span', { className: 'code-id' }, m.joinedAt) }),
      h(KV, { k: '마지막 로그인', v: h('span', { className: 'code-id' }, m.lastLogin) }),
      h(KV, { k: '상태', v: h(Pill, { kind: m.status === 'active' ? 'active' : m.status === 'inactive' ? 'pay' : 'cancel' }, m.status === 'active' ? '활성' : m.status === 'inactive' ? '정지' : '탈퇴') }),
      h(KV, { k: '마케팅 수신', v: m.marketing ? '동의' : '미동의' }),
      m.reason && h(KV, { k: '사유', v: m.reason })
    ),

    h(FieldSet, { legend: `접수 이력 (${myApplies.length})`, cols: 1 },
      myApplies.length === 0 ? h('div', { className: 'empty', style: { padding: '20px 0' } }, '접수 이력 없음') : (
        h('table', { className: 'dg', style: { fontSize: 12.5 } },
          h('thead', null, h('tr', null, h('th', null, '회차'), h('th', null, '급수'), h('th', null, '시험장'), h('th', null, '상태'), h('th', null, '수험번호'))),
          h('tbody', null,
            myApplies.map(a => {
              const s = state.sessions.find(s => s.id === a.sessionId);
              return h('tr', { key: a.id },
                h('td', null, s?.name),
                h('td', null, a.level),
                h('td', null, DataStore.venueName(a.venueId)),
                h('td', null, h(Pill, { kind: a.status }, DataStore.statusLabel(a.status))),
                h('td', { className: 'code' }, a.exam || '—')
              );
            })
          )
        )
      )
    ),

    h(FieldSet, { legend: `관리자 처리 이력 (${log.length})`, cols: 1 },
      h('div', { className: 'timeline' },
        log.length === 0 && h('div', { className: 'empty', style: { padding: '20px 0' } }, '이력 없음'),
        log.map(l => h('div', { key: l.id, className: 'ev' },
          h('div', { className: 'when' }, l.ts),
          h('div', { className: 'what' }, l.type, ' · ', h('b', null, l.action)),
          h('div', { className: 'who' }, '처리자 ', h('code', { className: 'code-id' }, l.actor)),
          l.memo && h('div', { className: 'note' }, l.memo)
        ))
      )
    )
  );
}

function MemberEditLP({ id, onClose }) {
  const state = useStore();
  const m = state.members.find(x => x.id === id);
  const [f, setF] = useState({ ...m });
  const [reason, setReason] = useState('');
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));
  const save = () => {
    if (!reason.trim()) { toastErr('수정 사유를 입력해주세요.'); return; }
    const payload = {
      name_ko: f.nameKo, name_en: f.nameEn, phone: f.tel,
      nationality: f.nation, marketing_opt_in: !!f.marketing, notify_member: true,
    };
    TopikBoApi.updateMember(m.apiId, payload).then(res => {
      if (!res.ok) { toastErr(TopikBoApi.parseError(res)); return; }
      BoData.reload('members').then(() => {
        toastOk('회원 정보가 수정되었습니다. 회원에게 이메일 통지가 발송됩니다.');
        onClose();
      });
    });
  };
  return h(LP, {
    open: true, title: `회원 정보 수정 — ${m.nameKo}`, sub: '신원 식별 정보 직접 수정 · 사유 필수 · 처리 이력 자동 기록', onClose: onClose,
    footer: h(Fragment, null,
      h('button', { className: 'btn btn-secondary', onClick: onClose }, '취소'),
      h('button', { className: 'btn btn-primary', onClick: save, disabled: !reason.trim() }, '저장')
    )
  },
    h(FieldSet, { legend: '신원 정보', cols: 2 },
      h(FormRow, { label: '한글 성명' }, h('input', { className: 'input', value: f.nameKo, onChange: e => set('nameKo', e.target.value) })),
      h(FormRow, { label: '영문 성명' }, h('input', { className: 'input', value: f.nameEn, onChange: e => set('nameEn', e.target.value) })),
      h(FormRow, { label: '이메일' }, h('input', { className: 'input', value: f.email, onChange: e => set('email', e.target.value) })),
      h(FormRow, { label: '연락처' }, h('input', { className: 'input', value: f.tel, onChange: e => set('tel', e.target.value) })),
      h(FormRow, { label: '국적' }, h('input', { className: 'input', value: f.nation, onChange: e => set('nation', e.target.value) })),
      h(FormRow, { label: '마케팅 수신' },
        h('div', { className: 'seg' },
          h('button', { className: f.marketing ? 'active' : '', onClick: () => set('marketing', true), type: 'button' }, '동의'),
          h('button', { className: !f.marketing ? 'active' : '', onClick: () => set('marketing', false), type: 'button' }, '미동의')
        )
      )
    ),
    h(FieldSet, { legend: '수정 사유', cols: 1 },
      h(FormRow, { label: '사유', required: true, hint: '이력 추적용 · 회원에게 노출되지 않음' },
        h('textarea', { className: 'textarea', rows: '3', value: reason, onChange: e => setReason(e.target.value), placeholder: '예) 정보정정 신청 처리 — 생년월일 정정' })
      )
    )
  );
}

function SuspendModal({ id, onClose }) {
  const state = useStore();
  const m = state.members.find(x => x.id === id);
  const [reason, setReason] = useState('이용 약관 위반');
  const [other, setOther] = useState('');
  const final = reason === '기타' ? other : reason;
  const submit = () => {
    if (!final.trim()) { toastErr('사유를 입력해주세요.'); return; }
    TopikBoApi.updateMember(m.apiId, { status: 'suspended', notify_member: false }).then(res => {
      if (!res.ok) { toastErr(TopikBoApi.parseError(res)); return; }
      BoData.reload('members').then(() => {
        toastOk('회원이 정지되었습니다. 활성 세션은 즉시 무효화됩니다.');
        onClose();
      });
    });
  };
  return h(Modal, {
    open: true, onClose: onClose, title: `회원 정지 — ${m.nameKo}`, danger: true,
    footer: h(Fragment, null,
      h('button', { className: 'btn btn-secondary', onClick: onClose }, '취소'),
      h('button', { className: 'btn btn-danger', onClick: submit }, '정지')
    )
  },
    h(FormRow, { label: '정지 사유', required: true },
      h('select', { className: 'select', value: reason, onChange: e => setReason(e.target.value) },
        ['이용 약관 위반','반복적인 부정 행위','장기 미접속','보안 위협','기타'].map(r => h('option', { key: r }, r))
      )
    ),
    reason === '기타' && h(FormRow, { label: '상세 사유', required: true },
      h('textarea', { className: 'textarea', rows: '2', value: other, onChange: e => setOther(e.target.value) })
    )
  );
}

function WithdrawModal({ id, onClose }) {
  const state = useStore();
  const m = state.members.find(x => x.id === id);
  const [reason, setReason] = useState('본인 요청');
  const myApplies = state.applicants.filter(a => a.email === m.email && !['cancel','rejected'].includes(a.status));
  const submit = () => {
    if (!reason.trim()) { toastErr('사유를 입력해주세요.'); return; }
    TopikBoApi.updateMember(m.apiId, { status: 'withdrawn', notify_member: false }).then(res => {
      if (!res.ok) { toastErr(TopikBoApi.parseError(res)); return; }
      BoData.reload('members').then(() => {
        toastOk('회원이 탈퇴 처리되었습니다.');
        onClose();
      });
    });
  };
  return h(Modal, {
    open: true, onClose: onClose, title: `회원 탈퇴 — ${m.nameKo}`, danger: true,
    footer: h(Fragment, null,
      h('button', { className: 'btn btn-secondary', onClick: onClose }, '취소'),
      h('button', { className: 'btn btn-danger', onClick: submit }, '탈퇴 처리')
    )
  },
    h('div', { style: { fontSize: 13, color: 'var(--text-2)', marginBottom: 12 } },
      '탈퇴 처리 시 ', h('b', null, '현재 진행 중인 접수 내역이 모두 취소'), '됩니다.'
    ),
    myApplies.length > 0 && h('div', { style: { marginBottom: 12, padding: 10, background: 'var(--st-photo-bg)', color: 'var(--st-photo)', borderRadius: 6, fontSize: 12.5 } },
      '⚠ 진행 중인 접수 ', h('b', null, myApplies.length), '건이 자동 취소됩니다:',
      h('ul', { style: { marginTop: 6, paddingLeft: 16 } },
        myApplies.map(a => {
          const s = state.sessions.find(x => x.id === a.sessionId);
          return h('li', { key: a.id }, s?.name, ' · TOPIK ', a.level, ' · ', DataStore.statusLabel(a.status));
        })
      )
    ),
    h(FormRow, { label: '탈퇴 사유', required: true },
      h('select', { className: 'select', value: reason, onChange: e => setReason(e.target.value) },
        ['본인 요청','장기 미접속','관리자 처리','기타'].map(r => h('option', { key: r }, r))
      )
    )
  );
}

function PwResetLP({ id, onClose }) {
  const state = useStore();
  const m = state.members.find(x => x.id === id);
  const [issued, setIssued] = useState(false);
  const [tempPw, setTempPw] = useState('');
  const issue = () => {
    TopikBoApi.resetMemberPassword(m.apiId).then(res => {
      if (!res.ok) { toastErr(TopikBoApi.parseError(res)); return; }
      setTempPw((res.body && res.body.temporary_password) || '');
      setIssued(true);
      toastOk('임시 비밀번호가 이메일로 전송되었습니다.');
    });
  };
  return h(LP, {
    open: true, size: 'sm', title: `비밀번호 초기화 — ${m.nameKo}`, sub: m.email, onClose: onClose,
    footer: h(Fragment, null,
      h('button', { className: 'btn btn-secondary', onClick: onClose }, '닫기'),
      !issued && h('button', { className: 'btn btn-primary', onClick: issue }, '임시 비밀번호 발급')
    )
  },
    h('div', { style: { fontSize: 13, color: 'var(--text-2)', marginBottom: 12 } },
      '임시 비밀번호는 회원 이메일로 발송됩니다. 다음 로그인 시 변경이 강제됩니다.'
    ),
    issued && tempPw && h('div', { className: 'kv', style: { background: 'var(--st-approved-bg)', borderColor: '#c8e5cd' } },
      h('span', { className: 'k' }, '발급된 임시 비밀번호 (1회 노출)'),
      h('span', { className: 'v', style: { fontFamily: 'Inter, monospace', color: 'var(--success)', letterSpacing: '0.04em' } }, tempPw)
    ),
    issued && !tempPw && h('div', { className: 'kv', style: { background: 'var(--st-approved-bg)', borderColor: '#c8e5cd' } },
      h('span', { className: 'k' }, '발급 완료'),
      h('span', { className: 'v' }, '임시 비밀번호가 회원 이메일로 발송되었습니다.')
    )
  );
}

// 데이터 로딩 게이트 — API에서 회원 목록을 받아온 뒤 내부 패널을 렌더
function MembersPanel() {
  return h(ResourceGate, { loader: () => BoData.loadMembers(), deps: [], inner: MembersPanelInner });
}

window.MembersPanel = MembersPanel;
