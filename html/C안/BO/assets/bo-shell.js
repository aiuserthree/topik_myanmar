/* TOPIK Myanmar BO — app shell helpers (mobile sidebar toggle). No framework. */
(function () {
  "use strict";
  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }
  ready(function () {
    var sb = document.getElementById("boSidebar");
    var backdrop = document.getElementById("boSbBackdrop");
    var ham = document.getElementById("boHam");
    if (!sb) return;
    function open() { sb.classList.add("is-open"); if (backdrop) backdrop.classList.add("is-open"); }
    function close() { sb.classList.remove("is-open"); if (backdrop) backdrop.classList.remove("is-open"); }
    if (ham) ham.addEventListener("click", function () {
      sb.classList.contains("is-open") ? close() : open();
    });
    if (backdrop) backdrop.addEventListener("click", close);
    [].forEach.call(sb.querySelectorAll(".bo-sb-link"), function (a) {
      a.addEventListener("click", close);
    });
  });
})();
