/**
 * FO GNB — IA v1.2 4대 메뉴(TOPIK 안내·규정·접수·게시판) + 로그인 가드 링크
 */
(function (global) {
  var PROTECTED = {
    "register.html": true,
    "mypage.html": true,
    "board-refund.html": true,
    "board-inquiry.html": true,
  };

  var MENUS = [
    {
      key: "guide",
      href: "guide.html",
      icon: "ic-guide",
      i18n: "nav_menu_guide",
      subs: [
        { href: "guide.html#overview", i18n: "sub_guide_overview" },
        { href: "guide.html#intro", i18n: "sub_guide_intro" },
        { href: "guide.html#structure", i18n: "sub_guide_structure" },
        { href: "guide.html#grading", i18n: "sub_guide_grading" },
      ],
    },
    {
      key: "rules",
      href: "rules.html",
      icon: "ic-rules",
      i18n: "nav_menu_rules",
      subs: [
        { href: "rules.html#caution", i18n: "sub_rules_caution" },
        { href: "rules.html#answer", i18n: "sub_rules_answer" },
        { href: "rules.html#fee", i18n: "sub_rules_fee" },
        { href: "rules.html#id", i18n: "sub_rules_id" },
      ],
    },
    {
      key: "register",
      href: "apply-howto.html",
      icon: "ic-register",
      i18n: "nav_menu_register",
      subs: [
        { href: "apply-howto.html", i18n: "sub_reg_howto" },
        { href: "register.html", i18n: "sub_reg_apply", protect: true },
        { href: "mypage.html", i18n: "sub_reg_confirm", protect: true },
        { href: "admit.html", i18n: "sub_reg_ticket" },
      ],
    },
    {
      key: "board",
      href: "notice.html",
      icon: "ic-notice",
      i18n: "nav_menu_board",
      subs: [
        { href: "notice.html", i18n: "sub_board_notice" },
        { href: "board-refund.html", i18n: "sub_board_refund", protect: true },
        { href: "board-inquiry.html", i18n: "sub_board_inquiry", protect: true },
        { href: "faq.html", i18n: "sub_board_faq" },
      ],
    },
  ];

  function currentPage() {
    var p = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    if (!p || p === "/") return "index.html";
    return p;
  }

  function isLoggedIn() {
    try {
      return localStorage.getItem("tm_session") === "1" && global.TMProfile && TMProfile.load();
    } catch (e) {
      return false;
    }
  }

  function loginUrl(target) {
    var u = "login.html";
    if (target) u += "?next=" + encodeURIComponent(target);
    return u;
  }

  function resolveHref(href, protect) {
    if (!protect) return href;
    if (isLoggedIn()) return href;
    return loginUrl(href.split("#")[0] + (href.indexOf("#") >= 0 ? href.slice(href.indexOf("#")) : ""));
  }

  function activeMenuKey(page) {
    if (page === "index.html") return "";
    if (/^guide/.test(page) || page === "guide.html") return "guide";
    if (page === "rules.html") return "rules";
    if (
      page === "apply-howto.html" ||
      page === "register.html" ||
      page === "register-complete.html" ||
      page === "mypage.html" ||
      page === "admit.html" ||
      page === "lookup.html"
    )
      return "register";
    if (
      page === "notice.html" ||
      page === "faq.html" ||
      page === "board-refund.html" ||
      page === "board-inquiry.html"
    )
      return "board";
    if (page === "login.html" || page === "signup.html" || page === "signup-complete.html")
      return "";
    return "";
  }

  function iconSvg(id) {
    /* color 는 SVG presentation attribute 이 아닌 style 로 지정해야
       CSS :hover / .is-active 등의 color 상속이 우선 적용됨 */
    return (
      '<svg class="icon" width="15" height="15" style="color:currentColor;flex-shrink:0"><use href="#' +
      id +
      '"/></svg>'
    );
  }

  function buildNavHtml(page) {
    var activeKey = activeMenuKey(page);
    var html = "";

    MENUS.forEach(function (m) {
      var isActive = m.key === activeKey;
      html +=
        '<div class="gnb-item' +
        (isActive ? " is-active" : "") +
        '" data-gnb-key="' +
        m.key +
        '">';
      html +=
        '<a href="' +
        resolveHref(m.href, false) +
        '" class="gnb-top' +
        (isActive ? " active" : "") +
        '" aria-current="' +
        (isActive ? "page" : "false") +
        '">';
      html += iconSvg(m.icon);
      html += '<span data-i18n="' + m.i18n + '"></span>';
      html += '<svg class="icon gnb-chev" width="12" height="12"><use href="#ic-chev-d"/></svg>';
      html += "</a>";
      html += '<div class="gnb-sub" role="menu">';
      m.subs.forEach(function (s) {
        var h = resolveHref(s.href, !!s.protect);
        html +=
          '<a href="' +
          h +
          '" role="menuitem" data-i18n="' +
          s.i18n +
          '"></a>';
      });
      html += "</div></div>";
    });

    return html;
  }

  function buildAuthHtml() {
    var profile = global.TMProfile && TMProfile.load();
    if (isLoggedIn() && profile) {
      var name = profile.nameKo || profile.nameEn || profile.email || "회원";
      return (
        '<a href="mypage.html" class="btn btn-outline tm-auth-mypage">' +
        iconSvg("ic-mypage") +
        '<span data-i18n="nav_mypage">마이페이지</span></a>' +
        '<span class="hdr-user-name" title="' +
        name.replace(/"/g, "&quot;") +
        '">' +
        name +
        "</span>" +
        '<button type="button" class="btn btn-outline tm-logout-btn">' +
        iconSvg("ic-logout") +
        '<span data-i18n="nav_logout">로그아웃</span></button>'
      );
    }
    return (
      '<a href="login.html" class="btn btn-outline">' +
      iconSvg("ic-login") +
      '<span data-i18n="nav_login">로그인</span></a>' +
      '<a href="signup.html" class="btn btn-primary">' +
      iconSvg("ic-signup") +
      '<span data-i18n="nav_signup">회원가입</span></a>'
    );
  }

  function wireLogout() {
    document.querySelectorAll(".tm-logout-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (!confirm("로그아웃 하시겠습니까?")) return;
        try {
          localStorage.removeItem("tm_session");
        } catch (e) {}
        location.href = "index.html";
      });
    });
  }

  function wireMegaMenu() {
    document.querySelectorAll("#mainNav .gnb-item").forEach(function (item) {
      var top = item.querySelector(".gnb-top");
      if (!top) return;
      top.addEventListener("click", function (e) {
        if (global.matchMedia("(max-width: 1199.98px)").matches) {
          e.preventDefault();
          var open = item.classList.contains("drawer-open");
          document.querySelectorAll("#mainNav .gnb-item.drawer-open").forEach(function (x) {
            if (x !== item) x.classList.remove("drawer-open");
          });
          item.classList.toggle("drawer-open", !open);
        }
      });
    });
  }

  function render() {
    var nav = document.getElementById("mainNav");
    if (!nav) return;
    var page = currentPage();
    nav.setAttribute("role", "navigation");
    nav.setAttribute("aria-label", "주 메뉴");
    nav.innerHTML = buildNavHtml(page);
    nav.classList.add("gnb-root");

    var actions = document.querySelector("header .header-actions");
    if (actions) {
      var lang = actions.querySelector(".hdr-lang-pc");
      actions.innerHTML = buildAuthHtml();
      if (lang) actions.insertBefore(lang, actions.firstChild);
      else {
        var wrap = document.createElement("div");
        wrap.className = "hdr-lang-pc lang-switch";
        wrap.innerHTML =
          '<svg class="icon" width="13" height="13"><use href="#ic-globe"/></svg>' +
          '<select class="tm-lang-select" aria-label="언어 선택">' +
          '<option value="ko">한국어</option><option value="my">မြန်မာ</option><option value="en">English</option>' +
          "</select>";
        actions.insertBefore(wrap, actions.firstChild);
      }
    }

    wireLogout();
    wireMegaMenu();

    if (global.TMI18N) {
      TMI18N.initLangButtons();
      TMI18N.apply(TMI18N.getLang());
    }
  }

  function guardPage() {
    var page = currentPage().split("#")[0];
    if (!PROTECTED[page]) return;
    if (isLoggedIn()) return;
    var next = location.pathname.split("/").pop() + location.search + location.hash;
    location.replace(loginUrl(next));
  }

  function init() {
    guardPage();
    render();
    global.dispatchEvent(new CustomEvent("tm-fo-nav-ready"));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  global.TMFONav = {
    MENUS: MENUS,
    PROTECTED: PROTECTED,
    render: render,
    isLoggedIn: isLoggedIn,
    currentPage: currentPage,
  };
})(typeof window !== "undefined" ? window : this);
