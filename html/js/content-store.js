/**
 * FO·BO 공지사항 글 · 공지 카테고리 · FAQ 분류 · FAQ 항목 — localStorage 동기화
 */
(function (global) {
  var STORAGE_KEY = "topik_mm_content_v1";

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

  function defaultFaqItems() {
    return [
      {
        id: "fq_seed_1",
        catId: "reg",
        question: "접수 후 수험번호는 언제 알 수 있나요?",
        answer:
          "현장 또는 온라인 수납이 완료된 뒤, 관리자가 순차적으로 수험번호를 부여합니다. 마이페이지 또는 수험번호 조회 메뉴에서 확인할 수 있습니다.",
        updatedAt: "2025.05.05",
      },
      {
        id: "fq_seed_2",
        catId: "exam",
        question: "재접수 시 매번 정보를 다 입력해야 하나요?",
        answer:
          "회원가입 시 등록한 개인정보가 저장되면, 이후 접수 단계에서 이름·생년월일 등이 자동으로 채워져 간소화됩니다.",
        updatedAt: "2025.05.05",
      },
      {
        id: "fq_seed_3",
        catId: "score",
        question: "증명사진 기준은 어디서 보나요?",
        answer:
          "시험 접수 페이지의 사진 업로드 단계와 TOPIK 본부 공식 안내(topik.go.kr)를 함께 확인해 주세요.",
        updatedAt: "2025.05.05",
      },
      {
        id: "fq_seed_4",
        catId: "etc",
        question: "오프라인으로 응시료를 냈는데 반영이 안 돼요.",
        answer:
          "시험장 또는 지정 창구에서 납부하신 경우, 관리자가 수납 완료 처리 후 수험번호가 부여됩니다. 처리까지 시간이 걸릴 수 있습니다.",
        updatedAt: "2025.05.05",
      },
      {
        id: "fq_seed_5",
        catId: "reg",
        question: "한국어·미얀마어·영어 중 화면 언어를 바꾸려면?",
        answer:
          "상단의 언어 선택 상자에서 원하는 언어를 고르면 주요 메뉴와 안내 문구가 변경됩니다. 설정은 브라우저에 저장됩니다.",
        updatedAt: "2025.05.05",
      },
    ];
  }

  function defaultNoticeItems() {
    return [
      {
        id: "nt_seed_98",
        catId: "new",
        title: "제98회 TOPIK 접수 안내 (양곤 시험장)",
        date: "2025.04.01",
        views: 128,
        bodyHtml:
          "<p><strong>제98회 한국어능력시험(TOPIK) 미얀마 시행 접수 안내</strong></p>" +
          "<p>안녕하세요, TOPIK Myanmar입니다.<br/>제98회 한국어능력시험(TOPIK) 미얀마 시행 원서 접수를 아래와 같이 안내드립니다.</p>" +
          "<p><strong>■ 접수 기간</strong><br/>2025년 4월 1일(화) ~ 2025년 4월 14일(월) 23:59까지</p>" +
          "<p><strong>■ 시험 일시</strong><br/>2025년 5월 17일(토)<br/>- TOPIK I: 오전 09:20 (입실 마감 09:05)<br/>- TOPIK II: 오후 12:35 (입실 마감 12:05)</p>" +
          "<p><strong>■ 시험 장소</strong><br/>양곤 시험장 (상세 위치는 추후 공지)</p>" +
          "<p><strong>■ 응시료</strong><br/>TOPIK I: MMK 55,000 / TOPIK II: MMK 75,000</p>" +
          "<p>접수는 반드시 온라인으로만 가능하며, 방문 접수는 받지 않습니다.<br/>기타 문의사항은 이메일(topik.myanmar@kr.go)로 문의해 주세요.</p>",
      },
      {
        id: "nt_seed_photo",
        catId: "imp",
        title: "증명사진 제출 기준 변경 안내",
        date: "2025.03.28",
        views: 247,
        bodyHtml:
          "<p><strong>증명사진 제출 기준 변경</strong></p>" +
          "<p>2025년 4월 1일부터 증명사진 심사 기준이 일부 개정됩니다. 배경·밝기·표정 등 상세 요건은 접수 페이지의 안내 이미지를 반드시 확인해 주세요.</p>" +
          "<p>미기준 사진은 반려될 수 있으며, 기한 내 재업로드가 필요합니다.</p>",
      },
      {
        id: "nt_seed_cal",
        catId: "gen",
        title: "2025년 TOPIK 미얀마 연간 시험 일정 공고",
        date: "2025.03.15",
        views: 512,
        bodyHtml:
          "<p><strong>2025년 TOPIK 미얀마 시행 연간 일정</strong></p>" +
          "<p>각 회차별 원서 접수·시험일·성적 발표 예정일은 추후 공지사항 및 본 페이지를 통해 안내됩니다. 시험장·정원 등은 회차별로 상이할 수 있습니다.</p>",
      },
      {
        id: "nt_seed_admit",
        catId: "gen",
        title: "수험표 출력 기간 안내 (제97회)",
        date: "2025.03.10",
        views: 389,
        bodyHtml:
          "<p><strong>제97회 TOPIK 수험표 출력 안내</strong></p>" +
          "<p>접수 승인 및 수납이 완료된 응시자는 마이페이지에서 수험표를 출력할 수 있습니다. 출력 가능 기간과 시험장 입실 시간을 반드시 확인하세요.</p>",
      },
      {
        id: "nt_seed_result97",
        catId: "gen",
        title: "제97회 TOPIK 최종 합격자 발표",
        date: "2025.02.20",
        views: 1024,
        bodyHtml:
          "<p><strong>제97회 한국어능력시험 최종 합격자 발표</strong></p>" +
          "<p>합격자 명단 및 성적 확인 방법은 마이페이지·성적 조회 메뉴에서 안내됩니다. 문의는 시행 기관 공지 채널을 이용해 주세요.</p>",
      },
    ];
  }

  /** 공지 첨부: 브라우저 저장 한도 고려해 data URL(href)·메타만 보관 (최대 12건) */
  function sanitizeNoticeAttachments(arr) {
    if (!Array.isArray(arr)) return [];
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      var a = arr[i];
      if (!a) continue;
      var href = String(a.href || "").trim();
      /* 10MB급 파일을 data URL로 넣어도 잘리지 않도록 상한(대략 15MB 문자) */
      if (!href || href.length > 15500000) continue;
      var row = {
        id: String(a.id || "").trim() || genId("at"),
        name: String(a.name || "첨부파일").slice(0, 240),
        mime: String(a.mime || "").slice(0, 120),
        href: href,
      };
      if (typeof a.size === "number" && isFinite(a.size)) {
        row.size = a.size;
      }
      out.push(row);
    }
    return out.slice(0, 12);
  }

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
      faqItems: defaultFaqItems(),
      noticeItems: defaultNoticeItems(),
    };
  }

  function normalizeState(parsed) {
    var d = defaults();
    var needSave = false;

    if (
      !Array.isArray(parsed.noticeCategories) ||
      parsed.noticeCategories.length === 0
    ) {
      parsed.noticeCategories = d.noticeCategories.slice();
      needSave = true;
    }
    if (
      !Array.isArray(parsed.faqCategories) ||
      parsed.faqCategories.length === 0
    ) {
      parsed.faqCategories = d.faqCategories.slice();
      needSave = true;
    }

    if (!Array.isArray(parsed.faqItems) || parsed.faqItems.length === 0) {
      parsed.faqItems = d.faqItems.slice();
      needSave = true;
    }

    if (!Array.isArray(parsed.noticeItems)) {
      parsed.noticeItems = d.noticeItems.slice();
      needSave = true;
    }

    for (var ni = 0; ni < parsed.noticeItems.length; ni++) {
      var nt = parsed.noticeItems[ni];
      var san = sanitizeNoticeAttachments(nt.attachments);
      if (!Array.isArray(nt.attachments)) {
        needSave = true;
      }
      nt.attachments = san;
    }

    var state = {
      noticeCategories: parsed.noticeCategories,
      faqCategories: parsed.faqCategories,
      faqItems: parsed.faqItems,
      noticeItems: parsed.noticeItems,
    };
    if (needSave) save(state);
    return state;
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaults();
      var parsed = JSON.parse(raw);
      return normalizeState(parsed);
    } catch (e) {
      return defaults();
    }
  }

  function save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      try {
        global.dispatchEvent(new CustomEvent("topik-content-change"));
      } catch (err) {}
    } catch (e) {
      if (e && (e.code === 22 || e.name === "QuotaExceededError")) {
        console.warn("topik-mm content: 저장 용량 초과");
      }
      throw e;
    }
  }

  /** 저장 실패(용량 초과 등) 시 false */
  function saveAllowFail(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      try {
        global.dispatchEvent(new CustomEvent("topik-content-change"));
      } catch (err) {}
      return true;
    } catch (e) {
      if (e && (e.code === 22 || e.name === "QuotaExceededError")) {
        console.warn("topik-mm content: 저장 용량 초과");
        return false;
      }
      throw e;
    }
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
    getNoticeItems: function () {
      return load().noticeItems.slice();
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
      if (s.noticeCategories.some(function (c) {
        return c.label === label;
      })) {
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
      if (s.faqCategories.some(function (c) {
        return c.label === label;
      })) {
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

    upsertNoticeItem: function (item) {
      var s = load();
      var title = String(item.title || "").trim();
      if (!title) return null;
      var bodyHtml = String(item.bodyHtml || "").trim();
      if (!bodyHtml) bodyHtml = "<p></p>";

      if (item.id) {
        var ix = s.noticeItems.findIndex(function (x) {
          return x.id === item.id;
        });
        if (ix >= 0) {
          s.noticeItems[ix].catId = item.catId || s.noticeItems[ix].catId;
          s.noticeItems[ix].title = title;
          s.noticeItems[ix].bodyHtml = bodyHtml;
          if (item.date) s.noticeItems[ix].date = item.date;
          if (typeof item.views === "number") {
            s.noticeItems[ix].views = item.views;
          }
          if (Array.isArray(item.attachments)) {
            s.noticeItems[ix].attachments = sanitizeNoticeAttachments(item.attachments);
          }
          if (!saveAllowFail(s)) return null;
          return s.noticeItems[ix];
        }
      }

      var row = {
        id: genId("nt"),
        catId: item.catId || (s.noticeCategories[0] && s.noticeCategories[0].id) || "gen",
        title: title,
        date: item.date || todayDots(),
        views: typeof item.views === "number" ? item.views : 0,
        bodyHtml: bodyHtml,
        attachments: sanitizeNoticeAttachments(item.attachments),
      };
      s.noticeItems.unshift(row);
      if (!saveAllowFail(s)) return null;
      return row;
    },

    removeNoticeItem: function (id) {
      if (!id) return;
      var s = load();
      s.noticeItems = s.noticeItems.filter(function (x) {
        return x.id !== id;
      });
      save(s);
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
