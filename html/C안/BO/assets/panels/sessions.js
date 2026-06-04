/* ============================================================
   panels/sessions.js — 회차 관리 (vanilla port of sessions.jsx, TPKM_BO_3_1_*)
   ============================================================ */

function regStatusCode(s) {
  return s === 'open' ? 'open' : s === 'closed' ? 'closed' : 'scheduled';
}

function SessionsPanelInner() {
  const state = useStore();
  const [edit, setEdit] = useState(null); // {id} | {copy} | {new:true}
  const [delId, setDelId] = useState(null);

  const sessions = state.sessions.slice().sort((a,b) => (b.examDate || '').localeCompare(a.examDate || ''));

  const save = (data) => {
    const venueIds = (data.venues || []).map(Number).filter(function (n) { return n > 0; });
    const body = {
      round_no: parseInt(data.no, 10),
      title: data.name,
      exam_date: data.examDate,
      registration_start_at: data.applyStart,
      registration_end_at: data.applyEnd,
      result_announcement_date: data.resultDate || null,
      fee_level_i: parseInt(data.feeI, 10),
      fee_level_ii: parseInt(data.feeII, 10),
      capacity: parseInt(data.cap, 10),
      registration_status: regStatusCode(data.status),
      venue_ids: venueIds,
    };
    const run = data.apiId
      ? TopikBoApi.updateExamRound(data.apiId, body)
      : TopikBoApi.createExamRound(body);
    return run.then(res => {
      if (!res.ok) { toastErr(TopikBoApi.parseError(res)); return; }
      return BoData.reload('sessions').then(() => {
        toastOk(data.apiId ? `${data.name} 정보가 수정되었습니다.` : `${data.name} 회차가 등록되었습니다.`);
        setEdit(null);
      });
    });
  };

  // 복제: 백엔드에 복제 API가 없어 → 원본 정보를 채운 '등록' 폼을 연다(검토 후 등록).
  const duplicate = (s) => {
    TopikBoApi.getExamRound(s.apiId).then(res => {
      const r = (res.ok && res.body && res.body.round) ? res.body.round : {};
      const baseNo = (r.round_no || s.no) + 1;
      setEdit({ copy: {
        no: baseNo,
        name: `제${baseNo}회 TOPIK`,
        examDate: (r.exam_date || '').slice(0, 10),
        applyStart: (r.registration_start_at || '').slice(0, 10),
        applyEnd: (r.registration_end_at || '').slice(0, 10),
        resultDate: (r.result_announcement_date || '').slice(0, 10),
        cap: r.capacity != null ? Number(r.capacity) : s.cap,
        feeI: r.fee_level_i != null ? Number(r.fee_level_i) : 0,
        feeII: r.fee_level_ii != null ? Number(r.fee_level_ii) : 0,
        venues: (res.ok && res.body.venue_ids) ? res.body.venue_ids.map(String) : (s.venues || []),
        status: 'planned',
      } });
    });
  };

  // 폐지: 회차 삭제 API가 없어 → is_active=false 로 soft-delete(FO 노출 중단). 접수 정보는 보존.
  const remove = () => {
    const s = state.sessions.find(x => x.id === delId);
    if (!s) return;
    TopikBoApi.updateExamRound(s.apiId, { is_active: false }).then(res => {
      if (!res.ok) { toastErr(TopikBoApi.parseError(res)); return; }
      BoData.reload('sessions').then(() => { setDelId(null); toastOk('회차가 비공개(soft-delete) 처리되었습니다. FO 노출이 중단됩니다.'); });
    });
  };

  return h(Fragment, null,
    h('div', { className: 'panel-head' },
      h('div', null,
        h('h1', null, '회차 관리'),
        h('div', { className: 'sub' }, '시험 회차를 등록·수정·복제합니다. 모든 변경은 처리 이력에 자동 기록됩니다.')
      ),
      h('div', { className: 'actions' },
        h('button', { className: 'btn btn-primary', onClick: () => setEdit({ new: true }) },
          h(I.Plus, { style: { width: 14, height: 14 } }), ' 회차 등록'
        )
      )
    ),

    h('div', { className: 'dg-wrap' },
      h('div', { className: 'dg-scroll' },
        h('table', { className: 'dg' },
          h('thead', null,
            h('tr', null,
              h('th', null, '회차'), h('th', null, '회차명'), h('th', null, '접수기간'), h('th', null, '시험일'), h('th', null, '발표일'),
              h('th', { className: 'num' }, '정원'), h('th', { className: 'num' }, '접수자'), h('th', null, '응시료(Ⅰ/Ⅱ)'), h('th', null, '시험장'), h('th', null, '상태'), h('th', null, '관리')
            )
          ),
          h('tbody', null,
            sessions.map(s => {
              const isOpen = s.status === 'open', isClosed = s.status === 'closed';
              return h('tr', { key: s.id },
                h('td', { className: 'code-id' }, s.no, '회'),
                h('td', null, h('b', null, s.name)),
                h('td', { className: 'code' }, s.applyStart, ' ~ ', s.applyEnd),
                h('td', { className: 'code' }, s.examDate),
                h('td', { className: 'code muted' }, s.resultDate),
                h('td', { className: 'num' }, DataStore.fmtNum(s.cap)),
                h('td', { className: 'num' }, DataStore.fmtNum(s.applicants || 0)),
                h('td', { className: 'code' }, DataStore.fmtNum(s.feeI), '/', DataStore.fmtNum(s.feeII)),
                h('td', null, s.venues.length, '개소'),
                h('td', null, h(Pill, { kind: isOpen ? 'approved' : isClosed ? 'cancel' : 'applied' }, isOpen ? '접수중' : isClosed ? '마감' : '예정')),
                h('td', null,
                  h('div', { className: 'row-actions' },
                    h('button', { className: 'ibtn', onClick: () => setEdit({ id: s.id }) }, h(I.Edit, { style: { width: 12, height: 12 } }), ' 수정'),
                    h('button', { className: 'ibtn', onClick: () => duplicate(s) }, h(I.Copy, { style: { width: 12, height: 12 } }), ' 복제'),
                    h('button', { className: 'ibtn danger', onClick: () => setDelId(s.id) }, h(I.Trash, { style: { width: 12, height: 12 } }))
                  )
                )
              );
            })
          )
        )
      )
    ),

    edit && h(SessionEditLP, { edit: edit, onClose: () => setEdit(null), onSave: save }),
    delId && h(Modal, {
      open: true, onClose: () => setDelId(null), title: '회차 폐지', danger: true,
      footer: h(Fragment, null,
        h('button', { className: 'btn btn-secondary', onClick: () => setDelId(null) }, '취소'),
        h('button', { className: 'btn btn-danger', onClick: remove }, '폐지')
      )
    },
      h('div', null, '회차를 폐지하시겠습니까? ', h('b', null, '접수자 정보는 유지'), '되며 회차는 비공개로 전환됩니다(soft-delete 권장).')
    )
  );
}

