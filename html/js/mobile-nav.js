(function () {
  var TM_NAV_PH = null;
  var TM_PC_LANG_PH = null;
  var TM_PC_LANG_NODE = null;

  function isMobileDrawerBreakpoint() {
    return window.matchMedia("(max-width: 768px)").matches;
  }

  /* PC 전용 언어 콤보박스(.hdr-lang-pc)가 모바일 viewport에서 layout(overflow / fixed anchor)에
     영향을 주지 않도록 DOM에서 빼두고, PC로 돌아가면 원위치로 복원한다. */
  function detachPcLangForMobile() {
    if (!isMobileDrawerBreakpoint()) return;
    if (TM_PC_LANG_NODE) return;
    var node = document.querySelector("header .hdr-lang-pc");
    if (!node || !node.parentNode) return;
    TM_PC_LANG_NODE = node;
    TM_PC_LANG_PH = document.createComment("tm-pc-lang-placeholder");
    node.parentNode.insertBefore(TM_PC_LANG_PH, node);
    node.parentNode.removeChild(node);
  }

  function reattachPcLangForDesktop() {
    if (isMobileDrawerBreakpoint()) return;
    if (!TM_PC_LANG_NODE || !TM_PC_LANG_PH) return;
    if (TM_PC_LANG_PH.parentNode) {
      TM_PC_LANG_PH.parentNode.insertBefore(TM_PC_LANG_NODE, TM_PC_LANG_PH);
      TM_PC_LANG_PH.remove();
    }
    TM_PC_LANG_PH = null;
    TM_PC_LANG_NODE = null;
  }

  /* Sticky header + position:fixed nav can mis-anchor in WebKit (left inset / gap). Reparent while open. */
  function portalMainNav() {
    var nav = document.getElementById("mainNav");
    if (!nav || !isMobileDrawerBreakpoint()) return;
    if (nav.dataset.tmPortaled === "1") return;
    var parent = nav.parentNode;
    if (!parent) return;
    TM_NAV_PH = document.createComment("tm-mainnav-placeholder");
    parent.insertBefore(TM_NAV_PH, nav);
    document.body.appendChild(nav);
    nav.dataset.tmPortaled = "1";
  }

  function unportalMainNav() {
    var nav = document.getElementById("mainNav");
    if (!nav) {
      TM_NAV_PH = null;
      return;
    }
    if (nav.dataset.tmPortaled !== "1") {
      TM_NAV_PH = null;
      return;
    }
    if (TM_NAV_PH && TM_NAV_PH.parentNode) {
      TM_NAV_PH.parentNode.insertBefore(nav, TM_NAV_PH);
      TM_NAV_PH.remove();
    } else {
      var hm = document.querySelector("header .header-main");
      var actions = hm && hm.querySelector(".header-actions");
      if (hm && actions) hm.insertBefore(nav, actions);
      else if (hm) hm.appendChild(nav);
    }
    TM_NAV_PH = null;
    delete nav.dataset.tmPortaled;
  }

  /* ─────────── Drawer control ─────────── */
  function toggleMenu() {
    var nav = document.getElementById("mainNav");
    if (!nav) return;
    var willOpen = !nav.classList.contains("is-open");
    if (willOpen) {
      portalMainNav();
      nav.classList.add("is-open");
    } else {
      nav.classList.remove("is-open");
      unportalMainNav();
    }
    var open = nav.classList.contains("is-open");
    document.body.classList.toggle("nav-open", open);
    var hb = document.querySelector(".hamburger");
    if (hb) hb.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function closeMenu() {
    var nav = document.getElementById("mainNav");
    if (nav) nav.classList.remove("is-open");
    unportalMainNav();
    document.body.classList.remove("nav-open");
    var hb = document.querySelector(".hamburger");
    if (hb) hb.setAttribute("aria-expanded", "false");
  }

  window.addEventListener("resize", function () {
    if (!isMobileDrawerBreakpoint()) {
      closeMenu();
      reattachPcLangForDesktop();
    } else {
      detachPcLangForMobile();
    }
  });

  document.addEventListener("click", function (e) {
    var nav = document.getElementById("mainNav");
    if (!nav || !nav.classList.contains("is-open")) return;
    var el = e.target;
    if (!el || typeof el.closest !== "function") return;
    if (el.closest("#mainNav") || el.closest(".hamburger")) return;
    closeMenu();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeMenu();
  });

  /* ─────────── Inject 3 lang buttons into drawer (mobile only) ─────────── */
  /* PC header-top keeps the <select> combobox; drawer always uses buttons */
  function relocateLangSwitch() {
    var nav = document.getElementById("mainNav");
    if (!nav || nav.querySelector(".tm-drawer-lang")) return;

    var LANGS = [
      { code: "ko", label: "한국어" },
      { code: "my", label: "မြန်မာ" },
      { code: "en", label: "English" },
    ];

    var cur = window.TMI18N ? window.TMI18N.getLang() : "ko";

    var wrap = document.createElement("div");
    wrap.className = "tm-drawer-lang";

    LANGS.forEach(function (l) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("data-lang", l.code);
      btn.textContent = l.label;
      if (l.code === cur) btn.classList.add("is-active");
      btn.addEventListener("click", function () {
        if (window.TMI18N && window.TMI18N.setLang) {
          window.TMI18N.setLang(l.code);
        } else {
          try {
            localStorage.setItem("tm_lang", l.code);
          } catch (e) {}
          document.documentElement.setAttribute(
            "lang",
            l.code === "my" ? "my" : l.code === "en" ? "en" : "ko"
          );
        }
      });
      wrap.appendChild(btn);
    });

    nav.appendChild(wrap);
  }

  /* ─────────── Bottom tab bar ─────────── */
  var TABS = [
    { key: "home",     href: "index.html",    label: "홈",    i18n: "tab_home",     icon: "ic-home" },
    { key: "guide",    href: "guide.html",    label: "안내",  i18n: "tab_guide",    icon: "ic-guide" },
    { key: "register", href: "register.html", label: "접수",  i18n: "tab_register", icon: "ic-register", primary: true },
    { key: "notice",   href: "notice.html",   label: "공지",  i18n: "tab_notice",   icon: "ic-notice" },
    { key: "mypage",   href: "mypage.html",   label: "마이",  i18n: "tab_mypage",   icon: "ic-mypage" },
  ];

  function currentPage() {
    var p = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    if (!p || p === "/") return "index.html";
    return p;
  }

  function buildTabBar() {
    if (document.querySelector(".bottom-tabbar")) return;
    if (!document.getElementById("mainNav")) return; // skip auth / admin / admit
    if (document.body.dataset.noTabbar === "1") return;

    var page = currentPage();
    var bar = document.createElement("nav");
    bar.className = "bottom-tabbar";
    bar.setAttribute("aria-label", "주요 메뉴");

    var row = document.createElement("div");
    row.className = "tab-row";

    TABS.forEach(function (t) {
      var a = document.createElement("a");
      a.href = t.href;
      a.className = "tab-item" + (t.primary ? " tab-primary" : "");
      if (page === t.href.toLowerCase()) a.classList.add("is-active");

      a.innerHTML =
        '<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><use href="#' + t.icon + '"/></svg>' +
        '<span class="tab-lbl" data-i18n="' + t.i18n + '">' + t.label + '</span>';
      row.appendChild(a);
    });

    bar.appendChild(row);
    document.body.appendChild(bar);

    if (window.TMI18N && typeof window.TMI18N.apply === "function") {
      window.TMI18N.apply(window.TMI18N.getLang());
    }
  }

  /* ─────────── Close drawer on nav link click ─────────── */
  function wireDrawerLinks() {
    var nav = document.getElementById("mainNav");
    if (!nav) return;
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeMenu);
    });
  }

  function wireHamburger() {
    document.querySelectorAll(".hamburger").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        toggleMenu();
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    detachPcLangForMobile();
    relocateLangSwitch();
    buildTabBar();
    wireDrawerLinks();
    wireHamburger();
  });

  window.toggleMenu = toggleMenu;
  window.closeMainNav = closeMenu;
})();
