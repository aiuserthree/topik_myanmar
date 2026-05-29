/**
 * FO 게시판(환불·정정 / 문의) 목록·작성·상세·비밀글·댓글·대댓글
 */
(function () {
  function qs(name) {
    return new URLSearchParams(location.search).get(name);
  }

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  /* ──────────────────────────────────
     비밀글 LP (TPKM_FO_5_2_4, 5_3_4)
     prompt 대신 모달 사용 + 5회 30분 잠금
  ────────────────────────────────── */
  function ensureSecretLP() {
    if (document.getElementById("secretLPOverlay")) return;
    var html =
      '<div id="secretLPOverlay" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,.6);z-index:99999;align-items:center;justify-content:center;padding:20px;">'
      + '<div style="background:white;border-radius:14px;max-width:420px;width:100%;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.3);">'
      + '<div style="padding:18px 22px;border-bottom:1px solid #e8ecf0;display:flex;justify-content:space-between;align-items:center;">'
      + '<h3 id="secretLPTitle" style="font-size:16px;font-weight:700;color:#003478;margin:0;">비밀글</h3>'
      + '<button type="button" id="secretLPClose" style="background:none;border:none;cursor:pointer;color:#6b7280;font-size:22px;line-height:1;">×</button>'
      + '</div>'
      + '<div style="padding:20px 22px;">'
      + '<p id="secretLPMsg" style="font-size:13px;color:#374151;line-height:1.6;margin-bottom:14px;">비밀글입니다. 비밀번호를 입력하세요.</p>'
      + '<input id="secretLPInput" type="password" autocomplete="current-password" placeholder="비밀번호 4자 이상" style="width:100%;padding:12px 14px;border:1.5px solid #e8ecf0;border-radius:8px;font-size:14px;font-family:inherit;"/>'
      + '<div id="secretLPErr" style="margin-top:8px;font-size:12px;color:#b91c1c;display:none;"></div>'
      + '</div>'
      + '<div style="padding:14px 22px;background:#fafbfc;border-top:1px solid #e8ecf0;display:flex;gap:8px;justify-content:flex-end;">'
      + '<button type="button" id="secretLPCancel" style="padding:9px 16px;background:#f3f4f6;color:#374151;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;">취소</button>'
      + '<button type="button" id="secretLPOk" style="padding:9px 18px;background:#003478;color:white;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;">확인</button>'
      + '</div></div></div>';
    var div = document.createElement("div");
    div.innerHTML = html;
    document.body.appendChild(div.firstChild);
    document.getElementById("secretLPClose").onclick = closeSecretLP;
    document.getElementById("secretLPCancel").onclick = closeSecretLP;
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeSecretLP();
    });
  }
  function closeSecretLP() {
    var o = document.getElementById("secretLPOverlay");
    if (o) o.style.display = "none";
  }
  window.openSecretLP = function (opts) {
    ensureSecretLP();
    document.getElementById("secretLPTitle").textContent = opts.title || "비밀글";
    document.getElementById("secretLPMsg").textContent = opts.message || "";
    var inp = document.getElementById("secretLPInput");
    var err = document.getElementById("secretLPErr");
    var ok = document.getElementById("secretLPOk");
    var cancel = document.getElementById("secretLPCancel");
    err.style.display = "none";
    err.textContent = "";
    inp.value = "";
    inp.style.display = opts.noPw ? "none" : "block";
    ok.style.display = opts.noPw ? "none" : "";
    cancel.textContent = opts.noPw ? "닫기" : "취소";
    document.getElementById("secretLPOverlay").style.display = "flex";
    setTimeout(function () { try { inp.focus(); } catch(e){} }, 50);
    ok.onclick = function () {
      var pw = inp.value;
      if (pw && pw.length >= 1) {
        var result = opts.onConfirm ? opts.onConfirm(pw) : true;
        if (result === false) {
          err.textContent = "비밀번호가 일치하지 않습니다. (5회 실패 시 30분간 열람 제한)";
          err.style.display = "block";
          inp.value = "";
          inp.focus();
        } else {
          closeSecretLP();
        }
      } else {
        err.textContent = "비밀번호를 입력하세요.";
        err.style.display = "block";
      }
    };
    inp.onkeydown = function(e){if(e.key==="Enter"){e.preventDefault();ok.click();}};
  };

  /**
   * 댓글/대댓글 섹션 HTML 생성 + 이벤트 연결
   * @param {string} board  "refund" | "inquiry"
   * @param {string} postId
   * @param {Array}  comments
   * @param {Element} container  삽입할 부모 요소
   */
  function renderComments(board, postId, comments, container) {
    if (!container) return;
    comments = Array.isArray(comments) ? comments : [];

    // 최상위 댓글만 추출
    var roots = comments.filter(function (c) { return !c.parentId; });
    var repliesOf = {};
    comments.forEach(function (c) {
      if (c.parentId) {
        if (!repliesOf[c.parentId]) repliesOf[c.parentId] = [];
        repliesOf[c.parentId].push(c);
      }
    });

    var prof = window.TMProfile && TMProfile.load();
    var myEmail = prof ? (prof.email || "") : "";

    function commentHTML(c, isReply) {
      var replies = repliesOf[c.id] || [];
      var replyHtml = replies.map(function (r) { return commentHTML(r, true); }).join("");
      return (
        '<div class="cm-item' + (isReply ? " cm-reply" : "") + '" data-cmid="' + esc(c.id) + '">' +
        '<div class="cm-meta"><span class="cm-author">' + esc(c.author) + (c.secret ? ' 🔒' : '') + '</span>' +
        '<span class="cm-date">' + esc(c.date) + '</span></div>' +
        '<div class="cm-body">' + esc(c.body).replace(/\n/g, "<br>") + '</div>' +
        (!isReply ? '<button type="button" class="cm-reply-btn" data-parent="' + esc(c.id) + '">답글</button>' : '') +
        (replyHtml ? '<div class="cm-replies">' + replyHtml + '</div>' : '') +
        '<div class="cm-reply-form" id="rf_' + esc(c.id) + '" style="display:none;">' +
        '<textarea class="cm-input" placeholder="답글을 입력하세요..." rows="2"></textarea>' +
        '<div style="display:flex;gap:6px;margin-top:6px;">' +
        '<button type="button" class="cm-submit-btn" data-parent="' + esc(c.id) + '">등록</button>' +
        '<button type="button" class="cm-cancel-btn" data-parent="' + esc(c.id) + '">취소</button>' +
        '</div></div>' +
        '</div>'
      );
    }

    var commentsHtml = roots.map(function (c) { return commentHTML(c, false); }).join("");

    container.innerHTML =
      '<section class="comments-section">' +
      '<h3 class="cm-title"><svg class="icon" width="15" height="15"><use href="#ic-info"/></svg> 댓글 ' +
      '<span class="cm-count">' + comments.length + '</span></h3>' +
      '<div class="cm-list">' + (commentsHtml || '<p class="cm-empty">첫 번째 댓글을 남겨보세요.</p>') + '</div>' +
      '<div class="cm-write">' +
      '<textarea class="cm-input" id="cmNewBody" placeholder="댓글을 입력하세요..." rows="3"></textarea>' +
      '<div style="display:flex;justify-content:flex-end;gap:6px;margin-top:6px;">' +
      '<button type="button" class="cm-submit-btn" id="cmNewSubmit">댓글 등록</button>' +
      '</div></div>' +
      '</section>';

    // 이벤트 — 답글 버튼 토글
    container.querySelectorAll(".cm-reply-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var pid = btn.getAttribute("data-parent");
        var rf = document.getElementById("rf_" + pid);
        if (rf) rf.style.display = rf.style.display === "none" ? "block" : "none";
      });
    });

    // 이벤트 — 답글 취소
    container.querySelectorAll(".cm-cancel-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var pid = btn.getAttribute("data-parent");
        var rf = document.getElementById("rf_" + pid);
        if (rf) { rf.style.display = "none"; rf.querySelector(".cm-input").value = ""; }
      });
    });

    // 이벤트 — 답글 등록
    container.querySelectorAll(".cm-submit-btn").forEach(function (btn) {
      if (btn.id === "cmNewSubmit") return;
      btn.addEventListener("click", function () {
        var pid = btn.getAttribute("data-parent");
        var rf = document.getElementById("rf_" + pid);
        var input = rf ? rf.querySelector(".cm-input") : null;
        if (!input || !input.value.trim()) { alert("내용을 입력하세요."); return; }
        // 0526 — 부모 글이 비밀글이면 댓글도 자동 secret
        var parentPost = (board === "refund" ? BoardStore.getRefundPosts() : BoardStore.getInquiryPosts())
          .find(function (x) { return x.id === postId; });
        var inheritSecret = !!(parentPost && parentPost.secret);
        BoardStore.addComment(board, postId, {
          parentId: pid,
          body: input.value.trim(),
          author: (prof && (prof.nameKr || prof.nameEn)) || "사용자",
          authorEmail: myEmail,
          secret: inheritSecret
        });
        // 재렌더링
        var newPost = (board === "refund" ? BoardStore.getRefundPosts() : BoardStore.getInquiryPosts())
          .find(function (x) { return x.id === postId; });
        if (newPost) renderComments(board, postId, newPost.comments, container);
      });
    });

    // 이벤트 — 신규 댓글 등록
    var newSubmit = container.querySelector("#cmNewSubmit");
    if (newSubmit) {
      newSubmit.addEventListener("click", function () {
        var ta = document.getElementById("cmNewBody");
        if (!ta || !ta.value.trim()) { alert("댓글 내용을 입력하세요."); return; }
        // 0526 — 부모 글이 비밀글이면 댓글도 자동 secret
        var parentPost = (board === "refund" ? BoardStore.getRefundPosts() : BoardStore.getInquiryPosts())
          .find(function (x) { return x.id === postId; });
        var inheritSecret = !!(parentPost && parentPost.secret);
        BoardStore.addComment(board, postId, {
          parentId: null,
          body: ta.value.trim(),
          author: (prof && (prof.nameKr || prof.nameEn)) || "사용자",
          authorEmail: myEmail,
          secret: inheritSecret
        });
        var newPost = (board === "refund" ? BoardStore.getRefundPosts() : BoardStore.getInquiryPosts())
          .find(function (x) { return x.id === postId; });
        if (newPost) renderComments(board, postId, newPost.comments, container);
      });
    }
  }

  function initRefund() {
    var listEl = document.getElementById("boardList");
    var detailEl = document.getElementById("detailView");
    var writeEl = document.getElementById("writeView");
    if (!listEl || !window.BoardStore) return;

    function renderList() {
      var typeFilter = document.getElementById("typeFilter");
      var stFilter = document.getElementById("statusFilter");
      var q = (document.getElementById("boardSearch") || {}).value || "";
      var type = typeFilter ? typeFilter.value : "";
      var st = stFilter ? stFilter.value : "";
      var posts = BoardStore.getRefundPosts().filter(function (p) {
        if (type && p.type !== type) return false;
        if (st && p.status !== st) return false;
        if (q && p.title.indexOf(q) < 0 && p.body.indexOf(q) < 0) return false;
        return true;
      });
      listEl.innerHTML = posts
        .map(function (p, i) {
          return (
            '<div class="board-row" data-id="' +
            esc(p.id) +
            '">' +
            '<div class="col-num">' +
            (i + 1) +
            "</div>" +
            '<div class="col-title">' +
            (p.secret ? "🔒 " : "") +
            esc(p.title) +
            ' <span class="chip">' +
            BoardStore.statusLabel("refund", p.status) +
            "</span></div>" +
            '<div class="col-date">' +
            esc(p.date) +
            "</div></div>"
          );
        })
        .join("");
      listEl.querySelectorAll(".board-row").forEach(function (row) {
        row.addEventListener("click", function () {
          openDetail(row.getAttribute("data-id"));
        });
      });
    }

    function openDetail(id) {
      var p = BoardStore.getRefundPosts().find(function (x) {
        return x.id === id;
      });
      if (!p) return;
      if (p.secret && !BoardStore.canViewSecret(p)) {
        if (BoardStore.isLocked(id)) {
          openSecretLP({title:"열람 제한", message:"비밀번호를 5회 이상 잘못 입력하여 30분간 열람이 제한됩니다.", noPw:true});
          return;
        }
        openSecretLP({
          title:"비밀글",
          message:"이 글은 비밀글입니다. 비밀번호를 입력하세요.",
          onConfirm:function(pw){
            if (!BoardStore.canViewSecret(p, pw)) {
              BoardStore.lockFail(id);
              return false;
            }
            BoardStore.clearLock(id);
            doOpenDetail();
            return true;
          }
        });
        return;
      }
      doOpenDetail();
      function doOpenDetail(){
      listEl.closest(".board-wrap").style.display = "none";
      document.querySelector(".board-toolbar").style.display = "none";
      detailEl.style.display = "block";
      detailEl.innerHTML =
        '<div class="detail-card"><div class="detail-head"><h2>' +
        esc(p.title) +
        '</h2><div class="detail-meta"><span>' +
        esc(p.date) +
        "</span><span>" +
        BoardStore.statusLabel("refund", p.status) +
        '</span></div></div><div class="detail-body">' +
        esc(p.body).replace(/\n/g, "<br>") +
        (p.adminReply
          ? '<hr style="margin:16px 0"><p><strong>관리자 답변</strong><br>' +
            esc(p.adminReply) +
            "</p>"
          : "") +
        '</div><div id="cmContainer"></div>' +
        '<div class="detail-nav"><button type="button" class="nav-btn" id="backList">목록</button></div></div>';
      renderComments("refund", p.id, p.comments || [], document.getElementById("cmContainer"));
      document.getElementById("backList").onclick = function () {
        detailEl.style.display = "none";
        listEl.closest(".board-wrap").style.display = "block";
        document.querySelector(".board-toolbar").style.display = "flex";
      };
      } /* end doOpenDetail */
    }

    document.getElementById("btnWrite") &&
      document.getElementById("btnWrite").addEventListener("click", function () {
        listEl.closest(".board-wrap").style.display = "none";
        document.querySelector(".board-toolbar").style.display = "none";
        writeEl.style.display = "block";
      });

    document.getElementById("writeForm") &&
      document.getElementById("writeForm").addEventListener("submit", function (e) {
        e.preventDefault();
        var secret = document.getElementById("wSecret").checked;
        var pw = document.getElementById("wSecretPw").value;
        if (secret && pw.length < 4) {
          alert("비밀글 비밀번호는 4자 이상입니다.");
          return;
        }
        BoardStore.addRefundPost({
          type: document.getElementById("wType").value,
          title: document.getElementById("wTitle").value,
          body: document.getElementById("wBody").value,
          secret: secret,
          secretPw: pw,
        });
        alert("등록되었습니다.");
        writeEl.style.display = "none";
        listEl.closest(".board-wrap").style.display = "block";
        document.querySelector(".board-toolbar").style.display = "flex";
        renderList();
      });

    document.getElementById("writeCancel") &&
      document.getElementById("writeCancel").addEventListener("click", function () {
        writeEl.style.display = "none";
        listEl.closest(".board-wrap").style.display = "block";
        document.querySelector(".board-toolbar").style.display = "flex";
      });

    ["typeFilter", "statusFilter", "boardSearch"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("change", renderList);
      if (el && el.tagName === "INPUT") el.addEventListener("input", renderList);
    });

    renderList();
    var openId = qs("id");
    if (openId) openDetail(openId);
  }

  function initInquiry() {
    var listEl = document.getElementById("boardList");
    var detailEl = document.getElementById("detailView");
    var writeEl = document.getElementById("writeView");
    if (!listEl || !window.BoardStore) return;

    function renderList() {
      var vis = document.getElementById("visFilter");
      var cat = document.getElementById("catFilter");
      var st = document.getElementById("statusFilter");
      var q = (document.getElementById("boardSearch") || {}).value || "";
      var posts = BoardStore.getInquiryPosts().filter(function (p) {
        if (vis && vis.value === "general" && p.secret) return false;
        if (vis && vis.value === "secret" && !p.secret) return false;
        if (cat && cat.value && p.category !== cat.value) return false;
        if (st && st.value && p.status !== st.value) return false;
        if (q && p.title.indexOf(q) < 0) return false;
        return true;
      });
      listEl.innerHTML = posts
        .map(function (p, i) {
          return (
            '<div class="board-row" data-id="' +
            esc(p.id) +
            '"><div class="col-num">' +
            (i + 1) +
            '</div><div class="col-title">' +
            (p.secret ? "🔒 " : "") +
            esc(p.title) +
            ' <span class="chip">' +
            BoardStore.statusLabel("inquiry", p.status) +
            "</span></div><div class="col-date'>" +
            esc(p.date) +
            "</div></div>"
          );
        })
        .join("");
      listEl.querySelectorAll(".board-row").forEach(function (row) {
        row.addEventListener("click", function () {
          openDetail(row.getAttribute("data-id"));
        });
      });
    }

    function openDetail(id) {
      var p = BoardStore.getInquiryPosts().find(function (x) {
        return x.id === id;
      });
      if (!p) return;
      if (p.secret && !BoardStore.canViewSecret(p)) {
        if (BoardStore.isLocked && BoardStore.isLocked(id)) {
          openSecretLP({title:"열람 제한", message:"비밀번호를 5회 이상 잘못 입력하여 30분간 열람이 제한됩니다.", noPw:true});
          return;
        }
        openSecretLP({
          title:"비밀글",
          message:"이 글은 비밀글입니다. 비밀번호를 입력하세요.",
          onConfirm:function(pw){
            if (!BoardStore.canViewSecret(p, pw)) {
              BoardStore.lockFail(id);
              return false;
            }
            if(BoardStore.clearLock)BoardStore.clearLock(id);
            doOpenDetail();
            return true;
          }
        });
        return;
      }
      doOpenDetail();
      function doOpenDetail(){
      listEl.closest(".board-wrap").style.display = "none";
      document.querySelector(".board-toolbar").style.display = "none";
      detailEl.style.display = "block";
      detailEl.innerHTML =
        '<div class="detail-card"><div class="detail-head"><h2>' +
        esc(p.title) +
        '</h2><div class="detail-meta"><span>' +
        esc(p.date) +
        "</span></div></div><div class=\"detail-body\">" +
        esc(p.body).replace(/\n/g, "<br>") +
        (p.adminReply
          ? '<hr style="margin:16px 0"><strong>답변</strong><p>' +
            esc(p.adminReply) +
            "</p>"
          : "") +
        '</div><div id="cmContainer"></div>' +
        '<div class="detail-nav"><button type="button" class="nav-btn" id="backList">목록</button></div></div>';
      renderComments("inquiry", p.id, p.comments || [], document.getElementById("cmContainer"));
      document.getElementById("backList").onclick = function () {
        detailEl.style.display = "none";
        listEl.closest(".board-wrap").style.display = "block";
        document.querySelector(".board-toolbar").style.display = "flex";
      };
      } /* end doOpenDetail */
    }

    document.getElementById("btnWrite") &&
      document.getElementById("btnWrite").addEventListener("click", function () {
        listEl.closest(".board-wrap").style.display = "none";
        document.querySelector(".board-toolbar").style.display = "none";
        writeEl.style.display = "block";
      });

    document.getElementById("writeForm") &&
      document.getElementById("writeForm").addEventListener("submit", function (e) {
        e.preventDefault();
        var vis = document.getElementById("wVisibility").value;
        var secret = vis === "secret";
        var pw = document.getElementById("wSecretPw").value;
        if (secret && pw.length < 4) {
          alert("비밀번호 4자 이상");
          return;
        }
        BoardStore.addInquiryPost({
          category: document.getElementById("wCategory").value,
          visibility: vis,
          title: document.getElementById("wTitle").value,
          body: document.getElementById("wBody").value,
          secretPw: pw,
        });
        alert("등록되었습니다.");
        writeEl.style.display = "none";
        listEl.closest(".board-wrap").style.display = "block";
        document.querySelector(".board-toolbar").style.display = "flex";
        renderList();
      });

    document.getElementById("writeCancel") &&
      document.getElementById("writeCancel").addEventListener("click", function () {
        writeEl.style.display = "none";
        listEl.closest(".board-wrap").style.display = "block";
        document.querySelector(".board-toolbar").style.display = "flex";
      });

    ["visFilter", "catFilter", "statusFilter", "boardSearch"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("change", renderList);
      if (el && el.tagName === "INPUT") el.addEventListener("input", renderList);
    });

    renderList();
  }

  document.addEventListener("DOMContentLoaded", function () {
    var mode = document.body.getAttribute("data-board");
    if (mode === "refund") initRefund();
    if (mode === "inquiry") initInquiry();
  });
})();
