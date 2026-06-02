/**
 * FO API client — Phase 0 (auth/login).
 * Override: window.API_BASE_URL, window.USE_API = false (static demo only).
 * Production: <meta name="topik-api-base" content="https://api.example.com">
 */
(function (global) {
  "use strict";

  var STORAGE = {
    access: "topik_access_token",
    refresh: "topik_refresh_token",
    user: "topik_user",
  };

  function resolveBaseUrl() {
    if (typeof global.API_BASE_URL === "string") {
      return global.API_BASE_URL;
    }
    if (typeof document !== "undefined") {
      var meta = document.querySelector('meta[name="topik-api-base"]');
      if (meta && meta.content) return meta.content.trim();
    }
    var loc = global.location;
    if (!loc || !loc.hostname) return "http://localhost:3000";
    var host = loc.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:3000";
    }
    if (host === "topik-myanmar.vercel.app" || host.endsWith(".vercel.app")) {
      return "";
    }
    return "";
  }

  var USE_API = global.USE_API !== false;
  var API_BASE_URL = resolveBaseUrl();

  function storageFor(persist) {
    return persist ? global.localStorage : global.sessionStorage;
  }

  function clearTokens(store) {
    store.removeItem(STORAGE.access);
    store.removeItem(STORAGE.refresh);
    store.removeItem(STORAGE.user);
  }

  function clearAllTokenStores() {
    try {
      clearTokens(global.sessionStorage);
      clearTokens(global.localStorage);
    } catch (e) { /* private mode */ }
  }

  function readUser() {
    try {
      var raw =
        global.sessionStorage.getItem(STORAGE.user) ||
        global.localStorage.getItem(STORAGE.user);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function getAccessToken() {
    try {
      return (
        global.sessionStorage.getItem(STORAGE.access) ||
        global.localStorage.getItem(STORAGE.access) ||
        null
      );
    } catch (e) {
      return null;
    }
  }

  function persistSession(data, persist) {
    var store = storageFor(!!persist);
    var other = storageFor(!persist);
    clearTokens(other);
    store.setItem(STORAGE.access, data.access_token);
    store.setItem(STORAGE.refresh, data.refresh_token);
    store.setItem(STORAGE.user, JSON.stringify(data.user));
  }

  function syncLegacyUser(user) {
    if (!user || typeof global.localStorage === "undefined") return;
    var displayName =
      user.name_ko || user.name || (user.email || "").split("@")[0] || "User";
    try {
      global.localStorage.setItem(
        "tpkm_user",
        JSON.stringify({
          name: displayName,
          email: user.email,
          id: user.id,
          role: user.role,
        })
      );
    } catch (e) { /* quota */ }
  }

  function apiUrl(path) {
    var base = API_BASE_URL.replace(/\/$/, "");
    return base + path;
  }

  function login(email, password, options) {
    options = options || {};
    var persist = !!options.persist;

    if (!USE_API || !API_BASE_URL) {
      return legacyLogin(email, password, persist);
    }

    return fetch(apiUrl("/api/v1/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email: email, password: password }),
    })
      .then(function (res) {
        return res
          .json()
          .catch(function () {
            return {};
          })
          .then(function (body) {
            if (!res.ok) {
              return {
                ok: false,
                status: res.status,
                error: body.error || "login_failed",
                body: body,
              };
            }
            persistSession(body, persist);
            syncLegacyUser(body.user);
            return { ok: true, status: res.status, user: body.user, body: body };
          });
      })
      .catch(function (err) {
        if (options.fallbackOnError) {
          return legacyLogin(email, password, persist);
        }
        return {
          ok: false,
          status: 0,
          error: "network_error",
          message: err && err.message ? err.message : String(err),
        };
      });
  }

  function legacyLogin(email, password, persist) {
    if (!email || !password) {
      return Promise.resolve({
        ok: false,
        status: 400,
        error: "email_and_password_required",
      });
    }
    var user = {
      email: email,
      name_ko: email.split("@")[0],
      role: "user",
    };
    var fake = {
      access_token: "demo-local",
      refresh_token: "demo-local-refresh",
      user: user,
    };
    persistSession(fake, persist);
    syncLegacyUser(user);
    return Promise.resolve({ ok: true, status: 200, user: user, demo: true });
  }

  function isLoggedIn() {
    return !!getAccessToken();
  }

  function logout() {
    clearAllTokenStores();
    try {
      global.localStorage.removeItem("tpkm_user");
    } catch (e) { /* ignore */ }
  }

  function getUser() {
    return readUser();
  }

  function apiFetch(path, options) {
    options = options || {};
    var headers = Object.assign(
      { Accept: "application/json" },
      options.headers || {}
    );
    if (options.auth !== false) {
      var token = getAccessToken();
      if (token) headers.Authorization = "Bearer " + token;
    }
    if (options.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    if (!USE_API || !API_BASE_URL) {
      return Promise.resolve({
        ok: false,
        status: 0,
        error: "api_disabled",
        body: {},
      });
    }
    return fetch(apiUrl(path), {
      method: options.method || "GET",
      headers: headers,
      body: options.body,
    }).then(function (res) {
      return res
        .json()
        .catch(function () {
          return {};
        })
        .then(function (body) {
          return { ok: res.ok, status: res.status, body: body };
        });
    });
  }

  function getMe() {
    return apiFetch("/api/v1/me");
  }

  function getExamRounds(query) {
    var q = query || {};
    var qs = "";
    if (q.registration_status) {
      qs = "?registration_status=" + encodeURIComponent(q.registration_status);
    }
    return apiFetch("/api/v1/exam-rounds" + qs, { auth: false });
  }

  function getExamVenues() {
    return apiFetch("/api/v1/exam-venues", { auth: false });
  }

  function submitApplication(payload) {
    return apiFetch("/api/v1/application-submissions", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  function getMyApplications() {
    return apiFetch("/api/v1/applications");
  }

  global.TopikApi = {
    baseUrl: API_BASE_URL,
    useApi: USE_API,

    health: function () {
      if (!API_BASE_URL) {
        return Promise.reject(new Error("API_BASE_URL not configured"));
      }
      return fetch(apiUrl("/health")).then(function (r) {
        return r.json();
      });
    },

    login: login,
    logout: logout,
    isLoggedIn: isLoggedIn,
    getAccessToken: getAccessToken,
    getUser: getUser,
    syncLegacyUser: syncLegacyUser,
    apiFetch: apiFetch,
    getMe: getMe,
    getExamRounds: getExamRounds,
    getExamVenues: getExamVenues,
    submitApplication: submitApplication,
    getMyApplications: getMyApplications,
  };
})(typeof window !== "undefined" ? window : globalThis);
