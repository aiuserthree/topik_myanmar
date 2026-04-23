(function () {
  var KEY = "tm_profile_v1";

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
    save: save,
    load: load,
    clear: clear,
    birthToCompact: birthToCompact,
  };
})();
