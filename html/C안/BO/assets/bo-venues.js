/* TOPIK Myanmar BO — 시험장 관리 controller (static, no framework). */
(function () {
  "use strict";
  var C = window.BoCommon;
  var Bo = C.Bo;
  if (!C.requireAuth()) return;
  C.initChrome();

  var state = { active: "", regions: [] };

  function loadRegions() {
    return Bo.listRegionCodes().then(function (res) {
      state.regions = (res.ok && res.body.items) ? res.body.items : [];
      var sel = document.getElementById("fRegion");
      if (!state.regions.length) {
        sel.innerHTML = '<option value="">등록된 지역 없음</option>';
        return;
      }
      sel.innerHTML = state.regions.map(function (r) {
        return '<option value="' + r.region_code + '" data-country="' + r.country_code + '">' +
          C.esc(r.name_ko) + " (" + r.country_code + "-" + r.region_code + ")</option>";
      }).join("");
    });
  }

  function load() {
    var tbody = document.getElementById("rows");
    tbody.innerHTML = '<tr><td colspan="7" class="bo-empty">불러오는 중…</td></tr>';
    Bo.listVenues({ active: state.active }).then(function (res) {
      if (!res.ok) {
        tbody.innerHTML = '<tr><td colspan="7" class="bo-empty">' + C.esc(Bo.parseError(res)) + "</td></tr>";
        return;
      }
      renderRows(res.body.items || []);
    });
  }

  function renderRows(items) {
    var tbody = document.getElementById("rows");
    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="bo-empty">시험장이 없습니다. [+ 새 시험장]으로 등록하세요.</td></tr>';
      return;
    }
    tbody.innerHTML = items.map(function (v) {
      var active = v.is_active
        ? '<span class="bo-badge bo-badge-green">사용</span>'
        : '<span class="bo-badge bo-badge-gray">미사용</span>';
      var toggle = v.is_active
        ? '<button class="bo-btn bo-btn-secondary bo-btn-sm" data-act="off" data-id="' + v.id + '">미사용</button>'
        : '<button class="bo-btn bo-btn-success bo-btn-sm" data-act="on" data-id="' + v.id + '">사용</button>';
      var region = (v.region_name ? C.esc(v.region_name) + " " : "") + "(" + C.esc(v.country_code) + "-" + C.esc(v.region_code) + ")";
      return "<tr>" +
        '<td class="bo-exam-no">' + C.esc(v.venue_code) + "</td>" +
        "<td>" + C.esc(v.name_ko) + "</td>" +
        '<td class="bo-cell-muted">' + region + "</td>" +
        "<td>" + (v.capacity != null ? v.capacity : "—") + "</td>" +
        "<td>" + active + "</td>" +
        '<td class="bo-cell-muted">' + C.esc((v.note || "").slice(0, 24)) + "</td>" +
        '<td><div class="bo-row-actions">' +
          '<button class="bo-btn bo-btn-secondary bo-btn-sm" data-act="edit" data-id="' + v.id + '">수정</button>' +
          toggle +
        "</div></td>" +
        "</tr>";
    }).join("");

    [].forEach.call(tbody.querySelectorAll("button[data-act]"), function (b) {
      b.addEventListener("click", function () {
        var id = Number(b.dataset.id), act = b.dataset.act;
        if (act === "edit") openEdit(id);
        else if (act === "on") toggleActive(id, true);
        else if (act === "off") toggleActive(id, false);
      });
    });
  }

  function clearForm() {
    ["fId", "fCode", "fNameKo", "fNameEn", "fAddress", "fCapacity", "fNote"].forEach(function (id) {
      document.getElementById(id).value = "";
    });
    document.getElementById("fActive").checked = true;
  }

  function openCreate() {
    clearForm();
    document.getElementById("panelTitle").textContent = "새 시험장";
    document.getElementById("fCode").disabled = false;
    document.getElementById("codeHint").textContent = "접수 이력이 있으면 변경 불가";
    C.openPanel();
  }

  function openEdit(id) {
    Bo.getVenue(id).then(function (res) {
      if (!res.ok) { C.toast(Bo.parseError(res), "error"); return; }
      var v = res.body;
      clearForm();
      document.getElementById("panelTitle").textContent = "시험장 수정 — " + v.venue_code;
      document.getElementById("fId").value = v.id;
      document.getElementById("fCode").value = v.venue_code;
      document.getElementById("fNameKo").value = v.name_ko || "";
      document.getElementById("fNameEn").value = v.name_en || "";
      document.getElementById("fAddress").value = v.address || "";
      document.getElementById("fCapacity").value = v.capacity != null ? v.capacity : "";
      document.getElementById("fNote").value = v.note || "";
      document.getElementById("fActive").checked = !!v.is_active;
      var sel = document.getElementById("fRegion");
      sel.value = v.region_code;
      C.openPanel();
    });
  }

  function regionCountry() {
    var sel = document.getElementById("fRegion");
    var opt = sel.options[sel.selectedIndex];
    return opt ? (opt.getAttribute("data-country") || "025") : "025";
  }

  function save() {
    var id = document.getElementById("fId").value;
    var region = document.getElementById("fRegion").value;
    if (!region) { C.toast("지역을 선택해 주세요. (없으면 운영팀에 지역코드 등록 요청)", "error"); return; }
    var payload = {
      venue_code: C.val("fCode"),
      name_ko: C.val("fNameKo"),
      name_en: C.val("fNameEn") || null,
      address: C.val("fAddress") || null,
      country_code: regionCountry(),
      region_code: region,
      capacity: C.val("fCapacity") === "" ? null : Number(C.val("fCapacity")),
      note: C.val("fNote") || null,
      is_active: C.checked("fActive"),
    };
    if (!payload.venue_code) { C.toast("시험장 코드(2자리)를 입력해 주세요.", "error"); return; }
    if (!payload.name_ko) { C.toast("시험장명(한국어)을 입력해 주세요.", "error"); return; }
    if (payload.capacity == null) { C.toast("정원을 입력해 주세요.", "error"); return; }

    var btn = document.getElementById("saveBtn");
    btn.disabled = true;
    var p = id ? Bo.updateVenue(id, payload) : Bo.createVenue(payload);
    p.then(function (res) {
      btn.disabled = false;
      if (!res.ok) { C.toast(Bo.parseError(res), "error"); return; }
      C.toast(id ? "시험장을 수정했습니다." : "시험장을 등록했습니다.", "success");
      C.closePanel();
      load();
    });
  }

  function toggleActive(id, active) {
    var fn = active ? Bo.activateVenue : Bo.deactivateVenue;
    fn(id).then(function (res) {
      if (!res.ok) { C.toast(Bo.parseError(res), "error"); return; }
      C.toast(active ? "사용으로 변경했습니다." : "미사용으로 변경했습니다.", "success");
      load();
    });
  }

  document.getElementById("newBtn").addEventListener("click", openCreate);
  document.getElementById("cancelBtn").addEventListener("click", C.closePanel);
  document.getElementById("saveBtn").addEventListener("click", save);
  document.getElementById("activeFilter").addEventListener("change", function (e) {
    state.active = e.target.value; load();
  });

  loadRegions().then(load);
})();
