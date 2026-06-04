/* ============================================================
   panels/notices.js — 공지사항 관리 (vanilla port of notices.jsx)
   고객사 수정 0527: 신규 게시 시 마케팅수신동의자 이메일 일괄 발송
   ============================================================ */

const NOTICE_CATS = ['중요','접수','시험','결과'];

function NoticesPanelInner() {
  const state = useStore();
  const [q, setQ] = useState('');
  const [catF, setCatF] = useState('all');
  const [edit, setEdit] = useState(null);
  const [delId, setDelId] = useState(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    let r = state.notices.slice();
    if (catF !== 'all') r = r.filter(n => n.cat === catF);
    if (q) r = r.filter(n => n.title.toLowerCase().includes(q.toLowerCase()));
    return r.sort((a,b) => (b.pin?1:0) - (a.pin?1:0) || (b.createdAt||'').localeCompare(a.createdAt||''));
  }, [state.notices, q, catF]);

  const save = (data) => {
    const payload = {
      category: BoData.NOTICE_L2C[data.cat] || 'registration',
      title: (data.title || '').trim(),
      body_html: data.body || '',
      is_pinned: !!data.pin,
    };
    setBusy(true);
    const run = data.apiId
      ? TopikBoApi.updateNotice(data.apiId, payload).then(res => {
          if (!res.ok) return res;
          const orig = state.notices.find(x => x.id === data.id);
          if (orig && orig.public !== data.public) {
            return data.public ? TopikBoApi.publishNotice(data.apiId) : TopikBoApi.unpublishNotice(data.apiId);
          }
          return res;
        })
      : TopikBoApi.createNotice(Object.assign({ is_published: !!data.public }, payload));
    return run.then(res => {
      if (!res.ok) { toastErr(TopikBoApi.parseError(res)); setBusy(false); return; }
      return BoData.reload('notices').then(() => {
        toastOk(data.apiId ? '공지가 수정되었습니다.' : '공지가 등록되었습니다.');
        setBusy(false);
        setEdit(null);
      });
    });
  };

  const remove = () => {
    const n = state.notices.find(x => x.id === delId);
    if (!n) return;
    setBusy(true);
    TopikBoApi.deleteNotice(n.apiId).then(res => {
      if (!res.ok) { toastErr(TopikBoApi.parseError(res)); setBusy(false); return; }
      BoData.reload('notices').then(() => { setDelId(null); setBusy(false); toastOk('공지가 삭제되었습니다.'); });
    });
  };

  return h(Fragment, null,
    h('div', { className: 'panel-head' },
      h('div', null,
        h('h1', null, '공지사항 관리'),
        h('div', { className: 'sub' }, 'FO 공지사항과 직접 연동 · 신규 게시 시 마케팅 동의 회원에 이메일 알림 발송')
      ),
      h('div', { className: 'actions' },
        h('button', { className: 'btn btn-primary', onClick: () => setEdit({ new: true }) },
          h(I.Plus, { style: { width: 14, height: 14 } }), ' 공지 작성'
        )
      )
    ),

    h('div', { className: 'filterbar' },
      h('div', { className: 'chips' },
        h('button', { className: `chip ${catF === 'all' ? 'active' : ''}`, onClick: () => setCatF('all') },
          '전체', h('span', { className: 'cnt' }, state.notices.length)
        ),
        NOTICE_CATS.map(c => h('button', { key: c, className: `chip ${catF === c ? 'active' : ''}`, onClick: () => setCatF(c) },
          c, h('span', { className: 'cnt' }, state.notices.filter(n => n.cat === c).length)
        ))
      ),
      h('div', { className: 'controls' },
        h('input', { className: 'input search', placeholder: '제목 검색', value: q, onChange: e => setQ(e.target.value) })
      )
    ),

    h('div', { className: 'dg-wrap' },
      h('div', { className: 'dg-scroll' },
        h('table', { className: 'dg' },
          h('thead', null,
            h('tr', null,
              h('th', { className: 'num' }, '번호'),
              h('th', null, '카테고리'),
              h('th', null, '제목'),
              h('th', null, '작성자'),
              h('th', null, '작성일'),
              h('th', { className: 'num' }, '조회'),
              h('th', null, '노출'),
              h('th', null, '관리')
            )
          ),
          h('tbody', null,
            filtered.map(n => h('tr', { key: n.id },
              h('td', { className: 'num' }, n.no),
              h('td', null, h('span', { className: `pill pill-${n.cat === '중요' ? 'rejected' : 'applied'}` }, n.cat)),
              h('td', null, n.pin && h(I.Bookmark, { style: { width: 12, height: 12, color: 'var(--accent)', display: 'inline', verticalAlign: '-2px', marginRight: 4 } }), h('b', null, n.title)),
              h('td', { className: 'muted' }, n.author),
              h('td', { className: 'code muted' }, n.createdAt),
              h('td', { className: 'num muted' }, DataStore.fmtNum(n.views)),
              h('td', null, h(Pill, { kind: n.public ? 'active' : 'inactive' }, n.public ? '공개' : '비공개')),
              h('td', null,
                h('div', { className: 'row-actions' },
                  h('button', { className: 'ibtn', onClick: () => setEdit({ id: n.id }) }, h(I.Edit, { style: { width: 12, height: 12 } })),
                  h('button', { className: 'ibtn danger', onClick: () => setDelId(n.id) }, h(I.Trash, { style: { width: 12, height: 12 } }))
                )
              )
            ))
          )
        )
      )
    ),

    edit && h(NoticeEditLP, { edit: edit, onClose: () => setEdit(null), onSave: save }),
    delId && h(Modal, {
      open: true, onClose: () => setDelId(null), title: '공지 삭제', danger: true,
      footer: h(Fragment, null,
        h('button', { className: 'btn btn-secondary', onClick: () => setDelId(null) }, '취소'),
        h('button', { className: 'btn btn-danger', onClick: remove }, '삭제')
      )
    },
      h('div', null, '공지를 삭제하시겠습니까? 30일 동안 휴지통에 보관됩니다(soft-delete).')
    )
  );
}

