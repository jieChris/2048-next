(function (global) {
  "use strict";

  if (!global) return;

  function resolveLocalStorage() {
    try {
      return global && global["localStorage"] ? global["localStorage"] : null;
    } catch (_err) {
      return null;
    }
  }

  function resolveLang() {
    try {
      var storage = resolveLocalStorage();
      var raw = String(
        (storage && storage.getItem("ui_language_v1")) || ""
      ).toLowerCase();
      return raw === "en" ? "en" : "zh";
    } catch (_err) {
      return "zh";
    }
  }

  function buildTimerModuleSettingsRowInnerHtml() {
    var isEn = resolveLang() === "en";
    return (
      "<div class='settings-toggle-main'>" +
      "<div class='settings-toggle-copy'>" +
      "<label for='timer-module-view-toggle' class='settings-toggle-title'>" +
      (isEn ? "Timer Mode" : "\u8ba1\u65f6\u5668\u6a21\u5f0f") +
      "</label>" +
      "<div id='timer-module-view-label' class='settings-toggle-desc'>" +
      (isEn
        ? "Turn on to show timers, turn off to show leaderboard."
        : "\u5f00\u542f\u65f6\u663e\u793a\u8ba1\u65f6\u5668\uff0c\u5173\u95ed\u65f6\u663e\u793a\u6392\u884c\u699c\u3002") +
      "</div>" +
      "</div>" +
      "<label class='settings-switch' for='timer-module-view-toggle' aria-label='" +
      (isEn ? "Timer Mode" : "\u8ba1\u65f6\u5668\u6a21\u5f0f") +
      "'>" +
      "<input id='timer-module-view-toggle' type='checkbox'>" +
      "<span class='settings-switch-slider'></span>" +
      "</label>" +
      "</div>" +
      "<div id='timer-module-view-note' class='settings-note'></div>"
    );
  }

  function resolveTimerModuleSettingsState(options) {
    var opts = options || {};
    var lang = opts.lang === "en" ? "en" : resolveLang();
    var viewMode = opts.viewMode === "hidden" ? "hidden" : "timer";
    var hasLeaderboard = !!opts.hasLeaderboard;
    var isTimerMode = viewMode !== "hidden";

    if (!hasLeaderboard) {
      return {
        toggleDisabled: true,
        toggleChecked: true,
        toggleLabelText:
          lang === "en"
            ? "Leaderboard is not available in this mode."
            : "\u5f53\u524d\u6a21\u5f0f\u4e0d\u652f\u6301\u6392\u884c\u699c\u754c\u9762\u3002",
        noteText:
          lang === "en"
            ? "Current mode does not support leaderboard panel."
            : "\u5f53\u524d\u6a21\u5f0f\u4e0d\u652f\u6301\u6392\u884c\u699c\u9762\u677f\u3002",
        rowVisible: false
      };
    }

    return {
      toggleDisabled: false,
      toggleChecked: isTimerMode,
      toggleLabelText: isTimerMode
        ? lang === "en"
          ? "Timers are shown in the right panel."
          : "\u5f53\u524d\u53f3\u4fa7\u663e\u793a\u8ba1\u65f6\u5668\u3002"
        : lang === "en"
          ? "Leaderboard is shown in the right panel."
          : "\u5f53\u524d\u53f3\u4fa7\u663e\u793a\u6392\u884c\u699c\u3002",
      noteText: isTimerMode
        ? lang === "en"
          ? "Switch off to show the leaderboard in the right panel."
          : "\u5173\u95ed\u540e\u5207\u6362\u4e3a\u6392\u884c\u699c\u754c\u9762\uff0c\u4e0d\u5f71\u54cd\u68cb\u76d8\u4e0e\u56de\u653e\u3002"
        : lang === "en"
          ? "Switch on to return to timer view."
          : "\u5f00\u542f\u540e\u5207\u56de\u8ba1\u65f6\u5668\u754c\u9762\u3002",
      rowVisible: true
    };
  }

  function resolveTimerModuleCurrentViewMode(options) {
    var opts = options || {};
    var fallbackViewMode = opts.fallbackViewMode === "hidden" ? "hidden" : "timer";
    var manager = opts.manager || null;
    if (!manager || typeof manager.getTimerModuleViewMode !== "function") {
      return fallbackViewMode;
    }
    try {
      var viewMode = manager.getTimerModuleViewMode();
      if (viewMode === "timer" || viewMode === "hidden") {
        return viewMode;
      }
    } catch (_err) {}
    return fallbackViewMode;
  }

  function resolveTimerModuleBindingState(options) {
    var opts = options || {};
    return {
      shouldBind: !opts.alreadyBound,
      boundValue: true
    };
  }

  function resolveTimerModuleViewMode(options) {
    var opts = options || {};
    return {
      viewMode: opts.checked ? "timer" : "hidden"
    };
  }

  function resolveTimerModuleAppliedViewMode(options) {
    var opts = options || {};
    var nextViewMode = opts.nextViewMode;
    if (
      nextViewMode &&
      (nextViewMode.viewMode === "timer" || nextViewMode.viewMode === "hidden")
    ) {
      return nextViewMode.viewMode;
    }
    return opts.checked ? "timer" : "hidden";
  }

  function resolveTimerModuleInitRetryState(options) {
    var opts = options || {};
    var retryDelayMs =
      typeof opts.retryDelayMs === "number" && opts.retryDelayMs > 0 ? opts.retryDelayMs : 60;
    return {
      shouldRetry: !!opts.hasToggle && !opts.hasManager,
      retryDelayMs: retryDelayMs
    };
  }

  global.CoreTimerModuleRuntime = global.CoreTimerModuleRuntime || {};
  global.CoreTimerModuleRuntime.buildTimerModuleSettingsRowInnerHtml =
    buildTimerModuleSettingsRowInnerHtml;
  global.CoreTimerModuleRuntime.resolveTimerModuleSettingsState =
    resolveTimerModuleSettingsState;
  global.CoreTimerModuleRuntime.resolveTimerModuleCurrentViewMode =
    resolveTimerModuleCurrentViewMode;
  global.CoreTimerModuleRuntime.resolveTimerModuleBindingState =
    resolveTimerModuleBindingState;
  global.CoreTimerModuleRuntime.resolveTimerModuleViewMode = resolveTimerModuleViewMode;
  global.CoreTimerModuleRuntime.resolveTimerModuleAppliedViewMode =
    resolveTimerModuleAppliedViewMode;
  global.CoreTimerModuleRuntime.resolveTimerModuleInitRetryState =
    resolveTimerModuleInitRetryState;
})(typeof window !== "undefined" ? window : this);
