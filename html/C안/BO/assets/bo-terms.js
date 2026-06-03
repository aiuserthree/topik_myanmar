/* TOPIK Myanmar BO — 약관/개인정보 관리 controller (static, no framework). */
(function () {
  "use strict";
  var C = window.BoCommon;
  var Bo = C.Bo;
  if (!C.requireAuth()) return;
  C.initChrome();

  var STATUS = {
    draft: ["초안", "bo-badge-gray"],
    published: ["게시중", "bo-badge-green"],
    retired: ["만료", "bo-badge-amber"],
  };
  var state = { type: "" };

  function statusBadge(s) {
    var m = STATUS[s] || [s, "bo-badge-gray"];
    return '<span class="bo-badge ' + m[1] + '">' + m[0] + "</span>";
  }

  function load() {
    var tbody = document.getElementById("rows");
    tbody.innerHTML = '<tr><td colspan="6" class="bo-empty">불러오는 중…</td></tr>';
    Bo.listTerms({ type: state.type }).then(function (res) {
      if (!res.ok) {
        tbody.innerHTML = '<tr><td colspan="6" class="bo-empty">' + C.esc(Bo.parseError(res)) + "</td></tr>";
        return;
      }
      renderRows(res.body.items || []);
    });
  }

  function renderRows(items) {
    var tbody = document.getElementById("rows");
    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="bo-empty">약관이 없습니다.</td></tr>';
      return;
    }
    tbody.innerHTML = items.map(function (t) {
      var actions = '<button class="bo-btn bo-btn-secondary bo-btn-sm" data-act="edit" data-id="' + t.id + '">' +
        (t.status === "draft" ? "수정" : "보기/새버전") + "</button>";
      if (t.status === "draft") {
        actions += '<button class="bo-btn bo-btn-success bo-btn-sm" data-act="publish" data-id="' + t.id + '">게시</button>' +
          '<button class="bo-btn bo-btn-danger bo-btn-sm" data-act="delete" data-id="' + t.id + '">삭제</button>';
      }
      return "<tr>" +
        "<td>" + t.id + "</td>" +
        "<td>" + C.esc(t.term_type_label) + "</td>" +
        '<td class="bo-exam-no">' + C.esc(t.version) + "</td>" +
        "<td>" + statusBadge(t.status) + "</td>" +
        "<td>" + C.esc(C.fmtDate(t.effective_at)) + "</td>" +
        '<td><div class="bo-row-actions">' + actions + "</div></td>" +
        "</tr>";
    }).join("");

    [].forEach.call(tbody.querySelectorAll("button[data-act]"), function (b) {
      b.addEventListener("click", function () {
        var id = Number(b.dataset.id), act = b.dataset.act;
        if (act === "edit") openDetail(id);
        else if (act === "publish") doPublish(id);
        else if (act === "delete") doDelete(id);
      });
    });
  }

  function fillForm(t, opts) {
    opts = opts || {};
    document.getElementById("fId").value = opts.asNewVersion ? "" : (t ? t.id : "");
    document.getElementById("fType").value = t ? t.term_type : "service";
    document.getElementById("fVersion").value = opts.asNewVersion ? "" : (t ? t.version : "");
    document.getElementById("fEffective").value = t ? C.toLocalInput(t.effective_at) : "";
    document.getElementById("fBodyKo").value = t ? (t.body_ko || "") : "";
    document.getElementById("fBodyMy").value = t ? (t.body_my || "") : "";
    document.getElementById("fBodyEn").value = t ? (t.body_en || "") : "";
  }

  function openCreate() {
    document.getElementById("panelTitle").textContent = "새 약관";
    fillForm(null);
    document.getElementById("editLockHint").style.display = "none";
    document.getElementById("saveBtn").textContent = "초안 저장";
    document.getElementById("fType").disabled = false;
    C.openPanel();
  }

  function openDetail(id) {
    Bo.getTerm(id).then(function (res) {
      if (!res.ok) { C.toast(Bo.parseError(res), "error"); return; }
      var t = res.body;
      if (t.status === "draft") {
        document.getElementById("panelTitle").textContent = "약관 수정 #" + t.id;
        fillForm(t);
        document.getElementById("editLockHint").style.display = "none";
        document.getElementById("saveBtn").textContent = "저장";
        document.getElementById("fType").disabled = false;
      } else {
        // 게시·만료본 → 새 버전 생성 폼으로 prefill
        document.getElementById("panelTitle").textContent = t.term_type_label + " — 새 버전 (현재 " + t.version + ")";
        fillForm(t, { asNewVersion: true });
        document.getElementById("editLockHint").style.display = "";
        document.getElementById("saveBtn").textContent = "새 버전 초안 저장";
        document.getElementById("fType").disabled = true;
      }
      C.openPanel();
    });
  }

  function save() {
    var id = document.getElementById("fId").value;
    var payload = {
      term_type: document.getElementById("fType").value,
      version: C.val("fVersion"),
      effective_at: C.val("fEffective") || null,
      body_ko: document.getElementById("fBodyKo").value,
      body_my: C.val("fBodyMy") || null,
      body_en: C.val("fBodyEn") || null,
    };
    if (!payload.version) { C.toast("버전을 입력해 주세요. (예: v1.1)", "error"); return; }
    if (!payload.body_ko.trim()) { C.toast("본문(한국어)은 필수입니다.", "error"); return; }

    var btn = document.getElementById("saveBtn");
    btn.disabled = true;
    var p = id ? Bo.updateTerm(id, payload) : Bo.createTerm(payload);
    p.then(function (res) {
      btn.disabled = false;
      if (!res.ok) { C.toast(Bo.parseError(res), "error"); return; }
      C.toast(id ? "약관을 수정했습니다." : "약관 초안을 저장했습니다.", "success");
      C.closePanel();
      load();
    });
  }

  function doPublish(id) {
    if (!confirm("이 버전을 게시하시겠습니까? 같은 종류의 기존 게시본은 만료 처리됩니다.")) return;
    Bo.publishTerm(id).then(function (res) {
      if (!res.ok) { C.toast(Bo.parseError(res), "error"); return; }
      C.toast("게시했습니다.", "success");
      load();
    });
  }

  function doDelete(id) {
    if (!confirm("초안 #" + id + " 을(를) 삭제하시겠습니까?")) return;
    Bo.deleteTerm(id).then(function (res) {
      if (!res.ok) { C.toast(Bo.parseError(res), "error"); return; }
      C.toast("삭제했습니다.", "success");
      load();
    });
  }

  document.getElementById("newBtn").addEventListener("click", openCreate);
  document.getElementById("cancelBtn").addEventListener("click", C.closePanel);
  document.getElementById("saveBtn").addEventListener("click", save);
  document.getElementById("typeFilter").addEventListener("change", function (e) {
    state.type = e.target.value; load();
  });

  load();
})();
