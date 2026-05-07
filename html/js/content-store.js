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
        updatedAt: "2026.05.05",
      },
      {
        id: "fq_seed_2",
        catId: "exam",
        question: "재접수 시 매번 정보를 다 입력해야 하나요?",
        answer:
          "회원가입 시 등록한 개인정보가 저장되면, 이후 접수 단계에서 이름·생년월일 등이 자동으로 채워져 간소화됩니다.",
        updatedAt: "2026.05.05",
      },
      {
        id: "fq_seed_3",
        catId: "score",
        question: "증명사진 기준은 어디서 보나요?",
        answer:
          "시험 접수 페이지의 사진 업로드 단계와 TOPIK 본부 공식 안내(topik.go.kr)를 함께 확인해 주세요.",
        updatedAt: "2026.05.05",
      },
      {
        id: "fq_seed_4",
        catId: "etc",
        question: "오프라인으로 응시료를 냈는데 반영이 안 돼요.",
        answer:
          "시험장 또는 지정 창구에서 납부하신 경우, 관리자가 수납 완료 처리 후 수험번호가 부여됩니다. 처리까지 시간이 걸릴 수 있습니다.",
        updatedAt: "2026.05.05",
      },
      {
        id: "fq_seed_5",
        catId: "reg",
        question: "한국어·미얀마어·영어 중 화면 언어를 바꾸려면?",
        answer:
          "상단의 언어 선택 상자에서 원하는 언어를 고르면 주요 메뉴와 안내 문구가 변경됩니다. 설정은 브라우저에 저장됩니다.",
        updatedAt: "2026.05.05",
      },
    ];
  }

  function defaultNoticeItems() {
    return [
      {
        id: "nt_seed_98",
        catId: "new",
        title: "제98회 TOPIK 접수 안내 (양곤 시험장)",
        date: "2026.04.01",
        views: 128,
        bodyHtml:
          "<p><strong>제98회 한국어능력시험(TOPIK) 미얀마 시행 접수 안내</strong></p>" +
          "<p>안녕하세요, TOPIK Myanmar입니다.<br/>제98회 한국어능력시험(TOPIK) 미얀마 시행 원서 접수를 아래와 같이 안내드립니다.</p>" +
          "<p><strong>■ 접수 기간</strong><br/>2026년 4월 1일(화) ~ 2026년 4월 14일(월) 23:59까지</p>" +
          "<p><strong>■ 시험 일시</strong><br/>2026년 5월 17일(토)<br/>- TOPIK I: 오전 09:20 (입실 마감 09:05)<br/>- TOPIK II: 오후 12:35 (입실 마감 12:05)</p>" +
          "<p><strong>■ 시험 장소</strong><br/>양곤 시험장 (상세 위치는 추후 공지)</p>" +
          "<p><strong>■ 응시료</strong><br/>TOPIK I: MMK 55,000 / TOPIK II: MMK 75,000</p>" +
          "<p>접수는 반드시 온라인으로만 가능하며, 방문 접수는 받지 않습니다.<br/>기타 문의사항은 이메일(topik.myanmar@kr.go)로 문의해 주세요.</p>",
      },
      {
        id: "nt_seed_photo",
        catId: "imp",
        title: "증명사진 제출 기준 변경 안내",
        date: "2026.03.28",
        views: 247,
        bodyHtml:
          "<p><strong>증명사진 제출 기준 변경</strong></p>" +
          "<p>2026년 4월 1일부터 증명사진 심사 기준이 일부 개정됩니다. 배경·밝기·표정 등 상세 요건은 접수 페이지의 안내 이미지를 반드시 확인해 주세요.</p>" +
          "<p>미기준 사진은 반려될 수 있으며, 기한 내 재업로드가 필요합니다.</p>",
      },
      {
        id: "nt_seed_cal",
        catId: "gen",
        title: "2026년 TOPIK 미얀마 연간 시험 일정 공고",
        date: "2026.03.15",
        views: 512,
        bodyHtml:
          "<p><strong>2026년 TOPIK 미얀마 시행 연간 일정</strong></p>" +
          "<p>각 회차별 원서 접수·시험일·성적 발표 예정일은 추후 공지사항 및 본 페이지를 통해 안내됩니다. 시험장·정원 등은 회차별로 상이할 수 있습니다.</p>",
      },
      {
        id: "nt_seed_admit",
        catId: "gen",
        title: "수험표 출력 기간 안내 (제97회)",
        date: "2026.03.10",
        views: 389,
        bodyHtml:
          "<p><strong>제97회 TOPIK 수험표 출력 안내</strong></p>" +
          "<p>접수 승인 및 수납이 완료된 응시자는 마이페이지에서 수험표를 출력할 수 있습니다. 출력 가능 기간과 시험장 입실 시간을 반드시 확인하세요.</p>",
      },
      {
        id: "nt_seed_result97",
        catId: "gen",
        title: "제97회 TOPIK 최종 합격자 발표",
        date: "2026.02.20",
        views: 1024,
        bodyHtml:
          "<p><strong>제97회 한국어능력시험 최종 합격자 발표</strong></p>" +
          "<p>합격자 명단 및 성적 확인 방법은 마이페이지·성적 조회 메뉴에서 안내됩니다. 문의는 시행 기관 공지 채널을 이용해 주세요.</p>",
      },
      /* 더미 공지 — 페이징(10건/페이지) 확인용 */
      {
        id: "nt_seed_dm_01",
        catId: "gen",
        title: "제96회 시험장 입실 안내 및 지각 처리 기준",
        date: "2026.02.05",
        views: 210,
        bodyHtml:
          "<p>제96회 시험 당일 입실 마감 시간을 준수해 주시기 바랍니다. 지각 시 응시가 제한될 수 있습니다.</p>",
      },
      {
        id: "nt_seed_dm_02",
        catId: "imp",
        title: "[중요] 응시료 환불 신청 마감 안내",
        date: "2026.01.28",
        views: 445,
        bodyHtml:
          "<p>접수 취소에 따른 환불 신청은 공지된 기한 내에만 처리됩니다. 기한 경과 후에는 환불이 불가할 수 있습니다.</p>",
      },
      {
        id: "nt_seed_dm_03",
        catId: "new",
        title: "2026년 상반기 TOPIK 스피킹 시범 운영 안내",
        date: "2026.01.20",
        views: 892,
        bodyHtml:
          "<p>TOPIK 스피킹 시범 운영 일정 및 신청 방법은 별도 공지를 통해 안내됩니다. 본 공지는 요약 안내입니다.</p>",
      },
      {
        id: "nt_seed_dm_04",
        catId: "result",
        title: "제95회 성적표 발급 및 재발급 절차",
        date: "2026.01.12",
        views: 1560,
        bodyHtml:
          "<p>성적표 온라인 확인 후, 종이 성적표가 필요한 경우 발급 창구 및 수수료 안내를 확인해 주세요.</p>",
      },
      {
        id: "nt_seed_dm_05",
        catId: "gen",
        title: "시험 당일 휴대전기·스마트워치 반입 금지 재안내",
        date: "2025.12.22",
        views: 334,
        bodyHtml:
          "<p>시험장 내 전자기기는 지정 보관함에 보관해야 하며, 시험 중 사용 적발 시 부정행위 처리될 수 있습니다.</p>",
      },
      {
        id: "nt_seed_dm_06",
        catId: "gen",
        title: "겨울철 독감 예방 및 시험장 환기 관련 안내",
        date: "2025.12.08",
        views: 178,
        bodyHtml:
          "<p>시험장 환기 정책은 현지 방역 지침에 따라 조정될 수 있습니다. 응시자 여러분의 양해 부탁드립니다.</p>",
      },
      {
        id: "nt_seed_dm_07",
        catId: "new",
        title: "회원정보 수정 시 본인인증 절차 강화 안내",
        date: "2025.11.30",
        views: 267,
        bodyHtml:
          "<p>개인정보 보호를 위해 마이페이지에서 연락처·주소 변경 시 추가 확인 절차가 적용됩니다.</p>",
      },
      {
        id: "nt_seed_dm_08",
        catId: "imp",
        title: "접수 시스템 점검 일정 (야간 2시간)",
        date: "2025.11.18",
        views: 1203,
        bodyHtml:
          "<p>원서 접수 시스템 안정화를 위한 점검이 예정되어 있습니다. 점검 시간에는 접수·결제가 일시 중단됩니다.</p>",
      },
      {
        id: "nt_seed_dm_09",
        catId: "gen",
        title: "TOPIK Myanmar 공식 이메일 주소 변경 안내",
        date: "2025.11.05",
        views: 621,
        bodyHtml:
          "<p>문의용 공식 이메일이 변경되었습니다. 기존 주소로 발송된 메일은 순차적으로 확인 중입니다.</p>",
      },
      {
        id: "nt_seed_dm_10",
        catId: "result",
        title: "제94회 이의신청 접수 기간 및 서류 안내",
        date: "2025.10.21",
        views: 88,
        bodyHtml:
          "<p>성적 이의신청은 정해진 기간과 양식에 따라 접수해야 하며, 기간 외 접수는 처리되지 않습니다.</p>",
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
    } else {
      /* 기본 시드에 추가된 공지(id 기준)를 로컬 데이터에 병합 — 페이징용 더미 등 */
      var defById = {};
      d.noticeItems.forEach(function (def) {
        defById[def.id] = def;
      });
      var merged = [];
      d.noticeItems.forEach(function (def) {
        var ix = parsed.noticeItems.findIndex(function (x) {
          return x && x.id === def.id;
        });
        merged.push(ix >= 0 ? parsed.noticeItems[ix] : def);
      });
      parsed.noticeItems.forEach(function (x) {
        if (x && x.id && !defById[x.id]) merged.push(x);
      });
      if (merged.length !== parsed.noticeItems.length) {
        needSave = true;
      } else {
        for (var mj = 0; mj < merged.length; mj++) {
          if (merged[mj] !== parsed.noticeItems[mj]) {
            needSave = true;
            break;
          }
        }
      }
      parsed.noticeItems = merged;
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
