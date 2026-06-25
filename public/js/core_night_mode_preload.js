(function () {
  var STORAGE_KEY = "settings_night_background_enabled_v1";
  var TIMER_MODULE_VIEW_SETTINGS_KEY = "settings_timer_module_view_by_mode_v1";
  var STYLE_ID = "night-background-style";
  var doc = document;
  var documentElement = doc && doc.documentElement;
  if (!documentElement) return;
  var RANKED_MODE_KEYS = {
    standard_4x4_pow2_no_undo: true,
    classic_4x4_pow2_undo: true,
    capped_4x4_pow2_no_undo: true,
    capped_4x4_pow2_64_no_undo: true,
    capped_4x4_pow2_1024_no_undo: true,
    capped_4x4_pow2_4096_no_undo: true,
    board_3x3_pow2_no_undo: true,
    board_3x3_pow2_undo: true,
    board_2x4_pow2_no_undo: true,
    board_2x4_pow2_undo: true,
    board_3x4_pow2_no_undo: true,
    board_3x4_pow2_undo: true,
    board_5x5_pow2_no_undo: true,
    board_5x5_pow2_undo: true,
    diag_3x3_pow2_no_undo: true,
    diag_4x4_pow2_no_undo: true,
    diag_3x4_pow2_no_undo: true,
    diag_2x4_pow2_no_undo: true,
    obstacle_4x4_pow2_no_undo: true,
    fib_4x4_no_undo: true,
    fib_4x4_undo: true,
    fib_3x3_no_undo: true,
    fib_3x3_undo: true,
    fib_4x3_no_undo: true,
    fib_4x3_undo: true,
    fib_4x2_no_undo: true,
    fib_4x2_undo: true
  };

  function resolveNightBackgroundCssText() {
    return [
      "html[data-night-background='1']{color-scheme:dark;--night-page-bg:#0a1220;--night-page-bg-deep:#060a12;--night-surface:#182338;--night-surface-alt:#22314a;--night-surface-soft:rgba(255,255,255,0.05);--night-line:rgba(181,198,221,0.16);--night-line-strong:rgba(207,222,241,0.24);--night-ink:#ece2d3;--night-ink-soft:#c8bcaa;--night-ink-dim:#97a7bc;--night-accent:#d5a86a;--night-accent-strong:#edc37b;--night-button:#436282;--night-button-hover:#537598;--night-grid:rgba(176,192,214,0.12);background:radial-gradient(circle at 18% 12%, rgba(95,121,166,0.26), transparent 28%),radial-gradient(circle at 82% 0%, rgba(114,86,153,0.2), transparent 22%),linear-gradient(180deg,#131b2d 0%,#0a1220 46%,#060913 100%) !important;}",
      "html[data-night-background='1'] body{background:transparent !important;color:var(--night-ink) !important;min-height:100vh;}",
      "html[data-night-background='1'] body::before{content:'';position:fixed;inset:0;pointer-events:none;z-index:-2;background-image:radial-gradient(2px 2px at 11% 18%, rgba(255,255,255,0.68), transparent 60%),radial-gradient(1.5px 1.5px at 22% 76%, rgba(255,255,255,0.52), transparent 60%),radial-gradient(2px 2px at 39% 32%, rgba(255,242,214,0.58), transparent 60%),radial-gradient(1.5px 1.5px at 56% 16%, rgba(255,255,255,0.64), transparent 60%),radial-gradient(2px 2px at 69% 60%, rgba(255,255,255,0.56), transparent 60%),radial-gradient(1.5px 1.5px at 81% 24%, rgba(255,248,226,0.68), transparent 60%),radial-gradient(2px 2px at 89% 72%, rgba(255,255,255,0.5), transparent 60%);opacity:0.42;}",
      "html[data-night-background='1'] body::after{content:'';position:fixed;inset:0;pointer-events:none;z-index:-1;background:linear-gradient(180deg, rgba(255,255,255,0.04), transparent 26%),radial-gradient(circle at top, rgba(240,199,126,0.1), transparent 32%),radial-gradient(circle at bottom, rgba(4,7,14,0.74), rgba(4,7,14,0.18) 48%, transparent 76%);}",
      "html[data-night-background='1'] hr{border-bottom-color:var(--night-line) !important;}"
    ].join("\n");
  }

  function ensureStyleTag() {
    if (!doc) return null;
    var style = typeof doc.getElementById === "function" ? doc.getElementById(STYLE_ID) : null;
    if (style) return style;
    if (typeof doc.createElement !== "function") return null;
    style = doc.createElement("style");
    if (!style) return null;
    style.id = STYLE_ID;
    var head = doc.head || documentElement;
    if (head && typeof head.appendChild === "function") {
      head.appendChild(style);
    }
    return style;
  }

  function readStorageItem(key) {
    try {
      return window.localStorage ? window.localStorage.getItem(key) : null;
    } catch (_err) {
      return null;
    }
  }

  function resolveInitialModeKey() {
    var search = "";
    var pathname = "";
    try {
      search = String(window.location && window.location.search || "");
      pathname = String(window.location && window.location.pathname || "");
    } catch (_err) {}
    try {
      var params = new URLSearchParams(search);
      var fromQuery = String(params.get("mode_key") || params.get("mode") || "").trim();
      if (fromQuery) return fromQuery;
    } catch (_errParams) {}
    if (/undo_2048\.html$/i.test(pathname)) return "classic_4x4_pow2_undo";
    if (/capped_2048\.html$/i.test(pathname)) return "capped_4x4_pow2_no_undo";
    if (/2048\.html$/i.test(pathname) || /play\.html$/i.test(pathname)) {
      return "standard_4x4_pow2_no_undo";
    }
    return "";
  }

  function syncInitialTimerLeaderboardAttribute() {
    try {
      var modeKey = resolveInitialModeKey();
      if (!RANKED_MODE_KEYS[modeKey]) {
        documentElement.removeAttribute("data-initial-timer-leaderboard");
        return;
      }
      var raw = readStorageItem(TIMER_MODULE_VIEW_SETTINGS_KEY);
      var map = raw ? JSON.parse(raw) : {};
      if (map && map[modeKey] === "hidden") {
        documentElement.setAttribute("data-initial-timer-leaderboard", "1");
        return;
      }
    } catch (_errTimerModule) {}
    documentElement.removeAttribute("data-initial-timer-leaderboard");
  }

  try {
    if (readStorageItem(STORAGE_KEY) === "1") {
      documentElement.setAttribute("data-night-background", "1");
      documentElement.style.colorScheme = "dark";
      var style = ensureStyleTag();
      if (style) {
        style.textContent = resolveNightBackgroundCssText();
      }
    } else {
      documentElement.removeAttribute("data-night-background");
      documentElement.style.colorScheme = "";
    }
  } catch (_error) {
    documentElement.removeAttribute("data-night-background");
    documentElement.style.colorScheme = "";
  }

  syncInitialTimerLeaderboardAttribute();
})();
