/* TOPIK Myanmar BO — shared helpers for content-management screens (no framework). */
(function (global) {
  "use strict";
  var Bo = global.TopikBoApi;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function requireAuth() {
    if (!Bo || !Bo.getAccessToken || !Bo.getAccessToken()) {
      location.replace("login.html");
      return false;
    }
    return true;
  }

  var toastEl, toastTimer;
  function toast(msg, kind) {
    toastEl = toastEl || document.getElementById("toast");
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.className = "bo-toast" + (kind ? " is-" + kind : "");
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 3200);
  }

  function initChrome() {
    try {
      var admin = JSON.parse(sessionStorage.getItem("bo_admin") || "{}");
      var idEl = document.getElementById("adminId");
      if (idEl) idEl.textContent = admin.email || "";
    } catch (e) { /* ignore */ }
    var logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", function () {
        Bo.logout();
        location.replace("login.html");
      });
    }
    bindPanelClose();
  }

  function pad(n) { return String(n).padStart(2, "0"); }
  function fmtDate(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.getFullYear() + "." + pad(d.getMonth() + 1) + "." + pad(d.getDate());
  }
  function fmtDateTime(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return fmtDate(iso) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }
  /** ISO → value for <input type="datetime-local"> in local time. */
  function toLocalInput(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    var local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }
  /** ISO → value for <input type="date">. */
  function toDateInput(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    var local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  function openPanel() {
    var ov = document.getElementById("overlay");
    var p = document.getElementById("formPanel");
    if (ov) ov.hidden = false;
    if (p) { p.hidden = false; p.setAttribute("aria-hidden", "false"); }
  }
  function closePanel() {
    var ov = document.getElementById("overlay");
    var p = document.getElementById("formPanel");
    if (ov) ov.hidden = true;
    if (p) { p.hidden = true; p.setAttribute("aria-hidden", "true"); }
  }
  function bindPanelClose() {
    var ov = document.getElementById("overlay");
    var c = document.getElementById("panelClose");
    if (ov) ov.addEventListener("click", closePanel);
    if (c) c.addEventListener("click", closePanel);
  }

  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : "";
  }
  function checked(id) {
    var el = document.getElementById(id);
    return el ? el.checked : false;
  }

  global.BoCommon = {
    Bo: Bo,
    esc: esc,
    requireAuth: requireAuth,
    toast: toast,
    initChrome: initChrome,
    fmtDate: fmtDate,
    fmtDateTime: fmtDateTime,
    toLocalInput: toLocalInput,
    toDateInput: toDateInput,
    openPanel: openPanel,
    closePanel: closePanel,
    val: val,
    checked: checked,
  };
})(window);
