(function () {
  /* ─────────── Drawer control ─────────── */
  function toggleMenu() {
    var nav = document.getElementById("mainNav");
    if (!nav) return;
    nav.classList.toggle("is-open");
    var open = nav.classList.contains("is-open");
    document.body.classList.toggle("nav-open", open);
    var hb = document.querySelector(".hamburger");
    if (hb) hb.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function closeMenu() {
    var nav = document.getElementById("mainNav");
    if (nav) nav.classList.remove("is-open");
    document.body.classList.remove("nav-open");
    var hb = document.querySelector(".hamburger");
    if (hb) hb.setAttribute("aria-expanded", "false");
  }

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

  /* ─────────── Move lang-switch into drawer on mobile ─────────── */
  function relocateLangSwitch() {
    var nav = document.getElementById("mainNav");
    var lang = document.querySelector(".header-top .lang-switch, header .lang-switch");
    if (!nav || !lang || lang.dataset.relocated === "1") return;
    var ref = lang.cloneNode(true);
    ref.dataset.relocated = "1";
    nav.appendChild(ref);
    if (window.TMI18N && typeof window.TMI18N.initLangButtons === "function") {
      window.TMI18N.initLangButtons(ref);
      window.TMI18N.apply(window.TMI18N.getLang());
    } else {
      ref.querySelectorAll("button[data-lang]").forEach(function (b) {
        b.addEventListener("click", function () {
          if (window.TMI18N && window.TMI18N.setLang) {
            window.TMI18N.setLang(b.getAttribute("data-lang"));
          }
        });
      });
    }
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
    relocateLangSwitch();
    buildTabBar();
    wireDrawerLinks();
    wireHamburger();
  });

  window.toggleMenu = toggleMenu;
  window.closeMainNav = closeMenu;
})();
