/**
 * 환불·정보정정신청 / 문의게시판 — localStorage (FO·BO 연동)
 */
(function (global) {
  var KEY = "topik_mm_boards_v1";
  var LOCK_KEY = "topik_mm_board_lock_v1";

  function genId(prefix) {
    return prefix + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  function today() {
    var t = new Date();
    return (
      t.getFullYear() +
      "." +
      String(t.getMonth() + 1).padStart(2, "0") +
      "." +
      String(t.getDate()).padStart(2, "0")
    );
  }

  function defaults() {
    return {
      refundPosts: [
        {
          id: "rf_seed_1",
          type: "refund",
          title: "접수 취소 및 응시료 환불 요청",
          body: "개인 사정으로 접수를 취소합니다. 영수증 첨부합니다.",
          authorEmail: "demo@example.com",
          authorName: "김민수",
          date: "2026.05.20",
          status: "review",
          secret: true,
          secretPw: "1234",
          attachments: [],
          adminReply: "",
          comments: [],
        },
      ],
      inquiryPosts: [
        {
          id: "iq_seed_1",
          type: "inquiry",
          category: "reg",
          visibility: "general",
          title: "TOPIK Ⅰ·Ⅱ 동시 접수 가능한가요?",
          body: "한 회차에 두 급수를 동시에 신청할 수 있는지 문의드립니다.",
          authorEmail: "demo@example.com",
          authorName: "이영희",
          date: "2026.05.18",
          status: "answered",
          secret: false,
          secretPw: "",
          attachments: [],
          adminReply: "네, 동일 회차에서 TOPIK Ⅰ·Ⅱ 동시 접수가 가능하며 응시료는 급수별로 각각 수납합니다.",
          comments: [],
        },
      ],
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return defaults();
      var p = JSON.parse(raw);
      if (!Array.isArray(p.refundPosts)) p.refundPosts = defaults().refundPosts;
      if (!Array.isArray(p.inquiryPosts)) p.inquiryPosts = defaults().inquiryPosts;
      return p;
    } catch (e) {
      return defaults();
    }
  }

  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      global.dispatchEvent(new CustomEvent("topik-board-change"));
    } catch (e) {}
  }

  function getProfile() {
    return global.TMProfile && TMProfile.load();
  }

  function isAdmin() {
    try {
      return !!localStorage.getItem("tm_admin_session");
    } catch (e) {
      return false;
    }
  }

  function canViewSecret(post, pw) {
    if (!post.secret) return true;
    var prof = getProfile();
    if (isAdmin()) return true;
    if (prof && post.authorEmail && prof.email === post.authorEmail) return true;
    return post.secretPw && pw === post.secretPw;
  }

  function lockFail(postId) {
    try {
      var m = JSON.parse(localStorage.getItem(LOCK_KEY) || "{}");
      var row = m[postId] || { fails: 0, until: 0 };
      row.fails = (row.fails || 0) + 1;
      if (row.fails >= 5) row.until = Date.now() + 30 * 60 * 1000;
      m[postId] = row;
      localStorage.setItem(LOCK_KEY, JSON.stringify(m));
      return row;
    } catch (e) {
      return { fails: 0, until: 0 };
    }
  }

  function isLocked(postId) {
    try {
      var m = JSON.parse(localStorage.getItem(LOCK_KEY) || "{}");
      var row = m[postId];
      if (!row || !row.until) return false;
      if (Date.now() < row.until) return true;
      delete m[postId];
      localStorage.setItem(LOCK_KEY, JSON.stringify(m));
      return false;
    } catch (e) {
      return false;
    }
  }

  function clearLock(postId) {
    try {
      var m = JSON.parse(localStorage.getItem(LOCK_KEY) || "{}");
      delete m[postId];
      localStorage.setItem(LOCK_KEY, JSON.stringify(m));
    } catch (e) {}
  }

  var BoardStore = {
    load: load,
    save: save,
    getRefundPosts: function () {
      return load().refundPosts.slice();
    },
    getInquiryPosts: function () {
      return load().inquiryPosts.slice();
    },
    addRefundPost: function (item) {
      var s = load();
      var prof = getProfile();
      var row = {
        id: genId("rf"),
        type: item.type || "refund",
        title: String(item.title || "").trim(),
        body: String(item.body || "").trim(),
        authorEmail: (prof && prof.email) || item.authorEmail || "",
        authorName: (prof && (prof.nameKo || prof.nameEn)) || "",
        date: today(),
        status: "received",
        secret: !!item.secret,
        secretPw: item.secret ? String(item.secretPw || "") : "",
        attachments: item.attachments || [],
        adminReply: "",
        comments: [],
      };
      s.refundPosts.unshift(row);
      save(s);
      return row;
    },
    addInquiryPost: function (item) {
      var s = load();
      var prof = getProfile();
      var row = {
        id: genId("iq"),
        type: "inquiry",
        category: item.category || "etc",
        visibility: item.visibility || "general",
        title: String(item.title || "").trim(),
        body: String(item.body || "").trim(),
        authorEmail: (prof && prof.email) || "",
        authorName: (prof && (prof.nameKo || prof.nameEn)) || "",
        date: today(),
        status: "pending",
        secret: item.visibility === "secret" || !!item.secret,
        secretPw: item.secretPw ? String(item.secretPw) : "",
        attachments: item.attachments || [],
        adminReply: "",
        comments: [],
      };
      s.inquiryPosts.unshift(row);
      save(s);
      return row;
    },
    updatePost: function (board, id, patch) {
      var s = load();
      var list = board === "refund" ? s.refundPosts : s.inquiryPosts;
      var ix = list.findIndex(function (x) {
        return x.id === id;
      });
      if (ix < 0) return null;
      Object.keys(patch || {}).forEach(function (k) {
        list[ix][k] = patch[k];
      });
      save(s);
      return list[ix];
    },
    removePost: function (board, id) {
      var s = load();
      if (board === "refund") {
        s.refundPosts = s.refundPosts.filter(function (x) {
          return x.id !== id;
        });
      } else {
        s.inquiryPosts = s.inquiryPosts.filter(function (x) {
          return x.id !== id;
        });
      }
      save(s);
    },
    addComment: function (board, postId, comment) {
      var s = load();
      var list = board === "refund" ? s.refundPosts : s.inquiryPosts;
      var post = list.find(function (x) {
        return x.id === postId;
      });
      if (!post) return null;
      if (!Array.isArray(post.comments)) post.comments = [];
      var row = {
        id: genId("cm"),
        parentId: comment.parentId || null,
        body: String(comment.body || "").trim(),
        author: comment.author || "user",
        authorEmail: comment.authorEmail || "",
        date: today(),
        secret: !!comment.secret,
      };
      post.comments.push(row);
      save(s);
      return row;
    },
    canViewSecret: canViewSecret,
    isLocked: isLocked,
    lockFail: lockFail,
    clearLock: clearLock,
    statusLabel: function (board, status) {
      var map =
        board === "refund"
          ? {
              received: "접수",
              review: "검토중",
              done: "처리완료",
              rejected: "반려",
            }
          : { pending: "답변대기", answered: "답변완료" };
      return map[status] || status;
    },
  };

  global.BoardStore = BoardStore;
})(typeof window !== "undefined" ? window : this);
