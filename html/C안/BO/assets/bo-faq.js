/* TOPIK Myanmar BO — FAQ 관리 controller (static, no framework). */
(function () {
  "use strict";
  var C = window.BoCommon;
  var Bo = C.Bo;
  if (!C.requireAuth()) return;
  C.initChrome();

  var state = { category: "all", active: "", items: [] };

  function load() {
    var tbody = document.getElementById("rows");
    tbody.innerHTML = '<tr><td colspan="7" class="bo-empty">불러오는 중…</td></tr>';
    Bo.listFaq({ category: state.category, active: state.active }).then(function (res) {
      if (!res.ok) {
        tbody.innerHTML = '<tr><td colspan="7" class="bo-empty">' + C.esc(Bo.parseError(res)) + "</td></tr>";
        return;
      }
      state.items = res.body.items || [];
      renderRows(state.items);
    });
  }

  function langTags(it) {
    var tags = [];
    if (it.question_my || it.answer_my) tags.push("MY");
    if (it.question_en || it.answer_en) tags.push("EN");
    return tags.length ? '<span class="bo-tag">' + tags.join(" · ") + "</span>" : '<span class="bo-cell-muted">KO</span>';
  }

  function renderRows(items) {
    var tbody = document.getElementById("rows");
    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="bo-empty">FAQ가 없습니다.</td></tr>';
      return;
    }
    tbody.innerHTML = items.map(function (it) {
      var active = it.is_active
        ? '<span class="bo-badge bo-badge-green">노출</span>'
        : '<span class="bo-badge bo-badge-gray">숨김</span>';
      var toggle = it.is_active
        ? '<button class="bo-btn bo-btn-secondary bo-btn-sm" data-act="hide" data-id="' + it.id + '">숨김</button>'
        : '<button class="bo-btn bo-btn-success bo-btn-sm" data-act="show" data-id="' + it.id + '">노출</button>';
      return "<tr>" +
        "<td>" + it.id + "</td>" +
        "<td>" + C.esc(it.category_label) + "</td>" +
        '<td><input type="number" class="bo-input" style="width:70px;min-width:0;" data-sort="' + it.id + '" value="' + (it.sort_order || 0) + '" /></td>' +
        "<td>" + C.esc((it.question_ko || "").slice(0, 60)) + "</td>" +
        "<td>" + langTags(it) + "</td>" +
        "<td>" + active + "</td>" +
        '<td><div class="bo-row-actions">' +
          '<button class="bo-btn bo-btn-secondary bo-btn-sm" data-act="edit" data-id="' + it.id + '">수정</button>' +
          toggle +
          '<button class="bo-btn bo-btn-danger bo-btn-sm" data-act="delete" data-id="' + it.id + '">삭제</button>' +
        "</div></td>" +
        "</tr>";
    }).join("");

    [].forEach.call(tbody.querySelectorAll("button[data-act]"), function (b) {
      b.addEventListener("click", function () {
        var id = Number(b.dataset.id), act = b.dataset.act;
        if (act === "edit") openEdit(id);
        else if (act === "show") toggleActive(id, true);
        else if (act === "hide") toggleActive(id, false);
        else if (act === "delete") doDelete(id);
      });
    });
  }

  function openCreate() {
    document.getElementById("panelTitle").textContent = "새 FAQ";
    ["fId", "fQko", "fAko", "fQmy", "fQen", "fAmy", "fAen"].forEach(function (id) {
      document.getElementById(id).value = "";
    });
    document.getElementById("fCategory").value = "account";
    document.getElementById("fSort").value = "0";
    document.getElementById("fActive").checked = true;
    C.openPanel();
  }

  function openEdit(id) {
    Bo.getFaq(id).then(function (res) {
      if (!res.ok) { C.toast(Bo.parseError(res), "error"); return; }
      var f = res.body;
      document.getElementById("panelTitle").textContent = "FAQ 수정 #" + f.id;
      document.getElementById("fId").value = f.id;
      document.getElementById("fCategory").value = f.category;
      document.getElementById("fSort").value = f.sort_order || 0;
      document.getElementById("fQko").value = f.question_ko || "";
      document.getElementById("fAko").value = f.answer_ko || "";
      document.getElementById("fQmy").value = f.question_my || "";
      document.getElementById("fQen").value = f.question_en || "";
      document.getElementById("fAmy").value = f.answer_my || "";
      document.getElementById("fAen").value = f.answer_en || "";
      document.getElementById("fActive").checked = !!f.is_active;
      C.openPanel();
    });
  }

  function save() {
    var id = document.getElementById("fId").value;
    var payload = {
      category: document.getElementById("fCategory").value,
      sort_order: Number(document.getElementById("fSort").value) || 0,
      question_ko: C.val("fQko"),
      answer_ko: C.val("fAko"),
      question_my: C.val("fQmy") || null,
      question_en: C.val("fQen") || null,
      answer_my: C.val("fAmy") || null,
      answer_en: C.val("fAen") || null,
      is_active: C.checked("fActive"),
    };
    if (!payload.question_ko || !payload.answer_ko) {
      C.toast("질문/답변(한국어)은 필수입니다.", "error");
      return;
    }
    var btn = document.getElementById("saveBtn");
    btn.disabled = true;
    var p = id ? Bo.updateFaq(id, payload) : Bo.createFaq(payload);
    p.then(function (res) {
      btn.disabled = false;
      if (!res.ok) { C.toast(Bo.parseError(res), "error"); return; }
      C.toast(id ? "FAQ를 수정했습니다." : "FAQ를 등록했습니다.", "success");
      C.closePanel();
      load();
    });
  }

  function toggleActive(id, active) {
    Bo.updateFaq(id, { is_active: active }).then(function (res) {
      if (!res.ok) { C.toast(Bo.parseError(res), "error"); return; }
      C.toast(active ? "노출로 변경했습니다." : "숨김으로 변경했습니다.", "success");
      load();
    });
  }

  function doDelete(id) {
    if (!confirm("FAQ #" + id + " 을(를) 삭제하시겠습니까?")) return;
    Bo.deleteFaq(id).then(function (res) {
      if (!res.ok) { C.toast(Bo.parseError(res), "error"); return; }
      C.toast("삭제했습니다.", "success");
      load();
    });
  }

  function saveOrder() {
    var inputs = document.querySelectorAll("input[data-sort]");
    var orders = [];
    [].forEach.call(inputs, function (i) {
      orders.push({ id: Number(i.dataset.sort), sort_order: Number(i.value) || 0 });
    });
    if (!orders.length) return;
    Bo.reorderFaq(orders).then(function (res) {
      if (!res.ok) { C.toast(Bo.parseError(res), "error"); return; }
      C.toast("정렬 순서를 저장했습니다. (" + (res.body.updated || 0) + "건)", "success");
      load();
    });
  }

  document.getElementById("newBtn").addEventListener("click", openCreate);
  document.getElementById("reorderBtn").addEventListener("click", saveOrder);
  document.getElementById("cancelBtn").addEventListener("click", C.closePanel);
  document.getElementById("saveBtn").addEventListener("click", save);
  document.getElementById("categoryFilter").addEventListener("change", function (e) {
    state.category = e.target.value; load();
  });
  document.getElementById("activeFilter").addEventListener("change", function (e) {
    state.active = e.target.value; load();
  });

  load();
})();
