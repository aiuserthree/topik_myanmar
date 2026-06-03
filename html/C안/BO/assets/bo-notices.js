/* TOPIK Myanmar BO — 공지 관리 controller (static, no framework). */
(function () {
  "use strict";
  var C = window.BoCommon;
  var Bo = C.Bo;
  if (!C.requireAuth()) return;
  C.initChrome();

  var CAT_LABEL = { important: "중요", registration: "접수", exam: "시험", result: "결과" };
  var state = { category: "all", published: "", q: "", page: 1, pageSize: 20 };

  function badge(label, cls) {
    return '<span class="bo-badge ' + cls + '">' + C.esc(label) + "</span>";
  }

  function load() {
    var tbody = document.getElementById("rows");
    tbody.innerHTML = '<tr><td colspan="8" class="bo-empty">불러오는 중…</td></tr>';
    Bo.listNotices({
      category: state.category,
      published: state.published,
      q: state.q,
      page: state.page,
      page_size: state.pageSize,
    }).then(function (res) {
      if (!res.ok) {
        tbody.innerHTML = '<tr><td colspan="8" class="bo-empty">' + C.esc(Bo.parseError(res)) + "</td></tr>";
        return;
      }
      renderRows(res.body.items || []);
      renderPagination(res.body.pagination || {});
    });
  }

  function renderRows(items) {
    var tbody = document.getElementById("rows");
    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="bo-empty">공지가 없습니다.</td></tr>';
      return;
    }
    tbody.innerHTML = items.map(function (it) {
      var pub = it.is_published
        ? badge("게시", "bo-badge-green")
        : badge("미게시", "bo-badge-gray");
      var pinned = it.is_pinned ? badge("고정", "bo-badge-blue") : '<span class="bo-cell-muted">—</span>';
      var toggleBtn = it.is_published
        ? '<button class="bo-btn bo-btn-secondary bo-btn-sm" data-act="unpublish" data-id="' + it.id + '">게시중지</button>'
        : '<button class="bo-btn bo-btn-success bo-btn-sm" data-act="publish" data-id="' + it.id + '">게시</button>';
      return "<tr>" +
        "<td>" + it.id + "</td>" +
        "<td>" + C.esc(it.category_label) + "</td>" +
        "<td>" + C.esc(it.title) + "</td>" +
        "<td>" + pub + "</td>" +
        "<td>" + pinned + "</td>" +
        "<td>" + (it.view_count || 0) + "</td>" +
        "<td>" + C.esc(it.published_at_label || "—") + "</td>" +
        '<td><div class="bo-row-actions">' +
          '<button class="bo-btn bo-btn-secondary bo-btn-sm" data-act="edit" data-id="' + it.id + '">수정</button>' +
          toggleBtn +
          '<button class="bo-btn bo-btn-danger bo-btn-sm" data-act="delete" data-id="' + it.id + '">삭제</button>' +
        "</div></td>" +
        "</tr>";
    }).join("");

    [].forEach.call(tbody.querySelectorAll("button[data-act]"), function (b) {
      b.addEventListener("click", function () {
        var id = Number(b.dataset.id);
        var act = b.dataset.act;
        if (act === "edit") openEdit(id);
        else if (act === "publish") doPublish(id, true);
        else if (act === "unpublish") doPublish(id, false);
        else if (act === "delete") doDelete(id);
      });
    });
  }

  function renderPagination(p) {
    var nav = document.getElementById("pagination");
    var total = p.total_pages || 1, cur = p.page || 1;
    if (total <= 1) { nav.innerHTML = ""; return; }
    var html = '<button ' + (cur <= 1 ? "disabled" : "") + ' data-pg="' + (cur - 1) + '">‹</button>';
    var start = Math.max(1, cur - 3), end = Math.min(total, cur + 3);
    for (var i = start; i <= end; i++) {
      html += '<button class="' + (i === cur ? "is-on" : "") + '" data-pg="' + i + '">' + i + "</button>";
    }
    html += '<button ' + (cur >= total ? "disabled" : "") + ' data-pg="' + (cur + 1) + '">›</button>';
    nav.innerHTML = html;
    [].forEach.call(nav.querySelectorAll("button[data-pg]"), function (b) {
      b.addEventListener("click", function () {
        if (b.disabled) return;
        state.page = Number(b.dataset.pg); load();
      });
    });
  }

  // ---- form ----
  function openCreate() {
    document.getElementById("panelTitle").textContent = "새 공지";
    document.getElementById("fId").value = "";
    document.getElementById("fCategory").value = "important";
    document.getElementById("fTitle").value = "";
    document.getElementById("fBody").value = "";
    document.getElementById("fPinned").checked = false;
    document.getElementById("fPublished").checked = false;
    document.getElementById("publishWrap").style.display = "";
    C.openPanel();
  }

  function openEdit(id) {
    Bo.getNotice(id).then(function (res) {
      if (!res.ok) { C.toast(Bo.parseError(res), "error"); return; }
      var n = res.body;
      document.getElementById("panelTitle").textContent = "공지 수정 #" + n.id;
      document.getElementById("fId").value = n.id;
      document.getElementById("fCategory").value = n.category;
      document.getElementById("fTitle").value = n.title || "";
      document.getElementById("fBody").value = n.body_html || "";
      document.getElementById("fPinned").checked = !!n.is_pinned;
      // 발행 토글은 목록 버튼에서 처리 — 수정 폼에서는 숨김
      document.getElementById("publishWrap").style.display = "none";
      C.openPanel();
    });
  }

  function save() {
    var id = document.getElementById("fId").value;
    var payload = {
      category: document.getElementById("fCategory").value,
      title: C.val("fTitle"),
      body_html: document.getElementById("fBody").value,
      is_pinned: C.checked("fPinned"),
    };
    if (!payload.title) { C.toast("제목을 입력해 주세요.", "error"); return; }
    var btn = document.getElementById("saveBtn");
    btn.disabled = true;
    var p;
    if (id) {
      p = Bo.updateNotice(id, payload);
    } else {
      payload.is_published = C.checked("fPublished");
      p = Bo.createNotice(payload);
    }
    p.then(function (res) {
      btn.disabled = false;
      if (!res.ok) { C.toast(Bo.parseError(res), "error"); return; }
      C.toast(id ? "공지를 수정했습니다." : "공지를 등록했습니다.", "success");
      C.closePanel();
      load();
    });
  }

  function doPublish(id, publish) {
    var fn = publish ? Bo.publishNotice : Bo.unpublishNotice;
    fn(id).then(function (res) {
      if (!res.ok) { C.toast(Bo.parseError(res), "error"); return; }
      C.toast(publish ? "게시했습니다." : "게시를 중지했습니다.", "success");
      load();
    });
  }

  function doDelete(id) {
    if (!confirm("공지 #" + id + " 을(를) 삭제하시겠습니까? 되돌릴 수 없습니다.")) return;
    Bo.deleteNotice(id).then(function (res) {
      if (!res.ok) { C.toast(Bo.parseError(res), "error"); return; }
      C.toast("삭제했습니다.", "success");
      load();
    });
  }

  // ---- bindings ----
  document.getElementById("newBtn").addEventListener("click", openCreate);
  document.getElementById("cancelBtn").addEventListener("click", C.closePanel);
  document.getElementById("saveBtn").addEventListener("click", save);
  document.getElementById("categoryFilter").addEventListener("change", function (e) {
    state.category = e.target.value; state.page = 1; load();
  });
  document.getElementById("publishedFilter").addEventListener("change", function (e) {
    state.published = e.target.value; state.page = 1; load();
  });
  document.getElementById("searchBtn").addEventListener("click", function () {
    state.q = C.val("searchInput"); state.page = 1; load();
  });
  document.getElementById("searchInput").addEventListener("keydown", function (e) {
    if (e.key === "Enter") { state.q = e.target.value.trim(); state.page = 1; load(); }
  });

  load();
})();
