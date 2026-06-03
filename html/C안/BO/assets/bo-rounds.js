/* TOPIK Myanmar BO — 회차 관리 controller (static, no framework). */
(function () {
  "use strict";
  var C = window.BoCommon;
  var Bo = C.Bo;
  if (!C.requireAuth()) return;
  C.initChrome();

  var STATUS = {
    scheduled: ["예정", "bo-badge-gray"],
    open: ["접수중", "bo-badge-green"],
    closed: ["마감", "bo-badge-amber"],
  };
  var state = { venues: [] };

  function statusBadge(s) {
    var m = STATUS[s] || [s, "bo-badge-gray"];
    return '<span class="bo-badge ' + m[1] + '">' + m[0] + "</span>";
  }

  function loadVenues() {
    return Bo.listVenues({ active: "1" }).then(function (res) {
      state.venues = (res.ok && res.body.items) ? res.body.items : [];
    });
  }

  function load() {
    var tbody = document.getElementById("rows");
    tbody.innerHTML = '<tr><td colspan="8" class="bo-empty">불러오는 중…</td></tr>';
    Bo.listExamRounds().then(function (res) {
      if (!res.ok) {
        tbody.innerHTML = '<tr><td colspan="8" class="bo-empty">' + C.esc(Bo.parseError(res)) + "</td></tr>";
        return;
      }
      renderRows(res.body.rounds || []);
    });
  }

  function renderRows(rounds) {
    var tbody = document.getElementById("rows");
    if (!rounds.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="bo-empty">회차가 없습니다. [+ 새 회차]로 개설하세요.</td></tr>';
      return;
    }
    tbody.innerHTML = rounds.map(function (r) {
      var venues = (r.venues || []).map(function (v) { return v.venue_code; }).join(", ") || "—";
      var statusBtn = r.registration_status === "open"
        ? '<button class="bo-btn bo-btn-secondary bo-btn-sm" data-act="close" data-id="' + r.id + '">마감</button>'
        : '<button class="bo-btn bo-btn-success bo-btn-sm" data-act="open" data-id="' + r.id + '">접수개시</button>';
      return "<tr>" +
        "<td>제" + r.round_no + "회</td>" +
        "<td>" + C.esc(r.title || "") + "</td>" +
        "<td>" + C.esc(C.fmtDate(r.exam_date)) + "</td>" +
        "<td>" + statusBadge(r.registration_status) + "</td>" +
        "<td>" + (r.capacity != null ? r.capacity : "—") + "</td>" +
        "<td>" + ((r.stats && r.stats.active) || 0) + "</td>" +
        '<td class="bo-cell-muted">' + C.esc(venues) + "</td>" +
        '<td><div class="bo-row-actions">' +
          '<button class="bo-btn bo-btn-secondary bo-btn-sm" data-act="edit" data-id="' + r.id + '">수정</button>' +
          statusBtn +
        "</div></td>" +
        "</tr>";
    }).join("");

    [].forEach.call(tbody.querySelectorAll("button[data-act]"), function (b) {
      b.addEventListener("click", function () {
        var id = Number(b.dataset.id), act = b.dataset.act;
        if (act === "edit") openEdit(id);
        else if (act === "open") changeStatus(id, "open");
        else if (act === "close") changeStatus(id, "closed");
      });
    });
  }

  function renderVenueChecks(selectedIds) {
    var sel = {};
    (selectedIds || []).forEach(function (id) { sel[id] = true; });
    var box = document.getElementById("venueList");
    if (!state.venues.length) {
      box.innerHTML = '<span class="bo-cell-muted">활성 시험장이 없습니다. 먼저 [시험장 관리]에서 등록하세요.</span>';
      return;
    }
    box.innerHTML = state.venues.map(function (v) {
      return '<label><input type="checkbox" class="venueChk" value="' + v.id + '" ' +
        (sel[v.id] ? "checked" : "") + " /> " + C.esc(v.name_ko) + " (" + C.esc(v.venue_code) + ")</label>";
    }).join("");
  }

  function selectedVenueIds() {
    return [].map.call(document.querySelectorAll(".venueChk:checked"), function (c) {
      return Number(c.value);
    });
  }

  function clearForm() {
    ["fId", "fRoundNo", "fTitle", "fExamDate", "fResultDate", "fRegStart", "fRegEnd",
     "fFeeI", "fFeeII", "fCapacity", "fVisibleAt"].forEach(function (id) {
      document.getElementById(id).value = "";
    });
    document.getElementById("fStatus").value = "scheduled";
    document.getElementById("fActive").checked = true;
  }

  function openCreate() {
    clearForm();
    document.getElementById("panelTitle").textContent = "새 회차";
    document.getElementById("fRoundNo").disabled = false;
    document.getElementById("roundNoHint").textContent = "생성 후 변경 불가";
    document.getElementById("fFeeI").value = "50000";
    document.getElementById("fFeeII").value = "75000";
    renderVenueChecks([]);
    C.openPanel();
  }

  function openEdit(id) {
    Bo.getExamRound(id).then(function (res) {
      if (!res.ok) { C.toast(Bo.parseError(res), "error"); return; }
      var r = res.body.round;
      clearForm();
      document.getElementById("panelTitle").textContent = "회차 수정 — 제" + r.round_no + "회";
      document.getElementById("fId").value = r.id;
      document.getElementById("fRoundNo").value = r.round_no;
      document.getElementById("fRoundNo").disabled = true;
      document.getElementById("roundNoHint").textContent = "회차 번호는 변경할 수 없습니다.";
      document.getElementById("fTitle").value = r.title || "";
      document.getElementById("fExamDate").value = C.toDateInput(r.exam_date);
      document.getElementById("fResultDate").value = C.toDateInput(r.result_announcement_date);
      document.getElementById("fRegStart").value = C.toLocalInput(r.registration_start_at);
      document.getElementById("fRegEnd").value = C.toLocalInput(r.registration_end_at);
      document.getElementById("fFeeI").value = r.fee_level_i != null ? r.fee_level_i : "";
      document.getElementById("fFeeII").value = r.fee_level_ii != null ? r.fee_level_ii : "";
      document.getElementById("fCapacity").value = r.capacity != null ? r.capacity : "";
      document.getElementById("fVisibleAt").value = C.toLocalInput(r.exam_number_visible_at);
      document.getElementById("fStatus").value = r.registration_status;
      document.getElementById("fActive").checked = !!r.is_active;
      renderVenueChecks(res.body.venue_ids || []);
      C.openPanel();
    });
  }

  function emptyToNull(v) { return v === "" ? null : v; }

  function save() {
    var id = document.getElementById("fId").value;
    var payload = {
      title: C.val("fTitle"),
      exam_date: C.val("fExamDate"),
      registration_start_at: emptyToNull(C.val("fRegStart")),
      registration_end_at: emptyToNull(C.val("fRegEnd")),
      result_announcement_date: emptyToNull(C.val("fResultDate")),
      fee_level_i: C.val("fFeeI") === "" ? null : Number(C.val("fFeeI")),
      fee_level_ii: C.val("fFeeII") === "" ? null : Number(C.val("fFeeII")),
      capacity: C.val("fCapacity") === "" ? null : Number(C.val("fCapacity")),
      registration_status: document.getElementById("fStatus").value,
      exam_number_visible_at: emptyToNull(C.val("fVisibleAt")),
      is_active: C.checked("fActive"),
      venue_ids: selectedVenueIds(),
    };
    if (!payload.title) { C.toast("제목을 입력해 주세요.", "error"); return; }
    if (!payload.exam_date) { C.toast("시험일을 선택해 주세요.", "error"); return; }
    if (!payload.registration_start_at || !payload.registration_end_at) {
      C.toast("접수 시작/종료 일시를 입력해 주세요.", "error"); return;
    }

    var btn = document.getElementById("saveBtn");
    btn.disabled = true;
    var p;
    if (id) {
      p = Bo.updateExamRound(id, payload);
    } else {
      payload.round_no = Number(C.val("fRoundNo"));
      if (!payload.round_no) { btn.disabled = false; C.toast("회차 번호를 입력해 주세요.", "error"); return; }
      p = Bo.createExamRound(payload);
    }
    p.then(function (res) {
      btn.disabled = false;
      if (!res.ok) { C.toast(Bo.parseError(res), "error"); return; }
      var skipped = (res.body && res.body.venue_skipped) || [];
      C.toast(
        (id ? "회차를 수정했습니다." : "회차를 개설했습니다.") +
        (skipped.length ? " (접수 이력으로 해제되지 않은 시험장 " + skipped.length + "곳)" : ""),
        "success"
      );
      C.closePanel();
      load();
    });
  }

  function changeStatus(id, status) {
    var msg = status === "open" ? "접수를 개시" : "접수를 마감";
    if (!confirm("해당 회차의 " + msg + "하시겠습니까?")) return;
    Bo.setRoundStatus(id, status).then(function (res) {
      if (!res.ok) { C.toast(Bo.parseError(res), "error"); return; }
      C.toast(msg + "했습니다.", "success");
      load();
    });
  }

  document.getElementById("newBtn").addEventListener("click", openCreate);
  document.getElementById("cancelBtn").addEventListener("click", C.closePanel);
  document.getElementById("saveBtn").addEventListener("click", save);

  loadVenues().then(load);
})();
