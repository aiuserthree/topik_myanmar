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

  /** 첨부 파일 입력에서 메타데이터(파일명·크기)만 추출 — 데모는 용량 보호 위해 원본 미저장 */
  function collectAttachmentMeta(inputId) {
    var el = document.getElementById(inputId);
    if (!el || !el.files || !el.files.length) return [];
    return Array.prototype.slice.call(el.files).slice(0, 5).map(function (f) {
      return { name: f.name, size: f.size, mime: f.type };
    });
  }
  /** 첨부 목록 HTML (상세에서 표시) */
  function attachmentsHtml(files) {
    if (!Array.isArray(files) || !files.length) return "";
    var items = files.map(function (a) {
      var kb = a.size ? " (" + Math.round(a.size / 1024) + "KB)" : "";
      return '<li style="display:flex;align-items:center;gap:6px;font-size:13px;color:#374151;"><svg class="icon" width="13" height="13"><use href="#ic-download"/></svg>' + esc(a.name) + kb + "</li>";
    }).join("");
    return '<div class="detail-attach" style="margin-top:14px;padding:12px 14px;background:#f8fafc;border:1px solid #e8ecf0;border-radius:8px;"><strong style="font-size:12px;color:#003478;">첨부파일</strong><ul style="margin-top:6px;list-style:none;display:flex;flex-direction:column;gap:4px;">' + items + "</ul></div>";
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
    var isAdminViewer = false;
    try { isAdminViewer = !!sessionStorage.getItem("tm_admin_session_v1"); } catch (e) {}
    /* 부모 글 작성자(게시물 소유자) 이메일 — 본인 글의 댓글은 열람 가능 */
    var thePost = (board === "refund" ? BoardStore.getRefundPosts() : BoardStore.getInquiryPosts())
      .find(function (x) { return x.id === postId; });
    var postOwnerEmail = thePost ? (thePost.authorEmail || "") : "";
    /* 비공개/비밀 댓글 열람 권한: 댓글 작성자 · 게시물 작성자 · 관리자 */
    function canViewComment(c) {
      if (!c.secret) return true;
      if (isAdminViewer) return true;
      if (myEmail && c.authorEmail && myEmail === c.authorEmail) return true;
      if (myEmail && postOwnerEmail && myEmail === postOwnerEmail) return true;
      return false;
    }

    function commentHTML(c, isReply) {
      var replies = repliesOf[c.id] || [];
      var replyHtml = replies.map(function (r) { return commentHTML(r, true); }).join("");
      var bodyHtml = canViewComment(c)
        ? esc(c.body).replace(/\n/g, "<br>")
        : '<span style="color:#9ca3af;">🔒 비공개 댓글입니다. (작성자·관리자만 열람)</span>';
      return (
        '<div class="cm-item' + (isReply ? " cm-reply" : "") + '" data-cmid="' + esc(c.id) + '">' +
        '<div class="cm-meta"><span class="cm-author">' + esc(c.author) + (c.secret ? ' 🔒' : '') + '</span>' +
        '<span class="cm-date">' + esc(c.date) + '</span></div>' +
        '<div class="cm-body">' + bodyHtml + '</div>' +
        (!isReply ? '<button type="button" class="cm-reply-btn" data-parent="' + esc(c.id) + '">답글</button>' : '') +
        (replyHtml ? '<div class="cm-replies">' + replyHtml + '</div>' : '') +
        '<div class="cm-reply-form" id="rf_' + esc(c.id) + '" style="display:none;">' +
        '<textarea class="cm-input" placeholder="답글을 입력하세요..." rows="2"></textarea>' +
        '<div style="display:flex;gap:10px;align-items:center;margin-top:6px;flex-wrap:wrap;">' +
        '<label style="font-size:12px;color:#6b7280;display:flex;align-items:center;gap:5px;"><input type="checkbox" class="cm-secret-chk"/> 비공개</label>' +
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
      '<div style="display:flex;justify-content:flex-end;align-items:center;gap:12px;margin-top:6px;">' +
      '<label style="font-size:12px;color:#6b7280;display:flex;align-items:center;gap:5px;"><input type="checkbox" id="cmNewSecret"/> 비공개(작성자·관리자만)</label>' +
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
        var secretChk = rf ? rf.querySelector(".cm-secret-chk") : null;
        // 0526 — 부모 글이 비밀글이면 댓글도 자동 secret, 아니면 비공개 옵션 적용
        var parentPost = (board === "refund" ? BoardStore.getRefundPosts() : BoardStore.getInquiryPosts())
          .find(function (x) { return x.id === postId; });
        var inheritSecret = !!(parentPost && parentPost.secret) || !!(secretChk && secretChk.checked);
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
        var newSecretChk = document.getElementById("cmNewSecret");
        // 0526 — 부모 글이 비밀글이면 댓글도 자동 secret, 아니면 비공개 옵션 적용
        var parentPost = (board === "refund" ? BoardStore.getRefundPosts() : BoardStore.getInquiryPosts())
          .find(function (x) { return x.id === postId; });
        var inheritSecret = !!(parentPost && parentPost.secret) || !!(newSecretChk && newSecretChk.checked);
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
          var typeLabel = p.type === "correction" ? "정정" : "환불";
          return (
            '<div class="board-row" data-id="' +
            esc(p.id) +
            '">' +
            '<div class="col-num">' +
            (i + 1) +
            "</div>" +
            '<div class="col-title">' +
            '<span class="chip" style="background:#eef2ff;color:#1d4ed8;">' + typeLabel + "</span> " +
            (p.secret ? "🔒 " : "") +
            esc(p.title) +
            ' <span class="chip">' +
            BoardStore.statusLabel("refund", p.status) +
            "</span></div>" +
            '<div class="col-author">' + esc(p.authorName || "—") + "</div>" +
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
        attachmentsHtml(p.attachments) +
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
          attachments: collectAttachmentMeta("wAttachments"),
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
      var CAT = { reg: "접수", exam: "시험", etc: "기타" };
      listEl.innerHTML = posts
        .map(function (p, i) {
          var catLabel = CAT[p.category] || p.category || "기타";
          return (
            '<div class="board-row" data-id="' + esc(p.id) + '">' +
            '<div class="col-num">' + (i + 1) + "</div>" +
            '<div class="col-title">' +
            (p.secret ? "🔒 " : "") +
            esc(p.title) +
            ' <span class="chip">' + esc(catLabel) + "</span>" +
            ' <span class="chip">' + BoardStore.statusLabel("inquiry", p.status) + "</span>" +
            "</div>" +
            '<div class="col-author">' + esc(p.authorName || "—") + "</div>" +
            '<div class="col-date">' + esc(p.date) + "</div>" +
            "</div>"
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
        attachmentsHtml(p.attachments) +
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
          attachments: collectAttachmentMeta("wAttachments"),
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
