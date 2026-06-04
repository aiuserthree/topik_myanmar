/* ============================================================
   panels/refunds.js — 환불·정보정정 관리 (vanilla port of refunds.jsx)
   - 전 게시글 비밀글 → 비밀글 필터 없음
   - 답변 유무 필터(전체/답변없음/답변있음)
   - 댓글/대댓글, 처리 상태, 환불금액·방법 메모, 회원정보 직접 반영(정보정정)
   ============================================================ */

const REF_STATUS = ['접수','검토중','처리완료','반려'];

function RefundsPanel() {
  const state = useStore();
  const [typeF, setTypeF] = useState('all');
  const [stF, setStF] = useState('all');
  const [ansF, setAnsF] = useState('all'); // all|none|has
  const [q, setQ] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [delId, setDelId] = useState(null);

  const filtered = useMemo(() => {
    let r = state.refunds.slice();
    if (typeF !== 'all') r = r.filter(x => x.type === typeF);
    if (stF !== 'all')   r = r.filter(x => x.status === stF);
    if (ansF === 'none') r = r.filter(x => !x.hasAnswer);
    if (ansF === 'has')  r = r.filter(x => x.hasAnswer);
    if (q) r = r.filter(x => x.title.toLowerCase().includes(q.toLowerCase()) || x.author.includes(q));
    return r.sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  }, [state.refunds, typeF, stF, ansF, q]);

  const counts = useMemo(() => ({
    all: state.refunds.length,
    refund: state.refunds.filter(r => r.type === '환불').length,
    fix: state.refunds.filter(r => r.type === '정보정정').length,
    none: state.refunds.filter(r => !r.hasAnswer).length,
  }), [state.refunds]);

  const remove = () => {
    const r = state.refunds.find(x => x.id === delId);
    state.refunds.splice(state.refunds.indexOf(r), 1);
    DataStore.addAudit({ type: '환불·정정', targetId: r.id, action: '삭제', before: { ...r }, memo: '' });
    DataStore.notify();
    setDelId(null);
    toastOk('삭제되었습니다.');
  };

  return h(Fragment, null,
    h('div', { className: 'panel-head' },
      h('div', null,
        h('h1', null, '환불·정보정정 신청 관리'),
        h('div', { className: 'sub' }, '전 게시글이 ', h('b', null, '비밀글'), '입니다. 관리자 열람 시 처리 이력에 자동 기록됩니다.')
      )
    ),

    h('div', { className: 'filterbar' },
      h('div', { className: 'chips' },
        h('button', { className: `chip ${ansF === 'all' ? 'active' : ''}`, onClick: () => setAnsF('all') }, '전체', h('span', { className: 'cnt' }, counts.all)),
        h('button', { className: `chip ${ansF === 'none' ? 'active' : ''}`, onClick: () => setAnsF('none') }, '답변없음', h('span', { className: 'cnt' }, counts.none)),
        h('button', { className: `chip ${ansF === 'has' ? 'active' : ''}`, onClick: () => setAnsF('has') }, '답변있음', h('span', { className: 'cnt' }, counts.all - counts.none))
      ),
      h('div', { className: 'controls' },
        h('select', { className: 'select', value: typeF, onChange: e => setTypeF(e.target.value) },
          h('option', { value: 'all' }, '전체 유형'),
          h('option', { value: '환불' }, '환불'),
          h('option', { value: '정보정정' }, '정보정정')
        ),
        h('select', { className: 'select', value: stF, onChange: e => setStF(e.target.value) },
          h('option', { value: 'all' }, '전체 상태'),
          REF_STATUS.map(s => h('option', { key: s }, s))
        ),
        h('input', { className: 'input search', placeholder: '제목·작성자 검색', value: q, onChange: e => setQ(e.target.value) })
      )
    ),

    h('div', { className: 'dg-wrap' },
      h('div', { className: 'dg-scroll' },
        h('table', { className: 'dg' },
          h('thead', null, h('tr', null,
            h('th', { className: 'num' }, '번호'), h('th', null, '유형'), h('th', null, '제목'), h('th', null, '작성자'), h('th', null, '작성일'),
            h('th', null, '처리 상태'), h('th', null, '답변'), h('th', null, '담당자'), h('th', null, '관리')
          )),
          h('tbody', null,
            filtered.map(r => h('tr', { key: r.id },
              h('td', { className: 'num' }, r.no),
              h('td', null, h('span', { className: `pill ${r.type === '환불' ? 'pill-pay' : 'pill-applied'}` }, r.type)),
              h('td', null,
                h('a', { style: { color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }, onClick: () => setDetailId(r.id) },
                  h(I.Lock, { style: { width: 11, height: 11, display: 'inline', verticalAlign: '-1px', marginRight: 3, color: 'var(--text-3)' } }),
                  r.title
                )
              ),
              h('td', { className: 'muted' }, r.author),
              h('td', { className: 'code muted' }, r.createdAt),
              h('td', null, h(Pill, { kind:
                r.status === '접수' ? 'applied' :
                r.status === '검토중' ? 'photo' :
                r.status === '처리완료' ? 'approved' : 'rejected'
              }, r.status)),
              h('td', null, r.hasAnswer ? h(Pill, { kind: 'done' }, '답변있음') : h(Pill, { kind: 'waiting' }, '답변없음')),
              h('td', { className: 'muted' }, r.assignee || '—'),
              h('td', null,
                h('div', { className: 'row-actions' },
                  h('button', { className: 'ibtn', onClick: () => setDetailId(r.id) }, h(I.Eye, { style: { width: 12, height: 12 } })),
                  h('button', { className: 'ibtn danger', onClick: () => setDelId(r.id) }, h(I.Trash, { style: { width: 12, height: 12 } }))
                )
              )
            ))
          )
        )
      )
    ),

    detailId && h(RefundDetailLP, { id: detailId, onClose: () => setDetailId(null) }),
    delId && h(Modal, {
      open: true, onClose: () => setDelId(null), title: '신청글 삭제', danger: true,
      footer: h(Fragment, null,
        h('button', { className: 'btn btn-secondary', onClick: () => setDelId(null) }, '취소'),
        h('button', { className: 'btn btn-danger', onClick: remove }, '삭제')
      )
    },
      h('div', null, '신청글을 삭제하시겠습니까? 처리 이력은 보존됩니다.')
    )
  );
}

