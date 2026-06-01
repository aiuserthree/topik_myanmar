/* ============================================================
   TOPIK Myanmar — Admin mobile helpers
   - Injects a bottom tab bar (mobile) for the admin panels
   - Adds data-label to every td so CSS can convert tables
     to card stacks on small screens
   - Keeps the sidebar in sync with tab activation
   ============================================================ */
(function () {
  var PANELS = [
    { key: "dashboard",  label: "대시보드", icon: "ic-chart" },
    { key: "applicants", label: "접수자",   icon: "ic-users" },
    { key: "rounds",     label: "회차",     icon: "ic-calendar" },
    { key: "notices",    label: "공지사항 관리", icon: "ic-notice" },
    { key: "faq",        label: "FAQ",      icon: "ic-info" },
  ];

  /* Plain text from <th> (strip SVG icons so data-label stays short) */
  function thPlainText(th) {
    var c = th.cloneNode(true);
    c.querySelectorAll("svg,script,style").forEach(function (el) {
      el.remove();
    });
    return (c.textContent || "").replace(/\s+/g, " ").trim();
  }

  /* ── Table → card stack (CSS uses ::before content attr) ── */
  function annotateTables() {
    document.querySelectorAll("table.data-table").forEach(function (table) {
      var heads = [];
      table.querySelectorAll("thead th").forEach(function (th) {
        heads.push(thPlainText(th));
      });
      if (!heads.length) return;
      table.querySelectorAll("tbody tr").forEach(function (tr) {
        var tds = tr.querySelectorAll("td");
        tds.forEach(function (td, idx) {
          if (heads[idx]) td.setAttribute("data-label", heads[idx]);
        });
        var last = tds[tds.length - 1];
        if (last && last.querySelector(".action-btns")) last.classList.add("td-actions");
      });
    });
  }

  /* ── Keep card labels in sync when JS mutates row cells ── */
  function watchTableMutations() {
    var tables = document.querySelectorAll("table.data-table tbody");
    if (!tables.length || typeof MutationObserver === "undefined") return;
    var obs = new MutationObserver(function () {
      annotateTables();
    });
    tables.forEach(function (tb) {
      obs.observe(tb, { childList: true, subtree: true });
    });
  }

  /* ── Bottom tab bar ── */
  function setActiveTab(name) {
    document.querySelectorAll(".bottom-tabbar-admin .tab-item").forEach(function (a) {
      a.classList.toggle("is-active", a.getAttribute("data-panel") === name);
    });
  }

  function currentActivePanel() {
    var active = document.querySelector(".sb-link.active");
    if (!active) return "dashboard";
    var oc = active.getAttribute("onclick") || "";
    var m = oc.match(/showPanel\('([^']+)'/);
    return m ? m[1] : "dashboard";
  }

  function closeSidebar() {
    var s = document.getElementById("sidebar");
    var o = document.getElementById("sbOverlay");
    if (s) s.classList.remove("open");
    if (o) {
      o.classList.remove("is-visible");
      o.setAttribute("aria-hidden", "true");
    }
  }

  function buildAdminTabBar() {
    if (document.querySelector(".bottom-tabbar")) return;
    if (!document.querySelector(".sidebar")) return;

    var bar = document.createElement("nav");
    bar.className = "bottom-tabbar bottom-tabbar-admin";
    bar.setAttribute("aria-label", "관리자 하단 메뉴");

    var row = document.createElement("div");
    row.className = "tab-row";

    PANELS.forEach(function (p) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "tab-item";
      b.setAttribute("data-panel", p.key);
      b.innerHTML =
        '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><use href="#' +
        p.icon +
        '"/></svg>' +
        '<span class="tab-lbl">' +
        p.label +
        "</span>";
      b.addEventListener("click", function () {
        if (typeof window.showPanel === "function") {
          var sbBtn = document.querySelector(
            '.sb-link[onclick*="showPanel(\'' + p.key + '\'"]'
          );
          window.showPanel(p.key, sbBtn || null);
        }
        setActiveTab(p.key);
        closeSidebar();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
      row.appendChild(b);
    });

    bar.appendChild(row);
    document.body.appendChild(bar);
    setActiveTab(currentActivePanel());
  }

  /* ── Wrap existing showPanel so tab state stays in sync ── */
  function wrapShowPanel() {
    if (typeof window.showPanel !== "function") return;
    var original = window.showPanel;
    window.showPanel = function (name, btn) {
      original(name, btn);
      setActiveTab(name);
    };
  }

  /* ── Soft-close drawer when sidebar link is tapped on mobile ── */
  function hookSidebarLinks() {
    document.querySelectorAll(".sb-link").forEach(function (b) {
      b.addEventListener("click", function () {
        var oc = b.getAttribute("onclick") || "";
        var m = oc.match(/showPanel\('([^']+)'/);
        if (m) setActiveTab(m[1]);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    annotateTables();
    watchTableMutations();
    buildAdminTabBar();
    wrapShowPanel();
    hookSidebarLinks();
  });
})();
