/* ============================================================
   panels/dashboard.jsx — 대시보드
   per docs/01_dashboard.md:
   - 회차 컨텍스트 카드
   - KPI 카드 (전체/접수완료/수납대기/승인완료/반려/취소/사진심사대기/수험번호부여완료)
   - 최근 접수자 위젯
   - 처리 이력 위젯 (최근 활동)
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

  return (
    <>
      <div className="panel-head">
        <div>
          <h1>안녕하세요, {me?.name || '관리자'}님</h1>
          <div className="sub">
            현재 회차 · <strong style={{ color: 'var(--text-2)' }}>{session?.name}</strong> ·
            접수기간 <code className="code-id">{session?.applyStart} ~ {session?.applyEnd}</code> ·
            시험일 <code className="code-id">{session?.examDate}</code>
          </div>
        </div>
        <div className="actions">
          <a className="btn btn-secondary" href="#applicants"><I.Users style={{ width:14, height:14 }}/> 접수자 목록</a>
          <a className="btn btn-primary" href="#applicants"><I.Image style={{ width:14, height:14 }}/> 사진 심사</a>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">
        <Kpi color="#0F1B2D"        label="전체 접수자"   val={cnt.total}     hint={`회차 ${session?.no}`}/>
        <Kpi color="var(--st-applied)"   label="접수완료"     val={cnt.applied}   hint="미처리"/>
        <Kpi color="var(--st-photo)"     label="사진심사 대기" val={cnt.photo}    hint="검토 필요"/>
        <Kpi color="var(--st-pay)"       label="수납대기"     val={cnt.pay}      hint="오프라인 수납"/>
        <Kpi color="var(--st-approved)"  label="승인완료"     val={cnt.approved} hint=""/>
        <Kpi color="var(--st-rejected)"  label="반려"         val={cnt.rejected} hint=""/>
        <Kpi color="var(--st-cancel)"    label="취소"         val={cnt.cancel}   hint=""/>
        <Kpi color="var(--st-number)"    label="수험번호 부여" val={cnt.exam}     hint="13자리 채번 완료"/>
      </div>

      {/* Two-column row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 16, marginBottom: 16 }}
           className="dash-row">
        {/* Status distribution + venue chart */}
        <div className="acard">
          <div className="acard-head">
            <h3>회차 {session?.no} 분포</h3>
            <div className="meta">접수 / 처리 / 시험장별 / 급수별</div>
          </div>
          <div className="acard-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>시험장별 접수</div>
                <div className="barchart">
                  {byVenue.map(({ venue, n }) => (
                    <div className="row" key={venue?.id}>
                      <div className="label" title={venue?.nameKo}>{venue?.nameKo}</div>
                      <div className="track"><div className="fill" style={{ width: `${(n/venueMax)*100}%` }}/></div>
                      <div className="val">{DataStore.fmtNum(n)}</div>
                    </div>
                  ))}
                  {!byVenue.length && <div className="empty" style={{ padding: '12px 0' }}>데이터 없음</div>}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>급수별 접수</div>
                <div className="barchart">
                  {['Ⅰ','Ⅱ','동시'].map(l => (
                    <div className="row" key={l}>
                      <div className="label">TOPIK {l}</div>
                      <div className="track"><div className="fill" style={{ width: `${(byLevel[l]/lvlMax)*100}%`, background: l === 'Ⅰ' ? 'var(--primary)' : l === 'Ⅱ' ? 'var(--st-number)' : 'var(--success)' }}/></div>
                      <div className="val">{DataStore.fmtNum(byLevel[l])}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>회차 진행률</div>
                <div className="barchart">
                  <div className="row">
                    <div className="label">정원 대비</div>
                    <div className="track">
                      <div className="fill" style={{ width: `${Math.min(100,(cnt.total / (session?.cap || 1)) * 100)}%`, background: 'var(--primary)' }}/>
                    </div>
                    <div className="val">{Math.round((cnt.total / (session?.cap || 1)) * 100)}%</div>
                  </div>
                  <div className="row">
                    <div className="label">승인 처리율</div>
                    <div className="track">
                      <div className="fill" style={{ width: `${cnt.total ? Math.min(100,(cnt.approved/cnt.total)*100):0}%`, background: 'var(--success)' }}/>
                    </div>
                    <div className="val">{cnt.total ? Math.round((cnt.approved/cnt.total)*100) : 0}%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent applicants */}
        <div className="acard">
          <div className="acard-head">
            <h3>최근 접수자</h3>
            <a className="ibtn ghost" href="#applicants">전체 보기 <I.ChevronRight style={{ width: 12, height: 12 }}/></a>
          </div>
          <div className="acard-body flush">
            <div className="rlist">
              {recent.map(a => (
                <div key={a.id} className="ri" onClick={() => { location.hash = 'applicants'; setTimeout(() => window.openApplicantDetail && window.openApplicantDetail(a.id), 200); }}>
                  <div>
                    <div className="nm">{a.nameKo} <span style={{ color: 'var(--text-3)', fontWeight: 400, fontSize: 12 }}>({a.nameEn})</span></div>
                    <div className="sub">{DataStore.venueName(a.venueId)} · TOPIK {a.level}</div>
                  </div>
                  <Pill kind={a.status}>{DataStore.statusLabel(a.status)}</Pill>
                  <div className="date">{a.appliedAt.split(' ')[0]}</div>
                </div>
              ))}
              {!recent.length && <div className="empty">데이터 없음</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row: 최근 처리 이력 + 빠른 통계 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 16 }} className="dash-row">
        <div className="acard">
          <div className="acard-head">
            <h3>최근 관리자 처리 이력</h3>
            <a className="ibtn ghost" href="#audit">전체 보기 <I.ChevronRight style={{ width: 12, height: 12 }}/></a>
          </div>
          <div className="acard-body flush">
            <div className="dg-scroll">
              <table className="dg">
                <thead><tr><th>시각</th><th>처리자</th><th>대상</th><th>액션</th><th>메모</th></tr></thead>
                <tbody>
                  {recentLog.map(l => (
                    <tr key={l.id}>
                      <td className="code">{l.ts}</td>
                      <td>{l.actor}</td>
                      <td>{l.type} · <span className="code-id">{l.targetId}</span></td>
                      <td><span className="pill" style={{ background: 'var(--bg-3)' }}>{l.action}</span></td>
                      <td className="muted">{l.memo || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="acard">
          <div className="acard-head">
            <h3>회차 기본 정보</h3>
          </div>
          <div className="acard-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="kv"><span className="k">접수 기간</span><span className="v" style={{ fontSize: 13 }}>{session?.applyStart} ~ {session?.applyEnd}</span></div>
            <div className="kv"><span className="k">시험일</span><span className="v">{session?.examDate}</span></div>
            <div className="kv"><span className="k">합격자 발표</span><span className="v">{session?.resultDate}</span></div>
            <div className="kv"><span className="k">정원</span><span className="v">{DataStore.fmtNum(session?.cap || 0)}명</span></div>
            <div className="kv"><span className="k">응시료 (Ⅰ / Ⅱ)</span><span className="v" style={{ fontSize: 13 }}>{DataStore.fmtCurrency(session?.feeI || 0)} / {DataStore.fmtCurrency(session?.feeII || 0)}</span></div>
            <div style={{ marginTop: 6 }}>
              <a className="btn btn-secondary btn-block" href="#sessions">회차 상세 편집</a>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1023px) { .dash-row { grid-template-columns: 1fr !important; } }
      `}</style>
    </>
  );
}

function Kpi({ color, label, val, hint }) {
  return (
    <div className="kpi">
      <div className="label"><span className="dot" style={{ background: color }}/>{label}</div>
      <div className="val">{DataStore.fmtNum(val)}</div>
      {hint && <div className="delta">{hint}</div>}
    </div>
  );
}

window.DashboardPanel = DashboardPanel;
