/* ============================================================
   panels/dashboard.js — 대시보드 (vanilla port of dashboard.jsx)
   ============================================================ */

function DashboardPanel() {
  const state = useStore();
  const me = state.me;
  const session = state.sessions.find(s => s.id === state.activeSessionId);
  const apps = useMemo(() => state.applicants.filter(a => a.sessionId === state.activeSessionId),
                       [state.applicants, state.activeSessionId]);

  // KPI 카운트
  const cnt = useMemo(() => {
    const c = { total: apps.length, applied: 0, photo: 0, pay: 0, approved: 0, rejected: 0, cancel: 0, refund: 0, exam: 0 };
    apps.forEach(a => {
      if (a.exam) c.exam++;
      const s = a.status;
      if (c[s] !== undefined) c[s]++;
    });
    c.photo = apps.filter(a => a.photoStatus === 'pending' && a.status !== 'cancel').length;
    return c;
  }, [apps]);

  // 시험장별 분포
  const byVenue = useMemo(() => {
    const m = new Map();
    apps.filter(a => a.status !== 'cancel').forEach(a => m.set(a.venueId, (m.get(a.venueId) || 0) + 1));
    return Array.from(m.entries()).map(([vid, n]) => ({ venue: state.venues.find(v => v.id === vid), n }))
      .sort((a, b) => b.n - a.n);
  }, [apps, state.venues]);

  // 급수별
  const byLevel = useMemo(() => {
    const m = { 'Ⅰ': 0, 'Ⅱ': 0, '동시': 0 };
    apps.filter(a => a.status !== 'cancel').forEach(a => { m[a.level] = (m[a.level] || 0) + 1; });
    return m;
  }, [apps]);

  const lvlMax = Math.max(byLevel['Ⅰ'], byLevel['Ⅱ'], byLevel['동시'], 1);
  const venueMax = Math.max(...byVenue.map(x => x.n), 1);

  // 최근 접수자
  const recent = useMemo(() => apps.slice().sort((a, b) => b.appliedAt.localeCompare(a.appliedAt)).slice(0, 6), [apps]);
  // 최근 처리 이력
  const recentLog = useMemo(() => state.audit.slice(0, 8), [state.audit]);

  // 최근 게시판 (공지 / 환불·정정 / 문의)
  const recentNotices = useMemo(() => state.notices.slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 4), [state.notices]);
  const recentRefunds = useMemo(() => state.refunds.slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 4), [state.refunds]);
  const recentInquiries = useMemo(() => state.inquiries.slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 4), [state.inquiries]);

  // 게시판 대기 KPI — 사이드바 배지와 동일 집계(환불·정정 대기 / 문의 답변 대기)
  const boardBadges = DataStore.badges();

  return h(Fragment, null,
    h('div', { className: 'panel-head' },
      h('div', null,
        h('h1', null, '안녕하세요, ', me?.name || '관리자', '님'),
        h('div', { className: 'sub' },
          '현재 회차 · ', h('strong', { style: { color: 'var(--text-2)' } }, session?.name), ' · ',
          '접수기간 ', h('code', { className: 'code-id' }, session?.applyStart, ' ~ ', session?.applyEnd), ' · ',
          '시험일 ', h('code', { className: 'code-id' }, session?.examDate)
        )
      ),
      h('div', { className: 'actions' },
        h('a', { className: 'btn btn-primary', href: '#applicants' }, h(I.Users, { style: { width: 14, height: 14 } }), ' 접수자 목록')
      )
    ),

    // KPI Grid
    h('div', { className: 'kpi-grid' },
      h(Kpi, { color: '#0F1B2D', label: '전체 접수자', val: cnt.total, hint: `회차 ${session?.no}` }),
      h(Kpi, { color: 'var(--st-applied)', label: '접수완료', val: cnt.applied, hint: '미처리' }),
      h(Kpi, { color: 'var(--st-photo)', label: '사진심사 대기', val: cnt.photo, hint: '검토 필요' }),
      h(Kpi, { color: 'var(--st-pay)', label: '수납대기', val: cnt.pay, hint: '오프라인 수납' }),
      h(Kpi, { color: 'var(--st-approved)', label: '승인완료', val: cnt.approved, hint: '' }),
      h(Kpi, { color: 'var(--st-rejected)', label: '반려', val: cnt.rejected, hint: '' }),
      h(Kpi, { color: 'var(--st-cancel)', label: '취소', val: cnt.cancel, hint: '' }),
      h(Kpi, { color: 'var(--st-number)', label: '수험번호 부여', val: cnt.exam, hint: '13자리 채번 완료' }),
      h(Kpi, { color: 'var(--st-rejected)', label: '환불·정정 대기', val: boardBadges.refundNew, hint: '답변 대기' }),
      h(Kpi, { color: 'var(--st-photo)', label: '문의 답변 대기', val: boardBadges.inquiryWait, hint: '미답변' })
    ),

    // Two-column row
    h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 16, marginBottom: 16 }, className: 'dash-row' },
      // Status distribution + venue chart
      h('div', { className: 'acard' },
        h('div', { className: 'acard-head' },
          h('h3', null, '회차 ', session?.no, ' 분포'),
          h('div', { className: 'meta' }, '접수 / 처리 / 시험장별 / 급수별')
        ),
        h('div', { className: 'acard-body' },
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 } },
            h('div', null,
              h('div', { style: { fontSize: 12, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 } }, '시험장별 접수'),
              h('div', { className: 'barchart' },
                byVenue.map(({ venue, n }) => h('div', { className: 'row', key: venue?.id },
                  h('div', { className: 'label', title: venue?.nameKo }, venue?.nameKo),
                  h('div', { className: 'track' }, h('div', { className: 'fill', style: { width: `${(n / venueMax) * 100}%` } })),
                  h('div', { className: 'val' }, DataStore.fmtNum(n))
                )),
                !byVenue.length && h('div', { className: 'empty', style: { padding: '12px 0' } }, '데이터 없음')
              )
            ),
            h('div', null,
              h('div', { style: { fontSize: 12, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 } }, '급수별 접수'),
              h('div', { className: 'barchart' },
                ['Ⅰ', 'Ⅱ', '동시'].map(l => h('div', { className: 'row', key: l },
                  h('div', { className: 'label' }, 'TOPIK ', l),
                  h('div', { className: 'track' }, h('div', { className: 'fill', style: { width: `${(byLevel[l] / lvlMax) * 100}%`, background: l === 'Ⅰ' ? 'var(--primary)' : l === 'Ⅱ' ? 'var(--st-number)' : 'var(--success)' } })),
                  h('div', { className: 'val' }, DataStore.fmtNum(byLevel[l]))
                ))
              ),
              h('div', { style: { marginTop: 16, fontSize: 12, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 } }, '회차 진행률'),
              h('div', { className: 'barchart' },
                h('div', { className: 'row' },
                  h('div', { className: 'label' }, '정원 대비'),
                  h('div', { className: 'track' },
                    h('div', { className: 'fill', style: { width: `${Math.min(100, (cnt.total / (session?.cap || 1)) * 100)}%`, background: 'var(--primary)' } })
                  ),
                  h('div', { className: 'val' }, Math.round((cnt.total / (session?.cap || 1)) * 100), '%')
                ),
                h('div', { className: 'row' },
                  h('div', { className: 'label' }, '승인 처리율'),
                  h('div', { className: 'track' },
                    h('div', { className: 'fill', style: { width: `${cnt.total ? Math.min(100, (cnt.approved / cnt.total) * 100) : 0}%`, background: 'var(--success)' } })
                  ),
                  h('div', { className: 'val' }, cnt.total ? Math.round((cnt.approved / cnt.total) * 100) : 0, '%')
                )
              )
            )
          )
        )
      ),

      // Recent applicants
      h('div', { className: 'acard' },
        h('div', { className: 'acard-head' },
          h('h3', null, '최근 접수자'),
          h('a', { className: 'ibtn ghost', href: '#applicants' }, '전체 보기 ', h(I.ChevronRight, { style: { width: 12, height: 12 } }))
        ),
        h('div', { className: 'acard-body flush' },
          h('div', { className: 'rlist' },
            recent.map(a => h('div', { key: a.id, className: 'ri', onClick: () => { location.hash = 'applicants'; setTimeout(() => window.openApplicantDetail && window.openApplicantDetail(a.id), 200); } },
              h('div', null,
                h('div', { className: 'nm' }, a.nameKo, ' ', h('span', { style: { color: 'var(--text-3)', fontWeight: 400, fontSize: 12 } }, '(', a.nameEn, ')')),
                h('div', { className: 'sub' }, DataStore.venueName(a.venueId), ' · TOPIK ', a.level)
              ),
              h(Pill, { kind: a.status }, DataStore.statusLabel(a.status)),
              h('div', { className: 'date' }, a.appliedAt.split(' ')[0])
            )),
            !recent.length && h('div', { className: 'empty' }, '데이터 없음')
          )
        )
      )
    ),

    // Bottom row: 최근 처리 이력 + 빠른 통계
    h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 16 }, className: 'dash-row' },
      h('div', { className: 'acard' },
        h('div', { className: 'acard-head' },
          h('h3', null, '최근 관리자 처리 이력'),
          h('a', { className: 'ibtn ghost', href: '#audit' }, '전체 보기 ', h(I.ChevronRight, { style: { width: 12, height: 12 } }))
        ),
        h('div', { className: 'acard-body flush' },
          h('div', { className: 'dg-scroll' },
            h('table', { className: 'dg' },
              h('thead', null, h('tr', null, h('th', null, '시각'), h('th', null, '처리자'), h('th', null, '대상'), h('th', null, '액션'), h('th', null, '메모'))),
              h('tbody', null,
                recentLog.map(l => h('tr', { key: l.id },
                  h('td', { className: 'code' }, l.ts),
                  h('td', null, l.actor),
                  h('td', null, l.type, ' · ', h('span', { className: 'code-id' }, l.targetId)),
                  h('td', null, h('span', { className: 'pill', style: { background: 'var(--bg-3)' } }, l.action)),
                  h('td', { className: 'muted' }, l.memo || '—')
                ))
              )
            )
          )
        )
      ),

      h('div', { className: 'acard' },
        h('div', { className: 'acard-head' },
          h('h3', null, '회차 기본 정보')
        ),
        h('div', { className: 'acard-body', style: { display: 'flex', flexDirection: 'column', gap: 10 } },
          h('div', { className: 'kv' }, h('span', { className: 'k' }, '접수 기간'), h('span', { className: 'v', style: { fontSize: 13 } }, session?.applyStart, ' ~ ', session?.applyEnd)),
          h('div', { className: 'kv' }, h('span', { className: 'k' }, '시험일'), h('span', { className: 'v' }, session?.examDate)),
          h('div', { className: 'kv' }, h('span', { className: 'k' }, '합격자 발표'), h('span', { className: 'v' }, session?.resultDate)),
          h('div', { className: 'kv' }, h('span', { className: 'k' }, '정원'), h('span', { className: 'v' }, DataStore.fmtNum(session?.cap || 0), '명')),
          h('div', { className: 'kv' }, h('span', { className: 'k' }, '응시료 (Ⅰ / Ⅱ)'), h('span', { className: 'v', style: { fontSize: 13 } }, DataStore.fmtCurrency(session?.feeI || 0), ' / ', DataStore.fmtCurrency(session?.feeII || 0))),
          h('div', { style: { marginTop: 6 } },
            h('a', { className: 'btn btn-secondary btn-block', href: '#sessions' }, '회차 상세 편집')
          )
        )
      )
    ),

    // 최근 게시판 (공지 / 환불·정정 / 문의)
    h('div', { className: 'acard', style: { marginTop: 16 } },
      h('div', { className: 'acard-head' },
        h('h3', null, '최근 게시판'),
        h('div', { className: 'meta' }, '공지사항 · 환불·정보정정 · 문의 게시판 최신 글')
      ),
      h('div', { className: 'acard-body' },
        h('div', { className: 'board-recent' },
          h('div', { className: 'col' },
            h('div', { className: 'col-head' }, h('span', null, '공지사항'), h('a', { className: 'ibtn ghost', href: '#notices' }, '전체 ', h(I.ChevronRight, { style: { width: 12, height: 12 } }))),
            recentNotices.map(n => h('a', { key: n.id, className: 'bi', href: '#notices' },
              h('span', { className: 't' }, n.pin && h(I.Bookmark, { style: { width: 11, height: 11, color: 'var(--accent)', verticalAlign: '-1px', marginRight: 3 } }), n.title),
              h('span', { className: 'd' }, (n.createdAt || '').split(' ')[0])
            )),
            !recentNotices.length && h('div', { className: 'empty' }, '데이터 없음')
          ),
          h('div', { className: 'col' },
            h('div', { className: 'col-head' }, h('span', null, '환불·정보정정'), h('a', { className: 'ibtn ghost', href: '#refunds' }, '전체 ', h(I.ChevronRight, { style: { width: 12, height: 12 } }))),
            recentRefunds.map(r => h('a', { key: r.id, className: 'bi', href: '#refunds' },
              h('span', { className: 't' }, h('span', { className: 'pill', style: { background: 'var(--bg-3)', marginRight: 4 } }, r.type), r.title),
              h('span', { className: 'd' }, (r.createdAt || '').split(' ')[0])
            )),
            !recentRefunds.length && h('div', { className: 'empty' }, '데이터 없음')
          ),
          h('div', { className: 'col' },
            h('div', { className: 'col-head' }, h('span', null, '문의 게시판'), h('a', { className: 'ibtn ghost', href: '#inquiries' }, '전체 ', h(I.ChevronRight, { style: { width: 12, height: 12 } }))),
            recentInquiries.map(q => h('a', { key: q.id, className: 'bi', href: '#inquiries' },
              h('span', { className: 't' }, q.secret && h(I.Lock, { style: { width: 11, height: 11, verticalAlign: '-1px', marginRight: 3 } }), q.title),
              h('span', { className: 'd' }, (q.createdAt || '').split(' ')[0])
            )),
            !recentInquiries.length && h('div', { className: 'empty' }, '데이터 없음')
          )
        )
      )
    ),

    h('style', null, `
        @media (max-width: 1023px) { .dash-row { grid-template-columns: 1fr !important; } }
        .board-recent { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        @media (max-width: 1023px) { .board-recent { grid-template-columns: 1fr; } }
        .board-recent .col-head { display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: 700; color: var(--text-3); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 8px; }
        .board-recent .bi { display: flex; justify-content: space-between; gap: 10px; padding: 7px 0; border-bottom: 1px solid var(--border); font-size: 12.5px; color: var(--text-2); }
        .board-recent .bi:last-child { border-bottom: 0; }
        .board-recent .bi:hover { color: var(--primary); }
        .board-recent .bi .t { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .board-recent .bi .d { color: var(--text-4); white-space: nowrap; font-size: 11.5px; }
      `)
  );
}

function Kpi({ color, label, val, hint }) {
  return h('div', { className: 'kpi' },
    h('div', { className: 'label' }, h('span', { className: 'dot', style: { background: color } }), label),
    h('div', { className: 'val' }, DataStore.fmtNum(val)),
    hint && h('div', { className: 'delta' }, hint)
  );
}

window.DashboardPanel = DashboardPanel;
