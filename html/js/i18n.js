(function () {
  var STORAGE = "tm_lang";

  var dict = {
    ko: {
      nav_guide: "TOPIK 안내",
      nav_rules: "시험 규정",
      nav_register: "시험 접수",
      nav_mypage: "접수 확인",
      nav_notice: "공지사항",
      nav_faq: "FAQ",
      nav_lookup: "수험번호 조회",
      nav_login: "로그인",
      nav_logout: "로그아웃",
      nav_signup: "회원가입",
      tab_home: "홈",
      tab_guide: "안내",
      tab_register: "접수",
      tab_notice: "공지",
      tab_mypage: "마이",
      hero_badge: "제98회 한국어능력시험 (TOPIK)",
      hero_title: "미얀마 한국어능력시험<br/>공식 접수 시스템",
      hero_reg: "시험 접수하기",
      hero_guide: "시험 안내 보기",
      cd_label: "접수 마감까지",
      cd_day: "일",
      cd_hour: "시",
      cd_min: "분",
      cd_sec: "초",
      cd_period: "접수기간: 2026.04.01 ~ 2026.04.14",
      sec_notice: "공지사항",
      sec_notice_more: "더보기",
      sec_schedule: "시험 일정",
      sec_quick: "바로가기",
      sec_faq: "자주 묻는 질문 (FAQ)",
      ql_topik: "TOPIK 본부",
      ql_topik_sub: "topik.go.kr",
      ql_score: "성적 조회",
      ql_score_sub: "합격 결과 확인",
      ql_docs: "자료실",
      ql_docs_sub: "기출문제 다운로드",
      ql_admit: "수험표 출력",
      ql_admit_sub: "승인 후 출력 가능",
      ql_lookup: "수험번호 조회",
      ql_lookup_sub: "이름·생년월일",
      ql_mypage: "마이페이지",
      ql_mypage_sub: "접수 현황 확인",
      ql_rules: "시험 규정",
      ql_rules_sub: "유의사항 안내",
      faq_q1: "접수 후 수험번호는 언제 알 수 있나요?",
      faq_a1: "현장 또는 온라인 수납이 완료된 뒤, 관리자가 순차적으로 수험번호를 부여합니다. 마이페이지 또는 수험번호 조회 메뉴에서 확인할 수 있습니다.",
      faq_q2: "재접수 시 매번 정보를 다 입력해야 하나요?",
      faq_a2: "회원가입 시 등록한 개인정보가 저장되면, 이후 접수 단계에서 이름·생년월일 등이 자동으로 채워져 간소화됩니다.",
      faq_q3: "증명사진 기준은 어디서 보나요?",
      faq_a3: "시험 접수 페이지의 사진 업로드 단계와 TOPIK 본부 공식 안내(topik.go.kr)를 함께 확인해 주세요.",
      faq_q4: "오프라인으로 응시료를 냈는데 반영이 안 돼요.",
      faq_a4: "시험장 또는 지정 창구에서 납부하신 경우, 관리자가 수납 완료 처리 후 수험번호가 부여됩니다. 처리까지 시간이 걸릴 수 있습니다.",
      faq_q5: "한국어·미얀마어·영어 중 화면 언어를 바꾸려면?",
      faq_a5: "상단의 언어 선택 상자에서 원하는 언어를 고르면 주요 메뉴와 안내 문구가 변경됩니다. 설정은 브라우저에 저장됩니다.",
      faq_official: "급수·시험 구성 등 공식 안내는 국립국제교육원 TOPIK 홈페이지를 참고하세요.",
      foot_menu: "사이트 메뉴",
      foot_links: "관련 링크",
      foot_contact: "문의처",
      foot_niied: "국립국제교육원 (NIIED)",
      foot_org: "미얀마 시행기관: 주미얀마 한국문화원",
      foot_email: "문의: topik.myanmar@koica.go.kr",
      foot_brand:
        "주관: 국립국제교육원 (NIIED)<br/>미얀마 시행기관: 주미얀마 한국문화원<br/>문의: topik.myanmar@koica.go.kr",
      lookup_title: "수험번호 조회",
      lookup_desc: "접수 시 입력한 영문 성명과 생년월일로 수험번호를 확인합니다. (데모 데이터: MA THIDA / 19950315)",
      lbl_fullname: "영문 성명 (여권과 동일)",
      lbl_birth: "생년월일",
      btn_search: "수험번호 조회",
      err_empty: "이름과 생년월일을 입력해 주세요.",
      msg_notfound: "일치하는 응시 정보가 없습니다. 이름·생년월일·수납 완료 여부를 확인하거나 마이페이지를 이용해 주세요.",
      res_exam: "수험번호",
      res_round: "회차",
      res_level: "급수",
      res_venue: "시험장",
      official_line: "시험 안내·급수·유의사항:",
    },
    my: {
      nav_guide: "TOPIK လမ်းညွှန်",
      nav_rules: "စာမေးပွဲ စည်းမျဉ်း",
      nav_register: "အွန်လိုင်း လျှောက်လွှာ",
      nav_mypage: "လျှောက်ထားမှု စစ်ဆေး",
      nav_notice: "ကြေညာချက်များ",
      nav_faq: "FAQ",
      nav_lookup: "စာမေးပွဲနံပါတ် ရှာဖွေ",
      nav_login: "ဝင်ရောက်ရန်",
      nav_logout: "ထွက်ရန်",
      nav_signup: "အကောင့်ဖွင့်ရန်",
      tab_home: "ပင်မ",
      tab_guide: "လမ်းညွှန်",
      tab_register: "လျှောက်",
      tab_notice: "ကြေညာ",
      tab_mypage: "ကျွန်ုပ်",
      hero_badge: "အကြိမ်(၉၈) ကိုရီးယား စာမေးပွဲ (TOPIK)",
      hero_title: "မြန်မာနိုင်ငံ<br/>TOPIK တရားဝင် လျှောက်လွှာစနစ်",
      hero_reg: "လျှောက်လွှာတင်ရန်",
      hero_guide: "လမ်းညွှန်ကြည့်ရန်",
      cd_label: "ပိတ်သိမ်းချိန်အထိ",
      cd_day: "ရက်",
      cd_hour: "နာရီ",
      cd_min: "မိနစ်",
      cd_sec: "စက္ကန့်",
      cd_period: "2026.04.01 ~ 2026.04.14 လျှောက်ကာလ",
      sec_notice: "ကြေညာချက်များ",
      sec_notice_more: "ပိုကြည့်ရန်",
      sec_schedule: "စာမေးပွဲ အချိန်ဇယား",
      sec_quick: "အမြန်လင့်များ",
      sec_faq: "မေးခွန်းများ (FAQ)",
      ql_topik: "TOPIK ဌာနချုပ်",
      ql_topik_sub: "topik.go.kr",
      ql_score: "ရလဒ်ကြည့်ရန်",
      ql_score_sub: "အောင်မြင်မှု စစ်ဆေး",
      ql_docs: "စာတမ်းများ",
      ql_docs_sub: "အမေးအဖြေများ ဒေါင်းလုဒ်",
      ql_admit: "ဝင်ခွင့်လက်မှတ်",
      ql_admit_sub: "အတည်ပြုပြီးနောက် ပုံနှိပ်ရန်",
      ql_lookup: "စာမေးပွဲနံပါတ်",
      ql_lookup_sub: "အမည် + မွေးနေ့",
      ql_mypage: "ကျွန်ုပ်၏စာမျက်နှာ",
      ql_mypage_sub: "လျှောက်ထားမှု အခြေအနေ",
      ql_rules: "စည်းမျဉ်းများ",
      ql_rules_sub: "သတိပြုရန်",
      faq_q1: "လျှောက်ပြီးနောက် စာမေးပွဲနံပါတ်ကို ဘယ်အချိန်သိနိုင်မလဲ?",
      faq_a1: "ကွင်းပေါ်တွင် သို့မဟုတ် အွန်လိုင်း ပေးချေမှု ပြီးပါက စီမံခန့်ခွဲသူက အစဉ်လိုက် နံပါတ်ပေးပါသည်။",
      faq_q2: "ထပ်လျှောက်ရင် အချက်အလက်အားလုံး ပြန်ထည့်ရမလား?",
      faq_a2: "အကောင့်ဖွင့်စဉ် သိမ်းထားသော ကိုယ်ရေးကိုယ်တာဖြင့် နောက်ပိုင်းလျှောက်လွှာတွင် အမည်၊ မွေးနေ့ စသည် အလိုအလျောက် ဖြည့်ပေးပါသည်။",
      faq_q3: "ဓာတ်ပုံစည်းကမ်းကို ဘယ်မှာကြည့်မလဲ?",
      faq_a3: "လျှောက်လွှာ စာမျက်နှာနှင့် topik.go.kr တရားဝင်လမ်းညွှန်ကို ကြည့်ပါ။",
      faq_q4: "ကွင်းတွင် ပေးချေပြီးသော်လည်း မပြသပါက?",
      faq_a4: "စီမံခန့်ခွဲသူက ပေးချေမှု ပြီးကြောင်း မှတ်ပြီးနောက် စာမေးပွဲနံပါတ် ပေးပါမည်။",
      faq_q5: "ဘာသာစကား ပြောင်းချင်ပါက?",
      faq_a5: "ထိပ်ရှိ ဘာသာရွေးချယ်မှုတွင် လိုချင်သော ဘာသာကို ရွေးပါ။ မီနူးနှင့် စာသား ပြောင်းလဲပြီး သိမ်းဆည်းချက်ကို ဘရောက်ဇာတွင် သိမ်းပါသည်။",
      faq_official: "အဆင့်၊ စာမေးပွဲ ဖွဲ့စည်းပုံ အတွက် တရားဝင် လမ်းညွှန်သည် —",
      foot_menu: "မီနူး",
      foot_links: "လင့်များ",
      foot_contact: "ဆက်သွယ်ရန်",
      foot_niied: "NIIED",
      foot_org: "မြန်မာ TOPIK ကျင်းပရေး",
      foot_email: "ဆက်သွယ်ရန်: topik.myanmar@koica.go.kr",
      foot_brand: "ကြီးကြပ်သူ: NIIED<br/>မြန်မာ ကျင်းပရေး<br/>ဆက်သွယ်ရန်: topik.myanmar@koica.go.kr",
      lookup_title: "စာမေးပွဲနံပါတ် ရှာဖွေ",
      lookup_desc: "လျှောက်ထားသည့် အင်္ဂလိပ် အမည်နှင့် မွေးနေ့ ဖြည့်ပါ။ (ဒမို: MA THIDA / 19950315)",
      lbl_fullname: "အင်္ဂလိပ် အမည် (နိုင်ငံကူးနဲ့တူ)",
      lbl_birth: "မွေးနေ့",
      btn_search: "ရှာဖွေရန်",
      err_empty: "အမည်နှင့် မွေးနေ့ ထည့်ပါ။",
      msg_notfound: "ကိုက်ညီသော မှတ်တမ်း မရှိပါ။",
      res_exam: "စာမေးပွဲနံပါတ်",
      res_round: "အကြိမ်",
      res_level: "အဆင့်",
      res_venue: "စာမေးပွဲခန်း",
      official_line: "တရားဝင် လမ်းညွှန်:",
    },
    en: {
      nav_guide: "About TOPIK",
      nav_rules: "Exam rules",
      nav_register: "Registration",
      nav_mypage: "My application",
      nav_notice: "Notices",
      nav_faq: "FAQ",
      nav_lookup: "Exam no. lookup",
      nav_login: "Log in",
      nav_logout: "Log out",
      nav_signup: "Sign up",
      tab_home: "Home",
      tab_guide: "Guide",
      tab_register: "Apply",
      tab_notice: "News",
      tab_mypage: "My",
      hero_badge: "98th TOPIK",
      hero_title: "TOPIK Myanmar<br/>Official registration",
      hero_reg: "Register now",
      hero_guide: "Exam guide",
      cd_label: "Registration closes in",
      cd_day: "Days",
      cd_hour: "Hrs",
      cd_min: "Min",
      cd_sec: "Sec",
      cd_period: "Period: 2026.04.01 ~ 2026.04.14",
      sec_notice: "Notices",
      sec_notice_more: "More",
      sec_schedule: "Schedule",
      sec_quick: "Quick links",
      sec_faq: "FAQ",
      ql_topik: "TOPIK HQ",
      ql_topik_sub: "topik.go.kr",
      ql_score: "Scores",
      ql_score_sub: "Check results",
      ql_docs: "Resources",
      ql_docs_sub: "Past exams",
      ql_admit: "Admit card",
      ql_admit_sub: "After approval",
      ql_lookup: "Exam no.",
      ql_lookup_sub: "Name + DOB",
      ql_mypage: "My page",
      ql_mypage_sub: "Application status",
      ql_rules: "Rules",
      ql_rules_sub: "Important notes",
      faq_q1: "When is my exam number issued?",
      faq_a1: "After on-site or online payment is marked complete, admins assign numbers in order. Check My page or Exam number lookup.",
      faq_q2: "Do I re-enter all data when re-registering?",
      faq_a2: "If you saved your profile at sign-up, name, date of birth and similar fields are prefilled to speed up registration.",
      faq_q3: "Where are photo rules explained?",
      faq_a3: "See the photo step during registration and the official TOPIK site (topik.go.kr).",
      faq_q4: "I paid offline but status did not update.",
      faq_a4: "Staff will mark payment complete; then your exam number can be assigned. This may take some time.",
      faq_q5: "How do I switch Korean / Myanmar / English?",
      faq_a5: "Use the language dropdown in the header. Your choice is saved in the browser.",
      faq_official: "For levels and test structure, see the official TOPIK site:",
      foot_menu: "Menu",
      foot_links: "Links",
      foot_contact: "Contact",
      foot_niied: "NIIED (Korea)",
      foot_org: "Myanmar test organizer",
      foot_email: "Contact: topik.myanmar@koica.go.kr",
      foot_brand:
        "Organizer: NIIED (Korea)<br/>Myanmar administration<br/>Contact: topik.myanmar@koica.go.kr",
      lookup_title: "Exam number lookup",
      lookup_desc: "Enter the English name and date of birth used at registration. (Demo: MA THIDA / 19950315)",
      lbl_fullname: "English name (as on passport)",
      lbl_birth: "Date of birth",
      btn_search: "Look up",
      err_empty: "Please enter name and date of birth.",
      msg_notfound: "No matching record. Check spelling, DOB, and payment status, or use My page.",
      res_exam: "Exam number",
      res_round: "Session",
      res_level: "Level",
      res_venue: "Venue",
      official_line: "Official information:",
    },
  };

  function getLang() {
    try {
      var s = localStorage.getItem(STORAGE);
      if (s === "ko" || s === "my" || s === "en") return s;
    } catch (e) {}
    return "ko";
  }

  function setLang(lang) {
    if (!dict[lang]) lang = "ko";
    try {
      localStorage.setItem(STORAGE, lang);
    } catch (e) {}
    document.documentElement.setAttribute("lang", lang === "my" ? "my" : lang === "en" ? "en" : "ko");
    apply(lang);
  }

  function t(lang, key) {
    var L = dict[lang] || dict.ko;
    return L[key] != null ? L[key] : dict.ko[key] || key;
  }

  function apply(lang) {
    if (!dict[lang]) lang = "ko";
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (!key) return;
      var val = t(lang, key);
      if (el.tagName === "INPUT" && el.type === "submit") el.value = val;
      else if (el.hasAttribute("data-i18n-placeholder")) el.placeholder = val;
      else if (el.hasAttribute("data-i18n-html")) el.innerHTML = val;
      else el.textContent = val;
    });
    document.querySelectorAll(".tm-lang-select").forEach(function (sel) {
      if (sel.value !== lang) sel.value = lang;
    });
    /* sync active state on drawer lang buttons */
    document.querySelectorAll(".tm-drawer-lang button[data-lang]").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-lang") === lang);
    });
  }

  function initLangButtons(root) {
    root = root || document;
    root.querySelectorAll(".tm-lang-select").forEach(function (sel) {
      if (sel.getAttribute("data-tm-lang-bound") === "1") return;
      sel.setAttribute("data-tm-lang-bound", "1");
      sel.addEventListener("change", function () {
        setLang(sel.value);
      });
    });
  }

  function boot() {
    var lang = getLang();
    document.documentElement.setAttribute("lang", lang === "my" ? "my" : lang === "en" ? "en" : "ko");
    apply(lang);
    initLangButtons();
  }

  window.TMI18N = {
    dict: dict,
    getLang: getLang,
    setLang: setLang,
    t: t,
    apply: apply,
    initLangButtons: initLangButtons,
    boot: boot,
  };
})();
