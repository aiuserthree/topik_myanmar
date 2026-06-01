/**
 * FO 계정 비밀번호 정책 (TPKM_FO_6_2_2, TPKM_FO_6_3)
 * 8자 이상, 영문+숫자+특수문자 조합
 */
(function () {
  var MSG =
    "영문·숫자·특수문자를 각각 포함하여 8자 이상 입력해 주세요.";

  function isValid(value) {
    var p = String(value || "");
    if (p.length < 8) return false;
    if (!/[A-Za-z]/.test(p)) return false;
    if (!/\d/.test(p)) return false;
    if (!/[^A-Za-z0-9]/.test(p)) return false;
    return true;
  }

  function strengthScore(value) {
    var p = String(value || "");
    if (!p) return 0;
    var score = 0;
    if (p.length >= 8) score += 1;
    if (p.length >= 12) score += 1;
    if (/[A-Za-z]/.test(p)) score += 1;
    if (/\d/.test(p)) score += 1;
    if (/[^A-Za-z0-9]/.test(p)) score += 1;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score += 1;
    return Math.min(score, 5);
  }

  function strengthMeta(value) {
    var s = strengthScore(value);
    if (!value) return { pct: 0, label: "", className: "" };
    if (s <= 2) return { pct: 33, label: "약함", className: "weak" };
    if (s <= 4) return { pct: 66, label: "보통", className: "medium" };
    return { pct: 100, label: "강함", className: "strong" };
  }

  function bindStrengthMeter(inputEl, barEl, labelEl) {
    if (!inputEl || !barEl) return;
    function refresh() {
      var meta = strengthMeta(inputEl.value);
      barEl.style.width = meta.pct + "%";
      barEl.className = "pw-strength-bar " + (meta.className || "");
      if (labelEl) labelEl.textContent = meta.label;
    }
    inputEl.addEventListener("input", refresh);
    refresh();
  }

  function bindToggle(btnEl, inputEl) {
    if (!btnEl || !inputEl) return;
    btnEl.addEventListener("click", function () {
      var show = inputEl.type === "password";
      inputEl.type = show ? "text" : "password";
      var use = btnEl.querySelector("use");
      if (use) use.setAttribute("href", show ? "#ic-eye-off" : "#ic-eye");
      btnEl.setAttribute("aria-label", show ? "비밀번호 숨기기" : "비밀번호 표시");
    });
  }

  window.TMAccountPw = {
    MSG: MSG,
    isValid: isValid,
    strengthMeta: strengthMeta,
    bindStrengthMeter: bindStrengthMeter,
    bindToggle: bindToggle,
  };
})();