function RefundDetailLP({ id, onClose }) {
  const state = useStore();
  const r = state.refunds.find(x => x.id === id);
  const [status, setStatus] = useState(r.status);
  const [reply, setReply] = useState('');
  const [replyPublic, setReplyPublic] = useState(false);
  const [comment, setComment] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundMethod, setRefundMethod] = useState('계좌이체');

  // 열람 이력 기록 (비밀글)
  useEffect(() => {
    DataStore.addAudit({ type: '환불·정정', targetId: id, action: '수정', memo: '비밀글 열람' });
    DataStore.notify();
  }, [id]);

  if (!r) return null;

  const submitReply = () => {
    if (!reply.trim()) { toastErr('답변 내용을 입력해주세요.'); return; }
    const before = { hasAnswer: r.hasAnswer, status: r.status };
    r.hasAnswer = true;
    r.assignee = state.me?.id || 'admin01';
    r.status = status;
    r.comments.push({ author: state.me?.id, body: reply, public: replyPublic, ts: new Date().toISOString().slice(0,16).replace('T',' '), kind: 'reply' });
    DataStore.addAudit({ type: '환불·정정', targetId: id, action: '수정', before, after: { hasAnswer: true, status }, memo: `답변 등록(${replyPublic ? '공개' : '비공개'})` });
    DataStore.notify();
    setReply('');
    toastOk('답변이 등록되었습니다. 작성자에게 이메일이 발송됩니다.');
  };

  const addComment = () => {
    if (!comment.trim()) return;
    r.comments.push({ author: state.me?.id, body: comment, public: false, ts: new Date().toISOString().slice(0,16).replace('T',' '), kind: 'comment' });
    DataStore.addAudit({ type: '환불·정정', targetId: id, action: '수정', memo: '댓글 등록(비밀글—자동 비공개)' });
    DataStore.notify();
    setComment('');
    toastOk('댓글이 등록되었습니다.');
  };

  const applyMemberFix = () => {
    DataStore.addAudit({ type: '회원', targetId: '—', action: '수정', memo: `정보정정 신청 ${id} 기반 회원 정보 반영(데모)` });
    toastOk('회원 정보 정정 패널이 열립니다(데모).');
    location.hash = 'members';
  };

  return h(LP, {
    open: true, size: 'wide', title: r.title, sub: `작성자 ${r.author} · 작성일 ${r.createdAt} · 비밀글`, onClose: onClose,
    footer: h(Fragment, null,
      h('button', { className: 'btn btn-secondary', onClick: onClose }, '닫기'),
      h('button', { className: 'btn btn-primary', onClick: submitReply, disabled: !reply.trim() }, '답변 등록 · 상태 저장')
    )
  },
    h(FieldSet, { legend: '신청 내용', cols: 1 },
      h(KV, { k: '유형', v: h('span', { className: `pill ${r.type === '환불' ? 'pill-pay' : 'pill-applied'}` }, r.type) }),
      h(KV, { k: '본문', v: h('pre', { style: { background: 'var(--bg-2)', padding: 10, borderRadius: 6, fontSize: 13, whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: 'var(--text)' } }, r.body) }),
      h(KV, { k: '첨부', v: r.attachments.map(a => h('span', { key: a, className: 'tag', style: { marginRight: 6 } }, '📎 ', a)) })
    ),

    h(FieldSet, { legend: '처리', cols: 2 },
      h(FormRow, { label: '처리 상태', required: true },
        h('select', { className: 'select', value: status, onChange: e => setStatus(e.target.value) },
          REF_STATUS.map(s => h('option', { key: s }, s))
        )
      ),
      h(FormRow, { label: '담당자' },
        h('input', { className: 'input', value: r.assignee || state.me?.id || '', disabled: true })
      ),
      r.type === '환불' && h(Fragment, null,
        h(FormRow, { label: '환불 금액' },
          h('input', { className: 'input', value: refundAmount, onChange: e => setRefundAmount(e.target.value), placeholder: '예) 12,000 MMK' })
        ),
        h(FormRow, { label: '환불 방법' },
          h('select', { className: 'select', value: refundMethod, onChange: e => setRefundMethod(e.target.value) },
            h('option', null, '계좌이체'), h('option', null, '현장환불'), h('option', null, '기타')
          )
        )
      ),
      r.type === '정보정정' && h(FormRow, { label: '회원 정보 직접 반영', span: 2 },
        h('button', { className: 'btn btn-secondary', onClick: applyMemberFix }, '회원 관리에서 정보 정정 →')
      )
    ),

    h(FieldSet, { legend: '답변 작성', cols: 1 },
      h(FormRow, { label: '답변 내용', required: true },
        h('textarea', { className: 'textarea', rows: '5', value: reply, onChange: e => setReply(e.target.value), placeholder: '작성자에게 보낼 답변을 입력하세요.' })
      ),
      h(FormRow, null,
        h('label', { style: { fontSize: 13, display: 'inline-flex', gap: 6, alignItems: 'center' } },
          h('input', { type: 'checkbox', checked: replyPublic, onChange: e => setReplyPublic(e.target.checked) }),
          '공개 답변 (체크 시 FO에서도 노출 — 비밀글이라도 작성자에게는 항상 보입니다)'
        )
      )
    ),

    h(FieldSet, { legend: `댓글/대댓글 (${r.comments.length})`, cols: 1 },
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
        r.comments.map((c, idx) => h('div', { key: idx, style: { padding: 10, background: 'var(--bg-2)', borderRadius: 6, fontSize: 13 } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-3)', marginBottom: 4 } },
            h('span', null, h('b', null, c.author), ' · ', h('span', { className: 'code-id' }, c.kind === 'reply' ? '답변' : '댓글'), ' · ', c.public ? '공개' : '비공개'),
            h('span', { className: 'code-id' }, c.ts)
          ),
          h('div', null, c.body)
        )),
        !r.comments.length && h('div', { className: 'empty', style: { padding: '20px 0' } }, '등록된 댓글이 없습니다'),
        h('div', { style: { display: 'flex', gap: 8 } },
          h('input', { className: 'input', placeholder: '댓글 추가(비밀글—자동 비공개)', value: comment, onChange: e => setComment(e.target.value) }),
          h('button', { className: 'btn btn-secondary', onClick: addComment, disabled: !comment.trim() }, '등록')
        )
      )
    )
  );
}

window.RefundsPanel = RefundsPanel;
