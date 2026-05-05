/**
 * FO 공지 카테고리 · FAQ 분류 · FAQ 항목 — localStorage 동기화
 * 같은 브라우저에서 어드민 저장 후 공지/FAQ 페이지 새로고침 또는 storage 이벤트로 반영
 */
(function (global) {
  var STORAGE_KEY = "topik_mm_content_v1";

  function defaults() {
    return {
      noticeCategories: [
        { id: "imp", label: "중요" },
        { id: "new", label: "접수 안내" },
        { id: "gen", label: "시험 일정" },
        { id: "result", label: "결과 발표" },
      ],
      faqCategories: [
        { id: "reg", label: "접수·결제" },
        { id: "exam", label: "시험·당일" },
        { id: "score", label: "성적·수험표" },
        { id: "etc", label: "기타" },
      ],
      faqItems: [],
    };
  }

  function todayDots() {
    var t = new Date();
    return (
      t.getFullYear() +
      "." +
      String(t.getMonth() + 1).padStart(2, "0") +
      "." +
      String(t.getDate()).padStart(2, "0")
    );
  }

  function genId(prefix) {
    return (
      prefix +
      "_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).slice(2, 8)
    );
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaults();
      var parsed = JSON.parse(raw);
      var d = defaults();
      if (
        !Array.isArray(parsed.noticeCategories) ||
        parsed.noticeCategories.length === 0
      ) {
        parsed.noticeCategories = d.noticeCategories;
      }
      if (
        !Array.isArray(parsed.faqCategories) ||
        parsed.faqCategories.length === 0
      ) {
        parsed.faqCategories = d.faqCategories;
      }
      if (!Array.isArray(parsed.faqItems)) parsed.faqItems = [];
      return {
        noticeCategories: parsed.noticeCategories,
        faqCategories: parsed.faqCategories,
        faqItems: parsed.faqItems,
      };
    } catch (e) {
      return defaults();
    }
  }

  function save(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    try {
      global.dispatchEvent(new CustomEvent("topik-content-change"));
    } catch (err) {}
  }

  function labelById(list, id) {
    var c = list.find(function (x) {
      return x.id === id;
    });
    return c ? c.label : id;
  }

  var ContentStore = {
    STORAGE_KEY: STORAGE_KEY,

    load: load,
    save: save,

    getNoticeCategories: function () {
      return load().noticeCategories.slice();
    },
    getFaqCategories: function () {
      return load().faqCategories.slice();
    },
    getFaqItems: function () {
      return load().faqItems.slice();
    },

    labelForNoticeCatId: function (id) {
      return labelById(load().noticeCategories, id);
    },
    labelForFaqCatId: function (id) {
      return labelById(load().faqCategories, id);
    },

    addNoticeCategory: function (label) {
      label = String(label || "").trim();
      if (!label) return { ok: false, error: "empty" };
      var s = load();
      if (s.noticeCategories.some(function (c) { return c.label === label; })) {
        return { ok: false, error: "dup" };
      }
      s.noticeCategories.push({ id: genId("nc"), label: label });
      save(s);
      return { ok: true };
    },
    removeNoticeCategory: function (id) {
      var s = load();
      if (s.noticeCategories.length <= 1) return { ok: false, error: "min" };
      var ix = s.noticeCategories.findIndex(function (c) {
        return c.id === id;
      });
      if (ix < 0) return { ok: false, error: "missing" };
      s.noticeCategories.splice(ix, 1);
      save(s);
      return { ok: true };
    },

    addFaqCategory: function (label) {
      label = String(label || "").trim();
      if (!label) return { ok: false, error: "empty" };
      var s = load();
      if (s.faqCategories.some(function (c) { return c.label === label; })) {
        return { ok: false, error: "dup" };
      }
      s.faqCategories.push({ id: genId("fc"), label: label });
      save(s);
      return { ok: true };
    },
    removeFaqCategory: function (id) {
      var s = load();
      if (s.faqCategories.length <= 1) return { ok: false, error: "min" };
      var ix = s.faqCategories.findIndex(function (c) {
        return c.id === id;
      });
      if (ix < 0) return { ok: false, error: "missing" };
      s.faqCategories.splice(ix, 1);
      save(s);
      return { ok: true };
    },

    upsertFaqItem: function (item) {
      var s = load();
      var ds = todayDots();
      if (item.id) {
        var ix = s.faqItems.findIndex(function (x) {
          return x.id === item.id;
        });
        if (ix >= 0) {
          s.faqItems[ix].catId = item.catId;
          s.faqItems[ix].question = item.question;
          s.faqItems[ix].answer = item.answer;
          s.faqItems[ix].updatedAt = ds;
          save(s);
          return s.faqItems[ix];
        }
      }
      var row = {
        id: genId("fq"),
        catId: item.catId,
        question: item.question,
        answer: item.answer,
        updatedAt: ds,
      };
      s.faqItems.unshift(row);
      save(s);
      return row;
    },

    removeFaqItem: function (id) {
      if (!id) return;
      var s = load();
      s.faqItems = s.faqItems.filter(function (x) {
        return x.id !== id;
      });
      save(s);
    },
  };

  global.ContentStore = ContentStore;
})(typeof window !== "undefined" ? window : this);
