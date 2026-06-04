/**
 * BO (Back-Office) API client — static HTML admin pages.
 * Override: window.TOPIK_API_BASE, meta[name="topik-api-base"].
 */
(function (global) {
  "use strict";

  var STORAGE = {
    access: "bo_access_token",
    refresh: "bo_refresh_token",
    admin: "bo_admin",
  };

  /** Map the admin_users.role column to the Korean label shown in the BO chrome. */
  function roleLabelKo(role) {
    if (role === "super") return "최고관리자";
    if (role === "standard" || role === "manager" || role === "general") return "일반관리자";
    if (role === "readonly" || role === "viewer") return "조회관리자";
    return role || "관리자";
  }

  function resolveBaseUrl() {
    if (typeof global.TOPIK_API_BASE === "string" && global.TOPIK_API_BASE.trim()) {
      return global.TOPIK_API_BASE.trim();
    }
    if (typeof document !== "undefined") {
      var meta = document.querySelector('meta[name="topik-api-base"]');
      if (meta && meta.content && meta.content.trim()) {
        return meta.content.trim();
      }
    }
    var loc = global.location;
    if (!loc || !loc.hostname) return "http://localhost:3000";
    if (loc.hostname === "localhost" || loc.hostname === "127.0.0.1") {
      return "http://localhost:3000";
    }
    return "";
  }

  var API_BASE_URL = resolveBaseUrl();
  var USE_API = global.USE_API !== false && !!API_BASE_URL;

  function apiUrl(path) {
    return API_BASE_URL.replace(/\/$/, "") + path;
  }

  function getAccessToken() {
    try {
      return global.sessionStorage.getItem(STORAGE.access);
    } catch (e) {
      return null;
    }
  }

  function getRefreshToken() {
    try {
      return global.sessionStorage.getItem(STORAGE.refresh);
    } catch (e) {
      return null;
    }
  }

  function persistSession(data) {
    try {
      global.sessionStorage.setItem(STORAGE.access, data.access_token);
      if (data.refresh_token) {
        global.sessionStorage.setItem(STORAGE.refresh, data.refresh_token);
      }
      if (data.user) {
        var u = data.user;
        global.sessionStorage.setItem(
          STORAGE.admin,
          JSON.stringify({
            id: u.id,
            email: u.email,
            name: u.name || u.name_ko || "관리자",
            role: roleLabelKo(u.role),
            roleKey: u.role,
          })
        );
      }
    } catch (e) { /* private mode */ }
  }

  function logout() {
    try {
      global.sessionStorage.removeItem(STORAGE.access);
      global.sessionStorage.removeItem(STORAGE.refresh);
      global.sessionStorage.removeItem(STORAGE.admin);
    } catch (e) { /* ignore */ }
  }

  /** Called once a 401 survives a refresh attempt: clear session + let the host redirect to login. */
  function handleUnauthorized() {
    logout();
    var bo = global.TopikBoApi;
    if (bo && typeof bo.onUnauthorized === "function") {
      try { bo.onUnauthorized(); } catch (e) { /* ignore */ }
    }
  }

  // Single-flight silent refresh using the stored refresh token (admin: sub).
  var refreshInFlight = null;
  function refreshSession() {
    if (refreshInFlight) return refreshInFlight;
    var rt = getRefreshToken();
    if (!rt || !USE_API) return Promise.resolve(false);
    refreshInFlight = fetch(apiUrl("/api/v1/auth/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refresh_token: rt }),
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (body) {
          if (!res.ok || !body || !body.access_token) return false;
          try {
            global.sessionStorage.setItem(STORAGE.access, body.access_token);
            if (body.refresh_token) {
              global.sessionStorage.setItem(STORAGE.refresh, body.refresh_token);
            }
          } catch (e) { /* private mode */ }
          return true;
        });
      })
      .catch(function () { return false; })
      .then(function (ok) { refreshInFlight = null; return ok; });
    return refreshInFlight;
  }

  // isRetry guards against loops: we attempt at most one silent refresh + retry.
  function doApiFetch(path, options, isRetry) {
    options = options || {};
    var headers = Object.assign({ Accept: "application/json" }, options.headers || {});
    var token = getAccessToken();
    if (token) headers.Authorization = "Bearer " + token;
    if (options.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    if (!USE_API) {
      return Promise.resolve({ ok: false, status: 0, error: "api_disabled", body: {} });
    }
    return fetch(apiUrl(path), {
      method: options.method || "GET",
      headers: headers,
      body: options.body,
    })
      .then(function (res) {
        return res
          .json()
          .catch(function () {
            return {};
          })
          .then(function (body) {
            if (res.status === 401 && !isRetry) {
              return refreshSession().then(function (ok) {
                if (ok) return doApiFetch(path, options, true);
                handleUnauthorized();
                return { ok: false, status: 401, body: body };
              });
            }
            return { ok: res.ok, status: res.status, body: body };
          });
      })
      .catch(function (err) {
        return { ok: false, status: 0, error: "network_error", message: err && err.message, body: {} };
      });
  }

  function apiFetch(path, options) {
    return doApiFetch(path, options, false);
  }

  function login(email, password) {
    if (!USE_API) {
      return Promise.resolve({ ok: false, error: "api_disabled" });
    }
    return fetch(apiUrl("/api/v1/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email: email, password: password }),
    })
      .then(function (res) {
        return res.json().then(function (body) {
          if (!res.ok) {
            return { ok: false, status: res.status, error: body.error || "login_failed", body: body };
          }
          persistSession(body);
          return { ok: true, body: body };
        });
      })
      .catch(function (err) {
        return { ok: false, error: "network_error", message: err && err.message };
      });
  }

  function approveApplication(id, payload) {
    return apiFetch("/api/v1/admin/applications/" + encodeURIComponent(id) + "/approve", {
      method: "POST",
      body: JSON.stringify(payload || {}),
    });
  }

  function rejectApplication(id, payload) {
    return apiFetch("/api/v1/admin/applications/" + encodeURIComponent(id) + "/reject", {
      method: "POST",
      body: JSON.stringify(payload || {}),
    });
  }

  function photoReview(id, payload) {
    return apiFetch("/api/v1/admin/applications/" + encodeURIComponent(id) + "/photo-review", {
      method: "POST",
      body: JSON.stringify(payload || {}),
    });
  }

  // --- BO operational endpoints (접수 관리) ---------------------------------

  function buildQuery(params) {
    if (!params) return "";
    var parts = [];
    Object.keys(params).forEach(function (k) {
      var v = params[k];
      if (v === undefined || v === null || v === "") return;
      parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(v));
    });
    return parts.length ? "?" + parts.join("&") : "";
  }

  function listExamRounds() {
    return apiFetch("/api/v1/admin/exam-rounds");
  }

  function listApplications(params) {
    return apiFetch("/api/v1/admin/applications" + buildQuery(params));
  }

  function getApplication(id) {
    return apiFetch("/api/v1/admin/applications/" + encodeURIComponent(id));
  }

  function markPayment(id, payload) {
    return apiFetch("/api/v1/admin/applications/" + encodeURIComponent(id) + "/payment", {
      method: "POST",
      body: JSON.stringify(payload || {}),
    });
  }

  function cancelPayment(id, payload) {
    return apiFetch(
      "/api/v1/admin/applications/" + encodeURIComponent(id) + "/payment/cancel",
      { method: "POST", body: JSON.stringify(payload || {}) }
    );
  }

  function assignExamNumbers(roundId, payload) {
    return apiFetch(
      "/api/v1/admin/exam-rounds/" + encodeURIComponent(roundId) + "/assign-exam-numbers",
      { method: "POST", body: JSON.stringify(payload || {}) }
    );
  }

  /** Authenticated <img src> URL for an admin-viewable file (token in query). */
  function fileUrl(fileId) {
    if (!fileId) return "";
    var token = getAccessToken();
    return apiUrl("/api/v1/admin/files/" + encodeURIComponent(fileId)) +
      (token ? "?token=" + encodeURIComponent(token) : "");
  }

  /** Fetch a binary export with auth and trigger a browser download. */
  function downloadExport(path, filename) {
    var token = getAccessToken();
    if (!USE_API) return Promise.resolve({ ok: false, error: "api_disabled" });
    return fetch(apiUrl(path), {
      headers: token ? { Authorization: "Bearer " + token } : {},
    }).then(function (res) {
      if (!res.ok) {
        return res.json().catch(function () { return {}; }).then(function (body) {
          return { ok: false, status: res.status, body: body };
        });
      }
      return res.blob().then(function (blob) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = filename || "download";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        return { ok: true };
      });
    }).catch(function (err) {
      return { ok: false, error: "network_error", message: err && err.message };
    });
  }

  function downloadRoster(roundId, params, filename) {
    return downloadExport(
      "/api/v1/admin/exam-rounds/" + encodeURIComponent(roundId) + "/roster.xlsx" + buildQuery(params),
      filename || "roster.xlsx"
    );
  }

  function downloadPhotosZip(roundId, params, filename) {
    return downloadExport(
      "/api/v1/admin/exam-rounds/" + encodeURIComponent(roundId) + "/photos.zip" + buildQuery(params),
      filename || "photos.zip"
    );
  }

  function boardReply(postId, reply) {
    return apiFetch("/api/v1/admin/board/posts/" + encodeURIComponent(postId) + "/reply", {
      method: "POST",
      body: JSON.stringify({
        reply: reply,
        activity_type: "공식 답변",
        workflow_status: "answered",
      }),
    });
  }

  function sendNoticeMarketing(noticeId) {
    return apiFetch(
      "/api/v1/admin/notices/" + encodeURIComponent(noticeId) + "/send-marketing",
      { method: "POST", body: "{}" }
    );
  }

  // --- Generic JSON sender (content management CRUD) ------------------------
  function send(method, path, payload) {
    return apiFetch(path, {
      method: method,
      body: payload === undefined ? undefined : JSON.stringify(payload || {}),
    });
  }

  // --- 공지(notices) 관리 ---------------------------------------------------
  function listNotices(params) { return apiFetch("/api/v1/admin/notices" + buildQuery(params)); }
  function getNotice(id) { return apiFetch("/api/v1/admin/notices/" + encodeURIComponent(id)); }
  function createNotice(body) { return send("POST", "/api/v1/admin/notices", body); }
  function updateNotice(id, body) { return send("PATCH", "/api/v1/admin/notices/" + encodeURIComponent(id), body); }
  function deleteNotice(id) { return send("DELETE", "/api/v1/admin/notices/" + encodeURIComponent(id)); }
  function publishNotice(id) { return send("POST", "/api/v1/admin/notices/" + encodeURIComponent(id) + "/publish", {}); }
  function unpublishNotice(id) { return send("POST", "/api/v1/admin/notices/" + encodeURIComponent(id) + "/unpublish", {}); }

  // 공지 본문 인라인 이미지 업로드 → { id, url(absolute), path }
  function uploadNoticeImage(dataUrl, filename, mime) {
    return send("POST", "/api/v1/admin/notices/images", {
      data: dataUrl, filename: filename || "image", mime: mime || "",
    });
  }
  // 공지 첨부파일
  function listNoticeAttachments(id) {
    return apiFetch("/api/v1/admin/notices/" + encodeURIComponent(id) + "/attachments");
  }
  function uploadNoticeAttachment(id, dataUrl, filename, mime) {
    return send("POST", "/api/v1/admin/notices/" + encodeURIComponent(id) + "/attachments", {
      data: dataUrl, filename: filename || "file", mime: mime || "",
    });
  }
  function deleteNoticeAttachment(id, fileId) {
    return send("DELETE", "/api/v1/admin/notices/" + encodeURIComponent(id) + "/attachments/" + encodeURIComponent(fileId));
  }
  // 절대 URL — FO에 저장되는 본문 이미지 src 등에 사용 (배포 BO는 meta로 API base 주입)
  function noticeFileUrl(fileId, download) {
    if (!fileId) return "";
    var base = (API_BASE_URL || "").replace(/\/$/, "");
    return base + "/api/v1/public/notice-files/" + encodeURIComponent(fileId) + (download ? "?dl=1" : "");
  }

  // --- FAQ 관리 -------------------------------------------------------------
  function listFaq(params) { return apiFetch("/api/v1/admin/faq" + buildQuery(params)); }
  function getFaq(id) { return apiFetch("/api/v1/admin/faq/" + encodeURIComponent(id)); }
  function createFaq(body) { return send("POST", "/api/v1/admin/faq", body); }
  function updateFaq(id, body) { return send("PATCH", "/api/v1/admin/faq/" + encodeURIComponent(id), body); }
  function deleteFaq(id) { return send("DELETE", "/api/v1/admin/faq/" + encodeURIComponent(id)); }
  function reorderFaq(orders) { return send("POST", "/api/v1/admin/faq/reorder", { orders: orders }); }

  // --- 회차(exam-rounds) 관리 ----------------------------------------------
  function getExamRound(id) { return apiFetch("/api/v1/admin/exam-rounds/" + encodeURIComponent(id)); }
  function createExamRound(body) { return send("POST", "/api/v1/admin/exam-rounds", body); }
  function updateExamRound(id, body) { return send("PATCH", "/api/v1/admin/exam-rounds/" + encodeURIComponent(id), body); }
  function setRoundStatus(id, status) {
    return send("POST", "/api/v1/admin/exam-rounds/" + encodeURIComponent(id) + "/status", { registration_status: status });
  }

  // --- 시험장(exam-venues) 관리 --------------------------------------------
  function listVenues(params) { return apiFetch("/api/v1/admin/exam-venues" + buildQuery(params)); }
  function getVenue(id) { return apiFetch("/api/v1/admin/exam-venues/" + encodeURIComponent(id)); }
  function createVenue(body) { return send("POST", "/api/v1/admin/exam-venues", body); }
  function updateVenue(id, body) { return send("PATCH", "/api/v1/admin/exam-venues/" + encodeURIComponent(id), body); }
  function activateVenue(id) { return send("POST", "/api/v1/admin/exam-venues/" + encodeURIComponent(id) + "/activate", {}); }
  function deactivateVenue(id) { return send("POST", "/api/v1/admin/exam-venues/" + encodeURIComponent(id) + "/deactivate", {}); }
  function listRegionCodes() { return apiFetch("/api/v1/admin/region-codes"); }

  // --- 약관/개인정보(terms) 관리 -------------------------------------------
  function listTerms(params) { return apiFetch("/api/v1/admin/terms" + buildQuery(params)); }
  function getTerm(id) { return apiFetch("/api/v1/admin/terms/" + encodeURIComponent(id)); }
  function createTerm(body) { return send("POST", "/api/v1/admin/terms", body); }
  function updateTerm(id, body) { return send("PATCH", "/api/v1/admin/terms/" + encodeURIComponent(id), body); }
  function publishTerm(id) { return send("POST", "/api/v1/admin/terms/" + encodeURIComponent(id) + "/publish", {}); }
  function deleteTerm(id) { return send("DELETE", "/api/v1/admin/terms/" + encodeURIComponent(id)); }

  function parseError(res) {
    if (!res) return "요청을 처리할 수 없습니다.";
    var b = res.body || {};
    if (b.error && b.error.message) return b.error.message;
    if (typeof b.error === "string") return b.error;
    if (res.status === 401) return "로그인이 필요합니다. admin-login에서 API 계정으로 로그인해 주세요.";
    if (res.status === 403) return "권한이 없습니다.";
    return "요청을 처리할 수 없습니다. (" + (res.status || "오류") + ")";
  }

  global.TopikBoApi = {
    baseUrl: API_BASE_URL,
    useApi: USE_API,
    login: login,
    logout: logout,
    getAccessToken: getAccessToken,
    getRefreshToken: getRefreshToken,
    refreshSession: refreshSession,
    onUnauthorized: null,
    apiFetch: apiFetch,
    approveApplication: approveApplication,
    rejectApplication: rejectApplication,
    photoReview: photoReview,
    listExamRounds: listExamRounds,
    listApplications: listApplications,
    getApplication: getApplication,
    markPayment: markPayment,
    cancelPayment: cancelPayment,
    assignExamNumbers: assignExamNumbers,
    fileUrl: fileUrl,
    downloadRoster: downloadRoster,
    downloadPhotosZip: downloadPhotosZip,
    boardReply: boardReply,
    sendNoticeMarketing: sendNoticeMarketing,
    listNotices: listNotices,
    getNotice: getNotice,
    createNotice: createNotice,
    updateNotice: updateNotice,
    deleteNotice: deleteNotice,
    publishNotice: publishNotice,
    unpublishNotice: unpublishNotice,
    uploadNoticeImage: uploadNoticeImage,
    listNoticeAttachments: listNoticeAttachments,
    uploadNoticeAttachment: uploadNoticeAttachment,
    deleteNoticeAttachment: deleteNoticeAttachment,
    noticeFileUrl: noticeFileUrl,
    listFaq: listFaq,
    getFaq: getFaq,
    createFaq: createFaq,
    updateFaq: updateFaq,
    deleteFaq: deleteFaq,
    reorderFaq: reorderFaq,
    getExamRound: getExamRound,
    createExamRound: createExamRound,
    updateExamRound: updateExamRound,
    setRoundStatus: setRoundStatus,
    listVenues: listVenues,
    getVenue: getVenue,
    createVenue: createVenue,
    updateVenue: updateVenue,
    activateVenue: activateVenue,
    deactivateVenue: deactivateVenue,
    listRegionCodes: listRegionCodes,
    listTerms: listTerms,
    getTerm: getTerm,
    createTerm: createTerm,
    updateTerm: updateTerm,
    publishTerm: publishTerm,
    deleteTerm: deleteTerm,
    parseError: parseError,
    canUseApi: function () {
      return USE_API && !!getAccessToken();
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
