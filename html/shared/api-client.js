/**
 * FO API client placeholder — Phase 0.
 * Set window.API_BASE_URL before loading, or override at build/deploy time.
 */
(function (global) {
  "use strict";

  var API_BASE_URL =
    (typeof global.API_BASE_URL !== "undefined" && global.API_BASE_URL) ||
    "http://localhost:3000";

  global.TopikApi = {
    baseUrl: API_BASE_URL,

    health: function () {
      return fetch(API_BASE_URL + "/health").then(function (r) {
        return r.json();
      });
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