function SessionEditLP({ edit, onClose, onSave }) {
  const state = useStore();
  const existing = edit.id ? state.sessions.find(s => s.id === edit.id) : null;
  const blank = {
    no: (state.sessions.length ? Math.max.apply(null, state.sessions.map(s => s.no)) : 0) + 1,
    name: '',
    applyStart: '', applyEnd: '', examDate: '', resultDate: '',
    cap: 1000, feeI: 12000, feeII: 15000, venues: [], status: 'planned'
  };
  const [f, setF] = useState(existing ? { ...existing } : (edit.copy ? Object.assign({}, blank, edit.copy) : blank));

  useEffect(() => { if (!f.name && !existing && !edit.copy) setF(s => ({ ...s, name: `제${s.no}회 TOPIK` })); }, []);

  // 기존 회차 상세(접수기간·응시료·시험장 매핑)는 목록 API에 없어 상세 API에서 로드
  useEffect(() => {
    if (existing && existing.apiId) {
      TopikBoApi.getExamRound(existing.apiId).then(res => {
        if (res.ok && res.body && res.body.round) {
          const r = res.body.round;
          setF(s => ({ ...s,
            no: r.round_no, name: r.title,
            examDate: (r.exam_date || '').slice(0, 10),
            applyStart: (r.registration_start_at || '').slice(0, 10),
            applyEnd: (r.registration_end_at || '').slice(0, 10),
            resultDate: (r.result_announcement_date || '').slice(0, 10),
            cap: r.capacity != null ? Number(r.capacity) : s.cap,
            feeI: r.fee_level_i != null ? Number(r.fee_level_i) : 0,
            feeII: r.fee_level_ii != null ? Number(r.fee_level_ii) : 0,
            status: r.registration_status === 'open' ? 'open' : r.registration_status === 'closed' ? 'closed' : 'planned',
            venues: Array.isArray(res.body.venue_ids) ? res.body.venue_ids.map(String) : (s.venues || []),
          }));
        }
      });
    }
  }, []);

  const set = (k, v) => setF(s => ({ ...s, [k]: v }));
  const toggleVenue = (vid) => set('venues', f.venues.includes(vid) ? f.venues.filter(x => x !== vid) : [...f.venues, vid]);
  const valid = f.name && f.applyStart && f.applyEnd && f.examDate && f.resultDate && f.cap > 0 && f.feeI > 0 && f.feeII > 0 && f.venues.length > 0
    && f.applyStart < f.applyEnd && f.applyEnd < f.examDate && f.examDate < f.resultDate;

  return h(LP, {
    open: true, title: existing ? `회차 수정 — ${existing.name}` : '회차 등록', sub: existing ? `회차 ID ${existing.id}` : '신규 회차',
    onClose: onClose,
    footer: h(Fragment, null,
      h('button', { className: 'btn btn-secondary', onClick: onClose }, '취소'),
      h('button', { className: 'btn btn-primary', disabled: !valid, onClick: () => onSave(f) }, existing ? '저장' : '등록')
    )
  },
    h(FieldSet, { legend: '기본 정보', cols: 2 },
      h(FormRow, { label: '회차 번호', required: true },
        h('input', { type: 'number', className: 'input', value: f.no, onChange: e => set('no', parseInt(e.target.value||'0')) })
      ),
      h(FormRow, { label: '회차명', required: true },
        h('input', { className: 'input', value: f.name, onChange: e => set('name', e.target.value) })
      ),
      h(FormRow, { label: '상태' },
        h('select', { className: 'select', value: f.status, onChange: e => set('status', e.target.value) },
          h('option', { value: 'planned' }, '예정'),
          h('option', { value: 'open' }, '접수중'),
          h('option', { value: 'closed' }, '마감')
        )
      ),
      h(FormRow, { label: '정원', required: true },
        h('input', { type: 'number', className: 'input', value: f.cap, onChange: e => set('cap', parseInt(e.target.value||'0')) })
      )
    ),

    h(FieldSet, { legend: '일정', cols: 2 },
      h(FormRow, { label: '접수 시작일', required: true }, h('input', { type: 'date', className: 'input', value: f.applyStart, onChange: e => set('applyStart', e.target.value) })),
      h(FormRow, { label: '접수 마감일', required: true }, h('input', { type: 'date', className: 'input', value: f.applyEnd, onChange: e => set('applyEnd', e.target.value) })),
      h(FormRow, { label: '시험일', required: true }, h('input', { type: 'date', className: 'input', value: f.examDate, onChange: e => set('examDate', e.target.value) })),
      h(FormRow, { label: '합격발표일', required: true }, h('input', { type: 'date', className: 'input', value: f.resultDate, onChange: e => set('resultDate', e.target.value) }))
    ),

    h(FieldSet, { legend: '응시료(MMK)', cols: 2 },
      h(FormRow, { label: 'TOPIK Ⅰ', required: true }, h('input', { type: 'number', step: '500', className: 'input', value: f.feeI, onChange: e => set('feeI', parseInt(e.target.value||'0')) })),
      h(FormRow, { label: 'TOPIK Ⅱ', required: true }, h('input', { type: 'number', step: '500', className: 'input', value: f.feeII, onChange: e => set('feeII', parseInt(e.target.value||'0')) }))
    ),

    h(FieldSet, { legend: '시험장 다중 선택' },
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 } },
        state.venues.filter(v => v.active).map(v => (
          h('label', { key: v.id, className: 'kv', style: { cursor: 'pointer', flexDirection: 'row', alignItems: 'center', gap: 10, padding: '10px 12px' } },
            h('input', { type: 'checkbox', checked: f.venues.includes(v.id), onChange: () => toggleVenue(v.id) }),
            h('div', null,
              h('div', { className: 'k' }, v.region, ' · 코드 ', v.code),
              h('div', { className: 'v', style: { fontSize: 13, fontWeight: 500 } }, v.nameKo)
            )
          )
        ))
      ),
      h('div', { style: { marginTop: 8, fontSize: 12, color: 'var(--text-3)' } }, '※ 활성 시험장만 선택할 수 있습니다.')
    ),

    !valid && h('div', { style: { padding: 10, background: 'var(--st-photo-bg)', color: 'var(--st-photo)', borderRadius: 6, fontSize: 12.5 } },
      '※ 모든 필수 항목 입력 + 일정 순서(접수시작 < 접수마감 < 시험일 < 발표일) + 시험장 1개 이상 선택이 필요합니다.'
    )
  );
}

function SessionsPanel() {
  return h(ResourceGate, { loader: () => BoData.loadSessionsPanel(), deps: [], inner: SessionsPanelInner });
}

window.SessionsPanel = SessionsPanel;