function NoticeEditLP({ edit, onClose, onSave }) {
  const state = useStore();
  const n = edit.id ? state.notices.find(x => x.id === edit.id) : null;
  const [f, setF] = useState(n ? { ...n } : {
    cat: '접수', title: '', body: '', titleMy: '', titleEn: '', bodyMy: '', bodyEn: '',
    public: true, pin: false, showStart: '', showEnd: ''
  });
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));
  const valid = f.title.trim();
  const isNew = !n;

  // 기존 공지 본문(body_html)은 상세 API에서 로드
  useEffect(() => {
    if (n && n.apiId) {
      TopikBoApi.getNotice(n.apiId).then(res => {
        if (res.ok && res.body) setF(s => ({ ...s, body: res.body.body_html || '' }));
      });
    }
  }, []);

  // 다국어(KO/MY/EN) 입력 — KO 필수, MY/EN 선택
  const [lang, setLang] = useState('KO');
  const titleKey = lang === 'KO' ? 'title' : lang === 'MY' ? 'titleMy' : 'titleEn';
  const bodyKey  = lang === 'KO' ? 'body'  : lang === 'MY' ? 'bodyMy'  : 'bodyEn';
  const titlePh  = lang === 'KO' ? '예) 제106회 TOPIK 접수 안내' : lang === 'MY' ? 'ဥပမာ - ၁၀၆ ကြိမ်မြောက် TOPIK လျှောက်ထားရန်' : 'e.g. 106th TOPIK Application Guide';

  return h(LP, {
    open: true, title: n ? `공지 수정 — ${n.title}` : '공지 작성', onClose: onClose, size: 'wide',
    footer: h(Fragment, null,
      h('button', { className: 'btn btn-secondary', onClick: onClose }, '취소'),
      h('button', { className: 'btn btn-primary', disabled: !valid, onClick: () => onSave(f) }, n ? '저장' : '게시')
    )
  },
    h(FieldSet, { legend: '기본 정보', cols: 2 },
      h(FormRow, { label: '카테고리', required: true },
        h('select', { className: 'select', value: f.cat, onChange: e => set('cat', e.target.value) },
          NOTICE_CATS.map(c => h('option', { key: c }, c))
        )
      ),
      h(FormRow, { label: '옵션' },
        h('div', { style: { display: 'flex', gap: 16, alignItems: 'center', height: 38 } },
          h('label', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 } },
            h('input', { type: 'checkbox', checked: f.public, onChange: e => set('public', e.target.checked) }), ' 공개'
          ),
          h('label', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 } },
            h('input', { type: 'checkbox', checked: f.pin, onChange: e => set('pin', e.target.checked) }), ' 상단 고정'
          )
        )
      ),
      h(FormRow, { label: '노출 시작' },
        h('input', { type: 'datetime-local', className: 'input', value: f.showStart, onChange: e => set('showStart', e.target.value) })
      ),
      h(FormRow, { label: '노출 종료' },
        h('input', { type: 'datetime-local', className: 'input', value: f.showEnd, onChange: e => set('showEnd', e.target.value) })
      )
    ),

    h(FieldSet, { legend: '다국어 입력 (KO 필수 · MY/EN 선택)', cols: 1 },
      h(FormRow, { label: '언어 선택' },
        h('div', { className: 'seg' },
          ['KO','MY','EN'].map(l => h('button', { key: l, type: 'button', className: lang === l ? 'active' : '', onClick: () => setLang(l) },
            l, l === 'KO' ? ' · 필수' : ''
          ))
        )
      ),
      h(FormRow, { label: `제목 (${lang})`, required: lang === 'KO' },
        h('input', { className: 'input', value: f[titleKey] || '', onChange: e => set(titleKey, e.target.value), maxLength: 80, placeholder: titlePh })
      ),
      h(FormRow, { label: `본문 (${lang})`, required: lang === 'KO' },
        h('textarea', { className: 'textarea', rows: '10', value: f[bodyKey] || '', onChange: e => set(bodyKey, e.target.value), placeholder: '본문을 입력하세요. HTML 서식 가능.' })
      )
    ),

    isNew && f.public && h('div', { style: { padding: 12, background: 'var(--st-applied-bg)', color: 'var(--st-applied)', borderRadius: 6, fontSize: 12.5, marginBottom: 10 } },
      'ⓘ 게시(공개)하면 FO 공지사항 페이지에 즉시 노출됩니다.', h('br'),
      h('span', { style: { fontSize: 11.5, color: 'var(--text-3)' } }, '※ 다국어(MY/EN) 입력과 마케팅 수신 동의 회원 일괄 발송은 별도 메뉴/작업으로 처리됩니다. (현재 한국어 제목·본문이 저장됩니다.)')
    )
  );
}

// 데이터 로딩 게이트 — API에서 공지 목록을 받아온 뒤 내부 패널을 렌더
function NoticesPanel() {
  return h(ResourceGate, { loader: () => BoData.loadNotices(), deps: [], inner: NoticesPanelInner });
}

window.NoticesPanel = NoticesPanel;
