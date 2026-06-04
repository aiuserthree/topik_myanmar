/* ============================================================
   panels/terms.js — 약관 관리 (vanilla port of terms.jsx)
   ============================================================ */

const TERM_KINDS = ['이용약관','개인정보','마케팅'];

function TermsPanelInner() {
  const state = useStore();
  const [kindF, setKindF] = useState('all');
  const [edit, setEdit] = useState(null);
  const [preview, setPreview] = useState(null);
  const [publish, setPublish] = useState(null);
  const [retire, setRetire] = useState(null);
  const [consent, setConsent] = useState(false);

  const filtered = useMemo(() => {
    let r = state.terms.slice();
    if (kindF !== 'all') r = r.filter(t => t.kind === kindF);
    return r.sort((a,b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
  }, [state.terms, kindF]);

  const save = (data) => {
    if (data.apiId) {
      const t = state.terms.find(x => x.id === data.id);
      if (t && t.status !== 'draft') { toastErr('게시된 약관은 수정할 수 없습니다. 신규 버전을 등록해주세요.'); return; }
      const payload = { version: (data.version || '').trim(), body_ko: (data.body || '').trim() };
      if (data.scheduledAt) payload.effective_at = data.scheduledAt;
      return TopikBoApi.updateTerm(data.apiId, payload).then(res => {
        if (!res.ok) { toastErr(TopikBoApi.parseError(res)); return; }
        return BoData.reload('terms').then(() => { toastOk('약관 초안이 수정되었습니다.'); setEdit(null); });
      });
    }
    const payload = {
      term_type: BoData.TERM_L2C[data.kind] || 'service',
      version: (data.version || '').trim(),
      body_ko: (data.body || '').trim(),
    };
    if (data.scheduledAt) payload.effective_at = data.scheduledAt;
    return TopikBoApi.createTerm(payload).then(res => {
      if (!res.ok) { toastErr(TopikBoApi.parseError(res)); return; }
      return BoData.reload('terms').then(() => { toastOk('약관 초안이 등록되었습니다.'); setEdit(null); });
    });
  };

  const doPublish = () => {
    const t = state.terms.find(x => x.id === publish);
    if (!t) return;
    // 백엔드가 같은 종류의 기존 게시본을 자동으로 retired 처리함
    return TopikBoApi.publishTerm(t.apiId).then(res => {
      if (!res.ok) { toastErr(TopikBoApi.parseError(res)); return; }
      return BoData.reload('terms').then(() => { setPublish(null); toastOk(`${t.kind} ${t.version}가 게시되었습니다.`); });
    });
  };

  // 게시본 수동 폐지 API는 없음 — 같은 종류의 새 버전 게시 시 자동 폐지된다는 안내만 제공.
  const doRetire = () => {
    setRetire(null);
    toast('게시본은 직접 폐지할 수 없습니다. 같은 종류의 새 버전을 게시하면 기존 게시본이 자동으로 폐지(retired) 처리됩니다.', { title: '약관 폐지 안내', type: 'success', duration: 6000 });
  };

  return h(Fragment, null,
    h('div', { className: 'panel-head' },
      h('div', null,
        h('h1', null, '약관 관리'),
        h('div', { className: 'sub' }, '이용약관 / 개인정보 / 마케팅 · 버전 보존 + 동의 이력 영구 보관')
      ),
      h('div', { className: 'actions' },
        h('button', { className: 'btn btn-secondary', onClick: () => setConsent(true) }, h(I.History, { style: { width: 14, height: 14 } }), ' 동의 이력'),
        h('button', { className: 'btn btn-primary', onClick: () => setEdit({ new: true }) }, h(I.Plus, { style: { width: 14, height: 14 } }), ' 약관 등록')
      )
    ),

    h('div', { className: 'filterbar' },
      h('div', { className: 'chips' },
        h('button', { className: `chip ${kindF === 'all' ? 'active' : ''}`, onClick: () => setKindF('all') }, '전체', h('span', { className: 'cnt' }, state.terms.length)),
        TERM_KINDS.map(k => (
          h('button', { key: k, className: `chip ${kindF === k ? 'active' : ''}`, onClick: () => setKindF(k) }, k, h('span', { className: 'cnt' }, state.terms.filter(t => t.kind === k).length))
        ))
      )
    ),

    h('div', { className: 'dg-wrap' },
      h('div', { className: 'dg-scroll' },
        h('table', { className: 'dg' },
          h('thead', null, h('tr', null,
            h('th', null, '약관 종류'), h('th', null, '버전'), h('th', null, '게시일'), h('th', null, '폐지일'), h('th', null, '상태'), h('th', null, '작성자'), h('th', null, '관리')
          )),
          h('tbody', null,
            filtered.map(t => (
              h('tr', { key: t.id },
                h('td', null, h('span', { className: 'pill', style: { background: 'var(--bg-3)' } }, t.kind)),
                h('td', { className: 'code' }, h('b', null, t.version)),
                h('td', { className: 'code muted' }, t.publishedAt || '—'),
                h('td', { className: 'code muted' }, t.retiredAt || '—'),
                h('td', null, h(Pill, { kind: t.status === 'pub' ? 'pub' : t.status === 'draft' ? 'draft' : 'retired' }, t.status === 'pub' ? '게시' : t.status === 'draft' ? '초안' : '폐지')),
                h('td', { className: 'muted' }, t.author),
                h('td', null,
                  h('div', { className: 'row-actions' },
                    h('button', { className: 'ibtn', onClick: () => setPreview(t.id) }, h(I.Eye, { style: { width: 12, height: 12 } }), ' 미리보기'),
                    t.status === 'draft' && h('button', { className: 'ibtn', onClick: () => setEdit({ id: t.id }) }, h(I.Edit, { style: { width: 12, height: 12 } })),
                    t.status === 'draft' && h('button', { className: 'ibtn primary', onClick: () => setPublish(t.id) }, '게시'),
                    t.status === 'pub' && h('button', { className: 'ibtn danger', onClick: () => setRetire(t.id) }, '폐지')
                  )
                )
              )
            ))
          )
        )
      )
    ),

    edit && h(TermEditLP, { edit: edit, onClose: () => setEdit(null), onSave: save }),
    preview && h(TermPreviewLP, { id: preview, onClose: () => setPreview(null) }),
    publish && (
      h(Modal, { open: true, onClose: () => setPublish(null), title: '약관 게시',
        footer: h(Fragment, null,
          h('button', { className: 'btn btn-secondary', onClick: () => setPublish(null) }, '취소'),
          h('button', { className: 'btn btn-primary', onClick: doPublish }, '게시')
        )
      },
        h('div', null, '약관을 즉시 게시하시겠습니까? 동일 종류의 기존 게시 버전은 자동 폐지되고 회원에게는 다음 로그인 시 재동의가 요청됩니다.')
      )
    ),
    retire && (
      h(Modal, { open: true, onClose: () => setRetire(null), title: '약관 폐지 안내',
        footer: h(Fragment, null,
          h('button', { className: 'btn btn-secondary', onClick: () => setRetire(null) }, '닫기'),
          h('button', { className: 'btn btn-primary', onClick: doRetire }, '확인')
        )
      },
        h('div', null, '게시된 약관은 직접 폐지할 수 없습니다. 같은 종류의 ', h('b', null, '새 버전을 게시'), '하면 기존 게시본이 자동으로 폐지(retired)됩니다. 버전과 동의 이력은 영구 보존됩니다.')
      )
    ),
    consent && h(ConsentLogLP, { onClose: () => setConsent(false) })
  );
}

function TermEditLP({ edit, onClose, onSave }) {
  const state = useStore();
  const t0 = edit.id ? state.terms.find(x => x.id === edit.id) : null;
  const [f, setF] = useState(t0 ? { ...t0 } : { kind: '이용약관', version: 'v1.0', body: '', scheduledAt: '' });
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));
  // 기존 약관 본문(body_ko)은 상세 API에서 로드
  useEffect(() => {
    if (t0 && t0.apiId) {
      TopikBoApi.getTerm(t0.apiId).then(res => {
        if (res.ok && res.body) setF(s => ({ ...s, body: res.body.body_ko || '' }));
      });
    }
  }, []);
  const valid = f.kind && f.version && true;
  return h(LP, { open: true, title: t0 ? `약관 수정 — ${t0.kind} ${t0.version}` : '약관 등록', sub: '게시 전에만 본문 수정 가능 · 게시 후에는 신규 버전 등록', onClose: onClose,
    footer: h(Fragment, null,
      h('button', { className: 'btn btn-secondary', onClick: onClose }, '취소'),
      h('button', { className: 'btn btn-primary', disabled: !valid, onClick: () => onSave(f) }, t0 ? '저장' : '등록')
    )
  },
    h(FieldSet, { legend: '기본', cols: 2 },
      h(FormRow, { label: '약관 종류', required: true },
        h('select', { className: 'select', value: f.kind, onChange: e => set('kind', e.target.value) },
          TERM_KINDS.map(k => h('option', { key: k }, k))
        )
      ),
      h(FormRow, { label: '버전 (시맨틱)', required: true, hint: '예: v2.0, v2.1' },
        h('input', { className: 'input', value: f.version, onChange: e => set('version', e.target.value) })
      ),
      h(FormRow, { label: '게시 예정일' },
        h('input', { type: 'date', className: 'input', value: f.scheduledAt || '', onChange: e => set('scheduledAt', e.target.value) })
      )
    ),
    h(FieldSet, { legend: '본문 (KO 필수 · MY/EN 선택 — 데모는 KO만)', cols: 1 },
      h(FormRow, { label: '본문(KO)', required: true },
        h('textarea', { className: 'textarea', rows: '14', value: f.body || '', onChange: e => set('body', e.target.value), placeholder: '제1조 (목적) ...' })
      )
    )
  );
}

