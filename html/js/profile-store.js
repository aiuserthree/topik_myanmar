(function () {
  var KEY = "tm_profile_v1";
  /** 가입 시 증명사진(data URL). 시험 접수 단계에서 재사용. 본문 JSON과 분리해 용량·파싱 부담 완화 */
  var PHOTO_KEY = "tm_signup_photo_v1";

  function save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {}
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function clear() {
    try {
      localStorage.removeItem(KEY);
      localStorage.removeItem(PHOTO_KEY);
    } catch (e) {}
  }

  function saveSignupPhoto(dataUrl) {
    if (!dataUrl || typeof dataUrl !== "string") return false;
    try {
      localStorage.setItem(PHOTO_KEY, dataUrl);
      return true;
    } catch (e) {
      return false;
    }
  }

  function loadSignupPhoto() {
    try {
      var s = localStorage.getItem(PHOTO_KEY);
      return s && s.length > 30 ? s : null;
    } catch (e) {
      return null;
    }
  }

  function clearSignupPhoto() {
    try {
      localStorage.removeItem(PHOTO_KEY);
    } catch (e) {}
  }

  /** YYYY-MM-DD → YYYYMMDD for register.html */
  function birthToCompact(iso) {
    if (!iso) return "";
    var s = String(iso).replace(/\D/g, "");
    if (s.length >= 8) return s.slice(0, 8);
    return "";
  }

  window.TMProfile = {
    KEY: KEY,
    PHOTO_KEY: PHOTO_KEY,
    save: save,
    load: load,
    clear: clear,
    birthToCompact: birthToCompact,
    saveSignupPhoto: saveSignupPhoto,
    loadSignupPhoto: loadSignupPhoto,
    clearSignupPhoto: clearSignupPhoto,
  };
})();
