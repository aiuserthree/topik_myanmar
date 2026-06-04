/* ============================================================
   panels/applicants.js — 접수자 관리 (vanilla port of applicants.jsx)
   ============================================================ */

const STATUS_CHIPS = [
  { id: 'all',      label: '전체' },
  { id: 'applied',  label: '접수완료' },
  { id: 'photo',    label: '사진심사중' },
  { id: 'pay',      label: '수납대기' },
  { id: 'approved', label: '승인완료' },
  { id: 'rejected', label: '반려' },
  { id: 'cancel',   label: '취소' },
  { id: 'refund',   label: '환불자' },
];

const REJECT_REASONS = ['사진 부적합', '정보 불일치', '중복 접수', '기타'];

function ApplicantsPanel() {
  const state = useStore();
  const sessionId = state.activeSessionId;
  const apps = useMemo(() => state.applicants.filter(a => a.sessionId === sessionId), [state.applicants, sessionId]);

  // ---- Filter / search ----
  const [statusF, setStatusF] = useState('all');
  const [venueF, setVenueF] = useState('all');
  const [levelF, setLevelF] = useState('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState({ k: 'no', dir: 'asc' });
  const [page, setPage] = useState(1);
  const PER_PAGE = 12;

  // URL sync (북마크 가능)
  useEffect(() => {
    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    if (params.has('s')) setStatusF(params.get('s'));
    if (params.has('v')) setVenueF(params.get('v'));
    if (params.has('l')) setLevelF(params.get('l'));
    if (params.has('q')) setQ(params.get('q'));
  }, []);

  const filtered = useMemo(() => {
    let r = apps;
    if (statusF !== 'all') r = r.filter(a => a.status === statusF);
    if (venueF !== 'all')  r = r.filter(a => a.venueId === venueF);
    if (levelF !== 'all')  r = r.filter(a => a.level === levelF);
    if (q) {
      const qq = q.trim().toLowerCase();
      r = r.filter(a => a.nameKo.includes(qq) || a.nameEn.toLowerCase().includes(qq) || a.dob.includes(qq) || (a.exam && a.exam.includes(qq)));
    }
    // sort
    r = r.slice().sort((a, b) => {
      const va = a[sort.k], vb = b[sort.k];
      const cmp = String(va).localeCompare(String(vb), 'ko');
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return r;
  }, [apps, statusF, venueF, levelF, q, sort]);

  useEffect(() => { setPage(1); }, [statusF, venueF, levelF, q, sessionId]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageRows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // status counts (for chip badges)
  const counts = useMemo(() => {
    const c = { all: apps.length };
    STATUS_CHIPS.forEach(x => { if (x.id !== 'all') c[x.id] = 0; });
    apps.forEach(a => { c[a.status] = (c[a.status] || 0) + 1; });
    return c;
  }, [apps]);

  // ---- Modals ----
  // 모든 처리(사진심사·수납·승인·반려)는 접수자 상세(상세보기)에서 수행한다.
  const [detailId, setDetailId] = useState(null);
  const [payModal, setPayModal] = useState(null);          // { ids:[], mode:'pay'|'cancel' }
  const [approveModal, setApproveModal] = useState(null);  // { ids:[] }
  const [rejectModal, setRejectModal] = useState(null);    // { ids:[] }
  const [examModal, setExamModal] = useState(false);
  const [excelModal, setExcelModal] = useState(false);
  const [zipModal, setZipModal] = useState(false);

  // expose detail open to other panels (Dashboard 'Recent')
  useEffect(() => { window.openApplicantDetail = (id) => setDetailId(id); }, []);

  // ---- 사진 심사 (인라인) handlers — TPKM_BO_2_1_3 ----
  const doPhotoApprove = (id) => {
    const a = state.applicants.find(x => x.id === id);
    if (!a) return;
    const before = { photoStatus: a.photoStatus, status: a.status };
    a.photoStatus = 'approved';
    a.photoOk = true;
    // 사진 승인으로 후속 상태 진행
    if (a.status === 'photo') a.status = a.paid ? 'approved' : 'pay';
    DataStore.addAudit({ type: '사진', targetId: id, action: '승인', before, after: { photoStatus: 'approved', status: a.status }, memo: '' });
    DataStore.notify();
    toastOk('사진이 승인되었습니다.', { title: '사진 심사', type: 'success' });
  };
  const doPhotoReject = (id, reason) => {
    const a = state.applicants.find(x => x.id === id);
    if (!a) return;
    if (!reason || !reason.trim()) { toastErr('반려 사유를 입력해주세요.'); return; }
    const before = { photoStatus: a.photoStatus, status: a.status, rejectReason: a.rejectReason };
    a.photoStatus = 'rejected';
    a.photoOk = false;
    a.status = 'rejected';
    a.rejectReason = reason;
    DataStore.addAudit({ type: '사진', targetId: id, action: '반려', before, after: { photoStatus: 'rejected', status: 'rejected', rejectReason: reason }, memo: reason });
    DataStore.notify();
    toastOk('사진이 반려되었습니다. 응시자에게 이메일이 발송됩니다.', { title: '사진 심사', type: 'success' });
  };
  const doApprove = (ids) => {
    // 사진 미심사 행 가드 — 사진 승인 완료 건만 승인 가능
    const blocked = ids.filter(id => {
      const a = state.applicants.find(x => x.id === id);
      return a && a.photoStatus !== 'approved';
    });
    if (blocked.length) {
      toastErr(`사진 미심사 ${blocked.length}건이 포함되어 있습니다. 행의 ‘사진심사’ 버튼으로 먼저 심사해주세요.`, { title: '승인 불가' });
      return;
    }
    let n = 0;
    ids.forEach(id => {
      const a = state.applicants.find(x => x.id === id);
      if (!a) return;
      const before = { status: a.status };
      a.status = 'approved';
      n++;
      DataStore.addAudit({ type: '접수자', targetId: id, action: '승인', before, after: { status: 'approved' }, memo: '' });
    });
    DataStore.notify();
    toastOk(`${n}건이 승인되었습니다. (이메일 통지 전송)`, { title: '승인 완료', type: 'success' });
    setApproveModal(null);
  };

  const doReject = (ids, reason) => {
    if (!reason || !reason.trim()) { toastErr('반려 사유를 입력해주세요.'); return; }
    let n = 0;
    ids.forEach(id => {
      const a = state.applicants.find(x => x.id === id);
      if (!a) return;
      const before = { status: a.status, rejectReason: a.rejectReason };
      a.status = 'rejected';
      a.rejectReason = reason;
      n++;
      DataStore.addAudit({ type: '접수자', targetId: id, action: '반려', before, after: { status: 'rejected', rejectReason: reason }, memo: reason });
    });
    DataStore.notify();
    toastOk(`${n}건이 반려되었습니다. (이메일 통지)`, { title: '반려 완료', type: 'success' });
    setRejectModal(null);
  };

  const doPay = (ids, info) => {
    let n = 0;
    ids.forEach(id => {
      const a = state.applicants.find(x => x.id === id);
      if (!a || a.paid) return;
      const before = { paid: a.paid, status: a.status };
      a.paid = true;
      a.paidAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
      a.receipt = info.receipt || `R-${Math.floor(10000 + Math.random() * 89999)}`;
      a.memo = (a.memo || '') + (info.memo ? `[수납] ${info.memo}\n` : '');
      // 사진 OK 이면 자동 승인 후보, 아닐 시 photo 상태 유지
      if (a.photoOk && a.status === 'pay') a.status = 'approved';
      else if (a.status === 'applied') a.status = a.photoOk ? 'approved' : 'photo';
      n++;
      DataStore.addAudit({ type: '접수자', targetId: id, action: '수납', before, after: { paid: true, status: a.status }, memo: info.memo || '' });
    });
    DataStore.notify();
    toastOk(`${n}건 수납 처리되었습니다.`, { title: '수납 완료', type: 'success' });
    setPayModal(null);
  };

  // 수납취소 — 수납을 취소하고 미수납(수납대기) 상태로 되돌린다(토글). 수험번호는 유지.
  const doCancelPay = (ids, reason) => {
    let n = 0;
    ids.forEach(id => {
      const a = state.applicants.find(x => x.id === id);
      if (!a || !a.paid) return;
      const before = { paid: a.paid, status: a.status, paidAt: a.paidAt, receipt: a.receipt };
      a.paid = false;
      a.paidAt = '';
      a.receipt = '';
      a.status = 'pay';                    // 미수납(수납대기)로 되돌림
      if (reason && reason.trim()) a.memo = (a.memo || '') + `[수납취소] ${reason}\n`;
      n++;
      DataStore.addAudit({ type: '접수자', targetId: id, action: '수납취소', before, after: { paid: false, status: 'pay' }, memo: reason || '' });
    });
    DataStore.notify();
    if (n) toastOk(`${n}건 수납이 취소되어 미수납(수납대기)으로 변경되었습니다.`, { title: '수납 취소', type: 'success' });
    else toastErr('수납 취소할 대상이 없습니다.');
    setPayModal(null);
  };

  // 수험번호 13자리 일괄 부여
  const doAssignExam = (preview = false) => {
    const session = state.sessions.find(s => s.id === sessionId);
    // 대상: paid && photoOk && status NOT IN (cancel, rejected) && exam 비어있음
    const targets = state.applicants
      .filter(a => a.sessionId === sessionId)
      .filter(a => a.paid && a.photoOk && !['cancel', 'rejected'].includes(a.status) && !a.exam);
    // 같은 시험장에서 동시접수(Ⅰ+Ⅱ) 강제: 본 데모에서는 lvl=동시 동일 처리
    // 알파벳 오름차순(영문)
    const sorted = targets.slice().sort((a, b) => a.nameEn.localeCompare(b.nameEn));

    // 그룹: 시험장×수준(7/8)
    const seqs = {}; // key: venueCode|lvlCode → 0001 시작
    const result = [];
    for (const a of sorted) {
      const v = state.venues.find(x => x.id === a.venueId);
      const venueCode = v ? v.code : '01';
      const regionCode = v ? v.regionCode : '001';
      const lvlCodes = a.level === '동시' ? ['7', '8'] : [a.level === 'Ⅰ' ? '7' : '8'];
      const assigned = [];
      for (const lc of lvlCodes) {
        const key = venueCode + '|' + lc;
        seqs[key] = (seqs[key] || 0) + 1;
        const num = `025${regionCode}${lc}${venueCode}${String(seqs[key]).padStart(4, '0')}`;
        assigned.push(num);
      }
      result.push({ id: a.id, name: a.nameEn, nameKo: a.nameKo, exam: assigned.join(' / '), level: a.level });
    }

    if (preview) return { result, targets: targets.length, skipped: state.applicants.filter(a => a.sessionId === sessionId).length - targets.length };

    // 확정
    for (const r of result) {
      const a = state.applicants.find(x => x.id === r.id);
      a.exam = r.exam;
      DataStore.addAudit({ type: '접수자', targetId: r.id, action: '수험번호부여', after: { exam: a.exam }, memo: `회차 ${session?.no} 알파벳순 부여` });
    }
    DataStore.notify();
    toastOk(`${result.length}건에 수험번호가 일괄 부여되었습니다.`, { title: '수험번호 부여 완료' });
    return { result, targets: targets.length };
  };

  const myRole = state.me?.role || 'super';
  const canAssignExam = myRole === 'super';                 // 슈퍼 관리자만
  const canDownload = myRole !== 'viewer';                  // 조회자는 불가

  // sort helper
  const sortBy = (k) => setSort(s => s.k === k ? { k, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { k, dir: 'asc' });

  return h(Fragment, null,
    h('div', { className: 'panel-head' },
      h('div', null,
        h('h1', null, '접수자 관리'),
        h('div', { className: 'sub' }, '사진 심사·수납·승인·반려·수험번호 부여를 단일 메뉴에서 동시에 진행합니다.')
      ),
      h('div', { className: 'actions' },
        h('button', { className: 'btn btn-secondary', onClick: () => setExcelModal(true), disabled: !canDownload },
          h(I.Download, { style: { width: 14, height: 14 } }), ' 연명부 엑셀'
        ),
        h('button', { className: 'btn btn-secondary', onClick: () => setZipModal(true), disabled: !canDownload },
          h(I.Download, { style: { width: 14, height: 14 } }), ' 사진 zip'
        ),
        h('button', { className: 'btn btn-secondary', onClick: () => window.print() },
          h(I.Printer, { style: { width: 14, height: 14 } }), ' 인쇄'
        ),
        h('button', { className: 'btn btn-primary', disabled: !canAssignExam, onClick: () => setExamModal(true) },
          h(I.Hash, { style: { width: 14, height: 14 } }), ' 수험번호 일괄 부여'
        )
      )
    ),

    // Filter bar — TPKM_BO_2_1_1
    h('div', { className: 'filterbar no-print' },
      h('div', { className: 'chips' },
        STATUS_CHIPS.map(c => h('button', {
          key: c.id,
          className: `chip ${statusF === c.id ? 'active' : ''}`,
          onClick: () => setStatusF(c.id)
        },
          c.label, h('span', { className: 'cnt' }, DataStore.fmtNum(counts[c.id] || 0))
        ))
      ),
      h('div', { className: 'controls' },
        h('select', { className: 'select', value: venueF, onChange: e => setVenueF(e.target.value) },
          h('option', { value: 'all' }, '전체 시험장'),
          state.venues.filter(v => v.active).map(v => h('option', { key: v.id, value: v.id }, v.nameKo))
        ),
        h('select', { className: 'select', value: levelF, onChange: e => setLevelF(e.target.value) },
          h('option', { value: 'all' }, '전체 급수'),
          h('option', { value: 'Ⅰ' }, 'TOPIK Ⅰ'),
          h('option', { value: 'Ⅱ' }, 'TOPIK Ⅱ'),
          h('option', { value: '동시' }, '동시(Ⅰ+Ⅱ)')
        ),
        h('input', { className: 'input search', type: 'text', placeholder: '한글·영문 성명/생년월일/수험번호', value: q, onChange: e => setQ(e.target.value) }),
        (statusF !== 'all' || venueF !== 'all' || levelF !== 'all' || q) && h('button', {
          className: 'ibtn ghost', onClick: () => { setStatusF('all'); setVenueF('all'); setLevelF('all'); setQ(''); }
        }, '조건 초기화')
      )
    ),

    // Data grid — TPKM_BO_2_1_2 연명부 컬럼 정합
    h('div', { className: 'dg-wrap' },
      h('div', { className: 'dg-scroll' },
        h('table', { className: 'dg', id: 'applicants-grid' },
          h('thead', null,
            h('tr', null,
              h('th', { className: 'sortable num', onClick: () => sortBy('no') }, '번호'),
              h('th', null, '사진'),
              h('th', { className: 'sortable', onClick: () => sortBy('nameKo') }, '한글성명'),
              h('th', { className: 'sortable', onClick: () => sortBy('nameEn') }, '영문성명'),
              h('th', null, '급수'),
              h('th', { className: 'sortable', onClick: () => sortBy('appliedAt') }, '접수일'),
              h('th', null, '수험번호'),
              h('th', null, '사진심사'),
              h('th', null, '수납'),
              h('th', null, '상태'),
              h('th', { className: 'no-print' }, '관리')
            )
          ),
          h('tbody', null,
            pageRows.map(a => h('tr', { key: a.id },
              h('td', { className: 'num' }, a.no),
              h('td', null, h(PhotoThumb, { status: a.photoStatus, name: a.nameKo, seed: a.id })),
              h('td', null, h('a', { style: { color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }, onClick: () => setDetailId(a.id) }, a.nameKo)),
              h('td', null, a.nameEn),
              h('td', null, h('span', { className: 'code-id' }, 'TOPIK ', a.level)),
              h('td', { className: 'code muted' }, a.appliedAt),
              h('td', { className: 'code' }, h('b', { style: { color: a.exam ? 'var(--st-number)' : 'var(--text-4)' } }, a.exam || '미부여')),
              h('td', null, h(PhotoStatusPill, { status: a.photoStatus })),
              h('td', null, a.paid ? h(Pill, { kind: 'approved' }, '수납완료') : h(Pill, { kind: 'pay' }, '미수납')),
              h('td', null, h(Pill, { kind: a.status }, DataStore.statusLabel(a.status))),
              h('td', { className: 'no-print' },
                h('button', { className: 'ibtn primary', title: '접수자 상세 보기', onClick: () => setDetailId(a.id) },
                  h(I.Eye, { style: { width: 14, height: 14 } }), ' 상세보기'
                )
              )
            )),
            !pageRows.length && h('tr', null, h('td', { colSpan: '11' },
              h('div', { className: 'empty' },
                h('div', { className: 'icon' }, h(I.Search)),
                h('div', { className: 'ttl' }, '조건에 맞는 접수자가 없습니다'),
                h('div', { className: 'sub' }, '필터/검색 조건을 변경해 보세요.')
              )
            ))
          )
        )
      ),
      h('div', { className: 'dg-foot no-print' },
        h('div', { className: 'info' }, '총 ', h('b', { style: { color: 'var(--text)', fontFamily: 'Inter' } }, DataStore.fmtNum(filtered.length)), '건 · 페이지 ', page, ' / ', totalPages),
        h(Pager, { page: page, total: totalPages, onPage: setPage })
      )
    ),

    // 노출시점 설정 — 고객사 수정 0527
    h('div', { className: 'acard no-print', style: { marginTop: 16 } },
      h('div', { className: 'acard-head' },
        h('h3', null, '수험번호 / 수험표 노출 시점 설정 (FO 접수확인)'),
        h('div', { className: 'meta' }, '고객사 수정 0527 — 부여 즉시 노출 안 함, 정해진 날짜에 FO에서 노출')
      ),
      h('div', { className: 'acard-body', style: { display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' } },
        h(FormRow, { label: '노출 시작일', hint: '이 날짜 이전에는 FO에서 수험번호 미노출' },
          h('input', { type: 'date', className: 'input', style: { height: 38, width: 200 }, defaultValue: '2026-08-15' })
        ),
        h(FormRow, { label: '노출 시작 시각' },
          h('input', { type: 'time', className: 'input', style: { height: 38, width: 140 }, defaultValue: '09:00' })
        ),
        // 버튼을 form-row 컬럼으로 감싸고, 빈 라벨로 라벨 높이만큼 자리만 차지시켜 입력칸과 같은 줄에 맞춤
        h('div', { className: 'form-row', style: { marginBottom: 0 } },
          h('label', { className: 'label', style: { visibility: 'hidden' } }, '\u00A0'),
          h('button', { className: 'btn btn-primary', style: { height: 38 }, onClick: () => { DataStore.addAudit({ type: '회차', targetId: sessionId, action: '수정', memo: '수험번호 노출 시점 변경' }); toastOk('노출 시점이 저장되었습니다.'); } }, '노출 시점 저장')
        )
      )
    ),

    // Detail LP (TPKM_BO_2_1_6) — 사진심사·수납(취소)·반려·승인을 모두 상세에서 처리
    detailId && h(ApplicantDetailLP, {
      id: detailId, onClose: () => setDetailId(null),
      onApprove: () => { setApproveModal({ ids: [detailId] }); },
      onReject: () => { setRejectModal({ ids: [detailId] }); },
      onPay: () => { const a = state.applicants.find(x => x.id === detailId); setPayModal({ ids: [detailId], mode: a?.paid ? 'cancel' : 'pay' }); },
      onPhotoApprove: doPhotoApprove,
      onPhotoReject: doPhotoReject
    }),

    // Modals
    payModal && h(PayModal, { modal: payModal, onClose: () => setPayModal(null), onPay: doPay, onCancel: doCancelPay, onPhotoApprove: doPhotoApprove }),
    approveModal && h(ApproveModal, { modal: approveModal, onClose: () => setApproveModal(null), onConfirm: () => doApprove(approveModal.ids) }),
    rejectModal && h(RejectModal, { modal: rejectModal, onClose: () => setRejectModal(null), onConfirm: (reason) => doReject(rejectModal.ids, reason) }),
    examModal && h(ExamAssignModal, { onClose: () => setExamModal(false), doAssign: doAssignExam }),
    excelModal && h(ExcelExportModal, { onClose: () => setExcelModal(false), rows: filtered }),
    zipModal && h(ZipExportModal, { onClose: () => setZipModal(false), rows: filtered }),

    h('style', null, `
        @media print {
          .no-print { display: none !important; }
          .sb, .tb, .panel-head .actions { display: none !important; }
          .app { display: block !important; }
          .mn { padding: 0 !important; }
          .dg-wrap { border: 0 !important; box-shadow: none !important; }
        }
      `)
  );
}

// ---- thumb (initial-based avatar with subtle gradient) ----
function PhotoThumb({ status, name, seed }) {
  if (status === 'pending') return h('div', { className: 'photo', style: { background: 'var(--st-photo-bg)', color: 'var(--st-photo)' } }, '미심사');
  if (status === 'rejected') return h('div', { className: 'photo', style: { background: 'var(--st-rejected-bg)', color: 'var(--st-rejected)' } }, '반려');
  const hue = (seed.charCodeAt(seed.length - 1) * 17) % 360;
  return h('div', { className: 'photo', style: { background: `linear-gradient(160deg, hsl(${hue} 35% 88%), hsl(${hue} 30% 78%))`, color: '#fff', fontSize: 13, fontWeight: 700 } },
    name.slice(0, 1)
  );
}

// ---- 사진 심사 상태 칩 (미심사 · 승인 · 반려) ----
function PhotoStatusPill({ status }) {
  if (status === 'approved') return h(Pill, { kind: 'approved' }, '승인');
  if (status === 'rejected') return h(Pill, { kind: 'rejected' }, '반려');
  return h(Pill, { kind: 'photo' }, '미심사');
}

// ===== 사진 심사 인라인 슬라이드 패널 (TPKM_BO_2_1_3) =====
const PHOTO_REJECT_REASONS = ['정면 아님', '모자·선글라스', '흑백', '흐림', '본인 아님', '기타'];
function PhotoReviewLP({ id, onClose, onApprove, onReject }) {
  const state = useStore();
  const a = state.applicants.find(x => x.id === id);
  const [mode, setMode] = useState(null); // null | 'reject'
  const [reason, setReason] = useState(PHOTO_REJECT_REASONS[0]);
  const [other, setOther] = useState('');
  const [zoom, setZoom] = useState(false);
  if (!a) return null;
  const venue = state.venues.find(v => v.id === a.venueId);
  const hue = (a.id.charCodeAt(a.id.length - 1) * 17) % 360;
  const finalReason = reason === '기타' ? other : (other ? `${reason} — ${other}` : reason);
  const approve = () => { onApprove(id); onClose(); };
  const reject = () => {
    if (reason === '기타' && !other.trim()) { toastErr('상세 사유를 입력해주세요.'); return; }
    onReject(id, finalReason); onClose();
  };
  return h(LP, {
    open: true, size: 'sm', onClose: onClose,
    title: `사진 심사 — ${a.nameKo}`,
    sub: h('span', null, '접수ID ', h('code', { className: 'code-id' }, a.id), ' · 현재 ', h(PhotoStatusPill, { status: a.photoStatus })),
    footer: mode === 'reject'
      ? h(Fragment, null,
          h('button', { className: 'btn btn-secondary', onClick: () => setMode(null) }, '뒤로'),
          h('button', { className: 'btn btn-danger', onClick: reject, disabled: reason === '기타' && !other.trim() }, '반려 처리')
        )
      : h(Fragment, null,
          h('button', { className: 'btn btn-secondary', onClick: onClose }, '닫기'),
          h('button', { className: 'btn btn-secondary', onClick: () => setMode('reject') }, '반려'),
          h('button', { className: 'btn btn-primary', onClick: approve }, '승인')
        )
  },
    h('div', { style: { display: 'flex', gap: 16 } },
      h('div', { style: { flex: '0 0 150px' } },
        a.photoStatus === 'rejected'
          ? h('div', { className: 'photo-lg', style: { background: 'var(--st-rejected-bg)', color: 'var(--st-rejected)' } }, '반려된 사진')
          : h('div', { className: 'photo-lg', onClick: () => setZoom(true), style: { cursor: 'zoom-in', background: `linear-gradient(160deg, hsl(${hue} 40% 84%), hsl(${hue} 35% 58%))`, color: '#fff', fontSize: 64, fontWeight: 700 } }, a.nameKo.slice(0, 1)),
        h('div', { style: { marginTop: 8, display: 'flex', gap: 6 } },
          h('button', { className: 'ibtn', style: { flex: 1 }, onClick: () => setZoom(true) }, h(I.Eye, { style: { width: 12, height: 12 } }), ' 원본'),
          h('button', { className: 'ibtn', style: { flex: 1 } }, h(I.Download, { style: { width: 12, height: 12 } }), ' 받기')
        )
      ),
      h('div', { style: { flex: 1 } },
        h('dl', { className: 'dl', style: { gridTemplateColumns: '78px 1fr' } },
          h('dt', null, '한글성명'), h('dd', null, a.nameKo),
          h('dt', null, '영문성명'), h('dd', null, a.nameEn),
          h('dt', null, '생년월일'), h('dd', null, h('code', null, a.dob)),
          h('dt', null, '성별'), h('dd', null, a.sx === 1 ? '남(1)' : '여(2)'),
          h('dt', null, '국적'), h('dd', null, a.nation),
          h('dt', null, '급수'), h('dd', null, 'TOPIK ', a.level),
          h('dt', null, '시험장'), h('dd', null, venue?.nameKo)
        )
      )
    ),

    mode === 'reject' && h('div', { style: { marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' } },
      h(FormRow, { label: '반려 사유', required: true, hint: '사유는 응시자 이메일·마이페이지에 안내됩니다(사진 재등록 요청).' },
        h('select', { className: 'select', value: reason, onChange: e => setReason(e.target.value) },
          PHOTO_REJECT_REASONS.map(r => h('option', { key: r }, r))
        )
      ),
      h(FormRow, { label: reason === '기타' ? '상세 사유' : '추가 안내(선택)', required: reason === '기타' },
        h('textarea', { className: 'textarea', rows: '2', value: other, onChange: e => setOther(e.target.value), placeholder: '예) 정면 사진이 아닙니다. 사진을 다시 등록해주세요.' })
      )
    ),

    h('div', { style: { marginTop: 14, fontSize: 11.5, color: 'var(--text-3)', background: 'var(--bg-2)', padding: 8, borderRadius: 6 } },
      'ⓘ 동시 작업 충돌 방지(낙관적 잠금) · 이미 다른 관리자가 처리한 경우 안내 후 새로고침됩니다. 처리 즉시 처리 이력에 기록됩니다.'
    ),

    zoom && h('div', { className: 'modal-backdrop open', style: { zIndex: 340 }, onClick: () => setZoom(false) },
      h('div', { style: { width: 'min(420px, 90vw)', aspectRatio: '3/4', borderRadius: 10, background: `linear-gradient(160deg, hsl(${hue} 40% 80%), hsl(${hue} 35% 48%))`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 160, fontWeight: 700 } }, a.nameKo.slice(0, 1))
    )
  );
}

// ===== Detail LP =====
function ApplicantDetailLP({ id, onClose, onApprove, onReject, onPay, onPhotoApprove, onPhotoReject }) {
  const state = useStore();
  const a = state.applicants.find(x => x.id === id);
  const [tab, setTab] = useState('profile');
  const [memo, setMemo] = useState('');
  if (!a) return null;
  const venue = state.venues.find(v => v.id === a.venueId);
  const log = state.audit.filter(l => l.targetId === id);

  const addMemo = () => {
    if (!memo.trim()) return;
    a.memo = (a.memo || '') + `[${new Date().toISOString().slice(0, 16).replace('T', ' ')}/${state.me?.id}] ${memo}\n`;
    DataStore.addAudit({ type: '접수자', targetId: id, action: '수정', memo: '관리자 메모 추가' });
    DataStore.notify();
    setMemo('');
    toastOk('메모가 추가되었습니다.');
  };

  return h(LP, {
    open: true, size: 'wide', onClose: onClose,
    title: `접수자 상세 — ${a.nameKo} (${a.nameEn})`,
    sub: h('span', null, '회차 컨텍스트 · 접수ID ', h('code', { className: 'code-id' }, a.id), ' · 상태 ', h(Pill, { kind: a.status }, DataStore.statusLabel(a.status))),
    footer: h(Fragment, null,
      h('button', { className: 'btn btn-secondary', onClick: onClose }, '닫기'),
      h('button', { className: 'btn btn-secondary', onClick: onPay }, a.paid ? '수납 취소' : '수납 처리'),
      h('button', { className: 'btn btn-danger', onClick: onReject, disabled: a.status === 'rejected' }, '반려'),
      h('button', { className: 'btn btn-primary', onClick: onApprove, disabled: a.status === 'approved' }, '승인')
    )
  },
    h('div', { className: 'lp-tabs' },
      h('button', { className: tab === 'profile' ? 'active' : '', onClick: () => setTab('profile') }, '기본 정보'),
      h('button', { className: tab === 'memo' ? 'active' : '', onClick: () => setTab('memo') }, '메모'),
      h('button', { className: tab === 'log' ? 'active' : '', onClick: () => setTab('log') }, '처리 이력 (', log.length, ')')
    ),

    tab === 'profile' && h('div', { style: { display: 'grid', gridTemplateColumns: '240px 1fr', gap: 24 } },
      h('div', null,
        h(PhotoLarge, { status: a.photoStatus, name: a.nameKo, seed: a.id }),
        h('div', { style: { marginTop: 10, display: 'flex', gap: 6 } },
          h('button', { className: 'ibtn', style: { flex: 1 } }, h(I.Download, { style: { width: 12, height: 12 } }), ' 원본 받기'),
          h('button', { className: 'ibtn', style: { flex: 1 } }, '회전 보정')
        ),
        // 사진 심사 — photos.js 로직을 상세에 병합 (승인 / 반려+사유)
        h(DetailPhotoReview, { a: a, onApprove: onPhotoApprove, onReject: onPhotoReject })
      ),
      h('div', null,
        h(FieldSet, { legend: '응시자 정보', cols: 2 },
          h(KV, { k: '한글 성명', v: a.nameKo }),
          h(KV, { k: '영문 성명', v: a.nameEn }),
          h(KV, { k: '생년월일', v: h('code', { className: 'code-id' }, a.dob) }),
          h(KV, { k: '성별', v: a.sx === 1 ? '남(1)' : '여(2)' }),
          h(KV, { k: '국적', v: a.nation }),
          h(KV, { k: '제1언어', v: a.l1 }),
          h(KV, { k: '직업', v: a.job }),
          h(KV, { k: '이메일', v: a.email }),
          h(KV, { k: '전화', v: a.tel }),
          h(KV, { k: '편의지원', v: a.accommodation ? '신청' : '미신청' })
        ),

        h(FieldSet, { legend: '시험 정보', cols: 2 },
          h(KV, { k: '급수', v: `TOPIK ${a.level}` }),
          h(KV, { k: '시험장', v: venue?.nameKo }),
          h(KV, { k: '사진 심사', v: h(PhotoStatusPill, { status: a.photoStatus }) }),
          h(KV, { k: '응시동기', v: a.motive }),
          h(KV, { k: '응시목적', v: a.purpose }),
          h(KV, { k: '수납 상태', v: a.paid ? h(Pill, { kind: 'approved' }, '수납완료') : h(Pill, { kind: 'pay' }, '미수납') }),
          h(KV, { k: '수납 일시', v: a.paidAt || '—' }),
          h(KV, { k: '영수증', v: a.receipt || '—' }),
          h(KV, { k: '수험번호', v: a.exam ? h('code', { className: 'code-id', style: { color: 'var(--st-number)', fontWeight: 700 } }, a.exam) : '미부여' }),
          h(KV, { k: '접수일시', v: a.appliedAt }),
          h(KV, { k: '반려 사유', v: a.rejectReason || '—' })
        )
      )
    ),

    tab === 'memo' && h('div', null,
      h(FormRow, { label: '새 메모 추가' },
        h('textarea', { className: 'textarea', rows: '3', value: memo, onChange: e => setMemo(e.target.value), placeholder: '이 응시자에 대한 관리자 메모를 입력하세요' })
      ),
      h('button', { className: 'btn btn-primary', onClick: addMemo, disabled: !memo.trim() }, '메모 추가'),
      h('hr', { style: { margin: '20px 0', border: 'none', borderTop: '1px solid var(--border)' } }),
      h('div', null,
        h('div', { className: 'label', style: { fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 } }, '지난 메모'),
        h('pre', { style: { background: 'var(--bg-2)', padding: 12, borderRadius: 6, fontSize: 12.5, whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: 'var(--text-2)', maxHeight: 280, overflow: 'auto' } }, a.memo || '메모 없음')
      )
    ),

    tab === 'log' && h('div', { className: 'timeline' },
      log.length === 0 && h('div', { className: 'empty' }, '처리 이력이 없습니다'),
      log.map(l => h('div', { key: l.id, className: `ev ${l.action === '승인' ? 'approved' : l.action === '반려' ? 'rejected' : ''}` },
        h('div', { className: 'when' }, l.ts),
        h('div', { className: 'what' }, l.type, ' · ', h('b', null, l.action)),
        h('div', { className: 'who' }, '처리자 ', h('code', { className: 'code-id' }, l.actor), ' · IP ', l.ip),
        l.memo && h('div', { className: 'note' }, l.memo)
      ))
    )
  );
}

// ===== 상세 내 사진 심사 (photos.js 로직 병합) — 승인 / 반려+사유 =====
function DetailPhotoReview({ a, onApprove, onReject }) {
  const [mode, setMode] = useState(null);   // null | 'reject'
  const [reason, setReason] = useState(PHOTO_REJECT_REASONS[0]);
  const [other, setOther] = useState('');
  // 대상이 바뀌면 입력 상태 초기화
  useEffect(() => { setMode(null); setReason(PHOTO_REJECT_REASONS[0]); setOther(''); }, [a.id]);
  const finalReason = reason === '기타' ? other : (other ? `${reason} — ${other}` : reason);
  const doReject = () => {
    if (reason === '기타' && !other.trim()) { toastErr('상세 사유를 입력해주세요.'); return; }
    onReject(a.id, finalReason);
    setMode(null); setOther('');
  };
  return h('div', { className: 'detail-photo-review', style: { marginTop: 10, padding: 12, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-2)' } },
    h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 } },
      h('div', { style: { fontWeight: 700, fontSize: 13, color: 'var(--text-2)' } }, '사진 심사'),
      h(PhotoStatusPill, { status: a.photoStatus })
    ),
    mode === 'reject'
      ? h(Fragment, null,
          h(FormRow, { label: '반려 사유', required: true, hint: '사유는 응시자 이메일·마이페이지에 안내됩니다(사진 재등록 요청).' },
            h('select', { className: 'select', value: reason, onChange: e => setReason(e.target.value) },
              PHOTO_REJECT_REASONS.map(r => h('option', { key: r }, r))
            )
          ),
          (reason === '기타') && h(FormRow, { label: '상세 사유', required: true },
            h('input', { className: 'input', value: other, onChange: e => setOther(e.target.value), placeholder: '상세 사유 입력' })
          ),
          h('div', { style: { display: 'flex', gap: 6, marginTop: 2 } },
            h('button', { className: 'btn btn-secondary', style: { flex: 1 }, onClick: () => setMode(null) }, '뒤로'),
            h('button', { className: 'btn btn-danger', style: { flex: 1 }, onClick: doReject }, '반려 처리')
          )
        )
      : h('div', { style: { display: 'flex', gap: 6 } },
          h('button', { className: 'btn btn-secondary', style: { flex: 1 }, disabled: a.photoStatus === 'rejected', onClick: () => setMode('reject') }, '반려'),
          h('button', { className: 'btn btn-primary', style: { flex: 1 }, disabled: a.photoStatus === 'approved', onClick: () => onApprove(a.id) }, '승인')
        )
  );
}

function KV({ k, v }) {
  return h('div', { className: 'form-row', style: { marginBottom: 0 } },
    h('div', { className: 'label', style: { fontSize: 11.5, color: 'var(--text-3)', marginBottom: 2 } }, k),
    h('div', { style: { fontSize: 14, color: 'var(--text)', fontWeight: 500 } }, v)
  );
}

function PhotoLarge({ status, name, seed }) {
  if (status === 'pending') return h('div', { className: 'photo-lg', style: { background: 'var(--st-photo-bg)', color: 'var(--st-photo)' } }, '사진 미심사');
  if (status === 'rejected') return h('div', { className: 'photo-lg', style: { background: 'var(--st-rejected-bg)', color: 'var(--st-rejected)' } }, '사진 반려');
  const hue = (seed.charCodeAt(seed.length - 1) * 17) % 360;
  return h('div', { className: 'photo-lg', style: { background: `linear-gradient(160deg, hsl(${hue} 35% 86%), hsl(${hue} 30% 70%))`, color: '#fff', fontSize: 80, fontWeight: 700 } },
    name.slice(0, 1)
  );
}

// ===== Pay modal (TPKM_BO_2_1_3) — 수납 / 수납취소(환불자) =====
function PayModal({ modal, onClose, onPay, onCancel, onPhotoApprove }) {
  const state = useStore();
  const [memo, setMemo] = useState('');
  const [receipt, setReceipt] = useState('');
  const [reason, setReason] = useState('본인 요청');
  const [reasonOther, setReasonOther] = useState('');
  const ids = modal.ids || [];
  const rows = ids.map(id => state.applicants.find(a => a.id === id)).filter(Boolean);
  if (!rows.length) return h(Modal, {
    open: true, onClose: onClose, title: '오프라인 수납 처리',
    footer: h('button', { className: 'btn btn-primary', onClick: onClose }, '확인')
  },
    h('div', null, '처리 가능한 대상이 없습니다.')
  );
  const session = state.sessions.find(s => s.id === rows[0].sessionId);
  const totalFee = rows.reduce((sum, a) => {
    if (a.level === 'Ⅰ') return sum + session.feeI;
    if (a.level === 'Ⅱ') return sum + session.feeII;
    return sum + session.feeI + session.feeII;
  }, 0);
  const cancelMode = modal.mode === 'cancel';
  const finalReason = reason === '기타' ? reasonOther : reason;

  return h(Modal, {
    open: true, onClose: onClose, title: cancelMode ? '수납 취소' : '오프라인 수납 처리', danger: cancelMode,
    footer: h(Fragment, null,
      h('button', { className: 'btn btn-secondary', onClick: onClose }, '취소'),
      cancelMode
        ? h('button', { className: 'btn btn-danger', onClick: () => onCancel(ids, finalReason), disabled: !finalReason.trim() }, '수납 취소')
        : h('button', { className: 'btn btn-primary', onClick: () => onPay(ids, { memo, receipt }) }, '수납 완료 처리')
    )
  },
    h('div', { style: { marginBottom: 14, fontSize: 13, color: 'var(--text-2)' } },
      '대상 ', h('b', null, rows.length), '건 · 합계 응시료 ', h('b', { style: { color: 'var(--primary)' } }, DataStore.fmtCurrency(totalFee)),
      h('div', { style: { fontSize: 12, color: 'var(--text-3)', marginTop: 2 } },
        cancelMode
          ? '※ 수납을 취소하면 미수납(수납대기) 상태로 되돌아갑니다. 수험번호는 유지됩니다.'
          : '※ 행 단위 낙관적 잠금 · 처리 즉시 관리자 처리 이력에 기록됩니다.'
      )
    ),

    // 사진/기본정보 동시 확인 (고객사 수정 0526) — 사진 미심사 건은 모달 내 사진 승인 가능
    h('div', { style: { maxHeight: 240, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 6, marginBottom: 14 } },
      h('table', { className: 'dg', style: { fontSize: 12 } },
        h('thead', null, h('tr', null, h('th', null, '사진'), h('th', null, '한글성명'), h('th', null, '영문성명'), h('th', null, '생년월일'), h('th', null, '급수'), h('th', null, '시험장'), h('th', null, '사진심사'), h('th', null, '현 상태'))),
        h('tbody', null,
          rows.map(a => h('tr', { key: a.id },
            h('td', null, h(PhotoThumb, { status: a.photoStatus, name: a.nameKo, seed: a.id })),
            h('td', null, a.nameKo),
            h('td', null, a.nameEn),
            h('td', { className: 'code' }, a.dob),
            h('td', null, a.level),
            h('td', null, DataStore.venueName(a.venueId)),
            h('td', null,
              a.photoStatus === 'pending'
                ? h('button', { className: 'ibtn', onClick: () => onPhotoApprove(a.id) }, '사진 승인')
                : h(PhotoStatusPill, { status: a.photoStatus })
            ),
            h('td', null, h(Pill, { kind: a.status }, DataStore.statusLabel(a.status)))
          ))
        )
      )
    ),

    cancelMode
      ? h(Fragment, null,
          h(FormRow, { label: '취소 사유', required: true },
            h('select', { className: 'select', value: reason, onChange: e => setReason(e.target.value) },
              ['본인 요청', '중복 접수', '정보 오류', '기타'].map(r => h('option', { key: r }, r))
            )
          ),
          reason === '기타' && h(FormRow, { label: '상세 사유', required: true },
            h('textarea', { className: 'textarea', rows: '2', value: reasonOther, onChange: e => setReasonOther(e.target.value) })
          )
        )
      : h(Fragment, null,
          h(FormRow, { label: '영수증 번호(선택)' },
            h('input', { className: 'input', placeholder: '예) R-12345', value: receipt, onChange: e => setReceipt(e.target.value) })
          ),
          h(FormRow, { label: '메모(선택)' },
            h('textarea', { className: 'textarea', rows: '2', placeholder: '예) 양곤대 흘라잉캠퍼스 1층 접수 데스크', value: memo, onChange: e => setMemo(e.target.value) })
          )
        )
  );
}

// ===== Approve modal (TPKM_BO_2_1_4) =====
function ApproveModal({ modal, onClose, onConfirm }) {
  const state = useStore();
  const ids = modal.ids;
  const rows = ids.map(id => state.applicants.find(a => a.id === id)).filter(Boolean);
  const blocked = rows.filter(a => a.photoStatus !== 'approved');
  return h(Modal, {
    open: true, onClose: onClose, title: '접수자 승인 처리',
    footer: h(Fragment, null,
      h('button', { className: 'btn btn-secondary', onClick: onClose }, '취소'),
      h('button', { className: 'btn btn-primary', onClick: onConfirm, disabled: blocked.length > 0 }, '승인 완료')
    )
  },
    h('div', { style: { fontSize: 13, color: 'var(--text-2)' } },
      '대상 ', h('b', null, rows.length), '건을 승인합니다. 승인 완료 시 응시자에게 이메일이 발송됩니다(문자 제외).'
    ),
    blocked.length > 0 && h('div', { style: { marginTop: 12, padding: 10, background: 'var(--danger-50)', color: 'var(--danger)', borderRadius: 6, fontSize: 12.5 } },
      '⚠ 사진 미심사 ', h('b', null, blocked.length), '건이 포함되어 있습니다. 사진 심사 메뉴에서 먼저 심사해 주세요.',
      h('ul', { style: { marginTop: 6, paddingLeft: 16 } },
        blocked.slice(0, 5).map(a => h('li', { key: a.id }, a.nameKo, ' (', a.nameEn, ')'))
      )
    )
  );
}

// ===== Reject modal (TPKM_BO_2_1_5) =====
function RejectModal({ modal, onClose, onConfirm }) {
  const state = useStore();
  const [reason, setReason] = useState(REJECT_REASONS[0]);
  const [other, setOther] = useState('');
  const ids = modal.ids;
  const rows = ids.map(id => state.applicants.find(a => a.id === id)).filter(Boolean);
  const final = reason === '기타' ? other : (other ? `${reason} — ${other}` : reason);
  return h(Modal, {
    open: true, onClose: onClose, title: '접수자 반려 처리', danger: true,
    footer: h(Fragment, null,
      h('button', { className: 'btn btn-secondary', onClick: onClose }, '취소'),
      h('button', { className: 'btn btn-danger', onClick: () => onConfirm(final), disabled: reason === '기타' && !other.trim() }, '반려 처리')
    )
  },
    h('div', { style: { fontSize: 13, color: 'var(--text-2)', marginBottom: 10 } },
      '대상 ', h('b', null, rows.length), '건 · 반려 사유는 응시자 이메일/마이페이지에 안내됩니다.'
    ),
    h(FormRow, { label: '반려 사유', required: true },
      h('select', { className: 'select', value: reason, onChange: e => setReason(e.target.value) },
        REJECT_REASONS.map(r => h('option', { key: r }, r))
      )
    ),
    h(FormRow, { label: reason === '기타' ? '상세 사유' : '추가 안내 (선택)', required: reason === '기타' },
      h('textarea', { className: 'textarea', rows: '3', value: other, onChange: e => setOther(e.target.value), placeholder: '예) 정면 사진이 아닙니다. 사진 재등록 후 다시 접수해주세요.' })
    )
  );
}

// ===== 수험번호 일괄 부여 (TPKM_BO_2_1_7) =====
function ExamAssignModal({ onClose, doAssign }) {
  const [preview, setPreview] = useState(null);
  useEffect(() => { setPreview(doAssign(true)); }, []);
  if (!preview) return null;
  const confirm = () => { doAssign(false); onClose(); };
  return h(Modal, {
    open: true, onClose: onClose, title: '수험번호 13자리 일괄 부여',
    footer: h(Fragment, null,
      h('button', { className: 'btn btn-secondary', onClick: onClose }, '취소'),
      h('button', { className: 'btn btn-primary', onClick: confirm, disabled: preview.result.length === 0 }, preview.result.length, '건 일괄 부여')
    )
  },
    h('div', { style: { fontSize: 13, color: 'var(--text-2)' } },
      h('p', null, '① 국가코드(3) ', h('b', null, '025'), ' + ② 지역코드(3) + ③ 수준코드(1) ', h('b', null, '7=Ⅰ / 8=Ⅱ'), ' + ④ 시험장코드(2) + ⑤ 응시자코드(4) — 영문 성명 알파벳 오름차순.'),
      h('p', { style: { marginTop: 4, color: 'var(--text-3)', fontSize: 12 } },
        '대상: 수납 완료 + 사진 승인 + 비반려/비취소 · 환불자는 수험번호 유지', h('br'),
        '이메일 발송: ', h('b', { style: { color: 'var(--danger)' } }, '안 함'), ' (고객사 수정 0527) · 노출 시점: 별도 설정한 날짜에 FO 접수확인 페이지에서 공개'
      )
    ),
    h('div', { className: 'kpi-grid', style: { margin: '14px 0' } },
      h('div', { className: 'kpi' }, h('div', { className: 'label' }, '부여 대상'), h('div', { className: 'val' }, preview.result.length)),
      h('div', { className: 'kpi' }, h('div', { className: 'label' }, '제외(누락 사유)'), h('div', { className: 'val' }, preview.skipped || 0))
    ),
    h('div', { style: { maxHeight: 260, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 6 } },
      h('table', { className: 'dg', style: { fontSize: 12 } },
        h('thead', null, h('tr', null, h('th', null, '한글성명'), h('th', null, '영문성명'), h('th', null, '급수'), h('th', null, '수험번호(미리보기)'))),
        h('tbody', null,
          preview.result.slice(0, 50).map(r => h('tr', { key: r.id },
            h('td', null, r.nameKo), h('td', null, r.name),
            h('td', null, r.level),
            h('td', null, h('code', { className: 'code-id', style: { color: 'var(--st-number)', fontWeight: 700 } }, r.exam))
          ))
        )
      ),
      preview.result.length > 50 && h('div', { style: { padding: 8, textAlign: 'center', fontSize: 12, color: 'var(--text-3)', background: 'var(--bg-2)' } }, '… 외 ', preview.result.length - 50, '건')
    )
  );
}

// ===== 엑셀(연명부 양식) 내보내기 (TPKM_BO_2_1_8) =====
function ExcelExportModal({ onClose, rows }) {
  const state = useStore();
  const [mode, setMode] = useState('current'); // current | full
  // group rows by (시험장, 급수)
  const groups = useMemo(() => {
    const m = new Map();
    rows.forEach(a => {
      const venue = state.venues.find(v => v.id === a.venueId);
      const key = `${a.level}_미얀마_${venue?.nameKo || '미지정'}`;
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(a);
    });
    return Array.from(m.entries()).map(([k, v]) => ({ k, n: v.length }));
  }, [rows, state.venues]);
  const session = state.sessions.find(s => s.id === state.activeSessionId);

  const doExport = () => {
    const role = (DataStore.getAdminSession && DataStore.getAdminSession()?.role) || 'super';
    if (window.TOPIKBoBridge && !TOPIKBoBridge.enforcePerm(role, '접수 관리|엑셀·사진 zip 다운로드', 'execute')) return;
    const run = () => {
      DataStore.addAudit({ type: '접수자', targetId: '—', action: '게시', memo: `연명부 엑셀 내보내기(${rows.length}건, ${mode === 'full' ? '회차전체 zip' : '현재 필터'})` });
      toastOk(`${rows.length}건의 연명부 엑셀 파일을 생성했습니다.`, { title: '엑셀 생성 완료' });
      onClose();
    };
    if (window.TOPIKBoBridge) {
      TOPIKBoBridge.exportRosterExcel({ mode, rows, state }).then(run).catch(e => toastErr(e.message || '엑셀 생성 실패'));
      return;
    }
    run();
  };
  return h(Modal, {
    open: true, onClose: onClose, title: '연명부 양식 엑셀 내보내기',
    footer: h(Fragment, null,
      h('button', { className: 'btn btn-secondary', onClick: onClose }, '취소'),
      h('button', { className: 'btn btn-primary', onClick: doExport }, '다운로드')
    )
  },
    h('div', { style: { fontSize: 13, color: 'var(--text-2)' } },
      h('b', null, '11컬럼'), '(연락처/이메일 제외): 한글성명 · 영문성명 · 생년월일 · 성별 · 국적 · 제1언어 · 직업 · 응시동기 · 응시목적 · 급수 · 수험번호'
    ),
    h('div', { className: 'seg', style: { marginTop: 12 } },
      h('button', { className: mode === 'current' ? 'active' : '', onClick: () => setMode('current') }, '현재 필터(', rows.length, ')'),
      h('button', { className: mode === 'full' ? 'active' : '', onClick: () => setMode('full') }, '회차 전체(시험장×수준별 zip)')
    ),
    h('div', { style: { marginTop: 16 } },
      h('div', { className: 'label', style: { fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 } }, '생성될 파일 미리보기'),
      h('div', { style: { background: 'var(--bg-2)', borderRadius: 6, padding: 12, fontSize: 12.5, fontFamily: 'Inter, monospace', color: 'var(--text-2)', maxHeight: 200, overflow: 'auto' } },
        mode === 'current'
          ? h('div', null, '제', session?.no, '회 TOPIK 지원자 연명부(미얀마_혼합).xlsx ', h('span', { style: { color: 'var(--text-3)' } }, '(', rows.length, '행)'))
          : groups.map(g => h('div', { key: g.k }, '제', session?.no, '회 TOPIK 지원자 연명부(TOPIK_', g.k, ').xlsx ', h('span', { style: { color: 'var(--text-3)' } }, '(', g.n, '행)')))
      ),
      h('div', { style: { marginTop: 10, fontSize: 12, color: 'var(--text-3)' } }, '※ 응시자코드 순으로 정렬(연명부 ‘작성된 수험번호 순으로 시험실 배치’ 원칙).')
    )
  );
}

// ===== 사진 zip 다운로드 (TPKM_BO_2_1_9) =====
function ZipExportModal({ onClose, rows }) {
  const state = useStore();
  const includeMissing = useMemo(() => rows.some(a => !a.photoOk || a.status === 'rejected'), [rows]);
  const missingCount = rows.filter(a => !a.photoOk || a.status === 'rejected').length;
  const doExport = () => {
    const role = (DataStore.getAdminSession && DataStore.getAdminSession()?.role) || 'super';
    if (window.TOPIKBoBridge && !TOPIKBoBridge.enforcePerm(role, '접수 관리|엑셀·사진 zip 다운로드', 'execute')) return;
    const done = () => {
      DataStore.addAudit({ type: '접수자', targetId: '—', action: '게시', memo: `사진 zip 다운로드(${rows.length}건, 폴더구조 {지역}/{시험장}/TOPIK_{급수}/{수험번호}.jpg)` });
      toastOk(`${rows.length - missingCount}장의 사진 zip 파일을 생성했습니다.`, { title: 'ZIP 생성 완료' });
      onClose();
    };
    if (window.TOPIKBoBridge) {
      TOPIKBoBridge.exportPhotosZip({ rows, state }).then(done).catch(e => toastErr(e.message || 'ZIP 생성 실패'));
      return;
    }
    done();
  };
  return h(Modal, {
    open: true, onClose: onClose, title: '사진 일괄 다운로드 (zip)',
    footer: h(Fragment, null,
      h('button', { className: 'btn btn-secondary', onClick: onClose }, '취소'),
      h('button', { className: 'btn btn-primary', onClick: doExport }, '다운로드')
    )
  },
    h('div', { style: { fontSize: 13, color: 'var(--text-2)', marginBottom: 12 } },
      'zip 폴더 구조 · 파일명은 ', h('b', null, '13자리 수험번호 + .jpg'), ' (다른 정보 포함 금지)'
    ),
    h('div', { style: { background: 'var(--bg-2)', borderRadius: 6, padding: 12, fontSize: 12, fontFamily: 'Inter, monospace', color: 'var(--text-2)' } },
`└─ 미얀마/
   ├─ 양곤대 흘라잉캠퍼스/
   │  ├─ TOPIK_Ⅰ/
   │  │   ├─ 0250017010001.jpg
   │  │   └─ 0250017010002.jpg
   │  └─ TOPIK_Ⅱ/
   │      └─ 0250018010001.jpg
   ├─ 한국문화원/
   │  └─ ...
   └─ 누락_리포트.xlsx  (사진 누락/반려/규격 미충족)`
    ),
    includeMissing && h('div', { style: { marginTop: 12, padding: 10, background: 'var(--st-photo-bg)', color: 'var(--st-photo)', borderRadius: 6, fontSize: 12.5 } },
      '⚠ 사진 누락·반려·규격 미충족 ', h('b', null, missingCount), '건은 누락 리포트로 동봉됩니다.'
    ),
    h('div', { style: { marginTop: 12, fontSize: 12, color: 'var(--text-3)' } }, '※ 대용량 zip 다운로드는 비동기 작업 큐로 처리되며 완료 후 다운로드 링크를 알림으로 발송합니다.')
  );
}

// quick icon
I.Hash = (p) => h('svg', Object.assign({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }, p), h('path', { d: 'M4 9h16M4 15h16M10 3 8 21M16 3l-2 18' }));

window.ApplicantsPanel = ApplicantsPanel;
// 사진 심사 패널(photos.jsx)에서 재사용할 수 있도록 노출
window.PhotoReviewLP = PhotoReviewLP;
window.PhotoLarge = PhotoLarge;
window.PhotoStatusPill = PhotoStatusPill;
window.PhotoThumb = PhotoThumb;