function TermPreviewLP({ id, onClose }) {
  const state = useStore();
  const t = state.terms.find(x => x.id === id);
  const [body, setBody] = useState(t ? t.body : '');
  useEffect(() => {
    if (t && t.apiId) {
      TopikBoApi.getTerm(t.apiId).then(res => {
        if (res.ok && res.body) setBody(res.body.body_ko || '');
      });
    }
  }, []);
  if (!t) return null;
  return h(LP, { open: true, title: `미리보기 — ${t.kind} ${t.version}`, sub: 'FO 표시 형태로 렌더링', onClose: onClose,
    footer: h('button', { className: 'btn btn-secondary', onClick: onClose }, '닫기')
  },
    h('article', { style: { background: 'var(--bg)', padding: 20, borderRadius: 8, border: '1px solid var(--border)' } },
      h('h2', { style: { fontSize: 20, marginBottom: 8 } }, t.kind, ' (', t.version, ')'),
      h('div', { style: { fontSize: 12, color: 'var(--text-3)', marginBottom: 16 } }, '게시일: ', t.publishedAt || '미게시'),
      h('pre', { style: { whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7 } }, body || '— 본문 미입력 —')
    )
  );
}

function ConsentLogLP({ onClose }) {
  const state = useStore();
  const [memberF, setMemberF] = useState('all');
  const [kindF, setKindF] = useState('all');
  const filtered = useMemo(() => {
    let r = state.consents.slice();
    if (memberF !== 'all') r = r.filter(c => c.memberId === memberF);
    if (kindF !== 'all')   r = r.filter(c => c.termsKind === kindF);
    return r.sort((a,b) => b.ts.localeCompare(a.ts));
  }, [state.consents, memberF, kindF]);

  const exportCSV = () => {
    DataStore.addAudit({ type: '약관', targetId: '—', action: '게시', memo: `약관 동의 이력 CSV 내보내기(${filtered.length}건) — 감사 자료` });
    toastOk('동의 이력 CSV를 생성했습니다.');
  };

  return h(LP, { open: true, size: 'wide', title: '약관 동의 이력', sub: '회원·버전별 동의 시점/IP/방식 (감사 자료)', onClose: onClose,
    footer: h(Fragment, null,
      h('button', { className: 'btn btn-secondary', onClick: onClose }, '닫기'),
      h('button', { className: 'btn btn-primary', onClick: exportCSV }, h(I.Download, { style: { width: 12, height: 12 } }), ' CSV 내보내기')
    )
  },
    h(DemoNote, { message: '약관 동의 이력 조회 API가 아직 없어 샘플 데이터로 표시됩니다.' }),
    h('div', { className: 'filterbar' },
      h('div', { className: 'controls' },
        h('select', { className: 'select', value: memberF, onChange: e => setMemberF(e.target.value), style: { minWidth: 180 } },
          h('option', { value: 'all' }, '전체 회원'),
          state.members.slice(0, 20).map(m => h('option', { key: m.id, value: m.id }, m.id, ' · ', m.nameKo))
        ),
        h('select', { className: 'select', value: kindF, onChange: e => setKindF(e.target.value) },
          h('option', { value: 'all' }, '전체 약관'),
          TERM_KINDS.map(k => h('option', { key: k }, k))
        )
      )
    ),
    h('div', { className: 'dg-wrap', style: { marginTop: 12 } },
      h('div', { className: 'dg-scroll' },
        h('table', { className: 'dg' },
          h('thead', null, h('tr', null, h('th', null, '시각'), h('th', null, '회원ID'), h('th', null, '약관'), h('th', null, '버전'), h('th', null, 'IP'), h('th', null, '방식'))),
          h('tbody', null,
            filtered.map(c => (
              h('tr', { key: c.id },
                h('td', { className: 'code' }, c.ts),
                h('td', null, h('code', { className: 'code-id' }, c.memberId)),
                h('td', null, c.termsKind),
                h('td', { className: 'code' }, c.version),
                h('td', { className: 'code muted' }, c.ip),
                h('td', null, h('span', { className: 'tag' }, c.method))
              )
            ))
          )
        )
      )
    )
  );
}

function TermsPanel() {
  return h(ResourceGate, { loader: () => BoData.loadTerms(), deps: [], inner: TermsPanelInner });
}

window.TermsPanel = TermsPanel;
