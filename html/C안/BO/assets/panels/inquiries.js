/* ============================================================
   panels/inquiries.js — 문의게시판 관리 (vanilla port of inquiries.jsx)
   - 전체/일반/비밀 탭, 카테고리, 상태(답변대기/답변완료), 검색
   - 답변 작성·답변 완료 처리(토글), 댓글/대댓글
   ============================================================ */

const INQ_CATS = ['접수','시험','기타'];

function InquiriesPanel() {
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
    state.inquiries.splice(state.inquiries.indexOf(i), 1);
    DataStore.addAudit({ type: '문의', targetId: i.id, action: '삭제', before: { ...i }, memo: '' });
    DataStore.notify();
    setDelId(null);
    toastOk('삭제되었습니다.');
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
  const [done, setDone] = useState(q.status === 'done');
  const [comment, setComment] = useState('');
  const [commentPublic, setCommentPublic] = useState(!q.secret);

  useEffect(() => {
    if (q.secret) {
      DataStore.addAudit({ type: '문의', targetId: id, action: '수정', memo: '비밀글 본문 열람' });
      DataStore.notify();
    }
  }, [id]);

  if (!q) return null;

  const submit = () => {
    if (!reply.trim()) { toastErr('답변을 입력해주세요.'); return; }
    const before = { status: q.status };
    q.comments.push({ author: state.me?.id, body: reply, public: !q.secret, ts: new Date().toISOString().slice(0,16).replace('T',' '), kind: 'reply' });
    q.assignee = state.me?.id;
    if (done) q.status = 'done';
    DataStore.addAudit({ type: '문의', targetId: id, action: '수정', before, after: { status: q.status }, memo: `답변 등록${done ? '+답변완료 처리' : ''}` });
    DataStore.notify();
    setReply('');
    toastOk('답변이 등록되었습니다. 작성자에게 이메일이 발송됩니다.');
  };

  const addComment = () => {
    if (!comment.trim()) return;
    // 비밀글의 댓글·대댓글은 자동 비밀글 (강제)
    const isPub = q.secret ? false : commentPublic;
    q.comments.push({ author: state.me?.id, body: comment, public: isPub, ts: new Date().toISOString().slice(0,16).replace('T',' '), kind: 'comment' });
    DataStore.addAudit({ type: '문의', targetId: id, action: '수정', memo: `댓글 등록(${isPub ? '공개' : '비공개'})` });
    DataStore.notify();
    setComment('');
    toastOk('댓글이 등록되었습니다.');
  };

  return h(LP, {
    open: true, size: 'wide', title: q.title, sub: `작성자 ${q.author} · 작성일 ${q.createdAt} · ${q.secret ? '비밀글' : '일반글'}`, onClose: onClose,
    footer: h(Fragment, null,
      h('button', { className: 'btn btn-secondary', onClick: onClose }, '닫기'),
      h('button', { className: 'btn btn-primary', onClick: submit, disabled: !reply.trim() }, done ? '답변 등록 · 완료 처리' : '답변 등록')
    )
  },
    h(FieldSet, { legend: '문의 내용', cols: 1 },
      h(KV, { k: '카테고리', v: h('span', { className: 'pill', style: { background: 'var(--bg-3)' } }, q.cat) }),
      h(KV, { k: '본문', v: h('pre', { style: { background: 'var(--bg-2)', padding: 10, borderRadius: 6, fontSize: 13, whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: 'var(--text)' } }, q.body) })
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

    h(FieldSet, { legend: `댓글/대댓글 (${q.comments.length})`, cols: 1 },
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
        q.comments.map((c, idx) => (
          h('div', { key: idx, style: { padding: 10, background: 'var(--bg-2)', borderRadius: 6, fontSize: 13 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-3)', marginBottom: 4 } },
              h('span', null, h('b', null, c.author), ' · ', h('span', { className: 'code-id' }, c.kind === 'reply' ? '답변' : '댓글'), ' · ', c.public ? '공개' : '비공개'),
              h('span', { className: 'code-id' }, c.ts)
            ),
            h('div', null, c.body)
          )
        )),
        !q.comments.length && h('div', { className: 'empty', style: { padding: '20px 0' } }, '등록된 댓글이 없습니다'),
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

window.InquiriesPanel = InquiriesPanel;
