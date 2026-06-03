/**
 * Wires B안 BO mock pages to TopikBoApi when API token is present.
 * Include after bo-api-client.js on admin-applicants / admin-inquiry / admin-notice.
 */
(function (global) {
  "use strict";

  var Bo = global.TopikBoApi;
  if (!Bo || !Bo.useApi) return;

  function alertApiResult(res, okMsg) {
    if (res.ok) {
      alert(okMsg || "API 처리가 완료되었습니다.");
      return true;
    }
    alert(Bo.parseError(res));
    return false;
  }

  /** Patch admin-applicants approve/reject/photo handlers */
  function wireApplicants() {
    if (typeof global.doApproveFromDetail !== "function") return;

    var origApprove = global.doApproveFromDetail;
    global.doApproveFromDetail = function () {
      if (!Bo.canUseApi() || !global.currentId) return origApprove();
      if (!confirm("API로 승인 처리하시겠습니까? (application id=" + global.currentId + ")")) return;
      Bo.approveApplication(global.currentId, {}).then(function (res) {
        if (alertApiResult(res, "승인 처리되었습니다.")) origApprove();
      });
    };

    var origReject = global.doReject;
    global.doReject = function () {
      if (!Bo.canUseApi() || !global.currentId) return origReject();
      var chips = [].slice
        .call(document.querySelectorAll("#rjReasonChips .rj-chip.on"))
        .map(function (c) {
          return c.dataset.r;
        });
      var text = (document.getElementById("rj-reason") || {}).value || "";
      if (!chips.length) {
        alert("반려 사유(정형)를 1개 이상 선택해 주세요.");
        return;
      }
      var reason = [chips.join(", "), text.trim()].filter(Boolean).join(" / ");
      Bo.rejectApplication(global.currentId, { reject_code: "other", reject_note: reason }).then(
        function (res) {
          if (alertApiResult(res, "반려 처리되었습니다.")) origReject();
        }
      );
    };

    var origPhoto = global.doPhotoAction;
    global.doPhotoAction = function (type) {
      if (!Bo.canUseApi() || !global.currentId) return origPhoto(type);
      var payload =
        type === "approve"
          ? { action: "approve" }
          : {
              action: "reject",
              photo_reject_code: "other",
              photo_reject_note:
                [].slice
                  .call(document.querySelectorAll(".rj-chip.on"))
                  .map(function (c) {
                    return c.dataset.r;
                  })
                  .join(", ") ||
                (document.getElementById("rjText") || {}).value ||
                "사유 없음",
            };
      Bo.photoReview(global.currentId, payload).then(function (res) {
        if (alertApiResult(res, type === "approve" ? "사진 승인되었습니다." : "사진 반려되었습니다."))
          origPhoto(type);
      });
    };
  }

  function wireInquiry() {
    if (typeof global.doIqReply !== "function") return;
    var orig = global.doIqReply;
    global.doIqReply = function () {
      var replyEl = document.getElementById("iq-reply");
      var reply = replyEl ? replyEl.value.trim() : "";
      if (!reply) {
        alert("답변 내용을 입력해 주세요.");
        return;
      }
      if (!Bo.canUseApi() || !global.currentIqId) return orig();
      Bo.boardReply(global.currentIqId, reply).then(function (res) {
        if (alertApiResult(res, "답변이 저장되었습니다. board_reply 메일이 발송됩니다.")) orig();
      });
    };
  }

  function wireNotice() {
    if (typeof global.sendMarketingEmail !== "function") return;
    var orig = global.sendMarketingEmail;
    global.sendMarketingEmail = function (title, noticeId) {
      if (!Bo.canUseApi() || !noticeId) {
        orig(title);
        return;
      }
      if (!confirm("마케팅 수신 동의 회원에게 공지 알림을 발송하시겠습니까?")) return;
      Bo.sendNoticeMarketing(noticeId).then(function (res) {
        if (res.ok && res.body) {
          var n = res.body.queued != null ? res.body.queued : 0;
          if (typeof global.showToast === "function") {
            global.showToast("마케팅 수신 동의 회원 " + n + "명에게 발송 큐에 등록했습니다.");
          } else {
            alert("발송 큐 등록: " + n + "건");
          }
        } else {
          alert(Bo.parseError(res));
          orig(title);
        }
      });
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      wireApplicants();
      wireInquiry();
      wireNotice();
    });
  } else {
    wireApplicants();
    wireInquiry();
    wireNotice();
  }
})(typeof window !== "undefined" ? window : globalThis);
