/* ============================================================
   panels/audit.js — 관리자 처리 이력 (vanilla port of audit.jsx, TPKM_BO_6_2_*)
   ============================================================ */

const AUDIT_TYPES = ['접수자','사진','회차','시험장','공지','FAQ','환불·정정','문의','회원','약관','관리자계정'];
const AUDIT_ACTIONS_F = ['생성','수정','삭제','승인','반려','수납','수납취소','게시','폐지','정지','탈퇴','비밀번호초기화','로그인','로그아웃','수험번호부여','취소'];

function AuditPanel() {
  const state = useStore();
  const me = state.me;
  const myRole = me?.role || 'super';
  const canSeeAll = myRole === 'super';

  // 일반/조회는 본인 이력만
  const baseLog = useMemo(() => canSeeAll ? state.audit : state.audit.filter(l => l.actor === me?.id), [state.audit, canSeeAll, me]);

  const [actorF, setActorF] = useState('all');
  const [typeF, setTypeF] = useState('all');
  const [actionF, setActionF] = useState('all');
  const [range, setRange] = useState(0); // 0=all, 7, 30
  const [targetQ, setTargetQ] = useState('');
  const [page, setPage] = useState(1);
  const PER = 25;
  const [detailId, setDetailId] = useState(null);

  const filtered = useMemo(() => {
    let r = baseLog.slice();
    if (actorF !== 'all') r = r.filter(l => l.actor === actorF);
    if (typeF !== 'all')  r = r.filter(l => l.type === typeF);
    if (actionF !== 'all') r = r.filter(l => l.action === actionF);
    if (range > 0) {
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - range);
      const cutoffStr = cutoff.toISOString().slice(0, 10);
      r = r.filter(l => l.ts.slice(0, 10) >= cutoffStr);
    }
    if (targetQ) r = r.filter(l => l.targetId && l.targetId.includes(targetQ));
    return r;
  }, [baseLog, actorF, typeF, actionF, range, targetQ]);

  useEffect(() => setPage(1), [actorF, typeF, actionF, range, targetQ]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const rows = filtered.slice((page-1)*PER, page*PER);

  const exportCSV = () => {
    DataStore.addAudit({ type: '관리자계정', targetId: '—', action: '게시', memo: `처리 이력 CSV 내보내기(${filtered.length}건)` });
    toastOk(`${filtered.length}건의 처리 이력 CSV를 생성했습니다.`);
  };

  return h(Fragment, null,
    h('div', { className: 'panel-head' },
      h('div', null,
        h('h1', null, '관리자 처리 이력'),
        h('div', { className: 'sub' }, canSeeAll ? '모든 관리자의 처리 이력을 조회합니다.' : h('span', null, '본인 처리 이력만 조회됩니다 (권한: ', h('b', null, DataStore.roleLabel(myRole)), ')'))
      ),
      h('div', { className: 'actions' },
        h('button', { className: 'btn btn-secondary', disabled: !canSeeAll, onClick: exportCSV },
          h(I.Download, { style: { width: 14, height: 14 } }), ' CSV 내보내기'
        )
      )
    ),

    h('div', { className: 'filterbar' },
      h('div', { className: 'chips' },
        h('button', { className: `chip ${range === 0 ? 'active' : ''}`, onClick: () => setRange(0) }, '전체 기간', h('span', { className: 'cnt' }, baseLog.length)),
        h('button', { className: `chip ${range === 7 ? 'active' : ''}`, onClick: () => setRange(7) }, '최근 7일'),
        h('button', { className: `chip ${range === 30 ? 'active' : ''}`, onClick: () => setRange(30) }, '최근 30일')
      ),
      h('div', { className: 'controls' },
        h('select', { className: 'select', value: actorF, onChange: e => setActorF(e.target.value), disabled: !canSeeAll },
          h('option', { value: 'all' }, '전체 처리자'),
          state.admins.map(a => h('option', { key: a.id, value: a.id }, a.id, ' · ', a.name))
        ),
        h('select', { className: 'select', value: typeF, onChange: e => setTypeF(e.target.value) },
          h('option', { value: 'all' }, '전체 유형'),
          AUDIT_TYPES.map(t => h('option', { key: t }, t))
        ),
        h('select', { className: 'select', value: actionF, onChange: e => setActionF(e.target.value) },
          h('option', { value: 'all' }, '전체 액션'),
          AUDIT_ACTIONS_F.map(a => h('option', { key: a }, a))
        ),
        h('input', { className: 'input search', placeholder: '대상 ID 검색', value: targetQ, onChange: e => setTargetQ(e.target.value) })
      )
    ),

    h('div', { className: 'dg-wrap' },
      h('div', { className: 'dg-scroll' },
        h('table', { className: 'dg' },
          h('thead', null, h('tr', null,
            h('th', null, '시각'), h('th', null, '처리자'), h('th', null, 'IP'), h('th', null, '유형'), h('th', null, '대상 ID'),
            h('th', null, '액션'), h('th', null, '메모'), h('th', null, '상세')
          )),
          h('tbody', null,
            rows.map(l => h('tr', { key: l.id },
              h('td', { className: 'code' }, l.ts),
              h('td', null, h('code', { className: 'code-id' }, l.actor)),
              h('td', { className: 'code muted' }, l.ip),
              h('td', null, l.type),
              h('td', { className: 'code' }, l.targetId),
              h('td', null, h('span', { className: `pill ${l.action === '승인' || l.action === '생성' || l.action === '수납' ? 'pill-approved' : l.action === '반려' || l.action === '삭제' || l.action === '폐지' || l.action === '취소' ? 'pill-rejected' : 'pill-applied'}` }, l.action)),
              h('td', { className: 'muted', style: { maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis' } }, l.memo || '—'),
              h('td', null,
                h('button', { className: 'ibtn ghost', onClick: () => setDetailId(l.id) }, h(I.Eye, { style: { width: 12, height: 12 } }))
              )
            )),
            !rows.length && h('tr', null, h('td', { colSpan: '8' }, h('div', { className: 'empty' }, h('div', { className: 'ttl' }, '조건에 맞는 이력이 없습니다'))))
          )
        )
      ),
      h('div', { className: 'dg-foot' },
        h('div', { className: 'info' }, '총 ', h('b', { style: { color: 'var(--text)', fontFamily: 'Inter' } }, DataStore.fmtNum(filtered.length)), '건'),
        h(Pager, { page: page, total: totalPages, onPage: setPage })
      )
    ),

    detailId && h(AuditDetailLP, { id: detailId, onClose: () => setDetailId(null) })
  );
}

function AuditDetailLP({ id, onClose }) {
  const state = useStore();
  const l = state.audit.find(x => x.id === id);
  if (!l) return null;
  const linkHash = ({
    접수자: 'applicants', 사진: 'photos', 회차: 'sessions', 시험장: 'venues',
    공지: 'notices', FAQ: 'faq', '환불·정정': 'refunds', 문의: 'inquiries',
    회원: 'members', 약관: 'terms', 관리자계정: 'admins',
  })[l.type];
  return h(LP, {
    open: true, size: 'wide', title: `처리 이력 상세 — ${l.action}`, sub: `${l.type} · ${l.targetId}`, onClose: onClose,
    footer: h(Fragment, null,
      linkHash && h('a', { className: 'btn btn-secondary', href: `#${linkHash}`, onClick: onClose }, '관련 화면 바로가기 →'),
      h('button', { className: 'btn btn-primary', onClick: onClose }, '닫기')
    )
  },
    h(FieldSet, { legend: '기본', cols: 2 },
      h(KV, { k: '처리 시각', v: h('code', { className: 'code-id' }, l.ts) }),
      h(KV, { k: '액션', v: h('span', { className: 'pill', style: { background: 'var(--bg-3)' } }, l.action) }),
      h(KV, { k: '처리자', v: h(Fragment, null, h('code', { className: 'code-id' }, l.actor)) }),
      h(KV, { k: 'IP', v: h('code', { className: 'code-id' }, l.ip) }),
      h(KV, { k: '유형', v: l.type }),
      h(KV, { k: '대상 ID', v: h('code', { className: 'code-id' }, l.targetId) }),
      h(KV, { k: '로그 ID', v: h('code', { className: 'code-id' }, l.id) })
    ),

    l.memo && h(FieldSet, { legend: '메모', cols: 1 },
      h('div', { style: { background: 'var(--bg-2)', padding: 10, borderRadius: 6, fontSize: 13, color: 'var(--text-2)' } }, l.memo)
    ),

    (l.before || l.after) && h(FieldSet, { legend: '변경 내용 (Diff)', cols: 1 },
      h('div', { className: 'diff' },
        h('div', null,
          h('div', { className: 'h' }, 'Before'),
          h('pre', { className: 'before' }, l.before ? JSON.stringify(l.before, null, 2) : '— 이전 값 없음')
        ),
        h('div', null,
          h('div', { className: 'h' }, 'After'),
          h('pre', { className: 'after' }, l.after ? JSON.stringify(l.after, null, 2) : '— 이후 값 없음')
        )
      )
    ),

    h('div', { style: { fontSize: 11.5, color: 'var(--text-3)' } },
      '※ 처리 이력은 append-only — 수정/삭제 불가. 최소 3년 보존 권장.'
    )
  );
}

window.AuditPanel = AuditPanel;
