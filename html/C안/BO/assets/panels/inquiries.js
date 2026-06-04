/* ============================================================
   panels/inquiries.js — 문의게시판 관리 (vanilla port of inquiries.jsx)
   - 전체/일반/비밀 탭, 카테고리, 상태(답변대기/답변완료), 검색
   - 답변 작성·답변 완료 처리(토글), 댓글/대댓글
   ============================================================ */

const INQ_CATS = ['접수','시험','기타'];

function InquiriesPanelInner() {
  const state = useStore();
  const [tab, setTab] = useState('all'); // all|public|secret
  const [catF, setCatF] = useState('all');
  const [stF, setStF] = useState('all');
  const [q, setQ] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [delId, setDelId] = useState(null);

  const filtered = useMemo(() => {
    let r = state.inquiries.slice();
    if (tab === 'public') r = r.filter(x => !x.secret);
    if (tab === 'secret') r = r.filter(x => x.secret);
    if (catF !== 'all') r = r.filter(x => x.cat === catF);
    if (stF !== 'all') r = r.filter(x => x.status === stF);
    if (q) r = r.filter(x => x.title.toLowerCase().includes(q.toLowerCase()) || x.author.includes(q));
    return r.sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  }, [state.inquiries, tab, catF, stF, q]);

  const remove = () => {
    const i = state.inquiries.find(x => x.id === delId);
    if (!i) { setDelId(null); return; }
    TopikBoApi.deleteBoardPost(i.apiId).then(res => {
      if (!res.ok) { toastErr(TopikBoApi.parseError(res)); return; }
      BoData.reload('inquiries').then(() => { setDelId(null); toastOk('삭제되었습니다.'); });
    });
  };

  return h(Fragment, null,
    h('div', { className: 'panel-head' },
      h('div', null,
        h('h1', null, '문의 게시판 관리'),
        h('div', { className: 'sub' }, '전체/일반/비밀글 분리 · 비밀글 열람 시 처리 이력 자동 기록')
      )
    ),

    h('div', { className: 'filterbar' },
      h('div', { className: 'chips' },
        [['all','전체'],['public','일반'],['secret','비밀']].map(([k, l]) => (
          h('button', { key: k, className: `chip ${tab === k ? 'active' : ''}`, onClick: () => setTab(k) },
            l, h('span', { className: 'cnt' }, k === 'all' ? state.inquiries.length : state.inquiries.filter(x => (k === 'secret' ? x.secret : !x.secret)).length)
          )
        ))
      ),
      h('div', { className: 'controls' },
        h('select', { className: 'select', value: catF, onChange: e => setCatF(e.target.value) },
          h('option', { value: 'all' }, '전체 카테고리'),
          INQ_CATS.map(c => h('option', { key: c }, c))
        ),
        h('select', { className: 'select', value: stF, onChange: e => setStF(e.target.value) },
          h('option', { value: 'all' }, '전체 상태'),
          h('option', { value: 'wait' }, '답변대기'),
          h('option', { value: 'done' }, '답변완료')
        ),
        h('input', { className: 'input search', placeholder: '제목·작성자 검색', value: q, onChange: e => setQ(e.target.value) })
      )
    ),

    h('div', { className: 'dg-wrap' },
      h('div', { className: 'dg-scroll' },
        h('table', { className: 'dg' },
          h('thead', null, h('tr', null,
            h('th', { className: 'num' }, '번호'), h('th', null, '공개'), h('th', null, '카테고리'), h('th', null, '제목'), h('th', null, '작성자'),
            h('th', null, '작성일'), h('th', null, '상태'), h('th', null, '담당자'), h('th', null, '관리')
          )),
          h('tbody', null,
            filtered.map(i => (
              h('tr', { key: i.id },
                h('td', { className: 'num' }, i.no),
                h('td', null, i.secret ? h(I.Lock, { style: { width: 14, height: 14, color: 'var(--text-3)' } }) : h(I.Eye, { style: { width: 14, height: 14, color: 'var(--text-3)' } })),
                h('td', null, h('span', { className: 'pill', style: { background: 'var(--bg-3)' } }, i.cat)),
                h('td', null, h('a', { style: { color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }, onClick: () => setDetailId(i.id) }, i.title)),
                h('td', { className: 'muted' }, i.author),
                h('td', { className: 'code muted' }, i.createdAt),
                h('td', null, h(Pill, { kind: i.status === 'done' ? 'done' : 'waiting' }, i.status === 'done' ? '답변완료' : '답변대기')),
                h('td', { className: 'muted' }, i.assignee || '—'),
                h('td', null,
                  h('div', { className: 'row-actions' },
                    h('button', { className: 'ibtn', onClick: () => setDetailId(i.id) }, h(I.Eye, { style: { width: 12, height: 12 } })),
                    h('button', { className: 'ibtn danger', onClick: () => setDelId(i.id) }, h(I.Trash, { style: { width: 12, height: 12 } }))
                  )
                )
              )
            ))
          )
        )
      )
    ),

    detailId && h(InquiryDetailLP, { id: detailId, onClose: () => setDetailId(null) }),
    delId && (
      h(Modal, { open: true, onClose: () => setDelId(null), title: '문의 삭제', danger: true,
        footer: h(Fragment, null,
          h('button', { className: 'btn btn-secondary', onClick: () => setDelId(null) }, '취소'),
          h('button', { className: 'btn btn-danger', onClick: remove }, '삭제')
        )
      },
        h('div', null, '문의를 삭제하시겠습니까?')
      )
    )
  );
}

