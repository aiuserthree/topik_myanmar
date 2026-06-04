/* ============================================================
   bo-api-data.js — Shared async data layer for the C안 BO SPA.
   ------------------------------------------------------------
   Bridges the live admin API (window.TopikBoApi) into the existing
   synchronous DataStore.state shape that every panel already renders.

   Responsibilities:
     • Adapters  — map API response shapes → the field names panels expect.
     • Loaders   — fetch + map + write DataStore.state[...] + notify().
     • useBoResource — hook returning {loading,error,reload} for panel gates.
     • LoadingState / ErrorState — styled loading/error UI (BO look & feel).
     • ResourceGate — wraps a panel: shows loader/error, else renders inner.

   Design notes:
     • UI/DOM is unchanged — we only change the *source* of the data.
     • Live API blocks localhost via CORS, so loaders degrade gracefully
       (network errors → ErrorState, never a blank screen / uncaught error).
   ============================================================ */
(function (global) {
  "use strict";

  function Api() { return global.TopikBoApi; }
  function DS() { return global.DataStore; }

  // ---------- code <-> label maps (match backend route source) -------------
  var NOTICE_C2L = { important: "중요", registration: "접수", exam: "시험", result: "결과" };
  var NOTICE_L2C = { "중요": "important", "접수": "registration", "시험": "exam", "결과": "result" };
  var FAQ_C2L = { account: "계정", apply: "접수", exam: "시험", result: "결과", other: "기타" };
  var FAQ_L2C = { "계정": "account", "접수": "apply", "시험": "exam", "결과": "result", "기타": "other" };
  var TERM_C2L = { service: "이용약관", privacy: "개인정보", marketing: "마케팅" };
  var TERM_L2C = { "이용약관": "service", "개인정보": "privacy", "마케팅": "marketing" };

  function dateOnly(s) { return s ? String(s).slice(0, 10) : ""; }
  function levelKo(l) {
    l = String(l || "").toUpperCase();
    return l === "II" ? "Ⅱ" : l === "I" ? "Ⅰ" : l;
  }
  function fail(res) { return { error: Api().parseError(res) }; }

  // ---------- adapters -----------------------------------------------------
  function mapRound(r) {
    return {
      id: String(r.id),
      apiId: r.id,
      no: Number(r.round_no),
      name: r.title,
      examDate: dateOnly(r.exam_date),
      applyStart: dateOnly(r.registration_start_at),
      applyEnd: dateOnly(r.registration_end_at),
      resultDate: dateOnly(r.result_announcement_date),
      cap: r.capacity != null ? Number(r.capacity) : 0,
      feeI: r.fee_level_i != null ? Number(r.fee_level_i) : 0,
      feeII: r.fee_level_ii != null ? Number(r.fee_level_ii) : 0,
      venues: (r.venues || []).map(function (v) { return String(v.id); }),
      status: r.registration_status === "open" ? "open"
        : r.registration_status === "closed" ? "closed" : "planned",
      registration_status: r.registration_status,
      examVisibleAt: r.exam_number_visible_at || "",
      applicants: (r.stats && r.stats.active) || 0,
      stats: r.stats || { active: 0, paid: 0, assigned: 0 },
    };
  }

  function mapVenue(v) {
    return {
      id: String(v.id), apiId: v.id, code: v.venue_code,
      regionCode: v.region_code, region: v.region_name || v.region_code,
      nameKo: v.name_ko, nameEn: v.name_en || "", address: v.address || "",
      cap: v.capacity != null ? Number(v.capacity) : 0,
      active: !!v.is_active, memo: v.note || "",
      countryCode: v.country_code || "025", rev: v.rev,
    };
  }

  function mapRegion(rc) {
    return { code: rc.region_code, name: rc.name_ko + " (" + (rc.name_en || rc.region_code) + ")" };
  }

  function mapNotice(n) {
    return {
      id: String(n.id), apiId: n.id, no: n.id,
      cat: NOTICE_C2L[n.category] || n.category, catCode: n.category,
      title: n.title, author: n.author_email || "—",
      createdAt: n.created_at_label || dateOnly(n.created_at),
      views: n.view_count || 0, public: !!n.is_published, pin: !!n.is_pinned,
      body: "",
    };
  }

  function mapFaq(f) {
    return {
      id: String(f.id), apiId: f.id, no: f.id,
      cat: FAQ_C2L[f.category] || f.category, catCode: f.category,
      order: Number(f.sort_order) || 0,
      question: f.question_ko || "", answer: f.answer_ko || "",
      questionMy: f.question_my || "", questionEn: f.question_en || "",
      answerMy: f.answer_my || "", answerEn: f.answer_en || "",
      isActive: f.is_active !== false,
    };
  }

  function mapTerm(t) {
    var status = t.status === "published" ? "pub" : t.status === "retired" ? "retired" : "draft";
    return {
      id: String(t.id), apiId: t.id,
      kind: TERM_C2L[t.term_type] || t.term_type, termType: t.term_type,
      version: t.version,
      publishedAt: (t.status === "published" || t.status === "retired") ? dateOnly(t.effective_at) : "",
      retiredAt: "",
      status: status, author: "—", body: t.body_ko || "",
      effectiveAt: dateOnly(t.effective_at),
    };
  }

  function mapApplication(it, sessionId) {
    var u = it.user || {};
    var v = it.venue || {};
    var ps = it.payment_status, st = it.status, prs = it.photo_review_status;
    var status;
    if (ps === "refunded") status = "refund";
    else if (st === "cancelled") status = "cancel";
    else if (st === "rejected") status = "rejected";
    else if (st === "approved" || st === "exam_number_assigned") status = "approved";
    else if (st === "payment_pending") status = "pay";
    else if (prs === "pending" || prs === "rejected") status = "photo";
    else status = "applied";
    return {
      id: String(it.application_id), apiId: it.application_id, rev: it.rev,
      sessionId: sessionId,
      no: it.application_no || it.application_id,
      nameKo: u.name_ko || "", nameEn: u.name_en || "",
      dob: u.birth_date || "", sx: Number(u.gender) || u.gender,
      nation: u.nationality || "", l1: u.first_language || "",
      job: u.job_label || "", motive: u.motive_label || "", purpose: u.purpose_label || "",
      level: levelKo(it.exam_level),
      venueId: v.id != null ? String(v.id) : "",
      photoOk: prs === "approved",
      photoStatus: prs || "pending",
      paid: ps === "paid",
      paidAt: it.paid_at ? dateOnly(it.paid_at) : "",
      receipt: it.receipt_no || "",
      exam: it.exam_number || "",
      status: status,
      appliedAt: it.created_at_label || dateOnly(it.created_at),
      rejectReason: it.reject_note || "",
      memo: "", email: u.email || "", tel: u.phone || "",
      accommodation: false,
      photoFileId: it.photo_file_id || null,
    };
  }

  // ---------- raw loaders (fetch + map + write + notify) -------------------
  function loadRoundsRaw() {
    return Api().listExamRounds().then(function (res) {
      if (!res.ok) return fail(res);
      var rounds = (res.body.rounds || []).map(mapRound);
      DS().state.sessions = rounds;
      var active = DS().state.activeSessionId;
      if (!active || !rounds.some(function (s) { return s.id === active; })) {
        var open = rounds.filter(function (s) { return s.status === "open"; })[0];
        DS().state.activeSessionId = (open || rounds[0] || {}).id || null;
      }
      DS().notify();
      return { ok: true };
    });
  }

  function loadVenuesRaw() {
    return Api().listVenues().then(function (res) {
      if (!res.ok) return fail(res);
      DS().state.venues = (res.body.items || []).map(mapVenue);
      return Api().listRegionCodes().then(function (r2) {
        if (r2.ok && r2.body && r2.body.items) {
          DS().state.regions = r2.body.items.map(mapRegion);
        }
        DS().notify();
        return { ok: true };
      });
    });
  }

  function mergeRoundDetail(roundId) {
    return Api().getExamRound(roundId).then(function (res) {
      if (!res.ok || !res.body || !res.body.round) return;
      var r = res.body.round;
      var s = DS().state.sessions.filter(function (x) { return x.id === String(roundId); })[0];
      if (!s) return;
      s.applyStart = dateOnly(r.registration_start_at);
      s.applyEnd = dateOnly(r.registration_end_at);
      s.resultDate = dateOnly(r.result_announcement_date);
      s.feeI = r.fee_level_i != null ? Number(r.fee_level_i) : 0;
      s.feeII = r.fee_level_ii != null ? Number(r.fee_level_ii) : 0;
      s.cap = r.capacity != null ? Number(r.capacity) : s.cap;
      s.examDate = dateOnly(r.exam_date) || s.examDate;
      s.examVisibleAt = r.exam_number_visible_at || s.examVisibleAt;
      s.rev = r.rev;
      if (Array.isArray(res.body.venue_ids)) s.venues = res.body.venue_ids.map(String);
      DS().notify();
    }).catch(function () { /* non-fatal */ });
  }

  function loadAppsRaw(roundId) {
    var all = [];
    var CAP_PAGES = 60; // safety cap (100/page → up to 6000 rows)
    function page(p) {
      return Api().listApplications({ exam_round_id: roundId, page: p, page_size: 100 }).then(function (res) {
        if (!res.ok) return fail(res);
        all = all.concat(res.body.items || []);
        var pg = res.body.pagination || {};
        if (p < (pg.total_pages || 1) && p < CAP_PAGES) return page(p + 1);
        DS().state.applicants = all.map(function (it) { return mapApplication(it, String(roundId)); });
        DS().notify();
        return { ok: true };
      });
    }
    return page(1);
  }

  function loadNoticesRaw() {
    return Api().listNotices({ page_size: 100 }).then(function (res) {
      if (!res.ok) return fail(res);
      DS().state.notices = (res.body.items || []).map(mapNotice);
      DS().notify();
      return { ok: true };
    });
  }

  function loadFaqRaw() {
    return Api().listFaq().then(function (res) {
      if (!res.ok) return fail(res);
      DS().state.faqs = (res.body.items || []).map(mapFaq);
      DS().notify();
      return { ok: true };
    });
  }

  function loadTermsRaw() {
    return Api().listTerms().then(function (res) {
      if (!res.ok) return fail(res);
      DS().state.terms = (res.body.items || []).map(mapTerm);
      DS().notify();
      return { ok: true };
    });
  }

  // ---------- once() cache for shared context (rounds / venues) ------------
  var loadedOnce = {};
  function once(key, fn) {
    if (loadedOnce[key]) return Promise.resolve({ ok: true });
    return Promise.resolve(fn()).then(function (r) {
      if (!(r && r.error)) loadedOnce[key] = true;
      return r;
    });
  }
  function invalidate(key) { loadedOnce[key] = false; }

  // Combined loader for dashboard + applicants (rounds + venues + active round apps)
  function loadRoundContext() {
    return once("rounds", loadRoundsRaw).then(function (r) {
      if (r && r.error) return r;
      return once("venues", loadVenuesRaw);
    }).then(function (r) {
      if (r && r.error) return r;
      var rid = DS().state.activeSessionId;
      if (!rid) { DS().state.applicants = []; DS().notify(); return { ok: true }; }
      return mergeRoundDetail(rid).then(function () { return loadAppsRaw(rid); });
    });
  }

  // Ensure venues are available for panels that need them but aren't round-gated
  function ensureVenues() { return once("venues", loadVenuesRaw); }
  function loadVenuesPanel() { invalidate("venues"); return loadVenuesRaw(); }
  function loadSessionsPanel() {
    invalidate("rounds");
    return loadRoundsRaw().then(function (r) {
      if (r && r.error) return r;
      return once("venues", loadVenuesRaw); // sessions edit picks from active venues
    });
  }

  // Named reloaders used by panels after a successful write.
  var RELOADERS = {
    notices: loadNoticesRaw,
    faq: loadFaqRaw,
    terms: loadTermsRaw,
    venues: loadVenuesPanel,
    sessions: function () { invalidate("rounds"); return loadRoundsRaw(); },
    apps: function () {
      var rid = DS().state.activeSessionId;
      return rid ? loadAppsRaw(rid) : Promise.resolve({ ok: true });
    },
  };
  function reload(name) {
    var fn = RELOADERS[name];
    return fn ? Promise.resolve(fn()) : Promise.resolve({ ok: true });
  }

  // ---------- hook + gate UI ----------------------------------------------
  function useBoResource(loader, deps) {
    var t = global.useState(0); var tick = t[0], setTick = t[1];
    var s = global.useState({ loading: true, error: null }); var st = s[0], setSt = s[1];
    global.useEffect(function () {
      var alive = true;
      setSt({ loading: true, error: null });
      Promise.resolve(loader()).then(function (r) {
        if (!alive) return;
        setSt({ loading: false, error: (r && r.error) || null });
      }).catch(function (e) {
        if (alive) setSt({ loading: false, error: String((e && e.message) || e) });
      });
      return function () { alive = false; };
    }, (deps || []).concat([tick]));
    return {
      loading: st.loading, error: st.error,
      reload: function () { setTick(function (x) { return x + 1; }); },
    };
  }

  function LoadingState() {
    var h = global.h;
    return h("div", { className: "dg-wrap", style: { marginTop: 16 } },
      h("div", { className: "empty", style: { padding: "60px 24px" } },
        h("div", { className: "spinner-dot", style: {
          width: 28, height: 28, margin: "0 auto 14px", borderRadius: "50%",
          border: "3px solid var(--border)", borderTopColor: "var(--primary)",
          animation: "bo-spin 0.8s linear infinite",
        } }),
        h("div", { className: "ttl" }, "불러오는 중…"),
        h("div", { className: "sub" }, "서버에서 데이터를 가져오고 있습니다."),
        h("style", null, "@keyframes bo-spin{to{transform:rotate(360deg)}}")
      )
    );
  }

  function ErrorState(props) {
    var h = global.h;
    return h("div", { className: "dg-wrap", style: { marginTop: 16 } },
      h("div", { className: "empty", style: { padding: "48px 24px" } },
        h("div", { className: "icon" }, global.I && global.I.X ? h(global.I.X) : "!"),
        h("div", { className: "ttl" }, props.error || "데이터를 불러오지 못했습니다."),
        h("div", { className: "sub", style: { marginBottom: 16 } },
          "API 연결 상태를 확인한 뒤 다시 시도해 주세요. (로컬에서는 CORS 정책으로 호출이 차단될 수 있습니다.)"),
        h("button", { className: "btn btn-secondary", onClick: props.onRetry }, "다시 시도")
      )
    );
  }

  function ResourceGate(props) {
    var h = global.h;
    var res = useBoResource(props.loader, props.deps);
    if (res.error) return h(ErrorState, { error: res.error, onRetry: res.reload });
    if (res.loading) return h(LoadingState);
    return h(props.inner, props.innerProps || null);
  }

  // ---------- demo-data banner (mock-only panels) -------------------------
  function DemoNote(props) {
    var h = global.h;
    return h("div", {
      style: {
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 12px", marginBottom: 14, borderRadius: 6,
        background: "var(--st-photo-bg, #fff7e6)", color: "var(--st-photo, #9a6b00)",
        border: "1px solid var(--st-photo, #f0c36d)", fontSize: 12.5,
      },
    },
      h("b", null, "데모 데이터"),
      h("span", null, props.message || "이 화면은 백엔드 관리자 목록 API가 아직 없어 샘플 데이터로 표시됩니다.")
    );
  }

  global.BoData = {
    // adapters (exposed for clarity/testing)
    mapRound: mapRound, mapVenue: mapVenue, mapRegion: mapRegion,
    mapNotice: mapNotice, mapFaq: mapFaq, mapTerm: mapTerm, mapApplication: mapApplication,
    // code/label maps
    NOTICE_L2C: NOTICE_L2C, NOTICE_C2L: NOTICE_C2L,
    FAQ_L2C: FAQ_L2C, FAQ_C2L: FAQ_C2L,
    TERM_L2C: TERM_L2C, TERM_C2L: TERM_C2L,
    // loaders
    loadRoundContext: loadRoundContext,
    loadNotices: loadNoticesRaw,
    loadFaq: loadFaqRaw,
    loadTerms: loadTermsRaw,
    loadVenuesPanel: loadVenuesPanel,
    loadSessionsPanel: loadSessionsPanel,
    ensureVenues: ensureVenues,
    invalidate: invalidate,
    reload: reload,
  };
  global.useBoResource = useBoResource;
  global.ResourceGate = ResourceGate;
  global.LoadingState = LoadingState;
  global.ErrorState = ErrorState;
  global.DemoNote = DemoNote;
})(typeof window !== "undefined" ? window : this);
