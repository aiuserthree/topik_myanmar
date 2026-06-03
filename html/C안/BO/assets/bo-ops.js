/* TOPIK Myanmar BO — 접수 관리 controller (static, no framework). */
(function () {
  "use strict";

  var Bo = window.TopikBoApi;
  if (!Bo || !Bo.getAccessToken || !Bo.getAccessToken()) {
    location.replace("login.html");
    return;
  }

  // ---- state ----
  var state = {
    rounds: [],
    round: null,
    chip: "all",
    venue: "",
    level: "",
    q: "",
    page: 1,
    pageSize: 20,
    current: null, // open application detail
  };

  // ---- label maps ----
  var PHOTO_REJECT = {
    not_frontal: "정면 아님", hat_glasses: "모자·선글라스", bw_photo: "흑백",
    blurry: "흐림", not_self: "본인 아님", other: "기타",
  };
  var APP_REJECT = {
    photo_invalid: "사진 부적합", info_mismatch: "정보 불일치",
    duplicate: "중복 접수", other: "기타",
  };

  function statusBadge(s) {
    var map = {
      submitted: ["접수완료", "bo-badge-gray"],
      photo_review: ["사진심사중", "bo-badge-amber"],
      payment_pending: ["수납대기", "bo-badge-amber"],
      approved: ["승인완료", "bo-badge-blue"],
      exam_number_assigned: ["수험번호부여", "bo-badge-green"],
      rejected: ["반려", "bo-badge-red"],
      cancelled: ["취소", "bo-badge-gray"],
    };
    var m = map[s] || [s, "bo-badge-gray"];
    return '<span class="bo-badge ' + m[1] + '">' + m[0] + "</span>";
  }
  function photoBadge(p) {
    var map = {
      pending: ["미심사", "bo-badge-gray"],
      approved: ["승인", "bo-badge-green"],
      rejected: ["반려", "bo-badge-red"],
    };
    var m = map[p] || [p, "bo-badge-gray"];
    return '<span class="bo-badge ' + m[1] + '">' + m[0] + "</span>";
  }
  function payBadge(p) {
    var map = {
      unpaid: ["미납", "bo-badge-gray"],
      paid: ["수납완료", "bo-badge-green"],
      refunded: ["환불", "bo-badge-red"],
    };
    var m = map[p] || [p, "bo-badge-gray"];
    return '<span class="bo-badge ' + m[1] + '">' + m[0] + "</span>";
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmtBirth(b) {
    if (!b || b.length !== 8) return esc(b);
    return b.slice(0, 4) + "-" + b.slice(4, 6) + "-" + b.slice(6, 8);
  }

  // ---- toast ----
  var toastEl = document.getElementById("toast");
  var toastTimer;
  function toast(msg, kind) {
    toastEl.textContent = msg;
    toastEl.className = "bo-toast" + (kind ? " is-" + kind : "");
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 3200);
  }

  // ---- chip → API filter params ----
  function chipParams() {
    switch (state.chip) {
      case "submitted": return { status: "submitted" };
      case "photo_pending": return { photo_review_status: "pending", status: "submitted" };
      case "payment_pending": return { status: "payment_pending" };
      case "approved": return { status: "approved" };
      case "exam_number_assigned": return { status: "exam_number_assigned" };
      case "refunded": return { payment_status: "refunded" };
      case "rejected": return { status: "rejected" };
      case "cancelled": return { status: "cancelled" };
      default: return {};
    }
  }

  // ---- rounds ----
  function loadRounds() {
    return Bo.listExamRounds().then(function (res) {
      if (!res.ok) { toast(Bo.parseError(res), "error"); return; }
      state.rounds = (res.body && res.body.rounds) || [];
      var sel = document.getElementById("roundSelect");
      sel.innerHTML = state.rounds.map(function (r) {
        return '<option value="' + r.id + '">제' + r.round_no + "회 " + esc(r.title || "") +
          " (" + r.registration_status + ")</option>";
      }).join("");
      if (state.rounds.length) {
        state.round = state.rounds[0];
        sel.value = state.round.id;
        applyRound();
      }
    });
  }

  function applyRound() {
    var venueSel = document.getElementById("venueFilter");
    var venues = (state.round && state.round.venues) || [];
    venueSel.innerHTML = '<option value="">시험장 전체</option>' + venues.map(function (v) {
      return '<option value="' + v.id + '">' + esc(v.name_ko) + " (" + v.venue_code + ")</option>";
    }).join("");
    renderRoundStats();
  }

  function renderRoundStats() {
    var el = document.getElementById("roundStats");
    if (!state.round) { el.hidden = true; return; }
    var s = state.round.stats || {};
    var visible = state.round.exam_number_visible_at
      ? new Date(state.round.exam_number_visible_at).toLocaleString("ko-KR")
      : "미설정";
    el.hidden = false;
    el.innerHTML =
      "<span>유효 접수 <b>" + (s.active || 0) + "</b>건</span>" +
      "<span>수납완료 <b>" + (s.paid || 0) + "</b>건</span>" +
      "<span>수험번호 부여 <b>" + (s.assigned || 0) + "</b>건</span>" +
      "<span>수험번호 노출일: " + esc(visible) + "</span>";
  }

  // ---- list ----
  function loadApplications() {
    if (!state.round) return;
    var tbody = document.getElementById("appRows");
    tbody.innerHTML = '<tr><td colspan="15" class="bo-empty">불러오는 중…</td></tr>';
    var params = Object.assign(
      {
        exam_round_id: state.round.id,
        exam_venue_id: state.venue,
        level: state.level,
        q: state.q,
        page: state.page,
        page_size: state.pageSize,
        sort: "created_at",
        order: "desc",
      },
      chipParams()
    );
    Bo.listApplications(params).then(function (res) {
      if (!res.ok) {
        tbody.innerHTML = '<tr><td colspan="15" class="bo-empty">' + esc(Bo.parseError(res)) + "</td></tr>";
        return;
      }
      renderRows(res.body.items || []);
      renderPagination(res.body.pagination || {});
      var p = res.body.pagination || {};
      document.getElementById("resultCount").textContent =
        "총 " + (p.total_items || 0) + "건 · " + (p.page || 1) + "/" + (p.total_pages || 1) + "페이지";
    });
  }

  function renderRows(items) {
    var tbody = document.getElementById("appRows");
    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="15" class="bo-empty">접수 내역이 없습니다.</td></tr>';
      return;
    }
    tbody.innerHTML = items.map(function (it) {
      var u = it.user || {};
      var thumb = it.photo_file_id
        ? '<img class="bo-thumb" loading="lazy" src="' + esc(Bo.fileUrl(it.photo_file_id)) +
          '" alt="사진" onclick="window.__boView(' + it.application_id + ')" onerror="this.outerHTML=\'<span class=&quot;bo-thumb-none&quot;>없음</span>\'" />'
        : '<span class="bo-thumb-none">없음</span>';
      return "<tr>" +
        "<td>" + it.application_id + "</td>" +
        "<td>" + thumb + "</td>" +
        "<td>" + esc(u.name_ko) + "</td>" +
        "<td>" + esc(u.name_en) + "</td>" +
        "<td>" + fmtBirth(u.birth_date) + "</td>" +
        "<td>" + esc(u.gender_label) + "</td>" +
        "<td>" + esc(u.nationality) + "</td>" +
        "<td>" + esc(it.exam_level_label) + "</td>" +
        "<td>" + esc((it.venue || {}).name_ko) + "</td>" +
        "<td>" + esc(it.created_at_label) + "</td>" +
        "<td>" + photoBadge(it.photo_review_status) + "</td>" +
        "<td>" + payBadge(it.payment_status) + "</td>" +
        '<td class="bo-exam-no">' + esc(it.exam_number || "—") + "</td>" +
        "<td>" + statusBadge(it.status) + "</td>" +
        '<td><div class="bo-row-actions">' +
          '<button class="bo-btn bo-btn-secondary bo-btn-sm" onclick="window.__boView(' + it.application_id + ')">보기</button>' +
        "</div></td>" +
        "</tr>";
    }).join("");
  }

  function renderPagination(p) {
    var nav = document.getElementById("pagination");
    var total = p.total_pages || 1;
    var cur = p.page || 1;
    if (total <= 1) { nav.innerHTML = ""; return; }
    var html = "";
    html += '<button ' + (cur <= 1 ? "disabled" : "") + ' data-pg="' + (cur - 1) + '">‹</button>';
    var start = Math.max(1, cur - 3), end = Math.min(total, cur + 3);
    for (var i = start; i <= end; i++) {
      html += '<button class="' + (i === cur ? "is-on" : "") + '" data-pg="' + i + '">' + i + "</button>";
    }
    html += '<button ' + (cur >= total ? "disabled" : "") + ' data-pg="' + (cur + 1) + '">›</button>';
    nav.innerHTML = html;
    [].forEach.call(nav.querySelectorAll("button[data-pg]"), function (b) {
      b.addEventListener("click", function () {
        if (b.disabled) return;
        state.page = Number(b.dataset.pg);
        loadApplications();
      });
    });
  }

  // ---- detail panel ----
  var overlay = document.getElementById("overlay");
  var panel = document.getElementById("detailPanel");

  function openPanel() {
    overlay.hidden = false;
    panel.hidden = false;
    panel.setAttribute("aria-hidden", "false");
  }
  function closePanel() {
    overlay.hidden = true;
    panel.hidden = true;
    panel.setAttribute("aria-hidden", "true");
    state.current = null;
  }
  overlay.addEventListener("click", closePanel);
  document.getElementById("panelClose").addEventListener("click", closePanel);

  window.__boView = function (id) {
    Bo.getApplication(id).then(function (res) {
      if (!res.ok) { toast(Bo.parseError(res), "error"); return; }
      state.current = res.body;
      renderDetail(res.body);
      openPanel();
    });
  };

  function detailRow(dt, dd) {
    return "<dt>" + dt + "</dt><dd>" + dd + "</dd>";
  }

  function renderDetail(data) {
    var a = data.application || {};
    var u = data.user || {};
    var v = data.venue || {};
    document.getElementById("panelTitle").textContent =
      esc(u.name_ko) + " · " + esc(a.exam_level_label) + " · " + esc(a.application_no);

    var photo = a.photo_file_id
      ? '<img class="bo-detail-photo" src="' + esc(Bo.fileUrl(a.photo_file_id)) +
        '" alt="증명사진" onerror="this.replaceWith(document.createTextNode(\'사진 없음(레거시/누락)\'))" />'
      : '<div class="bo-detail-photo" style="display:flex;align-items:center;justify-content:center;color:#cbd5e1;">사진 없음</div>';

    var info = "<dl class=\"bo-detail-grid\">" +
      detailRow("영문성명", esc(u.name_en)) +
      detailRow("생년월일", fmtBirth(u.birth_date)) +
      detailRow("성별", esc(u.gender_label)) +
      detailRow("국적", esc(u.nationality)) +
      detailRow("제1언어", esc(u.first_language)) +
      detailRow("연락처", esc(u.phone)) +
      detailRow("이메일", esc(u.email)) +
      detailRow("직업", esc(u.job_label)) +
      detailRow("응시동기", esc(u.motive_label)) +
      detailRow("응시목적", esc(u.purpose_label)) +
      detailRow("시험장", esc(v.name_ko) + " (" + esc(v.venue_code) + ")") +
      detailRow("사진심사", photoBadge(a.photo_review_status) +
        (a.photo_reject_code ? " " + esc(PHOTO_REJECT[a.photo_reject_code] || a.photo_reject_code) : "")) +
      detailRow("수납", payBadge(a.payment_status) + (a.paid_at_label ? " · " + esc(a.paid_at_label) : "")) +
      detailRow("상태", statusBadge(a.status)) +
      detailRow("수험번호", '<span class="bo-exam-no">' + esc(a.exam_number || "—") + "</span>") +
      "</dl>";

    // 사진 심사 섹션
    var photoSection = "";
    if (a.status !== "cancelled" && a.status !== "rejected") {
      var rejectOpts = Object.keys(PHOTO_REJECT).map(function (k) {
        return '<option value="' + k + '">' + PHOTO_REJECT[k] + "</option>";
      }).join("");
      photoSection =
        '<div class="bo-section"><h3>사진 심사</h3>' +
        '<div class="bo-btn-group">' +
        '<button class="bo-btn bo-btn-success bo-btn-sm" id="btnPhotoApprove">사진 승인</button>' +
        "</div>" +
        '<div class="bo-field-row" style="margin-top:10px;"><span>반려 사유</span>' +
        '<select id="photoRejectCode">' + rejectOpts + "</select></div>" +
        '<div class="bo-field-row"><textarea id="photoRejectNote" rows="2" placeholder="반려 상세 사유(선택)"></textarea></div>' +
        '<button class="bo-btn bo-btn-danger bo-btn-sm" id="btnPhotoReject">사진 반려</button>' +
        "</div>";
    }

    // 수납 섹션
    var paySection = "";
    if (a.payment_status !== "paid" && a.status !== "cancelled" && a.status !== "rejected") {
      paySection =
        '<div class="bo-section"><h3>오프라인 수납 처리</h3>' +
        '<div class="bo-field-row"><span>영수증 번호(선택)</span><input id="payReceipt" type="text" /></div>' +
        '<div class="bo-field-row"><span>수납자 메모(선택)</span><input id="payMemo" type="text" /></div>' +
        '<label class="bo-checkbox" style="margin-bottom:10px;"><input type="checkbox" id="payApprovePhoto" ' +
          (a.photo_review_status === "approved" ? "checked disabled" : "") + " /> 사진 동시 승인</label>" +
        '<button class="bo-btn bo-btn-primary bo-btn-sm" id="btnPay">수납 완료</button>' +
        "</div>";
    } else if (a.payment_status === "paid") {
      paySection =
        '<div class="bo-section"><h3>수납 취소(환불)</h3>' +
        '<div class="bo-field-row"><span>취소 사유(필수)</span><input id="cancelReason" type="text" placeholder="환불 사유" /></div>' +
        '<button class="bo-btn bo-btn-danger bo-btn-sm" id="btnCancelPay">수납 취소(환불)</button>' +
        '<p style="font-size:11.5px;color:#6b7280;margin-top:6px;">환불 시 수험번호는 유지됩니다.</p>' +
        "</div>";
    }

    // 승인/반려 섹션
    var approveSection = "";
    if (["submitted", "photo_review", "payment_pending", "approved"].indexOf(a.status) >= 0) {
      var appRejectOpts = Object.keys(APP_REJECT).map(function (k) {
        return '<option value="' + k + '">' + APP_REJECT[k] + "</option>";
      }).join("");
      approveSection =
        '<div class="bo-section"><h3>접수 승인 / 반려</h3>' +
        '<div class="bo-btn-group" style="margin-bottom:10px;">' +
        '<button class="bo-btn bo-btn-success bo-btn-sm" id="btnApprove">접수 승인</button>' +
        "</div>" +
        '<div class="bo-field-row"><span>반려 사유 코드</span><select id="appRejectCode">' + appRejectOpts + "</select></div>" +
        '<div class="bo-field-row"><textarea id="appRejectNote" rows="2" placeholder="반려 사유(필수)"></textarea></div>' +
        '<button class="bo-btn bo-btn-danger bo-btn-sm" id="btnReject">접수 반려</button>' +
        "</div>";
    }

    // 처리 이력
    var logs = (data.audit_logs || []).map(function (l) {
      return "<li><div>" + esc(l.action) +
        (l.status_after ? " → " + esc(l.status_after) : "") +
        (l.memo ? " · " + esc(l.memo) : "") + "</div>" +
        '<div class="bo-tl-meta">' + esc(l.created_at_label) + " · " + esc(l.admin_name || l.admin_email || "—") + "</div></li>";
    }).join("");
    var historySection = '<div class="bo-section"><h3>처리 이력</h3><ul class="bo-timeline">' +
      (logs || '<li class="bo-tl-meta">이력 없음</li>') + "</ul></div>";

    document.getElementById("panelBody").innerHTML =
      '<div style="display:flex;gap:16px;align-items:flex-start;">' + photo +
      '<div style="flex:1;">' + info + "</div></div>" +
      photoSection + paySection + approveSection + historySection;

    bindDetailActions(a);
  }

  function bindDetailActions(a) {
    var rev = a.rev;
    var id = a.id;

    function after(res, okMsg) {
      if (res.ok) {
        toast(okMsg, "success");
        // refresh round stats + list + reopen panel
        loadRounds().then(loadApplications);
        window.__boView(id);
      } else {
        toast(Bo.parseError(res), "error");
      }
    }

    var bPhotoA = document.getElementById("btnPhotoApprove");
    if (bPhotoA) bPhotoA.addEventListener("click", function () {
      Bo.photoReview(id, { action: "approve", rev: rev }).then(function (r) { after(r, "사진을 승인했습니다."); });
    });
    var bPhotoR = document.getElementById("btnPhotoReject");
    if (bPhotoR) bPhotoR.addEventListener("click", function () {
      Bo.photoReview(id, {
        action: "reject", rev: rev,
        photo_reject_code: document.getElementById("photoRejectCode").value,
        photo_reject_note: document.getElementById("photoRejectNote").value,
      }).then(function (r) { after(r, "사진을 반려했습니다."); });
    });
    var bPay = document.getElementById("btnPay");
    if (bPay) bPay.addEventListener("click", function () {
      var cb = document.getElementById("payApprovePhoto");
      Bo.markPayment(id, {
        rev: rev,
        receipt_no: document.getElementById("payReceipt").value,
        payment_memo: document.getElementById("payMemo").value,
        approve_photo: cb ? cb.checked : false,
      }).then(function (r) {
        if (!r.ok && r.body && r.body.error && r.body.error.code === "CAPACITY_EXCEEDED") {
          if (confirm(Bo.parseError(r) + "\n정원을 초과해도 강제로 수납 처리할까요?")) {
            Bo.markPayment(id, {
              rev: rev, ignore_capacity: true,
              receipt_no: document.getElementById("payReceipt").value,
              payment_memo: document.getElementById("payMemo").value,
              approve_photo: cb ? cb.checked : false,
            }).then(function (r2) { after(r2, "수납 처리(정원 초과 강제)했습니다."); });
          }
          return;
        }
        after(r, "수납 처리했습니다.");
      });
    });
    var bCancel = document.getElementById("btnCancelPay");
    if (bCancel) bCancel.addEventListener("click", function () {
      var reason = document.getElementById("cancelReason").value.trim();
      if (!reason) { toast("취소(환불) 사유를 입력해 주세요.", "error"); return; }
      if (!confirm("수납을 취소(환불)하시겠습니까? 수험번호는 유지됩니다.")) return;
      Bo.cancelPayment(id, { rev: rev, reason: reason }).then(function (r) { after(r, "환불 처리했습니다."); });
    });
    var bApprove = document.getElementById("btnApprove");
    if (bApprove) bApprove.addEventListener("click", function () {
      Bo.approveApplication(id, { rev: rev }).then(function (r) { after(r, "접수를 승인했습니다."); });
    });
    var bReject = document.getElementById("btnReject");
    if (bReject) bReject.addEventListener("click", function () {
      var note = document.getElementById("appRejectNote").value.trim();
      if (!note) { toast("반려 사유를 입력해 주세요.", "error"); return; }
      Bo.rejectApplication(id, {
        rev: rev,
        reject_code: document.getElementById("appRejectCode").value,
        reject_note: note,
      }).then(function (r) { after(r, "접수를 반려했습니다."); });
    });
  }

  // ---- bulk actions ----
  document.getElementById("assignBtn").addEventListener("click", function () {
    if (!state.round) return;
    var rid = state.round.id;
    Bo.assignExamNumbers(rid, { dry_run: true }).then(function (res) {
      if (!res.ok) { toast(Bo.parseError(res), "error"); return; }
      var n = res.body.assigned_now || 0;
      if (n === 0) { toast("부여 대상(수납완료+사진승인+미부여)이 없습니다.", "error"); return; }
      if (!confirm("제" + state.round.round_no + "회 — 수험번호 " + n + "건을 일괄 부여합니다.\n(영문성명 알파벳순, 13자리) 진행할까요?")) return;
      Bo.assignExamNumbers(rid, {}).then(function (r2) {
        if (!r2.ok) { toast(Bo.parseError(r2), "error"); return; }
        toast("수험번호 " + (r2.body.assigned_now || 0) + "건 부여 완료 (누적 " + (r2.body.total_assigned || 0) + "건).", "success");
        loadRounds().then(loadApplications);
      });
    });
  });

  document.getElementById("rosterBtn").addEventListener("click", function () {
    if (!state.round) return;
    var fname = "제" + state.round.round_no + "회 TOPIK 지원자 연명부.xlsx";
    toast("연명부 엑셀 생성 중…");
    Bo.downloadRoster(state.round.id, { exam_venue_id: state.venue, level: state.level }, fname).then(function (r) {
      if (!r.ok) toast(Bo.parseError(r) || "다운로드 실패", "error");
    });
  });

  document.getElementById("zipBtn").addEventListener("click", function () {
    if (!state.round) return;
    var fname = "제" + state.round.round_no + "회 TOPIK 사진.zip";
    toast("사진 ZIP 생성 중… (사진 수에 따라 시간이 걸릴 수 있습니다)");
    Bo.downloadPhotosZip(state.round.id, { exam_venue_id: state.venue, level: state.level }, fname).then(function (r) {
      if (!r.ok) toast(Bo.parseError(r) || "다운로드 실패", "error");
    });
  });

  // ---- filter bindings ----
  document.getElementById("roundSelect").addEventListener("change", function (e) {
    state.round = state.rounds.find(function (r) { return String(r.id) === e.target.value; });
    state.page = 1;
    state.venue = "";
    applyRound();
    loadApplications();
  });
  document.getElementById("venueFilter").addEventListener("change", function (e) {
    state.venue = e.target.value; state.page = 1; loadApplications();
  });
  document.getElementById("levelFilter").addEventListener("change", function (e) {
    state.level = e.target.value; state.page = 1; loadApplications();
  });
  document.getElementById("searchBtn").addEventListener("click", function () {
    state.q = document.getElementById("searchInput").value.trim(); state.page = 1; loadApplications();
  });
  document.getElementById("searchInput").addEventListener("keydown", function (e) {
    if (e.key === "Enter") { state.q = e.target.value.trim(); state.page = 1; loadApplications(); }
  });
  [].forEach.call(document.querySelectorAll("#statusChips .bo-chip"), function (chip) {
    chip.addEventListener("click", function () {
      [].forEach.call(document.querySelectorAll("#statusChips .bo-chip"), function (c) { c.classList.remove("is-on"); });
      chip.classList.add("is-on");
      state.chip = chip.dataset.chip; state.page = 1; loadApplications();
    });
  });
  document.getElementById("logoutBtn").addEventListener("click", function () {
    Bo.logout(); location.replace("login.html");
  });

  // ---- init ----
  try {
    var admin = JSON.parse(sessionStorage.getItem("bo_admin") || "{}");
    document.getElementById("adminId").textContent = admin.email || "";
  } catch (e) { /* ignore */ }

  loadRounds().then(loadApplications);
})();
