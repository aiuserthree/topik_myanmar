/* ============================================================
   panels/venues.js — 시험장 관리 (vanilla port of venues.jsx)
   고객사 수정 0526: 좌석배치도/책임자/연락처 입력 항목 없음 (비고에 자유 기재)
   ============================================================ */

function VenuesPanel() {
  const state = useStore();
  const [edit, setEdit] = useState(null);

  const list = state.venues.slice().sort((a,b) => a.regionCode.localeCompare(b.regionCode) || a.code.localeCompare(b.code));

  const save = (data) => {
    if (data.id) {
      const v = state.venues.find(x => x.id === data.id);
      const before = { ...v };
      Object.assign(v, data);
      DataStore.addAudit({ type: '시험장', targetId: v.id, action: '수정', before, after: { ...v }, memo: '' });
      toastOk(`${v.nameKo} 정보가 수정되었습니다.`);
    } else {
      // 코드 중복 검사 (동일 지역 내)
      if (state.venues.some(v => v.regionCode === data.regionCode && v.code === data.code)) {
        toastErr('동일 지역 내 시험장 코드가 중복됩니다.'); return false;
      }
      const id = 'v' + (Math.max(...state.venues.map(x => parseInt(x.id.slice(1)))) + 1).toString().padStart(2, '0');
      const nw = { id, active: true, ...data };
      state.venues.push(nw);
      DataStore.addAudit({ type: '시험장', targetId: id, action: '생성', after: { ...nw }, memo: '' });
      toastOk(`${nw.nameKo}가 등록되었습니다.`);
    }
    DataStore.notify();
    setEdit(null);
  };

  const toggleActive = (v) => {
    const before = { active: v.active };
    v.active = !v.active;
    DataStore.addAudit({ type: '시험장', targetId: v.id, action: '수정', before, after: { active: v.active }, memo: v.active ? '활성화' : '비활성화' });
    DataStore.notify();
    toastOk(`시험장이 ${v.active ? '활성화' : '비활성화'}되었습니다.`);
  };

  return h(Fragment, null,
    h('div', { className: 'panel-head' },
      h('div', null,
        h('h1', null, '시험장 관리'),
        h('div', { className: 'sub' }, '국가코드 025(미얀마) · 지역코드 + 시험장코드(2자리)는 13자리 수험번호 생성에 사용됩니다.')
      ),
      h('div', { className: 'actions' },
        h('button', { className: 'btn btn-primary', onClick: () => setEdit({ new: true }) }, h(I.Plus, { style: { width: 14, height: 14 } }), ' 시험장 등록')
      )
    ),

    h('div', { className: 'dg-wrap' },
      h('div', { className: 'dg-scroll' },
        h('table', { className: 'dg' },
          h('thead', null,
            h('tr', null,
              h('th', null, '코드'), h('th', null, '지역'), h('th', null, '한글 명칭'), h('th', null, '영문 명칭'), h('th', null, '주소'), h('th', { className: 'num' }, '정원'), h('th', null, '상태'), h('th', null, '비고'), h('th', null, '관리')
            )
          ),
          h('tbody', null,
            list.map(v => h('tr', { key: v.id },
              h('td', { className: 'code' }, h('b', null, '025·', v.regionCode, '·', v.code)),
              h('td', null, v.region),
              h('td', null, h('b', null, v.nameKo)),
              h('td', { className: 'muted' }, v.nameEn),
              h('td', { className: 'muted', style: { maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' } }, v.address),
              h('td', { className: 'num' }, DataStore.fmtNum(v.cap)),
              h('td', null,
                h(Pill, { kind: v.active ? 'active' : 'inactive' }, v.active ? '활성' : '비활성')
              ),
              h('td', { className: 'muted', style: { maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, v.memo || '—'),
              h('td', null,
                h('div', { className: 'row-actions' },
                  h('button', { className: 'ibtn', onClick: () => setEdit({ id: v.id }) }, h(I.Edit, { style: { width: 12, height: 12 } }), ' 수정'),
                  h('button', { className: 'ibtn', onClick: () => toggleActive(v) }, v.active ? '비활성' : '활성')
                )
              )
            ))
          )
        )
      )
    ),

    edit && h(VenueEditLP, { edit: edit, onClose: () => setEdit(null), onSave: save })
  );
}

function VenueEditLP({ edit, onClose, onSave }) {
  const state = useStore();
  const v = edit.id ? state.venues.find(x => x.id === edit.id) : null;
  const [f, setF] = useState(v ? { ...v } : {
    code: '', regionCode: '001', region: '양곤', nameKo: '', nameEn: '', address: '', cap: 100, active: true, memo: ''
  });
  const set = (k, val) => setF(s => ({ ...s, [k]: val }));
  const onRegion = (rc) => {
    const r = state.regions.find(x => x.code === rc);
    setF(s => ({ ...s, regionCode: rc, region: r ? r.name.split('(')[0] : s.region }));
  };
  const valid = /^[0-9]{2}$/.test(f.code) && f.code !== '00' && f.nameKo && f.nameEn && f.cap > 0;
  return h(LP, {
    open: true, size: 'sm', title: v ? `시험장 수정 — ${v.nameKo}` : '시험장 등록',
    sub: v ? '코드 변경 시 기존 부여된 수험번호와 충돌 정책 합의' : null,
    onClose: onClose,
    footer: h(Fragment, null,
      h('button', { className: 'btn btn-secondary', onClick: onClose }, '취소'),
      h('button', { className: 'btn btn-primary', disabled: !valid, onClick: () => onSave(f) }, v ? '저장' : '등록')
    )
  },
    h(FieldSet, { legend: '기본', cols: 2 },
      h(FormRow, { label: '국가' },
        h('input', { className: 'input', disabled: true, value: '미얀마 (025)' })
      ),
      h(FormRow, { label: '지역', required: true },
        h('select', { className: 'select', value: f.regionCode, onChange: e => onRegion(e.target.value) },
          state.regions.map(r => h('option', { key: r.code, value: r.code }, r.name, ' (', r.code, ')'))
        )
      ),
      h(FormRow, { label: '시험장 코드 (2자리, 01~99)', required: true, hint: '동일 지역 내 unique, 00 사용 불가' },
        h('input', { className: 'input', maxLength: 2, value: f.code, onChange: e => set('code', e.target.value.replace(/\D/g,'')) })
      ),
      h(FormRow, { label: '정원', required: true },
        h('input', { type: 'number', className: 'input', value: f.cap, onChange: e => set('cap', parseInt(e.target.value||'0')) })
      )
    ),

    h(FieldSet, { legend: '명칭 / 주소', cols: 1 },
      h(FormRow, { label: '한글 명칭', required: true },
        h('input', { className: 'input', value: f.nameKo, onChange: e => set('nameKo', e.target.value), placeholder: '예: 양곤대 흘라잉캠퍼스' })
      ),
      h(FormRow, { label: '영문 명칭', required: true },
        h('input', { className: 'input', value: f.nameEn, onChange: e => set('nameEn', e.target.value), placeholder: '예: Yangon Univ. Hlaing Campus' })
      ),
      h(FormRow, { label: '주소' },
        h('input', { className: 'input', value: f.address, onChange: e => set('address', e.target.value) })
      )
    ),

    h(FieldSet, { legend: '기타', cols: 1 },
      h(FormRow, { label: '상태' },
        h('div', { className: 'seg' },
          h('button', { className: f.active ? 'active' : '', onClick: () => set('active', true), type: 'button' }, '활성'),
          h('button', { className: !f.active ? 'active' : '', onClick: () => set('active', false), type: 'button' }, '비활성')
        )
      ),
      h(FormRow, { label: '비고', hint: '좌석배치도·시험장 책임자·연락처 등 운영 정보는 이 비고란에 자유 기재(고객사 수정 0526)' },
        h('textarea', { className: 'textarea', rows: '3', value: f.memo, onChange: e => set('memo', e.target.value) })
      )
    )
  );
}

window.VenuesPanel = VenuesPanel;