function InquiryDetailLP({ id, onClose }) {
  const state = useStore();
  const q = state.inquiries.find(x => x.id === id);
  const [reply, setReply] = useState('');
  const [done, setDone] = useState(q && q.status === 'done');
  const [comment, setComment] = useState('');
  const [commentPublic, setCommentPublic] = useState(!(q && q.secret));
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadDetail = () => {
    if (!q) return Promise.resolve();
    return TopikBoApi.getBoardPost(q.apiId).then(res => {
      if (res.ok && res.body) setDetail(res.body);
    });
  };
  useEffect(() => { loadDetail(); }, [id]);

  if (!q) return null;

  const body = detail ? (detail.body || '') : '불러오는 중…';
  const comments = (detail && detail.comments) || [];

  const submit = () => {
    if (!reply.trim()) { toastErr('답변을 입력해주세요.'); return; }
    setBusy(true);
    TopikBoApi.replyBoardPost(q.apiId, {
      reply: reply, activity_type: '공식 답변',
      workflow_status: done ? 'answered' : 'awaiting_reply',
    }).then(res => {
      setBusy(false);
      if (!res.ok) { toastErr(TopikBoApi.parseError(res)); return; }
      setReply('');
      BoData.reload('inquiries');
      loadDetail();
      toastOk('답변이 등록되었습니다. 작성자에게 이메일이 발송됩니다.');
    });
  };

  const addComment = () => {
    if (!comment.trim()) return;
    const isPub = q.secret ? false : commentPublic;
    TopikBoApi.addBoardComment(q.apiId, { body: comment, is_secret: !isPub }).then(res => {
      if (!res.ok) { toastErr(TopikBoApi.parseError(res)); return; }
      setComment('');
      loadDetail();
      toastOk('댓글이 등록되었습니다.');
    });
  };

  return h(LP, {
    open: true, size: 'wide', title: q.title, sub: `작성자 ${q.author} · 작성일 ${q.createdAt} · ${q.secret ? '비밀글' : '일반글'}`, onClose: onClose,
    footer: h(Fragment, null,
      h('button', { className: 'btn btn-secondary', onClick: onClose }, '닫기'),
      h('button', { className: 'btn btn-primary', onClick: submit, disabled: !reply.trim() || busy }, done ? '답변 등록 · 완료 처리' : '답변 등록')
    )
  },
    h(FieldSet, { legend: '문의 내용', cols: 1 },
      h(KV, { k: '카테고리', v: h('span', { className: 'pill', style: { background: 'var(--bg-3)' } }, q.cat) }),
      h(KV, { k: '본문', v: h('pre', { style: { background: 'var(--bg-2)', padding: 10, borderRadius: 6, fontSize: 13, whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: 'var(--text)' } }, body) })
    ),

    detail && detail.admin_reply && h(FieldSet, { legend: '등록된 답변', cols: 1 },
      h(KV, { k: '담당자', v: detail.assignee_name || detail.assignee_email || '—' }),
      h(KV, { k: '답변', v: h('pre', { style: { background: 'var(--st-approved-bg)', padding: 10, borderRadius: 6, fontSize: 13, whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: 'var(--text)' } }, detail.admin_reply) })
    ),

    h(FieldSet, { legend: '답변 작성', cols: 1 },
      h(FormRow, { label: '답변 내용', required: true },
        h('textarea', { className: 'textarea', rows: '5', value: reply, onChange: e => setReply(e.target.value), placeholder: '답변 내용을 입력하세요.' })
      ),
      h(FormRow, null,
        h('label', { style: { fontSize: 13, display: 'inline-flex', gap: 6, alignItems: 'center' } },
          h('input', { type: 'checkbox', checked: done, onChange: e => setDone(e.target.checked) }),
          "답변 완료 처리 (상태를 '답변완료'로 전환 + 작성자 이메일 통지)"
        )
      )
    ),

    h(FieldSet, { legend: `댓글/대댓글 (${comments.length})`, cols: 1 },
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
        comments.map((c, idx) => (
          h('div', { key: c.id || idx, style: { padding: 10, background: 'var(--bg-2)', borderRadius: 6, fontSize: 13 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-3)', marginBottom: 4 } },
              h('span', null, h('b', null, c.author), ' · ', h('span', { className: 'code-id' }, c.is_admin ? '관리자' : '회원'), ' · ', c.is_secret ? '비공개' : '공개'),
              h('span', { className: 'code-id' }, c.created_at_label)
            ),
            h('div', null, c.body)
          )
        )),
        !comments.length && h('div', { className: 'empty', style: { padding: '20px 0' } }, '등록된 댓글이 없습니다'),
        h('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
          h('input', { className: 'input', placeholder: q.secret ? '댓글 추가(비밀글—자동 비공개)' : '댓글 추가', value: comment, onChange: e => setComment(e.target.value) }),
          !q.secret && (
            h('label', { style: { fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' } },
              h('input', { type: 'checkbox', checked: commentPublic, onChange: e => setCommentPublic(e.target.checked) }), ' 공개'
            )
          ),
          h('button', { className: 'btn btn-secondary', onClick: addComment, disabled: !comment.trim() }, '등록')
        )
      )
    )
  );
}

// 데이터 로딩 게이트 — API에서 문의 목록을 받아온 뒤 내부 패널을 렌더
function InquiriesPanel() {
  return h(ResourceGate, { loader: () => BoData.loadInquiries(), deps: [], inner: InquiriesPanelInner });
}

window.InquiriesPanel = InquiriesPanel;
